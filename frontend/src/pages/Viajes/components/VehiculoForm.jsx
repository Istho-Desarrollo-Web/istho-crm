/**
 * ISTHO CRM - VehiculoForm Component
 * Formulario modal para crear y editar vehículos.
 * Sigue el mismo patrón de diseño que ClienteForm.
 * @version 2.0.0
 */

import { useState, useEffect } from 'react';
import { Truck, FileText, User, Calendar, Shield, Cog } from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';
import { vehiculosService } from '../../../api/viajes.service';
import useNotification from '../../../hooks/useNotification';

// ════════════════════════════════════════════════════════════════════════════
// OPCIONES
// ════════════════════════════════════════════════════════════════════════════

const TIPOS_VEHICULO = [
  { value: 'sencillo', label: 'Sencillo' },
  { value: 'tractomula', label: 'Tractomula' },
  { value: 'turbo', label: 'Turbo' },
  { value: 'dobletroque', label: 'Doble Troque' },
  { value: 'minimula', label: 'Minimula' },
  { value: 'otro', label: 'Otro' },
];

const ESTADOS_VEHICULO = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'mantenimiento', label: 'En Mantenimiento' },
];

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE CAMPOS POR TAB
// ════════════════════════════════════════════════════════════════════════════

const FORM_FIELDS = {
  basico: [
    { name: 'placa', label: 'Placa', type: 'text', required: true, icon: Truck, placeholder: 'ABC123', maxLength: 10, uppercase: true },
    { name: 'tipo_vehiculo', label: 'Tipo de Vehículo', type: 'select', required: true, options: TIPOS_VEHICULO },
    { name: 'capacidad_ton', label: 'Capacidad (Toneladas)', type: 'number', placeholder: '10.00', min: 0, step: '0.1' },
    { name: 'marca', label: 'Marca', type: 'text', placeholder: 'Chevrolet, Kenworth...' },
    { name: 'modelo', label: 'Modelo (Año)', type: 'text', placeholder: '2024' },
    { name: 'color', label: 'Color', type: 'text', placeholder: 'Blanco' },
  ],
  documentos: [
    { name: 'vencimiento_soat', label: 'Vencimiento SOAT', type: 'date', icon: Calendar },
    { name: 'vencimiento_tecnicomecanica', label: 'Vencimiento Tecnomecánica', type: 'date', icon: Calendar },
    { name: 'poliza_responsabilidad', label: 'Póliza de Responsabilidad', type: 'text', icon: Shield, placeholder: 'Número de póliza' },
    { name: 'numero_motor', label: 'Número de Motor', type: 'text', icon: Cog, placeholder: 'Número de motor' },
    { name: 'numero_chasis', label: 'Número de Chasis', type: 'text', icon: FileText, placeholder: 'Número de chasis' },
  ],
  asignacion: [
    { name: 'conductor_id', label: 'Conductor Asignado', type: 'select_conductor', icon: User },
    { name: 'descripcion', label: 'Descripción / Observaciones', type: 'textarea', placeholder: 'Notas adicionales sobre el vehículo...' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT FIELD (mismo patrón que ClienteForm)
// ════════════════════════════════════════════════════════════════════════════

const InputField = ({ field, value, onChange, error, conductores }) => {
  const Icon = field.icon;

  const baseInputClasses = `
    w-full px-4 py-2.5
    bg-white dark:bg-slate-800 border rounded-xl
    text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
    focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
    transition-all duration-200
    ${error ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
    ${Icon ? 'pl-10' : ''}
    ${field.uppercase ? 'uppercase' : ''}
  `;

  const handleChange = (e) => {
    let newValue = e.target.value;
    if (field.type === 'number') {
      newValue = newValue === '' ? null : Number(newValue);
    }
    if (field.uppercase) {
      newValue = typeof newValue === 'string' ? newValue.toUpperCase() : newValue;
    }
    onChange(field.name, newValue);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-slate-400" />
          </div>
        )}

        {field.type === 'select' ? (
          <select
            name={field.name}
            value={value || ''}
            onChange={handleChange}
            className={baseInputClasses}
          >
            <option value="">Seleccionar...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : field.type === 'select_conductor' ? (
          <select
            name={field.name}
            value={value || ''}
            onChange={handleChange}
            className={baseInputClasses}
          >
            <option value="">Sin asignar</option>
            {conductores?.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`.trim() || c.username}</option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            name={field.name}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            rows={3}
            className={baseInputClasses}
          />
        ) : (
          <input
            type={field.type}
            name={field.name}
            value={value ?? ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
            min={field.min}
            step={field.step}
            className={baseInputClasses}
          />
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const VehiculoForm = ({ open, onClose, onSuccess, vehiculoId, readOnly = false }) => {
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [formData, setFormData] = useState({});
  const [conductores, setConductores] = useState([]);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('basico');
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const isEditing = !!vehiculoId;

  // Cargar conductores y datos del vehículo
  useEffect(() => {
    if (!open) return;

    setActiveTab('basico');
    setErrors({});

    // Cargar conductores
    vehiculosService.getConductores()
      .then(res => { if (res.success) setConductores(res.data || []); })
      .catch(() => {});

    if (vehiculoId) {
      setLoadingData(true);
      vehiculosService.getById(vehiculoId)
        .then(res => {
          if (res.success && res.data) {
            const v = res.data;
            setFormData({
              placa: v.placa || '',
              tipo_vehiculo: v.tipo_vehiculo || '',
              capacidad_ton: v.capacidad_ton ?? '',
              marca: v.marca || '',
              modelo: v.modelo || '',
              color: v.color || '',
              vencimiento_soat: v.vencimiento_soat?.split('T')[0] || '',
              vencimiento_tecnicomecanica: v.vencimiento_tecnicomecanica?.split('T')[0] || '',
              poliza_responsabilidad: v.poliza_responsabilidad || '',
              numero_motor: v.numero_motor || '',
              numero_chasis: v.numero_chasis || '',
              conductor_id: v.conductor_id ?? '',
              descripcion: v.descripcion || '',
              estado: v.estado || 'activo',
            });
          }
        })
        .catch(() => notifyError('Error al cargar vehículo'))
        .finally(() => setLoadingData(false));
    } else {
      setFormData({ tipo_vehiculo: 'sencillo', estado: 'activo' });
    }
  }, [open, vehiculoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.placa?.trim()) newErrors.placa = 'La placa es requerida';
    if (!formData.tipo_vehiculo) newErrors.tipo_vehiculo = 'El tipo es requerido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        capacidad_ton: formData.capacidad_ton ? parseFloat(formData.capacidad_ton) : null,
        conductor_id: formData.conductor_id || null,
        vencimiento_soat: formData.vencimiento_soat || null,
        vencimiento_tecnicomecanica: formData.vencimiento_tecnicomecanica || null,
      };

      const response = isEditing
        ? await vehiculosService.update(vehiculoId, payload)
        : await vehiculosService.create(payload);

      if (response.success) {
        notifySuccess(isEditing ? 'Vehículo actualizado correctamente' : 'Vehículo creado correctamente');
        onSuccess?.();
        onClose();
      } else {
        notifyError(response.message || 'Error al guardar');
      }
    } catch (err) {
      notifyError(err.message || 'Error al guardar el vehículo');
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'basico', label: 'Datos Básicos' },
    { id: 'documentos', label: 'Documentos' },
    { id: 'asignacion', label: 'Asignación' },
  ];

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={readOnly ? 'Detalle Vehículo' : (isEditing ? 'Editar Vehículo' : 'Nuevo Vehículo')}
      subtitle={isEditing ? `${readOnly ? 'Viendo' : 'Editando'}: ${formData.placa || ''}` : 'Complete la información del vehículo'}
      size="lg"
      footer={
        readOnly ? (
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={loading} disabled={loadingData}>
              {isEditing ? 'Guardar Cambios' : 'Crear Vehículo'}
            </Button>
          </>
        )
      }
    >
      {loadingData ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Tabs */}
          <div className="border-b border-gray-100 dark:border-slate-700 mb-6">
            <nav className="flex gap-4">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    pb-3 px-1 text-sm font-medium transition-colors relative
                    ${activeTab === tab.id
                      ? 'text-orange-600'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                    }
                  `}
                >
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FORM_FIELDS[activeTab]?.map((field) => (
              <div
                key={field.name}
                className={field.type === 'textarea' ? 'md:col-span-2' : ''}
              >
                <InputField
                  field={field}
                  value={formData[field.name]}
                  onChange={handleChange}
                  error={errors[field.name]}
                  conductores={conductores}
                />
              </div>
            ))}
          </div>

          {/* Estado (solo en edición) */}
          {isEditing && activeTab === 'basico' && (
            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Estado del Vehículo
              </label>
              <div className="flex gap-4">
                {ESTADOS_VEHICULO.map((estado) => (
                  <label key={estado.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="estado"
                      value={estado.value}
                      checked={formData.estado === estado.value}
                      onChange={(e) => handleChange('estado', e.target.value)}
                      className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{estado.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};

export default VehiculoForm;
