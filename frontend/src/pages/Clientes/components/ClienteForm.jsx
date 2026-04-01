/**
 * ============================================================================
 * ISTHO CRM - ClienteForm Component
 * ============================================================================
 * Formulario para crear y editar clientes.
 * Validación con React Hook Form + Yup.
 *
 * @author Coordinación TI ISTHO
 * @version 3.0.0
 * @date Abril 2026
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import PropTypes from 'prop-types';
import {
  Building2,
  FileText,
  MapPin,
  Phone,
  Mail,
  Globe,
  Calendar,
} from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';
import { clienteSchema } from '../../../utils/validationSchemas';

// ============================================================================
// CONSTANTES
// ============================================================================

const TIPOS_CLIENTE = [
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'pyme', label: 'PyME' },
  { value: 'persona_natural', label: 'Persona Natural' },
];

const SECTORES = [
  { value: 'alimentos', label: 'Alimentos y Bebidas' },
  { value: 'construccion', label: 'Construcción' },
  { value: 'manufactura', label: 'Manufactura' },
  { value: 'retail', label: 'Retail' },
  { value: 'farmaceutico', label: 'Farmacéutico' },
  { value: 'quimico', label: 'Químico' },
  { value: 'textil', label: 'Textil' },
  { value: 'tecnologia', label: 'Tecnología' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'otro', label: 'Otro' },
];

const ESTADOS = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'suspendido', label: 'Suspendido' },
];

// ============================================================================
// HELPERS
// ============================================================================

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

const inputCls = (hasIcon, hasError) => `
  w-full px-4 py-2.5
  bg-white dark:bg-slate-800 border rounded-xl
  text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400
  focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
  transition-all duration-200
  ${hasError ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'}
  ${hasIcon ? 'pl-10' : ''}
`.trim();

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ClienteForm = ({
  isOpen,
  onClose,
  onSubmit,
  cliente = null,
  loading = false,
}) => {
  const [activeTab, setActiveTab] = useState('info');
  const isEditing = !!cliente;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(clienteSchema),
    defaultValues: { tipo_cliente: 'corporativo', estado: 'activo' },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR DATOS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('info');

    if (cliente) {
      reset({
        razon_social: cliente.razon_social || '',
        nit: cliente.nit || '',
        tipo_cliente: cliente.tipo_cliente || 'corporativo',
        sector: cliente.sector || '',
        fecha_inicio_relacion: cliente.fecha_inicio_relacion || '',
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || '',
        departamento: cliente.departamento || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        sitio_web: cliente.sitio_web || '',
        estado: cliente.estado || 'activo',
      });
    } else {
      reset({ tipo_cliente: 'corporativo', estado: 'activo' });
    }
  }, [isOpen, cliente]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────

  const submitForm = async (data) => {
    await onSubmit?.(data);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'contacto', label: 'Contacto' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
      subtitle={isEditing ? `Editando: ${cliente?.razon_social}` : 'Complete la información del cliente'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading || isSubmitting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit(submitForm)} loading={loading || isSubmitting}>
            {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
        </>
      }
    >
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
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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

      <form onSubmit={handleSubmit(submitForm)} noValidate>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* ── TAB INFORMACIÓN ── */}
          {activeTab === 'info' && (
            <>
              <InputField label="Razón Social" icon={Building2} required error={errors.razon_social?.message}>
                <input
                  {...register('razon_social')}
                  type="text"
                  placeholder="Nombre de la empresa o persona"
                  maxLength={200}
                  className={inputCls(true, !!errors.razon_social)}
                />
              </InputField>

              <InputField label="NIT" icon={FileText} required error={errors.nit?.message}>
                <input
                  {...register('nit')}
                  type="text"
                  placeholder="900123456-7"
                  maxLength={20}
                  className={inputCls(true, !!errors.nit)}
                />
              </InputField>

              <InputField label="Tipo de Cliente" error={errors.tipo_cliente?.message}>
                <select {...register('tipo_cliente')} className={inputCls(false, !!errors.tipo_cliente)}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_CLIENTE.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </InputField>

              <InputField label="Sector" error={errors.sector?.message}>
                <select {...register('sector')} className={inputCls(false, !!errors.sector)}>
                  <option value="">Seleccionar...</option>
                  {SECTORES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </InputField>

              <InputField label="Fecha Inicio Relación" icon={Calendar} error={errors.fecha_inicio_relacion?.message}>
                <input
                  {...register('fecha_inicio_relacion')}
                  type="date"
                  className={`${inputCls(true, !!errors.fecha_inicio_relacion)} min-w-0`}
                />
              </InputField>

              {/* Estado (solo edición) */}
              {isEditing && (
                <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Estado del Cliente
                  </label>
                  <div className="flex gap-4">
                    {ESTADOS.map((estado) => (
                      <label key={estado.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          {...register('estado')}
                          type="radio"
                          value={estado.value}
                          className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{estado.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Código de cliente (solo lectura en edición) */}
              {isEditing && cliente?.codigo_cliente && (
                <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Código de Cliente</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 font-mono">{cliente.codigo_cliente}</p>
                </div>
              )}
            </>
          )}

          {/* ── TAB CONTACTO ── */}
          {activeTab === 'contacto' && (
            <>
              <InputField label="Dirección" icon={MapPin} error={errors.direccion?.message}>
                <input
                  {...register('direccion')}
                  type="text"
                  placeholder="Calle, número, barrio"
                  maxLength={255}
                  className={inputCls(true, !!errors.direccion)}
                />
              </InputField>

              <InputField label="Ciudad" error={errors.ciudad?.message}>
                <input
                  {...register('ciudad')}
                  type="text"
                  placeholder="Ciudad"
                  maxLength={100}
                  className={inputCls(false, !!errors.ciudad)}
                />
              </InputField>

              <InputField label="Departamento" error={errors.departamento?.message}>
                <input
                  {...register('departamento')}
                  type="text"
                  placeholder="Departamento"
                  maxLength={100}
                  className={inputCls(false, !!errors.departamento)}
                />
              </InputField>

              <InputField label="Teléfono" icon={Phone} error={errors.telefono?.message}>
                <input
                  {...register('telefono')}
                  type="tel"
                  placeholder="+57 604 123 4567"
                  maxLength={50}
                  className={inputCls(true, !!errors.telefono)}
                />
              </InputField>

              <InputField label="Email" icon={Mail} error={errors.email?.message}>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="contacto@empresa.com"
                  maxLength={150}
                  className={inputCls(true, !!errors.email)}
                />
              </InputField>

              <InputField label="Sitio Web" icon={Globe} error={errors.sitio_web?.message}>
                <input
                  {...register('sitio_web')}
                  type="url"
                  placeholder="https://www.empresa.com"
                  maxLength={200}
                  className={inputCls(true, !!errors.sitio_web)}
                />
              </InputField>
            </>
          )}
        </div>
      </form>
    </Modal>
  );
};

ClienteForm.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  cliente: PropTypes.object,
  loading: PropTypes.bool,
};

export default ClienteForm;
