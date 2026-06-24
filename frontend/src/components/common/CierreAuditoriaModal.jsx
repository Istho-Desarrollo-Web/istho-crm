/**
 * ISTHO CRM - Modal de Cierre de Auditoría con Selección de Plantilla
 *
 * Permite al usuario seleccionar qué plantilla de email usar antes de cerrar
 * una auditoría. Muestra la plantilla predeterminada por defecto.
 *
 * @author Coordinación TI ISTHO
 */

import { useState, useEffect } from 'react';
import { Mail, CheckCircle2, FileText, Star, Loader2, X, ChevronDown, Users, Paperclip, AlertTriangle } from 'lucide-react';
import plantillasEmailService from '../../api/plantillasEmail.service';
import auditoriasService from '../../api/auditorias.service';

const CierreAuditoriaModal = ({
  isOpen,
  onClose,
  onConfirm,
  tipoAuditoria = 'ingreso', // 'ingreso' | 'salida' | 'kardex'
  closing = false,
  colorScheme = 'emerald', // 'emerald' | 'blue' | 'purple'
  auditoriaId = null,
}) => {
  const [plantillas, setPlantillas] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [enviarCorreo, setEnviarCorreo] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [destinatarios, setDestinatarios] = useState([]);
  const [loadingDestinatarios, setLoadingDestinatarios] = useState(false);
  const [adjuntosInfo, setAdjuntosInfo] = useState(null);
  const [loadingAdjuntos, setLoadingAdjuntos] = useState(false);

  const colors = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-300',
      icon: 'text-emerald-500',
      btn: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30',
      selected: 'ring-emerald-500 bg-emerald-50 dark:bg-emerald-900/30',
      badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-700 dark:text-blue-300',
      icon: 'text-blue-500',
      btn: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/30',
      selected: 'ring-blue-500 bg-blue-50 dark:bg-blue-900/30',
      badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-700 dark:text-purple-300',
      icon: 'text-purple-500',
      btn: 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/30',
      selected: 'ring-purple-500 bg-purple-50 dark:bg-purple-900/30',
      badge: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
    },
  };

  const c = colors[colorScheme] || colors.emerald;

  const tipoLabels = {
    ingreso: 'Entrada',
    salida: 'Salida',
    kardex: 'Kardex',
  };

  // Cargar plantillas al abrir
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);

    plantillasEmailService
      .getAll({ tipo: 'operacion_cierre', activo: true })
      .then((res) => {
        const data = res?.data || res || [];
        const lista = Array.isArray(data) ? data : data.data || [];

        // Filtrar: primero las del subtipo actual, luego las genéricas
        const relevantes = lista.filter((p) => p.subtipo === tipoAuditoria || !p.subtipo);
        // Agregar también las de otros subtipos por si quieren usar otra
        const otras = lista.filter((p) => p.subtipo && p.subtipo !== tipoAuditoria);

        const todas = [...relevantes, ...otras];
        setPlantillas(todas);

        // Seleccionar la predeterminada del subtipo actual
        const predeterminada =
          relevantes.find((p) => p.es_predeterminada && p.subtipo === tipoAuditoria) ||
          relevantes.find((p) => p.es_predeterminada) ||
          relevantes[0];

        if (predeterminada) {
          setSelectedId(predeterminada.id);
        }
      })
      .catch(() => {
        setPlantillas([]);
      })
      .finally(() => setLoading(false));
  }, [isOpen, tipoAuditoria]);

  // Cargar destinatarios y adjuntos estimados al abrir (si hay auditoriaId)
  useEffect(() => {
    if (!isOpen || !auditoriaId) return;

    setLoadingDestinatarios(true);
    auditoriasService
      .getDestinatarios(auditoriaId)
      .then((res) => {
        const data = res?.data || res || [];
        setDestinatarios(Array.isArray(data) ? data : []);
      })
      .catch(() => setDestinatarios([]))
      .finally(() => setLoadingDestinatarios(false));

    setLoadingAdjuntos(true);
    auditoriasService
      .getAdjuntosCorreo(auditoriaId)
      .then((res) => {
        const data = res?.data || res || {};
        setAdjuntosInfo(data);
      })
      .catch(() => setAdjuntosInfo(null))
      .finally(() => setLoadingAdjuntos(false));
  }, [isOpen, auditoriaId]);

  // Reset al cerrar
  useEffect(() => {
    if (!isOpen) {
      setShowDropdown(false);
      setDestinatarios([]);
      setAdjuntosInfo(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedPlantilla = plantillas.find((p) => p.id === selectedId);

  const handleConfirm = () => {
    onConfirm({
      enviar_correo: enviarCorreo,
      plantilla_id: enviarCorreo ? selectedId : null,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!closing ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl animate-fadeIn flex flex-col max-h-[90vh]">
        {/* Header */}
        <div
          className={`flex items-center gap-3 p-5 border-b border-gray-100 dark:border-slate-700`}
        >
          <div className={`p-2.5 rounded-xl ${c.bg}`}>
            <CheckCircle2 className={`w-6 h-6 ${c.icon}`} />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Completar Operación
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {tipoLabels[tipoAuditoria] || 'Operación'} - Confirmar cierre y envío de correo
            </p>
          </div>
          {!closing && (
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-lg transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Toggle enviar correo */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={enviarCorreo}
                onChange={(e) => setEnviarCorreo(e.target.checked)}
                className="sr-only peer"
              />
              <div
                className={`w-11 h-6 bg-slate-200 dark:bg-centhrix-surface rounded-full peer peer-checked:bg-emerald-500 transition-colors`}
              />
              <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-5" />
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Enviar correo de notificación
              </span>
            </div>
          </label>

          {/* Selector de plantilla (solo si enviarCorreo) */}
          {enviarCorreo && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Plantilla de email
              </label>

              {loading ? (
                <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-centhrix-surface/50 rounded-xl">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                  <span className="text-sm text-slate-500">Cargando plantillas...</span>
                </div>
              ) : plantillas.length === 0 ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                  No hay plantillas configuradas. Se usará la plantilla por defecto del sistema.
                </div>
              ) : (
                <div className="relative">
                  {/* Selected display */}
                  <button
                    type="button"
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={`w-full flex items-center justify-between gap-2 p-3 rounded-xl border transition-all ${
                      showDropdown
                        ? `ring-2 ${c.selected} ${c.border}`
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                    } bg-white dark:bg-centhrix-surface`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className={`w-4 h-4 flex-shrink-0 ${c.icon}`} />
                      <div className="text-left min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                          {selectedPlantilla?.nombre || 'Seleccionar plantilla'}
                        </p>
                        {selectedPlantilla?.asunto_template && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {selectedPlantilla.asunto_template}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {selectedPlantilla?.es_predeterminada && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.badge}`}
                        >
                          <Star className="w-3 h-3" />
                          Por defecto
                        </span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {/* Dropdown */}
                  {showDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-centhrix-surface rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 z-10 max-h-60 overflow-y-auto">
                      {plantillas.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedId(p.id);
                            setShowDropdown(false);
                          }}
                          className={`w-full flex items-center gap-2.5 p-3 text-left transition-colors ${
                            p.id === selectedId
                              ? `${c.bg} ${c.text}`
                              : 'hover:bg-slate-50 dark:hover:bg-centhrix-card/50'
                          } ${p.id !== plantillas[plantillas.length - 1].id ? 'border-b border-slate-100 dark:border-slate-600' : ''}`}
                        >
                          <FileText
                            className={`w-4 h-4 flex-shrink-0 ${p.id === selectedId ? c.icon : 'text-slate-400'}`}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium truncate">{p.nombre}</span>
                              {p.es_predeterminada && (
                                <Star
                                  className={`w-3 h-3 flex-shrink-0 ${p.id === selectedId ? c.icon : 'text-amber-400'}`}
                                />
                              )}
                            </div>
                            {p.subtipo && (
                              <span className="text-xs text-slate-400 dark:text-slate-500 capitalize">
                                {p.subtipo === 'ingreso'
                                  ? 'Entrada'
                                  : p.subtipo === 'salida'
                                    ? 'Salida'
                                    : p.subtipo === 'kardex'
                                      ? 'Kardex'
                                      : p.subtipo}
                              </span>
                            )}
                          </div>
                          {p.id === selectedId && (
                            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${c.icon}`} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Destinatarios del correo */}
          {enviarCorreo && auditoriaId && (
            <div className={`rounded-xl border ${c.border} ${c.bg}`}>
              <div className={`flex items-center gap-2 px-3 pt-3 pb-2`}>
                <Users className={`w-4 h-4 flex-shrink-0 ${c.icon}`} />
                <span className={`text-xs font-semibold uppercase tracking-wider ${c.text}`}>
                  Recibirán este correo
                </span>
              </div>
              {loadingDestinatarios ? (
                <div className="flex items-center gap-2 px-3 pb-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-500">Consultando contactos...</span>
                </div>
              ) : destinatarios.length === 0 ? (
                <p className="px-3 pb-3 text-xs text-slate-500 dark:text-slate-400">
                  Ningún contacto configurado recibirá el correo.
                </p>
              ) : (
                <ul className="px-3 pb-3 space-y-1.5">
                  {destinatarios.map((d, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-white dark:bg-centhrix-surface flex items-center justify-center flex-shrink-0 shadow-sm">
                        <span className={`text-xs font-bold ${c.text}`}>
                          {d.nombre?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                          {d.nombre}
                          {d.cargo ? ` · ${d.cargo}` : ''}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {d.email}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Indicador de adjuntos del correo */}
          {enviarCorreo && auditoriaId && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-centhrix-surface">
              <div className="flex items-center gap-2 px-3 pt-3 pb-2">
                <Paperclip className="w-4 h-4 flex-shrink-0 text-slate-400" />
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Archivos adjuntos al correo
                </span>
              </div>
              {loadingAdjuntos ? (
                <div className="flex items-center gap-2 px-3 pb-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span className="text-xs text-slate-500">Calculando adjuntos...</span>
                </div>
              ) : !adjuntosInfo || adjuntosInfo.total_archivos === 0 ? (
                <p className="px-3 pb-3 text-xs text-slate-400 dark:text-slate-500">
                  Sin archivos adjuntos para esta operación.
                </p>
              ) : (
                <div className="px-3 pb-3 space-y-2">
                  {/* Fila: conteo y peso */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      {adjuntosInfo.desglose?.documentos > 0 && (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{adjuntosInfo.desglose.documentos}</span>{' '}
                          {adjuntosInfo.desglose.documentos === 1 ? 'documento' : 'documentos'}
                        </span>
                      )}
                      {adjuntosInfo.desglose?.fotos_averias > 0 && (
                        <span className="text-xs text-slate-600 dark:text-slate-300">
                          <span className="font-semibold">{adjuntosInfo.desglose.fotos_averias}</span>{' '}
                          {adjuntosInfo.desglose.fotos_averias === 1 ? 'foto de avería' : 'fotos de averías'}
                        </span>
                      )}
                    </div>
                    {/* Badge de peso estimado */}
                    {adjuntosInfo.tamanio_estimado_bytes > 0 && (() => {
                      const mb = adjuntosInfo.tamanio_estimado_bytes / (1024 * 1024);
                      const color =
                        mb >= 14 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                        : mb >= 10 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300';
                      return (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${color}`}>
                          ≈ {mb.toFixed(1)} MB / 15 MB
                        </span>
                      );
                    })()}
                  </div>
                  {/* Advertencia de archivos omitidos */}
                  {adjuntosInfo.excede_limite && (
                    <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        {adjuntosInfo.archivos_omitidos}{' '}
                        {adjuntosInfo.archivos_omitidos === 1
                          ? 'archivo no se adjuntará'
                          : 'archivos no se adjuntarán'}{' '}
                        por superar el límite de 15 MB del correo.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Warning message */}
          <div className="p-3 bg-slate-50 dark:bg-centhrix-surface/50 rounded-xl">
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Una vez completada la operación, no podrá realizar más cambios.
              {enviarCorreo &&
                ' Se enviará el correo de notificación a los contactos configurados del cliente.'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-centhrix-card/50 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={closing}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors"
          >
            Seguir revisando
          </button>
          <button
            onClick={handleConfirm}
            disabled={closing}
            className={`px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-300 flex items-center gap-2 shadow-lg ${c.btn} ${
              closing ? 'opacity-75 cursor-wait' : ''
            }`}
          >
            {closing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {closing ? 'Cerrando...' : 'Sí, cerrar ahora'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CierreAuditoriaModal;
