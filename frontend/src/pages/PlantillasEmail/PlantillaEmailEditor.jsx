/**
 * ============================================================================
 * ISTHO CRM - Editor de Plantilla de Email
 * ============================================================================
 * Editor con inserción de variables, vista previa y configuración de firma.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Eye,
  Code,
  Star,
  Mail,
  Plus,
  Copy,
  Check,
  ToggleLeft,
  ToggleRight,
  Upload,
  Image,
  Loader2,
} from 'lucide-react';

import { Button } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import plantillasEmailService from '../../api/plantillasEmail.service';

const TIPO_OPTIONS = [
  { value: 'operacion_cierre', label: 'Cierre de Operación' },
  { value: 'alerta_inventario', label: 'Alerta de Inventario' },
  { value: 'bienvenida', label: 'Bienvenida' },
  { value: 'general', label: 'General' },
];

const SUBTIPO_OPTIONS = {
  operacion_cierre: [
    { value: '', label: 'Genérica (ambas)' },
    { value: 'ingreso', label: 'Entrada de Inventario' },
    { value: 'salida', label: 'Salida con Picking' },
  ],
};

const VariableChip = ({ variable, label, ejemplo, onInsert }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = () => {
    onInsert(`{{${variable}}}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleClick}
      className="group flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700/50 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-slate-200 dark:border-slate-600 hover:border-orange-300 dark:hover:border-orange-700 rounded-lg transition-colors text-left"
      title={`Ejemplo: ${ejemplo}`}
    >
      <Code className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-orange-500" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{label}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono truncate">{`{{${variable}}}`}</p>
      </div>
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-500" />
      ) : (
        <Copy className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-orange-400" />
      )}
    </button>
  );
};

const PlantillaEmailEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { success, error: notifyError } = useNotification();
  const editorRef = useRef(null);
  const asuntoRef = useRef(null);
  const activeFieldRef = useRef('cuerpo_html'); // 'asunto_template' | 'cuerpo_html'
  const [activeField, setActiveField] = useState('cuerpo_html');
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    nombre: '',
    tipo: 'operacion_cierre',
    subtipo: '',
    asunto_template: '',
    cuerpo_html: '',
    firma_habilitada: true,
    firma_html: '',
    es_predeterminada: false,
    activo: true,
  });

  const [campos, setCampos] = useState([]);
  const [firmaDefault, setFirmaDefault] = useState('');
  const [logoFirma, setLogoFirma] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewAsunto, setPreviewAsunto] = useState('');

  // Cargar campos según tipo
  const loadCampos = useCallback(async (tipo) => {
    try {
      const response = await plantillasEmailService.getCampos(tipo);
      if (response?.success) {
        setCampos(response.data.campos || []);
        setFirmaDefault(response.data.firma_default || '');
      }
    } catch (err) {
      console.error('Error cargando campos:', err);
    }
  }, []);

  // Cargar plantilla existente
  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      plantillasEmailService.getById(id)
        .then(response => {
          if (response?.success && response.data) {
            const p = response.data;
            setFormData({
              nombre: p.nombre || '',
              tipo: p.tipo || 'general',
              subtipo: p.subtipo || '',
              asunto_template: p.asunto_template || '',
              cuerpo_html: p.cuerpo_html || '',
              firma_habilitada: p.firma_habilitada ?? true,
              firma_html: p.firma_html || '',
              es_predeterminada: p.es_predeterminada || false,
              activo: p.activo ?? true,
            });
            loadCampos(p.tipo);
          }
        })
        .catch(err => {
          notifyError('Error al cargar la plantilla');
          console.error(err);
        })
        .finally(() => setLoading(false));
    } else {
      loadCampos('operacion_cierre');
    }

    // Cargar logo de firma
    plantillasEmailService.getLogoFirma()
      .then(res => { if (res?.success && res.data?.logoDataUri) setLogoFirma(res.data.logoDataUri); })
      .catch(() => {});
  }, [id, isEdit, loadCampos, notifyError]);

  const handleChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      // Limpiar subtipo al cambiar tipo
      if (field === 'tipo') updated.subtipo = '';
      return updated;
    });

    if (field === 'tipo') {
      loadCampos(value);
    }
  };

  const handleFieldFocus = (fieldName) => {
    activeFieldRef.current = fieldName;
    setActiveField(fieldName);
  };

  const handleInsertVariable = (variable) => {
    const field = activeFieldRef.current;
    const isAsunto = field === 'asunto_template';
    const inputEl = isAsunto ? asuntoRef.current : editorRef.current;

    if (inputEl) {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      const text = isAsunto ? formData.asunto_template : formData.cuerpo_html;
      const newText = text.substring(0, start) + variable + text.substring(end);
      setFormData(prev => ({ ...prev, [field]: newText }));

      setTimeout(() => {
        inputEl.focus();
        inputEl.selectionStart = inputEl.selectionEnd = start + variable.length;
      }, 0);
    } else {
      setFormData(prev => ({ ...prev, [field]: prev[field] + variable }));
    }
  };

  const handlePreview = async () => {
    try {
      const response = await plantillasEmailService.previewRaw({
        asunto_template: formData.asunto_template,
        cuerpo_html: formData.cuerpo_html,
        tipo: formData.tipo,
        firma_habilitada: formData.firma_habilitada,
        firma_html: formData.firma_html || null,
      });
      if (response?.success) {
        setPreviewHtml(response.data.cuerpo_html);
        setPreviewAsunto(response.data.asunto);
        setShowPreview(true);
      }
    } catch (err) {
      notifyError('Error al generar vista previa');
    }
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      notifyError('El nombre es requerido');
      return;
    }
    if (!formData.asunto_template.trim()) {
      notifyError('El asunto es requerido');
      return;
    }
    if (!formData.cuerpo_html.trim()) {
      notifyError('El cuerpo de la plantilla es requerido');
      return;
    }

    setSaving(true);
    try {
      if (isEdit) {
        await plantillasEmailService.update(id, formData);
        success('Plantilla actualizada');
      } else {
        await plantillasEmailService.create(formData);
        success('Plantilla creada');
      }
      navigate('/plantillas-email');
    } catch (err) {
      notifyError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-64" />
            <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/plantillas-email')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                {isEdit ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                Configura el contenido, variables y firma del correo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" icon={Eye} onClick={handlePreview}>
              Vista Previa
            </Button>
            <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
              {isEdit ? 'Guardar Cambios' : 'Crear Plantilla'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ════════════════════════════════════════════════════════ */}
          {/* EDITOR - 2/3 */}
          {/* ════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Datos básicos */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Información Básica</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelClass}>Nombre de la Plantilla *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    className={inputClass}
                    placeholder="Ej: Cierre de operación estándar"
                  />
                </div>
                <div>
                  <label className={labelClass}>Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => handleChange('tipo', e.target.value)}
                    className={inputClass}
                  >
                    {TIPO_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Subtipo - solo cuando aplica */}
              {SUBTIPO_OPTIONS[formData.tipo] && (
                <div className="mb-4">
                  <label className={labelClass}>Aplica a</label>
                  <select
                    value={formData.subtipo}
                    onChange={(e) => handleChange('subtipo', e.target.value)}
                    className={inputClass}
                  >
                    {SUBTIPO_OPTIONS[formData.tipo].map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Define a qué tipo de operación aplica esta plantilla
                  </p>
                </div>
              )}

              <div>
                <label className={labelClass}>
                  Asunto del Correo *
                  {activeField === 'asunto_template' && (
                    <span className="ml-2 text-xs font-normal text-orange-500">← variables se insertarán aquí</span>
                  )}
                </label>
                <input
                  ref={asuntoRef}
                  type="text"
                  value={formData.asunto_template}
                  onChange={(e) => handleChange('asunto_template', e.target.value)}
                  onFocus={() => handleFieldFocus('asunto_template')}
                  className={`${inputClass} ${activeField === 'asunto_template' ? 'ring-2 ring-orange-500/30 border-orange-400' : ''}`}
                  placeholder="Ej: [ISTHO] {{tipoOperacion}} - {{numeroOperacion}}"
                />
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Haz clic aquí y luego en una variable del panel derecho para insertarla en el asunto
                </p>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.es_predeterminada}
                    onChange={(e) => handleChange('es_predeterminada', e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-500" /> Plantilla predeterminada
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.activo}
                    onChange={(e) => handleChange('activo', e.target.checked)}
                    className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Activa</span>
                </label>
              </div>
            </div>

            {/* Cuerpo del email */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  Cuerpo del Correo (HTML)
                  {activeField === 'cuerpo_html' && (
                    <span className="ml-2 text-xs font-normal text-orange-500">← variables se insertarán aquí</span>
                  )}
                </h3>
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">Handlebars + HTML</span>
              </div>

              <textarea
                ref={editorRef}
                value={formData.cuerpo_html}
                onChange={(e) => handleChange('cuerpo_html', e.target.value)}
                onFocus={() => handleFieldFocus('cuerpo_html')}
                className={`w-full h-80 px-4 py-3 border rounded-xl text-sm font-mono bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-y ${activeField === 'cuerpo_html' ? 'border-orange-400 dark:border-orange-600' : 'border-slate-200 dark:border-slate-600'}`}
                placeholder={`<h2>{{tipoOperacion}} Completado</h2>\n\n<p>Estimado(a) cliente,</p>\n\n<p>Le informamos que la operación <strong>{{numeroOperacion}}</strong> fue cerrada por {{cerradoPor}}.</p>\n\n{{#if observaciones}}\n<p><strong>Observaciones:</strong> {{observaciones}}</p>\n{{/if}}`}
              />

              <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                Usa {'{{variable}}'} para insertar datos dinámicos. Condicionales: {'{{#if variable}}...{{/if}}'}. Listas: {'{{#each lista}}...{{/each}}'}
              </p>
            </div>

            {/* Firma */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Firma ISTHO S.A.S.</h3>
                <button
                  onClick={() => handleChange('firma_habilitada', !formData.firma_habilitada)}
                  className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300"
                >
                  {formData.firma_habilitada ? (
                    <ToggleRight className="w-6 h-6 text-orange-500" />
                  ) : (
                    <ToggleLeft className="w-6 h-6 text-slate-400" />
                  )}
                  {formData.firma_habilitada ? 'Habilitada' : 'Deshabilitada'}
                </button>
              </div>

              {formData.firma_habilitada && (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange('firma_html', '')}
                      className={!formData.firma_html ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : ''}
                    >
                      Firma por Defecto
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChange('firma_html', formData.firma_html || firmaDefault || 'Editar firma personalizada...')}
                      className={formData.firma_html ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : ''}
                    >
                      Firma Personalizada
                    </Button>
                  </div>

                  {formData.firma_html ? (
                    <textarea
                      value={formData.firma_html}
                      onChange={(e) => handleChange('firma_html', e.target.value)}
                      className="w-full h-40 px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-mono bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 resize-y"
                      placeholder="HTML de la firma personalizada..."
                    />
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
                      <div className="flex items-center gap-3">
                        {logoFirma ? (
                          <img src={logoFirma} alt="Logo" className="w-12 h-12 rounded-xl object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">IS</div>
                        )}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">ISTHO S.A.S.</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Centro Logístico Industrial del Norte</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Girardota, Antioquia - Colombia</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Tel: (604) 405 2000 | info@istho.com.co</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Upload Logo de Firma */}
                  <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-600">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {logoFirma ? (
                          <img src={logoFirma} alt="Logo firma" className="w-10 h-10 rounded-lg object-cover" />
                        ) : (
                          <div className="w-10 h-10 bg-slate-200 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                            <Image className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                          {logoFirma ? 'Logo de firma cargado' : 'Sin logo de firma'}
                        </p>
                        <p className="text-[11px] text-slate-400">Se usara en todas las firmas de correo (max 5MB)</p>
                      </div>
                      <label className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
                        logoUploading ? 'bg-slate-100 text-slate-400' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100'
                      }`}>
                        {logoUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                        {logoUploading ? 'Subiendo...' : 'Subir Logo'}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          disabled={logoUploading}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setLogoUploading(true);
                            try {
                              const res = await plantillasEmailService.uploadLogoFirma(file);
                              if (res.success && res.data?.logoDataUri) {
                                setLogoFirma(res.data.logoDataUri);
                                success('Logo de firma actualizado');
                              }
                            } catch (err) {
                              notifyError('Error al subir el logo');
                            } finally {
                              setLogoUploading(false);
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ════════════════════════════════════════════════════════ */}
          {/* SIDEBAR - Variables disponibles 1/3 */}
          {/* ════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 sticky top-32">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-1">Variables Disponibles</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
                Haz clic para insertar en el campo activo
              </p>
              <div className={`text-xs px-3 py-1.5 rounded-lg mb-4 font-medium ${activeField === 'asunto_template' ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                Insertando en: {activeField === 'asunto_template' ? 'Asunto' : 'Cuerpo HTML'}
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {campos.length === 0 ? (
                  <p className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">
                    Selecciona un tipo de plantilla
                  </p>
                ) : (
                  campos.map((campo) => (
                    <VariableChip
                      key={campo.variable}
                      variable={campo.variable}
                      label={campo.label}
                      ejemplo={campo.ejemplo}
                      onInsert={handleInsertVariable}
                    />
                  ))
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">Condicionales</h4>
                <div className="space-y-1.5">
                  <button
                    onClick={() => handleInsertVariable('{{#if variable}}\n  <!-- contenido si existe -->\n{{/if}}')}
                    className="w-full text-left px-3 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    {'{{#if}}...{{/if}}'}
                  </button>
                  <button
                    onClick={() => handleInsertVariable('{{#each lista}}\n  <tr><td>{{this.campo}}</td></tr>\n{{/each}}')}
                    className="w-full text-left px-3 py-1.5 text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                  >
                    {'{{#each}}...{{/each}}'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno
        </footer>
      </main>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-3xl w-full mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">Vista Previa del Email</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Asunto: {previewAsunto}</p>
              </div>
              <button
                onClick={() => setShowPreview(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div
                className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlantillaEmailEditor;
