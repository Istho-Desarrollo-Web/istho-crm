// frontend/src/pages/Solicitudes/SolicitudDetail.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Link2, Lock, Send, Paperclip, ExternalLink,
  X, Download, FileText, ChevronDown, Search, Loader2,
} from 'lucide-react';
import apiClient from '../../api/client';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';

const ESTADO_CONFIG = {
  recibida:   { label: 'Recibida',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  en_proceso: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completada: { label: 'Completada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rechazada:  { label: 'Rechazada',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

// ── Detectar tipo de archivo por extensión o mime ──────────────────────────
const detectarTipoArchivo = (url, nombre) => {
  const fuente = nombre || url || '';
  const ext = fuente.split('?')[0].split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'imagen';
  return 'otro';
};

// ── Descarga directa usando URL presignada con ResponseContentDisposition: attachment ──
const descargarArchivo = (downloadUrl) => {
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.click();
};

// ── Modal de vista previa de documento ────────────────────────────────────
const DocumentoPreviewModal = ({ url, downloadUrl, nombre, onClose }) => {
  const tipo = detectarTipoArchivo(url, nombre);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{nombre || 'Documento adjunto'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => descargarArchivo(downloadUrl || url)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-centhrix-surface rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Descargar
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-centhrix-surface transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-auto min-h-0">
          {tipo === 'pdf' && (
            <iframe
              src={url}
              title={nombre}
              className="w-full h-full min-h-[70vh]"
              style={{ border: 'none' }}
            />
          )}
          {tipo === 'imagen' && (
            <div className="flex items-center justify-center p-4 h-full min-h-[50vh] bg-slate-50 dark:bg-centhrix-bg">
              <img
                src={url}
                alt={nombre}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow"
              />
            </div>
          )}
          {tipo === 'otro' && (
            <div className="flex flex-col items-center justify-center gap-4 p-12 min-h-[30vh]">
              <FileText className="w-12 h-12 text-slate-300 dark:text-slate-600" />
              <p className="text-sm text-slate-500 dark:text-slate-400">Vista previa no disponible para este tipo de archivo.</p>
              <button
                onClick={() => descargarArchivo(downloadUrl || url)}
                className="px-4 py-2 text-sm font-medium text-white bg-[#E74C3C] hover:bg-[#C0392B] rounded-xl transition-colors"
              >
                Descargar archivo
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Selector de operación con búsqueda ────────────────────────────────────
const OperacionSelector = ({ clienteId, tipoSolicitud, value, onChange, disabled }) => {
  const [opciones, setOpciones] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [abierto, setAbierto] = useState(false);
  const ref = useRef(null);

  // Despacho → salida (PK), Ingreso → ingreso (CO)
  const tipoOp = tipoSolicitud === 'despacho' ? 'salida' : 'ingreso';
  const etiquetaTipo = tipoSolicitud === 'despacho' ? 'PK (picking)' : 'CO (recibo)';

  useEffect(() => {
    if (!clienteId) return;
    setCargando(true);
    apiClient
      .get('/operaciones', { params: { tipo: tipoOp, cliente_id: clienteId, limit: 200 } })
      .then((res) => {
        const rows = Array.isArray(res.data) ? res.data : (res.data?.rows || []);
        setOpciones(rows);
      })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, [clienteId, tipoOp]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtradas = opciones.filter((op) => {
    const q = busqueda.toLowerCase();
    return (
      op.numero_operacion?.toLowerCase().includes(q) ||
      op.numero_documento?.toLowerCase().includes(q) ||
      op.documento_wms?.toLowerCase().includes(q)
    );
  });

  const seleccionada = opciones.find((op) => String(op.id) === String(value));

  const handleSeleccionar = (op) => {
    onChange(String(op.id));
    setAbierto(false);
    setBusqueda('');
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled || cargando}
        onClick={() => setAbierto((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200 hover:border-gray-300 dark:hover:border-slate-600 transition-colors disabled:opacity-60"
      >
        <span className="truncate">
          {cargando ? (
            <span className="flex items-center gap-1.5 text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cargando operaciones...</span>
          ) : seleccionada ? (
            <span className="font-mono">{seleccionada.numero_operacion} — {seleccionada.numero_documento || seleccionada.documento_wms || 'sin doc'}</span>
          ) : (
            <span className="text-slate-400">Buscar operación {etiquetaTipo}...</span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${abierto ? 'rotate-180' : ''}`} />
      </button>

      {abierto && (
        <div className="absolute z-30 mt-1 w-full bg-white dark:bg-centhrix-card border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg overflow-hidden">
          {/* Búsqueda */}
          <div className="p-2 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 px-2">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                autoFocus
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="N° operación o documento..."
                className="flex-1 text-sm bg-transparent text-slate-700 dark:text-slate-200 placeholder-slate-400 outline-none"
              />
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-52 overflow-y-auto">
            {filtradas.length === 0 ? (
              <p className="px-3 py-4 text-xs text-slate-400 dark:text-slate-500 text-center">
                {opciones.length === 0 ? `Sin operaciones ${etiquetaTipo} para este cliente` : 'Sin resultados'}
              </p>
            ) : (
              filtradas.map((op) => (
                <button
                  key={op.id}
                  type="button"
                  onClick={() => handleSeleccionar(op)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-centhrix-surface text-left transition-colors"
                >
                  <span className="font-mono text-slate-700 dark:text-slate-200">{op.numero_operacion}</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 truncate ml-2">
                    {op.numero_documento || op.documento_wms || '—'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ── Componente principal ───────────────────────────────────────────────────
const SolicitudDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isCliente, isSupervisorOrAbove } = useAuth();
  const { success, error: notifyError } = useNotification();
  const { on, off } = useSocket();

  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [esInterno, setEsInterno] = useState(false);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [cambioEstado, setCambioEstado] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [operacionIdVincular, setOperacionIdVincular] = useState('');
  const [accionando, setAccionando] = useState(false);
  const [docPreview, setDocPreview] = useState(null); // { url, nombre }
  const comentariosRef = useRef(null);

  const fetchSolicitud = useCallback(async () => {
    setLoading(true);
    try {
      const res = await solicitudesService.getById(id);
      setSolicitud(res.data);
    } catch {
      notifyError('Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchSolicitud(); }, [fetchSolicitud]);

  useEffect(() => {
    if (comentariosRef.current) {
      comentariosRef.current.scrollTop = comentariosRef.current.scrollHeight;
    }
  }, [solicitud?.comentarios]);

  // Tiempo real: escuchar comentarios y cambios de estado de esta solicitud
  useEffect(() => {
    const numId = Number(id);

    const onComentario = ({ solicitud_id, comentario }) => {
      if (solicitud_id !== numId) return;
      setSolicitud((prev) => prev ? { ...prev, comentarios: [...(prev.comentarios || []), comentario] } : prev);
    };

    const onEstado = ({ solicitud_id, estado }) => {
      if (solicitud_id !== numId) return;
      setSolicitud((prev) => prev ? { ...prev, estado } : prev);
    };

    on('solicitud:comentario_nuevo', onComentario);
    on('solicitud:estado_cambio', onEstado);
    return () => {
      off('solicitud:comentario_nuevo', onComentario);
      off('solicitud:estado_cambio', onEstado);
    };
  }, [id, on, off]);

  const handleCambiarEstado = async () => {
    if (!cambioEstado) return;
    if (cambioEstado === 'rechazada' && motivoRechazo.trim().length < 5) {
      notifyError('El motivo de rechazo debe tener al menos 5 caracteres'); return;
    }
    setAccionando(true);
    try {
      await solicitudesService.cambiarEstado(id, cambioEstado, motivoRechazo || undefined);
      success(`Solicitud marcada como ${ESTADO_CONFIG[cambioEstado]?.label || cambioEstado}`);
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

  // Todos los documentos unificados
  const todosLosDocs = [
    ...(solicitud.documentos || []).map((d) => ({ url: d.url, downloadUrl: d.download_url || d.url, nombre: d.nombre_original })),
    ...(!(solicitud.documentos?.length) && solicitud.documento_url
      ? [{ url: solicitud.documento_url, downloadUrl: solicitud.documento_url, nombre: 'Documento adjunto' }]
      : []),
  ];

  return (
    <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-6 mb-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-lg sm:text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{solicitud.numero_solicitud}</h1>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${estadoConf.color}`}>{estadoConf.label}</span>
              {solicitud.prioridad === 'urgente' && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgente</span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {solicitud.tipo === 'ingreso' ? 'Aviso de Ingreso' : 'Solicitud de Despacho'} · {solicitud.cliente?.razon_social}
            </p>
          </div>
          {solicitud.operacion && (
            <button onClick={() => navigate(`/operaciones/${solicitud.tipo === 'ingreso' ? 'entradas' : 'salidas'}/${solicitud.operacion_id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shrink-0">
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

        {/* Documentos adjuntos — con vista previa */}
        {todosLosDocs.length > 0 && (
          <div className="mt-3 space-y-1">
            {todosLosDocs.map((d, i) => (
              <button
                key={i}
                onClick={() => setDocPreview({ url: d.url, downloadUrl: d.downloadUrl, nombre: d.nombre })}
                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 transition-colors max-w-full"
              >
                <Paperclip className="w-4 h-4 shrink-0" />
                <span className="truncate min-w-0">{d.nombre}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: detalles + acciones ISTHO */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabla de líneas */}
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Productos solicitados</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px]">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500">Referencia</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500 hidden sm:table-cell">Descripción</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500">Cantidad</th>
                    <th className="pb-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500">Unidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {(solicitud.detalles || []).map((d) => (
                    <tr key={d.id}>
                      <td className="py-2.5 pr-4 text-sm font-mono text-slate-700 dark:text-slate-200">
                        {d.referencia}
                        {d.descripcion && <div className="sm:hidden text-xs text-slate-400 font-sans mt-0.5 truncate max-w-[140px]">{d.descripcion}</div>}
                      </td>
                      <td className="py-2.5 pr-4 text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">{d.descripcion || '—'}</td>
                      <td className="py-2.5 pr-4 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">{Number(d.cantidad).toLocaleString('es-CO')}</td>
                      <td className="py-2.5 text-sm text-slate-500 dark:text-slate-400 capitalize">{d.unidad}</td>
                    </tr>
                  ))}
                </tbody>
                {(solicitud.detalles?.length > 1) && (
                  <tfoot>
                    <tr className="border-t border-gray-200 dark:border-slate-600">
                      <td className="pt-2.5 pr-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase hidden sm:table-cell" />
                      <td className="pt-2.5 pr-4 text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase hidden sm:table-cell">Total</td>
                      <td className="pt-2.5 pr-4 text-sm font-semibold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                        {(solicitud.detalles || []).reduce((acc, d) => acc + Number(d.cantidad), 0).toLocaleString('es-CO')}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Acciones ISTHO */}
          {puedeGestionar && !esFinal && (
            <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 sm:p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Acciones ISTHO</h3>

              {/* Cambiar estado */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Cambiar estado</label>
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[160px]">
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
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap">
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
                  <span className="ml-1 text-slate-400 font-normal">
                    ({solicitud.tipo === 'despacho' ? 'PK — picking' : 'CO — recibo'})
                  </span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <div className="flex-1 min-w-[160px]">
                    <OperacionSelector
                      clienteId={solicitud.cliente_id}
                      tipoSolicitud={solicitud.tipo}
                      value={operacionIdVincular}
                      onChange={setOperacionIdVincular}
                      disabled={accionando}
                    />
                  </div>
                  <button onClick={handleVincular} disabled={!operacionIdVincular || accionando}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors whitespace-nowrap">
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
                      {(c.autor?.nombre || c.autor?.nombre_completo || c.autor?.username || '?')[0].toUpperCase()}
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
                        {c.autor?.nombre || c.autor?.nombre_completo || c.autor?.username || ''} · {c.createdAt ? new Date(c.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : ''}
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

      {/* Modal de vista previa */}
      {docPreview && (
        <DocumentoPreviewModal
          url={docPreview.url}
          downloadUrl={docPreview.downloadUrl}
          nombre={docPreview.nombre}
          onClose={() => setDocPreview(null)}
        />
      )}
    </main>
  );
};

export default SolicitudDetail;
