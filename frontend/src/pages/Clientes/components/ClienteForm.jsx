/**
 * ============================================================================
 * ISTHO CRM - ClienteForm Component
 * ============================================================================
 * Formulario para crear y editar clientes.
 * 
 * IMPORTANTE: Los campos usan snake_case para coincidir con el backend.
 * 
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Enero 2026
 */

import { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { 
  Building2, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Globe,
  DollarSign,
  Calendar,
  FileEdit,
  Database,
} from 'lucide-react';
import { Button, Modal } from '../../../components/common/index';

// ============================================================================
// CONFIGURACIÓN (Alineado con modelo Backend)
// ============================================================================

/**
 * Tipos de cliente según ENUM del modelo Cliente
 */
const TIPOS_CLIENTE = [
  { value: 'corporativo', label: 'Corporativo' },
  { value: 'pyme', label: 'PyME' },
  { value: 'persona_natural', label: 'Persona Natural' },
];

/**
 * Sectores disponibles
 */
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

/**
 * Estados según ENUM del modelo Cliente
 */
const ESTADOS = [
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
  { value: 'suspendido', label: 'Suspendido' },
];

/**
 * Configuración de campos del formulario
 * IMPORTANTE: Los nombres (name) usan snake_case para coincidir con el backend
 */
const FORM_FIELDS = {
  info: [
    { 
      name: 'razon_social', 
      label: 'Razón Social', 
      type: 'text', 
      required: true, 
      icon: Building2, 
      placeholder: 'Nombre de la empresa o persona',
      maxLength: 200,
    },
    { 
      name: 'nit', 
      label: 'NIT', 
      type: 'text', 
      required: true, 
      icon: FileText, 
      placeholder: '900123456-7',
      maxLength: 20,
    },
    { 
      name: 'tipo_cliente', 
      label: 'Tipo de Cliente', 
      type: 'select', 
      required: false, 
      options: TIPOS_CLIENTE,
    },
    { 
      name: 'sector', 
      label: 'Sector', 
      type: 'select', 
      required: false, 
      options: SECTORES,
    },
  ],
  contacto: [
    { 
      name: 'direccion', 
      label: 'Dirección', 
      type: 'text', 
      required: false, 
      icon: MapPin, 
      placeholder: 'Calle, número, barrio',
      maxLength: 255,
    },
    { 
      name: 'ciudad', 
      label: 'Ciudad', 
      type: 'text', 
      required: false, 
      placeholder: 'Ciudad',
      maxLength: 100,
    },
    { 
      name: 'departamento', 
      label: 'Departamento', 
      type: 'text', 
      required: false, 
      placeholder: 'Departamento',
      maxLength: 100,
    },
    { 
      name: 'telefono', 
      label: 'Teléfono', 
      type: 'tel', 
      required: false, 
      icon: Phone, 
      placeholder: '+57 604 123 4567',
      maxLength: 50,
    },
    { 
      name: 'email', 
      label: 'Email', 
      type: 'email', 
      required: false, 
      icon: Mail, 
      placeholder: 'contacto@empresa.com',
      maxLength: 150,
    },
    { 
      name: 'sitio_web', 
      label: 'Sitio Web', 
      type: 'url', 
      required: false, 
      icon: Globe, 
      placeholder: 'https://www.empresa.com',
      maxLength: 200,
    },
  ],
  comercial: [
    { 
      name: 'credito_aprobado', 
      label: 'Límite de Crédito (COP)', 
      type: 'number', 
      required: false, 
      icon: DollarSign,
      placeholder: '50000000',
      min: 0,
    },
    { 
      name: 'fecha_inicio_relacion', 
      label: 'Fecha Inicio Relación', 
      type: 'date', 
      required: false, 
      icon: Calendar,
    },
    { 
      name: 'codigo_wms', 
      label: 'Código WMS', 
      type: 'text', 
      required: false,
      icon: Database,
      placeholder: 'Código en sistema WMS Copérnico',
      maxLength: 50,
    },
    { 
      name: 'notas', 
      label: 'Observaciones', 
      type: 'textarea', 
      required: false, 
      icon: FileEdit,
      placeholder: 'Notas adicionales sobre el cliente...',
    },
  ],
};

// ============================================================================
// COMPONENTE INPUT FIELD
// ============================================================================

const InputField = ({ field, value, onChange, error }) => {
  const Icon = field.icon;
  
  const baseInputClasses = `
    w-full px-4 py-2.5 
    bg-white border rounded-xl
    text-sm text-slate-800 placeholder-slate-400
    focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
    transition-all duration-200
    ${error ? 'border-red-300' : 'border-slate-200'}
    ${Icon ? 'pl-10' : ''}
  `;

  const handleChange = (e) => {
    let newValue = e.target.value;
    
    // Para números, convertir a número o null
    if (field.type === 'number') {
      newValue = newValue === '' ? null : Number(newValue);
    }
    
    onChange(field.name, newValue);
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-slate-700">
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
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : field.type === 'textarea' ? (
          <textarea
            name={field.name}
            value={value || ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            maxLength={field.maxLength}
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
            className={baseInputClasses}
          />
        )}
      </div>
      
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
};

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
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('info');

  const isEditing = !!cliente;

  // ──────────────────────────────────────────────────────────────────────────
  // INICIALIZAR FORMULARIO
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (cliente) {
      // Edición: usar datos del cliente directamente
      setFormData({
        razon_social: cliente.razon_social || '',
        nit: cliente.nit || '',
        tipo_cliente: cliente.tipo_cliente || 'corporativo',
        sector: cliente.sector || '',
        direccion: cliente.direccion || '',
        ciudad: cliente.ciudad || '',
        departamento: cliente.departamento || '',
        telefono: cliente.telefono || '',
        email: cliente.email || '',
        sitio_web: cliente.sitio_web || '',
        credito_aprobado: cliente.credito_aprobado || null,
        fecha_inicio_relacion: cliente.fecha_inicio_relacion || '',
        codigo_wms: cliente.codigo_wms || '',
        notas: cliente.notas || '',
        estado: cliente.estado || 'activo',
      });
    } else {
      // Nuevo cliente: valores por defecto
      setFormData({
        tipo_cliente: 'corporativo',
        estado: 'activo',
      });
    }
    setErrors({});
    setActiveTab('info');
  }, [cliente, isOpen]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Limpiar error del campo
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar razón social (requerido)
    if (!formData.razon_social?.trim()) {
      newErrors.razon_social = 'La razón social es requerida';
    } else if (formData.razon_social.length < 3) {
      newErrors.razon_social = 'La razón social debe tener al menos 3 caracteres';
    }
    
    // Validar NIT (requerido)
    if (!formData.nit?.trim()) {
      newErrors.nit = 'El NIT es requerido';
    }

    // Validar email si se proporciona
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    // Validar URL si se proporciona
    if (formData.sitio_web && formData.sitio_web.trim()) {
      try {
        new URL(formData.sitio_web);
      } catch {
        newErrors.sitio_web = 'URL inválida (debe incluir https://)';
      }
    }

    // Validar límite de crédito
    if (formData.credito_aprobado !== null && formData.credito_aprobado < 0) {
      newErrors.credito_aprobado = 'El límite de crédito no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      // Ir a la primera pestaña con errores
      const tabsWithErrors = ['info', 'contacto', 'comercial'].filter(tab =>
        FORM_FIELDS[tab].some(field => errors[field.name])
      );
      if (tabsWithErrors.length > 0) {
        setActiveTab(tabsWithErrors[0]);
      }
      return;
    }

    // Enviar datos directamente (ya están en formato snake_case)
    await onSubmit?.(formData);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'contacto', label: 'Contacto' },
    { id: 'comercial', label: 'Comercial' },
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
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {isEditing ? 'Guardar Cambios' : 'Crear Cliente'}
          </Button>
        </>
      }
    >
      {/* Tabs */}
      <div className="border-b border-gray-100 mb-6">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                pb-3 px-1 text-sm font-medium transition-colors relative
                ${activeTab === tab.id
                  ? 'text-orange-600'
                  : 'text-slate-500 hover:text-slate-700'
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
            />
          </div>
        ))}
      </div>

      {/* Estado (solo en edición) */}
      {isEditing && activeTab === 'info' && (
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Estado del Cliente
          </label>
          <div className="flex gap-4">
            {ESTADOS.map((estado) => (
              <label key={estado.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="estado"
                  value={estado.value}
                  checked={formData.estado === estado.value}
                  onChange={(e) => handleChange('estado', e.target.value)}
                  className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm text-slate-700">{estado.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Código de cliente (solo en edición, solo lectura) */}
      {isEditing && activeTab === 'info' && cliente?.codigo_cliente && (
        <div className="mt-4 p-3 bg-blue-50 rounded-xl">
          <p className="text-xs text-blue-600 font-medium">Código de Cliente</p>
          <p className="text-sm text-blue-800 font-mono">{cliente.codigo_cliente}</p>
        </div>
      )}
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