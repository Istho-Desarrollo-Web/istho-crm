/**
 * ISTHO CRM - Configuración WMS
 *
 * Panel de administración para gestionar la integración con WMS Copérnico:
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
  Edit3, Save, X, FileText, Truck, CheckCircle, AlertTriangle, Info
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
    color: 'green',
    campos: ['valor_wms', 'valor_crm', 'descripcion']
  }
};

const COLORES = {
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', icon: 'text-purple-400' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', icon: 'text-blue-400' },
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', icon: 'text-emerald-400' }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ConfiguracionWms = () => {
  const navigate = useNavigate();
  const { success: notifySuccess, error: notifyError, apiError } = useNotification();

  const [data, setData] = useState({ motivo_kardex: [], tipo_orden: [], estado_valido: [] });
  const [loading, setLoading] = useState(true);
  const [editando, setEditando] = useState(null);
  const [formData, setFormData] = useState({});
  const [creando, setCreando] = useState(null); // categoría en la que se está creando

  // ─── Cargar datos ────────────────────────────────────────────────────────
  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(ADMIN_ENDPOINTS.CONFIGURACION_WMS);
      if (response.success) {
        setData(response.data);
      }
    } catch (err) {
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

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E74C3C]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Settings className="w-7 h-7 text-[#E74C3C]" />
            Configuración WMS
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gestiona cómo el CRM procesa datos del WMS Copérnico
          </p>
        </div>
      </div>

      {/* Info box */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">¿Cómo funciona?</p>
          <p className="mt-1 text-blue-400/80">
            El WMS envía datos al CRM cuando una orden cambia a estado "Finalizada".
            El CRM valida el estado, el tipo de orden y (para Kardex) el motivo antes de procesarla.
            Solo las configuraciones <strong>activas</strong> se usan para validar.
          </p>
        </div>
      </div>

      {/* Secciones por categoría */}
      {Object.entries(CATEGORIAS).map(([categoria, config]) => {
        const colores = COLORES[config.color];
        const Icono = config.icono;
        const items = data[categoria] || [];

        return (
          <div key={categoria} className={`rounded-xl border ${colores.border} ${colores.bg} p-6`}>
            {/* Título de sección */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Icono className={`w-5 h-5 ${colores.icon}`} />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{config.titulo}</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{config.descripcion}</p>
                </div>
              </div>
              <button
                onClick={() => iniciarCreacion(categoria)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#E74C3C] text-white text-sm font-medium hover:bg-[#C0392B] transition-colors"
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
            {items.length === 0 && !creando ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No hay configuraciones en esta categoría
              </p>
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
                      <div className={`flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-white/5 border border-white/10 ${!item.activo ? 'opacity-50' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.valor_wms}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">→</span>
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {item.valor_crm}
                            </span>
                            {item.tipo_documento && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-blue-500/20 text-blue-400 font-mono">
                                {item.tipo_documento}
                              </span>
                            )}
                            {item.requiere_detalle && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-amber-500/20 text-amber-400">
                                + detalle
                              </span>
                            )}
                          </div>
                          {item.descripcion && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 truncate">{item.descripcion}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => handleToggle(item.id)}
                            className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            title={item.activo ? 'Desactivar' : 'Activar'}
                          >
                            {item.activo
                              ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                              : <ToggleLeft className="w-5 h-5 text-gray-500" />
                            }
                          </button>
                          <button
                            onClick={() => iniciarEdicion(item)}
                            className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4 text-blue-400" />
                          </button>
                          <button
                            onClick={() => handleEliminar(item.id)}
                            className="p-1.5 rounded hover:bg-white/10 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4 text-red-400" />
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
    <div className="p-4 rounded-lg bg-white/10 dark:bg-white/5 border border-white/20 mb-2 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Valor WMS */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Valor WMS (como lo envía el WMS)</label>
          <input
            type="text"
            value={formData.valor_wms || ''}
            onChange={(e) => handleChange('valor_wms', e.target.value)}
            placeholder="Ej: Recarga, Picking, Finalizada"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E74C3C]"
          />
        </div>

        {/* Valor CRM */}
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Nombre en CRM (como se muestra)</label>
          <input
            type="text"
            value={formData.valor_crm || ''}
            onChange={(e) => handleChange('valor_crm', e.target.value)}
            placeholder="Ej: Recarga de stock, Salida (PK)"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E74C3C]"
          />
        </div>

        {/* Tipo documento (solo tipo_orden) */}
        {categoria === 'tipo_orden' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Tipo Documento CRM</label>
            <select
              value={formData.tipo_documento || 'CO'}
              onChange={(e) => handleChange('tipo_documento', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#E74C3C]"
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
              className="w-4 h-4 rounded border-gray-600 text-[#E74C3C] focus:ring-[#E74C3C]"
            />
            <label className="text-sm text-gray-400">Requiere detalle adicional del WMS</label>
          </div>
        )}

        {/* Descripción */}
        <div className={categoria === 'estado_valido' ? '' : 'sm:col-span-2'}>
          <label className="block text-xs font-medium text-gray-400 mb-1">Descripción (opcional)</label>
          <input
            type="text"
            value={formData.descripcion || ''}
            onChange={(e) => handleChange('descripcion', e.target.value)}
            placeholder="Nota para el administrador"
            className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-sm text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-[#E74C3C]"
          />
        </div>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onGuardar}
          disabled={!formData.valor_wms || !formData.valor_crm}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#E74C3C] text-white text-sm font-medium hover:bg-[#C0392B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4" />
          {esNuevo ? 'Crear' : 'Guardar'}
        </button>
        <button
          onClick={onCancelar}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-gray-400 text-sm hover:bg-white/20 transition-colors"
        >
          <X className="w-4 h-4" />
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ConfiguracionWms;
