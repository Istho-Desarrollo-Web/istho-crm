// frontend/src/pages/Solicitudes/SolicitudDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Lock, Send, Paperclip, ExternalLink } from 'lucide-react';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

const ESTADO_CONFIG = {
  recibida:   { label: 'Recibida',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  en_proceso: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completada: { label: 'Completada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rechazada:  { label: 'Rechazada',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const SolicitudDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isCliente, isSupervisorOrAbove } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [esInterno, setEsInterno] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [cambioEstado, setCambioEstado] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [operacionIdVincular, setOperacionIdVincular] = useState('');
  const [accionando, setAccionando] = useState(false);
  const comentariosRef = useRef(null);

  const fetchSolicitud = async () => {
    setLoading(true);
    try {
      const res = await solicitudesService.getById(id);
      setSolicitud(res.data);
    } catch {
      notifyError('Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSolicitud(); }, [id]);

  useEffect(() => {
    if (comentariosRef.current) {
      comentariosRef.current.scrollTop = comentariosRef.current.scrollHeight;
    }
  }, [solicitud?.comentarios]);

  const handleCambiarEstado = async () => {
    if (!cambioEstado) return;
    if (cambioEstado === 'rechazada' && motivoRechazo.trim().length < 5) {
      notifyError('El motivo de rechazo debe tener al menos 5 caracteres'); return;
    }
    setAccionando(true);
    try {
      await solicitudesService.cambiarEstado(id, cambioEstado, motivoRechazo || undefined);
      success(`Solicitud marcada como ${cambioEstado}`);
      setCambioEstado(''); setMotivoRechazo('');
      fetchSolicitud();
    } catch (err) {
      notifyError(err.message || 'Error al cambiar estado');
    } finally { setAccionando(false); }
  };

  const handleVincular = async () => {
    if (!operacionIdVincular) return;
    setAccionando(true);
    try {
      await solicitudesService.vincular(id, Number(operacionIdVincular));
      success('Operación vinculada correctamente');
      setOperacionIdVincular('');
      fetchSolicitud();
    } catch (err) {
      notifyError(err.message || 'Error al vincular operación');
    } finally { setAccionando(false); }
  };

  const handleEnviarComentario = async () => {
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await solicitudesService.agregarComentario(id, comentario.trim(), esInterno);
      setComentario(''); setEsInterno(false);
      fetchSolicitud();
    } catch (err) {
      notifyError(err.message || 'Error al enviar comentario');
    } finally { setEnviandoComentario(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-64 text-slate-400">Cargando...</div>;
  if (!solicitud) return <div className="p-6 text-slate-500">Solicitud no encontrada</div>;

  const estadoConf = ESTADO_CONFIG[solicitud.estado] || ESTADO_CONFIG.recibida;
  const esFinal = ['completada', 'rechazada'].includes(solicitud.estado);
  const puedeGestionar = isSupervisorOrAbove();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{solicitud.numero_solicitud}</h1>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${estadoConf.color}`}>{estadoConf.label}</span>
              {solicitud.prioridad === 'urgente' && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgente</span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {solicitud.tipo === 'ingreso' ? 'Aviso de Ingreso' : 'Solicitud de Despacho'} · {solicitud.cliente?.razon_social}
            </p>
          </div>
          {solicitud.operacion && (
            <button onClick={() => navigate(`/operaciones/${solicitud.tipo === 'ingreso' ? 'entradas' : 'salidas'}/${solicitud.operacion_id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <ExternalLink className="w-4 h-4" /> {solicitud.operacion.numero_operacion}
            </button>
          )}
        </div>

        {/* Datos generales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Fecha estimada', value: solicitud.fecha_estimada ? new Date(solicitud.fecha_estimada + 'T00:00:00').toLocaleDateString('es-CO') : '—' },
            { label: 'N° Documento', value: solicitud.numero_documento || '—' },
            solicitud.tipo === 'ingreso'
              ? { label: 'Transportista', value: solicitud.transportista || '—' }
              : { label: 'Dirección entrega', value: solicitud.direccion_entrega || '—' },
            solicitud.tipo === 'despacho'
              ? { label: 'Contacto destino', value: solicitud.contacto_destino || '—' }
              : { label: 'Creado por', value: solicitud.creador ? `${solicitud.creador.nombre} ${solicitud.creador.apellido}` : '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{item.label}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{item.value}</p>
            </div>
          ))}
        </div>

        {solicitud.notas && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-centhrix-surface rounded-xl text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Notas: </span>{solicitud.notas}
          </div>
        )}

        {solicitud.documento_url && (
          <div className="mt-3">
            <a href={solicitud.documento_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700">
              <Paperclip className="w-4 h-4" /> Ver documento adjunto
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: detalles + acciones ISTHO */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabla de líneas */}
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Productos solicitados</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  {['Referencia', 'Descripción', 'Cantidad', 'Unidad'].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {(solicitud.detalles || []).map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 pr-4 text-sm font-mono text-slate-700 dark:text-slate-200">{d.referencia}</td>
                    <td className="py-2.5 pr-4 text-sm text-slate-600 dark:text-slate-300">{d.descripcion || '—'}</td>
                    <td className="py-2.5 pr-4 text-sm text-slate-700 dark:text-slate-200">{Number(d.cantidad).toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-sm text-slate-500 dark:text-slate-400 capitalize">{d.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Acciones ISTHO */}
          {puedeGestionar && !esFinal && (
            <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Acciones ISTHO</h3>

              {/* Cambiar estado */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Cambiar estado</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FilterDropdown
                      options={[
                        { value: '', label: 'Seleccionar estado...' },
                        { value: 'en_proceso', label: 'En Proceso' },
                        { value: 'completada', label: 'Completada' },
                        { value: 'rechazada', label: 'Rechazada' },
                      ]}
                      value={cambioEstado}
                      onChange={setCambioEstado}
                    />
                  </div>
                  <button onClick={handleCambiarEstado} disabled={!cambioEstado || accionando}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors">
                    Aplicar
                  </button>
                </div>
                {cambioEstado === 'rechazada' && (
                  <textarea value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)}
                    placeholder="Motivo del rechazo (requerido)..." rows={2}
                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200 resize-none" />
                )}
              </div>

              {/* Vincular operación */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  <Link2 className="inline w-3.5 h-3.5 mr-1" />
                  Vincular a operación existente
                </label>
                <div className="flex gap-2">
                  <input value={operacionIdVincular} onChange={(e) => setOperacionIdVincular(e.target.value)}
                    placeholder="ID de la operación..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200" />
                  <button onClick={handleVincular} disabled={!operacionIdVincular || accionando}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors">
                    Vincular
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: comentarios */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col" style={{ maxHeight: '600px' }}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comentarios</h3>
          </div>

          {/* Lista de comentarios */}
          <div ref={comentariosRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {(solicitud.comentarios || []).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">Sin comentarios aún</p>
            ) : (
              (solicitud.comentarios || []).map((c) => {
                const esMio = c.usuario_id === user?.id;
                return (
                  <div key={c.id} className={`flex gap-2 ${esMio ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                      {(c.autor?.nombre || '?')[0].toUpperCase()}
                    </div>
                    <div className={`flex-1 ${esMio ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
                        esMio
                          ? 'bg-orange-500 text-white'
                          : c.es_interno
                          ? 'bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-600'
                          : 'bg-slate-100 dark:bg-centhrix-surface text-slate-700 dark:text-slate-200'
                      }`}>
                        {c.es_interno && <div className="flex items-center gap-1 text-xs opacity-60 mb-1"><Lock className="w-3 h-3" /> Solo ISTHO</div>}
                        {c.mensaje}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 px-1">
                        {c.autor?.nombre} · {new Date(c.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input comentario */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-700">
            {!isCliente() && (
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 cursor-pointer">
                <input type="checkbox" checked={esInterno} onChange={(e) => setEsInterno(e.target.checked)} className="rounded" />
                <Lock className="w-3 h-3" /> Comentario interno (solo ISTHO)
              </label>
            )}
            <div className="flex gap-2">
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviarComentario(); } }}
                placeholder="Escribe un comentario..." rows={2}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200 resize-none" />
              <button onClick={handleEnviarComentario} disabled={!comentario.trim() || enviandoComentario}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitudDetail;
