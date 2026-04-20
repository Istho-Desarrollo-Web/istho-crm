/**
 * ISTHO CRM - VehiculoForm Component
 * Formulario modal para crear y editar vehículos.
 * Validación con React Hook Form + Yup.
 * @version 3.0.0
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Truck, FileText, User, Calendar, Shield, Cog } from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';
import { vehiculosService } from '../../../api/viajes.service';
import useNotification from '../../../hooks/useNotification';
import { vehiculoSchema, TIPOS_VEHICULO, ESTADOS_VEHICULO } from '../../../utils/validationSchemas';
import { makeSanitizeHandler, SANITIZE } from '../../../utils/sanitizeForms';
import { useState } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// INPUT FIELD
// ════════════════════════════════════════════════════════════════════════════

const InputField = ({ label, icon: Icon, required, error, children }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-slate-400" />
        </div>
      )}
      {children}
    </div>
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

const inputClasses = (hasIcon, hasError) => `
  w-full px-4 py-2.5
  bg-white dark:bg-centhrix-card border rounded-xl
  text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500
  focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
  transition-all duration-200
  ${hasError ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
  ${hasIcon ? 'pl-10' : ''}
`.trim();

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const VehiculoForm = ({ open, onClose, onSuccess, vehiculoId, readOnly = false }) => {
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [conductores, setConductores] = useState([]);
  const [activeTab, setActiveTab] = useState('basico');
  const [loadingData, setLoadingData] = useState(false);

  const isEditing = !!vehiculoId;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(vehiculoSchema),
    defaultValues: {
      tipo_vehiculo: 'sencillo',
      estado: 'activo',
    },
  });

  // Cargar conductores y datos del vehículo
  useEffect(() => {
    if (!open) return;

    setActiveTab('basico');

    vehiculosService.getConductores()
      .then(res => { if (res.success) setConductores(res.data || []); })
      .catch(() => {});

    if (vehiculoId) {
      setLoadingData(true);
      vehiculosService.getById(vehiculoId)
        .then(res => {
          if (res.success && res.data) {
            const v = res.data;
            reset({
              placa: v.placa || '',
              tipo_vehiculo: v.tipo_vehiculo || 'sencillo',
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
      reset({ tipo_vehiculo: 'sencillo', estado: 'activo' });
    }
  }, [open, vehiculoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        placa: data.placa?.toUpperCase(),
        capacidad_ton: data.capacidad_ton !== '' && data.capacidad_ton != null ? parseFloat(data.capacidad_ton) : null,
        conductor_id: data.conductor_id || null,
        vencimiento_soat: data.vencimiento_soat || null,
        vencimiento_tecnicomecanica: data.vencimiento_tecnicomecanica || null,
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
    }
  };

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
      subtitle={isEditing ? `${readOnly ? 'Viendo' : 'Editando'} vehículo` : 'Complete la información del vehículo'}
      size="lg"
      footer={
        readOnly ? (
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit(onSubmit)} loading={isSubmitting} disabled={loadingData}>
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
                  type="button"
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

          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* ── TAB BÁSICO ── */}
              {activeTab === 'basico' && (
                <>
                  <InputField label="Placa" icon={Truck} required error={errors.placa?.message}>
                    <input
                      {...register('placa')}
                      type="text"
                      placeholder="ABC123"
                      maxLength={10}
                      disabled={readOnly}
                      onChange={makeSanitizeHandler(setValue, 'placa', SANITIZE.ALFANUM_UPPER, 10)}
                      className={`${inputClasses(true, !!errors.placa)} uppercase`}
                    />
                  </InputField>

                  <InputField label="Tipo de Vehículo" required error={errors.tipo_vehiculo?.message}>
                    <select
                      {...register('tipo_vehiculo')}
                      disabled={readOnly}
                      className={inputClasses(false, !!errors.tipo_vehiculo)}
                    >
                      <option value="">Seleccionar...</option>
                      {TIPOS_VEHICULO.map(t => (
                        <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </InputField>

                  <InputField label="Capacidad (Toneladas)" error={errors.capacidad_ton?.message}>
                    <input
                      {...register('capacidad_ton')}
                      type="number"
                      placeholder="10.00"
                      min={0}
                      step="0.1"
                      disabled={readOnly}
                      className={inputClasses(false, !!errors.capacidad_ton)}
                    />
                  </InputField>

                  <InputField label="Marca" error={errors.marca?.message}>
                    <input
                      {...register('marca')}
                      type="text"
                      placeholder="Chevrolet, Kenworth..."
                      maxLength={50}
                      disabled={readOnly}
                      onChange={makeSanitizeHandler(setValue, 'marca', SANITIZE.TEXTO_UPPER, 50)}
                      className={inputClasses(false, !!errors.marca)}
                    />
                  </InputField>

                  <InputField label="Modelo (Año)" error={errors.modelo?.message}>
                    <input
                      {...register('modelo')}
                      type="text"
                      placeholder="2024"
                      maxLength={10}
                      disabled={readOnly}
                      onChange={makeSanitizeHandler(setValue, 'modelo', SANITIZE.ALFANUM_UPPER, 10)}
                      className={inputClasses(false, !!errors.modelo)}
                    />
                  </InputField>

                  <InputField label="Color" error={errors.color?.message}>
                    <input
                      {...register('color')}
                      type="text"
                      placeholder="Blanco"
                      maxLength={30}
                      disabled={readOnly}
                      onChange={makeSanitizeHandler(setValue, 'color', SANITIZE.TEXTO_UPPER, 30)}
                      className={inputClasses(false, !!errors.color)}
                    />
                  </InputField>

                  {/* Estado (solo edición) */}
                  {isEditing && !readOnly && (
                    <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-centhrix-card rounded-xl">
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Estado del Vehículo
                      </label>
                      <div className="flex gap-4">
                        {ESTADOS_VEHICULO.map((estado) => (
                          <label key={estado} className="flex items-center gap-2 cursor-pointer">
                            <input
                              {...register('estado')}
                              type="radio"
                              value={estado}
                              className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300 capitalize">{estado}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* ── TAB DOCUMENTOS ── */}
              {activeTab === 'documentos' && (
                <>
                  <InputField label="Vencimiento SOAT" icon={Calendar} error={errors.vencimiento_soat?.message}>
                    <input
                      {...register('vencimiento_soat')}
                      type="date"
                      disabled={readOnly}
                      className={`${inputClasses(true, !!errors.vencimiento_soat)} min-w-0`}
                    />
                  </InputField>

                  <InputField label="Vencimiento Tecnomecánica" icon={Calendar} error={errors.vencimiento_tecnicomecanica?.message}>
                    <input
                      {...register('vencimiento_tecnicomecanica')}
                      type="date"
                      disabled={readOnly}
                      className={`${inputClasses(true, !!errors.vencimiento_tecnicomecanica)} min-w-0`}
                    />
                  </InputField>

                  <InputField label="Póliza de Responsabilidad" icon={Shield} error={errors.poliza_responsabilidad?.message}>
                    <input
                      {...register('poliza_responsabilidad')}
                      type="text"
                      placeholder="Número de póliza"
                      maxLength={50}
                      disabled={readOnly}
                      onChange={makeSanitizeHandler(setValue, 'poliza_responsabilidad', SANITIZE.ALFANUM_UPPER, 50)}
                      className={inputClasses(true, !!errors.poliza_responsabilidad)}
                    />
                  </InputField>

                  <InputField label="Número de Motor" icon={Cog} error={errors.numero_motor?.message}>
                    <input
                      {...register('numero_motor')}
                      type="text"
                      placeholder="Número de motor"
                      maxLength={50}
                      disabled={readOnly}
                      onChange={makeSanitizeHandler(setValue, 'numero_motor', SANITIZE.ALFANUM_UPPER, 50)}
                      className={inputClasses(true, !!errors.numero_motor)}
                    />
                  </InputField>

                  <InputField label="Número de Chasis" icon={FileText} error={errors.numero_chasis?.message}>
                    <input
                      {...register('numero_chasis')}
                      type="text"
                      placeholder="Número de chasis"
                      maxLength={50}
                      disabled={readOnly}
                      onChange={makeSanitizeHandler(setValue, 'numero_chasis', SANITIZE.ALFANUM_UPPER, 50)}
                      className={inputClasses(true, !!errors.numero_chasis)}
                    />
                  </InputField>
                </>
              )}

              {/* ── TAB ASIGNACIÓN ── */}
              {activeTab === 'asignacion' && (
                <>
                  <InputField label="Conductor Asignado" icon={User} error={errors.conductor_id?.message}>
                    <select
                      {...register('conductor_id')}
                      disabled={readOnly}
                      className={inputClasses(true, !!errors.conductor_id)}
                    >
                      <option value="">Sin asignar</option>
                      {conductores.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre_completo || `${c.nombre || ''} ${c.apellido || ''}`.trim() || c.username}
                        </option>
                      ))}
                    </select>
                  </InputField>

                  <div className="md:col-span-2">
                    <InputField label="Descripción / Observaciones" error={errors.descripcion?.message}>
                      <textarea
                        {...register('descripcion')}
                        placeholder="Notas adicionales sobre el vehículo..."
                        rows={3}
                        disabled={readOnly}
                        className={inputClasses(false, !!errors.descripcion)}
                      />
                    </InputField>
                  </div>
                </>
              )}
            </div>
          </form>
        </>
      )}
    </Modal>
  );
};

export default VehiculoForm;
