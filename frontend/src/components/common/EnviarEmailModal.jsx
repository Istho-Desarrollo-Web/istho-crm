/**
 * ISTHO CRM - Modal de Envío Manual de Email
 *
 * Permite a admin y supervisor componer y enviar emails ad-hoc
 * usando una plantilla existente o en formato libre.
 *
 * @author Coordinación TI ISTHO
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Mail, Send, FileText, PenLine } from 'lucide-react';
import Button from './Button/Button';
import useNotification from '../../hooks/useNotification';
import emailManualService from '../../api/emailManual.service';
import plantillasEmailService from '../../api/plantillasEmail.service';

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseEmails = (str) =>
  str
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean);

const validarEmails = (str) => {
  const emails = parseEmails(str);
  if (!emails.length) return false;
  return emails.every((e) => REGEX_EMAIL.test(e));
};

const CAMPOS_POR_TIPO = {
  general: [
    { key: 'titulo', label: 'Título del mensaje', placeholder: 'Ej: Actualización importante' },
    { key: 'mensaje', label: 'Mensaje', placeholder: 'Escribe el contenido del email...', multiline: true },
    { key: 'urlAccion', label: 'URL de acción (opcional)', placeholder: 'https://...' },
    { key: 'labelAccion', label: 'Texto del botón (opcional)', placeholder: 'Ej: Ver detalles' },
  ],
};

const EnviarEmailModal = ({ isOpen, onClose }) => {
  const [modo, setModo] = useState('plantilla');
  const [plantillas, setPlantillas] = useState([]);
  const [plantillaId, setPlantillaId] = useState('');
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [para, setPara] = useState('');
  const [cc, setCc] = useState('');
  const [asunto, setAsunto] = useState('');
  const [cuerpo, setCuerpo] = useState('');
  const [variables, setVariables] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const { success, error } = useNotification();

  const cargarPlantillas = useCallback(async () => {
    setLoadingPlantillas(true);
    try {
      const resp = await plantillasEmailService.getAll();
      if (resp?.success) {
        setPlantillas((resp.data || []).filter((p) => p.activo && p.tipo === 'general'));
      }
    } catch (_) {
      // silencioso — si no carga, el modo libre sigue disponible
    } finally {
      setLoadingPlantillas(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      cargarPlantillas();
    } else {
      setModo('plantilla');
      setPlantillaId('');
      setPlantillaSeleccionada(null);
      setPara('');
      setCc('');
      setAsunto('');
      setCuerpo('');
      setVariables({});
    }
  }, [isOpen, cargarPlantillas]);

  const handlePlantillaChange = (id) => {
    setPlantillaId(id);
    const p = plantillas.find((p) => String(p.id) === String(id));
    setPlantillaSeleccionada(p || null);
    setVariables({});
  };

  const camposPlantilla = plantillaSeleccionada
    ? CAMPOS_POR_TIPO[plantillaSeleccionada.tipo] || []
    : [];

  const handleSend = async () => {
    if (!validarEmails(para)) {
      error('Ingresa al menos un email válido en el campo "Para"');
      return;
    }
    if (cc && !validarEmails(cc)) {
      error('Uno o más emails en CC no son válidos');
      return;
    }

    const payload = {
      para: parseEmails(para),
      cc: cc ? parseEmails(cc) : [],
    };

    if (modo === 'plantilla') {
      if (!plantillaId) {
        error('Selecciona una plantilla o cambia al modo libre');
        return;
      }
      payload.plantilla_id = Number(plantillaId);
      payload.variables = variables;
    } else {
      if (!asunto.trim()) {
        error('El asunto es obligatorio');
        return;
      }
      if (!cuerpo.trim()) {
        error('El cuerpo del email es obligatorio');
        return;
      }
      payload.asunto = asunto.trim();
      payload.cuerpo_html = cuerpo.trim();
    }

    setLoading(true);
    try {
      const resp = await emailManualService.enviar(payload);
      if (resp?.success !== false) {
        success('Email enviado correctamente');
        onClose();
      } else {
        error(resp?.message || 'Error al enviar el email');
      }
    } catch (err) {
      error(err?.response?.data?.message || 'Error al enviar el email');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <Mail className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Componer Email</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Envía un email desde el sistema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs de modo */}
        <div className="flex gap-1 p-4 pb-0 shrink-0">
          <button
            onClick={() => setModo('plantilla')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              modo === 'plantilla'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-centhrix-surface'
            }`}
          >
            <FileText className="w-4 h-4" />
            Con Plantilla
          </button>
          <button
            onClick={() => setModo('libre')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              modo === 'libre'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-centhrix-surface'
            }`}
          >
            <PenLine className="w-4 h-4" />
            Libre
          </button>
        </div>

        {/* Formulario */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Destinatarios */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Para <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={para}
              onChange={(e) => setPara(e.target.value)}
              placeholder="email1@ejemplo.com, email2@ejemplo.com"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              CC{' '}
              <span className="text-slate-400 dark:text-slate-500 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={cc}
              onChange={(e) => setCc(e.target.value)}
              placeholder="cc@ejemplo.com"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          {/* Modo Plantilla */}
          {modo === 'plantilla' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Plantilla <span className="text-red-500">*</span>
                </label>
                {loadingPlantillas ? (
                  <div className="h-10 bg-slate-100 dark:bg-centhrix-surface rounded-xl animate-pulse" />
                ) : (
                  <select
                    value={plantillaId}
                    onChange={(e) => handlePlantillaChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">— Selecciona una plantilla —</option>
                    {plantillas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} ({p.tipo})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {camposPlantilla.map((campo) => (
                <div key={campo.key}>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    {campo.label}
                  </label>
                  {campo.multiline ? (
                    <textarea
                      rows={4}
                      value={variables[campo.key] || ''}
                      onChange={(e) =>
                        setVariables((v) => ({ ...v, [campo.key]: e.target.value }))
                      }
                      placeholder={campo.placeholder}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                    />
                  ) : (
                    <input
                      type="text"
                      value={variables[campo.key] || ''}
                      onChange={(e) =>
                        setVariables((v) => ({ ...v, [campo.key]: e.target.value }))
                      }
                      placeholder={campo.placeholder}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  )}
                </div>
              ))}

              {plantillaSeleccionada && camposPlantilla.length === 0 && (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-centhrix-surface rounded-xl p-3">
                  Esta plantilla usa variables del sistema (datos de operaciones, usuarios, etc.)
                  que se llenan automáticamente. Solo selecciona el destinatario y envía.
                </p>
              )}
            </>
          )}

          {/* Modo Libre */}
          {modo === 'libre' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Asunto <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Asunto del email"
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Cuerpo <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={6}
                  value={cuerpo}
                  onChange={(e) => setCuerpo(e.target.value)}
                  placeholder="Escribe el contenido del email. Puedes usar HTML básico."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none font-mono"
                />
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Acepta HTML básico: &lt;b&gt;, &lt;a&gt;, &lt;p&gt;, &lt;br&gt;, etc.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100 dark:border-slate-700 shrink-0">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Send}
            onClick={handleSend}
            loading={loading}
          >
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnviarEmailModal;
