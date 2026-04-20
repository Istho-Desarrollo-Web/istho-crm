/**
 * ISTHO CRM - Configuración WMS
 *
 * Panel de administración para gestionar la integración con WMS Centhrix:
 * - Motivos de Kardex permitidos (lista blanca)
 * - Mapeo de tipos de orden (fallback)
 * - Estados válidos para procesar órdenes
 *
 * Solo accesible por admin.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '@api/client';
import { ADMIN_ENDPOINTS } from '@api/endpoints';
import useNotification from '@hooks/useNotification';
import {
  Settings, ArrowLeft, Plus, Trash2, ToggleLeft, ToggleRight,
  Edit3, Save, X, FileText, Truck, CheckCircle, Info, Database
} from 'lucide-react';

// ============================================================================
// CONSTANTES
// ============================================================================

const CATEGORIAS = {
  motivo_kardex: {
    titulo: 'Motivos de Kardex Permitidos',
    descripcion: 'Solo los kardex con estos motivos serán procesados por el CRM',
    icono: FileText,
    color: 'purple',
    campos: ['valor_wms', 'valor_crm', 'requiere_detalle', 'descripcion']
  },
  tipo_orden: {
    titulo: 'Mapeo de Tipos de Orden',
    descripcion: 'Fallback cuando el WMS no envía tipo_documento (CO/PK/CR)',
    icono: Truck,
    color: 'blue',
    campos: ['valor_wms', 'valor_crm', 'tipo_documento', 'descripcion']
  },
  estado_valido: {
    titulo: 'Estados Válidos para Procesar',
    descripcion: 'Solo las órdenes con estos estados serán aceptadas por el CRM',
    icono: CheckCircle,
    color: 'emerald',
    campos: ['valor_wms', 'valor_crm', 'descripcion']
  }
};

const COLOR_MAP = {
  purple: {
    kpi: 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300',
    icon: 'bg-purple-100 dark:bg-purple-900/30',
    iconText: 'text-purple-600 dark:text-purple-400',
    badge: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  },
  blue: {
    kpi: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300',
    icon: 'bg-blue-100 dark:bg-blue-900/30',
    iconText: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  },
  emerald: {
    kpi: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300',
    icon: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconText: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ConfiguracionWms = () => {
  const navigate = useNavigate();
  const { success: notifySuccess, error: notifyError } = useNotification();

  const [data, setData] = useState({ motivo_kardex: [], tipo_orden: [], estado_valido: [] });
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({});
  const [creando, setCreando] = useState(null);

  // ─── Cargar datos ────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(ADMIN_ENDPOINTS.CONFIGURACION_WMS);
      if (response.success) {
        setData(response.data);
      }
    } catch {
      notifyError('Error al cargar configuración WMS');
    } finally {
      setLoading(false);
    }
  }, [notifyError]);

  useEffect(() => { cargar(); }, [cargar]);

  // ─── Crear ───────────────────────────────────────────────────────────────
  const handleCrear = async () => {
    try {
      const payload = { ...formData, categoria: creando };
      const response = await apiClient.post(ADMIN_ENDPOINTS.CONFIGURACION_WMS, payload);
      if (response.success) {
        notifySuccess('Configuración creada');
        setCreando(null);
        setFormData({});
        cargar();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Error al crear');
    }
  };

  // ─── Actualizar ──────────────────────────────────────────────────────────
  const handleActualizar = async () => {
    try {
      const response = await apiClient.put(
        ADMIN_ENDPOINTS.CONFIGURACION_WMS_BY_ID(editando),
        formData
      );
      if (response.success) {
        notifySuccess('Configuración actualizada');
        setEditando(null);
        setFormData({});
        cargar();
      }
    } catch (err) {
      notifyError(err.response?.data?.message || 'Error al actualizar');
    }
  };

  // ─── Toggle activo ───────────────────────────────────────────────────────
  const handleToggle = async (id) => {
    try {
      const response = await apiClient.patch(ADMIN_ENDPOINTS.CONFIGURACION_WMS_TOGGLE(id));
      if (response.success) {
        notifySuccess(response.message);
        cargar();
      }
    } catch {
      notifyError('Error al cambiar estado');
    }
  };

  // ─── Eliminar ────────────────────────────────────────────────────────────
  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar esta configuración?')) return;
    try {
      const response = await apiClient.delete(ADMIN_ENDPOINTS.CONFIGURACION_WMS_BY_ID(id));
      if (response.success) {
        notifySuccess('Configuración eliminada');
        cargar();
      }
    } catch {
      notifyError('Error al eliminar');
    }
  };

  // ─── Iniciar edición ────────────────────────────────────────────────────
  const iniciarEdicion = (item) => {
    setEditando(item.id);
    setCreando(null);
    setFormData({
      valor_wms: item.valor_wms,
      valor_crm: item.valor_crm,
      tipo_documento: item.tipo_documento,
      requiere_detalle: item.requiere_detalle,
      descripcion: item.descripcion || ''
    });
  };

  const iniciarCreacion = (categoria) => {
    setCreando(categoria);
    setEditando(null);
    setFormData({
      valor_wms: '',
      valor_crm: '',
      tipo_documento: categoria === 'tipo_orden' ? 'CO' : null,
      requiere_detalle: false,
      descripcion: ''
    });
  };

  const cancelar = () => {
    setEditando(null);
    setCreando(null);
    setFormData({});
  };

  // ─── Contar totales ──────────────────────────────────────────────────────
  const totalConfigs = Object.values(data).flat().length;
  const totalActivas = Object.values(data).flat().filter(i => i.activo).length;
  const totalInactivas = totalConfigs - totalActivas;

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-centhrix-card transition-colors">
              <ArrowLeft className="w-5 h-5 text-slate-400" />
            </button>
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <Settings className="w-7 h-7 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">Configuración WMS</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">Gestiona cómo el CRM procesa datos del WMS Centhrix</p>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-50 border-slate-200 text-slate-700 dark:bg-centhrix-card/50 dark:border-slate-700 dark:text-slate-300 transition-all hover:scale-[1.02]">
            <div className="p-2 rounded-lg bg-white/80 dark:bg-centhrix-card/80">
              <Database className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalConfigs}</p>
              <p className="text-xs opacity-70">Total Reglas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300 transition-all hover:scale-[1.02]">
            <div className="p-2 rounded-lg bg-white/80 dark:bg-centhrix-card/80">
              <ToggleRight className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalActivas}</p>
              <p className="text-xs opacity-70">Activas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300 transition-all hover:scale-[1.02]">
            <div className="p-2 rounded-lg bg-white/80 dark:bg-centhrix-card/80">
              <ToggleLeft className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalInactivas}</p>
              <p className="text-xs opacity-70">Inactivas</p>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-sm">
              <p className="font-semibold text-slate-800 dark:text-slate-100">¿Cómo funciona?</p>
              <p className="mt-1 text-slate-500 dark:text-slate-400">
                El WMS envía datos al CRM cuando una orden cambia a estado &quot;Finalizada&quot;.
                El CRM valida el estado, el tipo de orden y (para Kardex) el motivo antes de procesarla.
                Solo las configuraciones <strong className="text-slate-700 dark:text-slate-200">activas</strong> se usan para validar.
              </p>
            </div>
          </div>
        </div>

        {/* Secciones por categoría */}
        {Object.entries(CATEGORIAS).map(([categoria, config]) => {
          const colors = COLOR_MAP[config.color];
          const Icono = config.icono;
          const items = data[categoria] || [];

          return (
            <div key={categoria} className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
              {/* Título de sección */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${colors.icon}`}>
                    <Icono className={`w-5 h-5 ${colors.iconText}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{config.titulo}</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{config.descripcion}</p>
                  </div>
                </div>
                <button
                  onClick={() => iniciarCreacion(categoria)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm"
                >
                  <Plus className="w-4 h-4" /> Agregar
                </button>
              </div>

              {/* Formulario de creación */}
              {creando === categoria && (
                <FormularioConfig
                  formData={formData}
                  setFormData={setFormData}
                  categoria={categoria}
                  onGuardar={handleCrear}
                  onCancelar={cancelar}
                  esNuevo
                />
              )}

              {/* Lista de items */}
              {items.length === 0 && creando !== categoria ? (
                <div className="text-center py-8">
                  <Icono className={`w-10 h-10 mx-auto mb-2 ${colors.iconText} opacity-40`} />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    No hay configuraciones en esta categoría
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.map((item) => (
                    <div key={item.id}>
                      {editando === item.id ? (
                        <FormularioConfig
                          formData={formData}
                          setFormData={setFormData}
                          categoria={categoria}
                          onGuardar={handleActualizar}
                          onCancelar={cancelar}
                        />
                      ) : (
                        <div className={`flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-slate-700 bg-slate-50 dark:bg-centhrix-bg/50 transition-all hover:shadow-sm ${!item.activo ? 'opacity-50' : ''}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {item.valor_wms}
                              </span>
                              <span className="text-slate-400">→</span>
                              <span className="text-sm text-slate-600 dark:text-slate-300">
                                {item.valor_crm}
                              </span>
                              {item.tipo_documento && (
                                <span className={`px-2 py-0.5 text-xs rounded-full font-semibold ${colors.badge}`}>
                                  {item.tipo_documento}
                                </span>
                              )}
                              {item.requiere_detalle && (
                                <span className="px-2 py-0.5 text-xs rounded-full font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                                  + detalle
                                </span>
                              )}
                            </div>
                            {item.descripcion && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{item.descripcion}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 ml-4">
                            <button
                              onClick={() => handleToggle(item.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-centhrix-surface transition-colors"
                              title={item.activo ? 'Desactivar' : 'Activar'}
                            >
                              {item.activo
                                ? <ToggleRight className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
                                : <ToggleLeft className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                              }
                            </button>
                            <button
                              onClick={() => iniciarEdicion(item)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-centhrix-surface transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            </button>
                            <button
                              onClick={() => handleEliminar(item.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </main>
    </div>
  );
};

// ============================================================================
// FORMULARIO DE CONFIGURACIÓN (inline)
// ============================================================================

const FormularioConfig = ({ formData, setFormData, categoria, onGuardar, onCancelar, esNuevo }) => {
  const handleChange = (campo, valor) => {
    setFormData(prev => ({ ...prev, [campo]: valor }));
  };

  return (
    <div className="p-4 rounded-xl bg-slate-50 dark:bg-centhrix-bg/50 border border-gray-100 dark:border-slate-700 mb-3 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Valor WMS */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Valor WMS (como lo envía el WMS)</label>
          <input
            type="text"
            value={formData.valor_wms || ''}
            onChange={(e) => handleChange('valor_wms', e.target.value)}
            placeholder="Ej: Recarga, Picking, Finalizada"
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* Valor CRM */}
        <div>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre en CRM (como se muestra)</label>
          <input
            type="text"
            value={formData.valor_crm || ''}
            onChange={(e) => handleChange('valor_crm', e.target.value)}
            placeholder="Ej: Recarga de stock, Salida (PK)"
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        {/* Tipo documento (solo tipo_orden) */}
        {categoria === 'tipo_orden' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo Documento CRM</label>
            <select
              value={formData.tipo_documento || 'CO'}
              onChange={(e) => handleChange('tipo_documento', e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="CO">CO — Entrada (Recepción)</option>
              <option value="PK">PK — Salida (Picking)</option>
              <option value="CR">CR — Kardex (Ajuste)</option>
            </select>
          </div>
        )}

        {/* Requiere detalle (solo motivo_kardex) */}
        {categoria === 'motivo_kardex' && (
          <div className="flex items-center gap-2 pt-5">
            <input
              type="checkbox"
              checked={formData.requiere_detalle || false}
              onChange={(e) => handleChange('requiere_detalle', e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 dark:bg-centhrix-surface text-orange-500 focus:ring-orange-500"
            />
            <label className="text-sm text-slate-600 dark:text-slate-400">Requiere detalle adicional del WMS</label>
          </div>
        )}

        {/* Descripción */}
        <div className={categoria === 'estado_valido' ? '' : 'sm:col-span-2'}>
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Descripción (opcional)</label>
          <input
            type="text"
            value={formData.descripcion || ''}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            placeholder="Nota para el administrador"
            className="w-full px-3 py-2 rounded-xl bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
        <button
          onClick={onGuardar}
          disabled={!formData.valor_wms || !formData.valor_crm}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {esNuevo ? 'Crear' : 'Guardar'}
        </button>
        <button
          onClick={onCancelar}
          className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 text-sm hover:bg-slate-200 dark:hover:bg-centhrix-card transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ConfiguracionWms;