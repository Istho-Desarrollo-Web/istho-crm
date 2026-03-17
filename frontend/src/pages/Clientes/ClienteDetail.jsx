/**
 * ============================================================================
 * ISTHO CRM - ClienteDetail
 * ============================================================================
 * Vista de detalle del cliente conectada al backend real.
 * 
 * ACTUALIZACIÓN v2.6.0:
 * - Nuevo tab "Usuarios Portal" para gestionar usuarios de cliente
 * - Integración con componente UsuariosCliente
 * - Corrección de template literals
 * 
 * @author Coordinación TI ISTHO
 * @version 2.6.0
 * @date Enero 2026
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Calendar,
  Pencil,
  Trash2,
  Plus,
  User,
  Users,
  Truck,
  Clock,
  MessageSquare,
  FileCheck,
  DollarSign,
  Database,
  Package,
  Camera,
} from 'lucide-react';

// Layout


// Components
import { Button, StatusChip, KpiCard, ConfirmDialog, Modal } from '../../components/common';

// Local Components
import ClienteForm from './components/ClienteForm';
import UsuariosCliente from './components/UsuariosCliente'; // ← NUEVO

// Hooks
import useClientes from '../../hooks/useClientes';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

// Services
import inventarioService from '../../api/inventario.service';
import clientesService from '../../api/clientes.service';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const formatTipoCliente = (tipo) => {
  const tipos = {
    corporativo: 'Corporativo',
    pyme: 'PyME',
    persona_natural: 'Persona Natural',
  };
  return tipos[tipo] || tipo || '-';
};

const formatSector = (sector) => {
  const sectores = {
    alimentos: 'Alimentos y Bebidas',
    construccion: 'Construcción',
    manufactura: 'Manufactura',
    retail: 'Retail',
    farmaceutico: 'Farmacéutico',
    quimico: 'Químico',
    textil: 'Textil',
    tecnologia: 'Tecnología',
    servicios: 'Servicios',
    otro: 'Otro',
  };
  return sectores[sector] || sector || '-';
};

const formatCurrency = (value) => {
  if (!value) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);
};


// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Tarjeta de contacto
 */
const ContactCard = ({ contacto, onEdit, onDelete, canEdit }) => (
  <div className={`
    p-4 rounded-xl border transition-colors
    ${contacto.es_principal
      ? 'border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-900/20'
      : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50'
    }
  `}>
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center
          ${contacto.es_principal ? 'bg-orange-200 dark:bg-orange-900/40' : 'bg-slate-200 dark:bg-slate-700'}
        `}>
          <User className={`w-5 h-5 ${contacto.es_principal ? 'text-orange-700 dark:text-orange-400' : 'text-slate-600 dark:text-slate-300'}`} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-slate-800 dark:text-slate-100">{contacto.nombre}</p>
            {contacto.es_principal && (
              <span className="text-xs bg-orange-200 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 px-2 py-0.5 rounded-full">
                Principal
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{contacto.cargo || 'Sin cargo'}</p>
        </div>
      </div>
      {canEdit && (
        <div className="flex gap-1">
          <button
            onClick={() => onEdit?.(contacto)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete?.(contacto)}
            className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
    <div className="mt-3 space-y-1.5 text-sm">
      {contacto.telefono && (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          {contacto.telefono}
        </div>
      )}
      {contacto.email && (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          {contacto.email}
        </div>
      )}
    </div>
  </div>
);

/**
 * Item de actividad/historial
 */
const ESTADO_CONFIG = {
  cerrado: { label: 'Cerrado', bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-700 dark:text-emerald-400' },
  en_proceso: { label: 'En Proceso', bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-700 dark:text-blue-400' },
  anulado: { label: 'Anulado', bg: 'bg-red-100 dark:bg-red-900/30', color: 'text-red-700 dark:text-red-400' },
  borrador: { label: 'Borrador', bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-700 dark:text-slate-300' },
};

const ActivityItem = ({ actividad }) => {
  const iconConfig = {
    operacion: { icon: Truck, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
    despacho: { icon: Truck, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400' },
    llamada: { icon: Phone, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
    documento: { icon: FileCheck, bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400' },
    nota: { icon: MessageSquare, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
    creacion: { icon: Building2, bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-600 dark:text-slate-300' },
    actualizar: { icon: Pencil, bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600 dark:text-orange-400' },
    login: { icon: User, bg: 'bg-green-100 dark:bg-green-900/30', color: 'text-green-600 dark:text-green-400' },
  };

  const config = iconConfig[actividad.tipo] || iconConfig[actividad.accion] || iconConfig.nota;
  const Icon = config.icon;
  const estadoConfig = ESTADO_CONFIG[actividad.estado];

  return (
    <div className="flex gap-4">
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}>
        <Icon className={`w-5 h-5 ${config.color}`} />
      </div>
      <div className="flex-1 pb-6 border-b border-gray-100 dark:border-slate-700 last:border-0">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-100">
              {actividad.titulo || actividad.accion || 'Actividad'}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {actividad.descripcion || actividad.detalle || '-'}
            </p>
          </div>
          {estadoConfig && (
            <span className={`text-xs px-2 py-1 rounded-full ${estadoConfig.bg} ${estadoConfig.color}`}>
              {estadoConfig.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(actividad.fecha || actividad.created_at).toLocaleString('es-CO')}
          </span>
          <span className="flex items-center gap-1">
            <User className="w-3 h-3" />
            {actividad.usuario || actividad.usuario_nombre || 'Sistema'}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Modal de formulario de contacto
 */
const ContactoFormModal = ({ isOpen, onClose, onSubmit, contacto, loading }) => {
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      setFormData(contacto || { es_principal: false, recibe_notificaciones: true });
      setErrors({});
    }
  }, [contacto, isOpen]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.nombre?.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.telefono?.trim()) newErrors.telefono = 'El teléfono es requerido';
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contacto ? 'Editar Contacto' : 'Nuevo Contacto'}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            {contacto ? 'Guardar' : 'Agregar'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nombre Completo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.nombre || ''}
            onChange={(e) => handleChange('nombre', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.nombre ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'
              }`}
            placeholder="Nombre del contacto"
          />
          {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Cargo
          </label>
          <input
            type="text"
            value={formData.cargo || ''}
            onChange={(e) => handleChange('cargo', e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            placeholder="Cargo en la empresa"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Teléfono <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.telefono || ''}
            onChange={(e) => handleChange('telefono', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.telefono ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'
              }`}
            placeholder="+57 300 123 4567"
          />
          {errors.telefono && <p className="text-xs text-red-500 mt-1">{errors.telefono}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className={`w-full px-4 py-2.5 border rounded-xl text-sm bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.email ? 'border-red-300' : 'border-slate-200 dark:border-slate-600'
              }`}
            placeholder="email@empresa.com"
          />
          {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.es_principal || false}
              onChange={(e) => handleChange('es_principal', e.target.checked)}
              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Contacto principal</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.recibe_notificaciones ?? true}
              onChange={(e) => handleChange('recibe_notificaciones', e.target.checked)}
              className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">Recibe notificaciones</span>
          </label>
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ClienteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { success, apiError, deleted } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // HOOK DE CLIENTES
  // ──────────────────────────────────────────────────────────────────────────

  const {
    cliente,
    loadingDetail: loading,
    errorDetail: error,
    fetchCliente,
    updateCliente,
    deleteCliente,
    fetchContactos,
    createContacto,
    updateContacto,
    deleteContacto,
  } = useClientes({ autoFetch: false });

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS LOCALES
  // ──────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState('info');
  const [contactos, setContactos] = useState([]);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  // Estado para productos del cliente
  const [productosCliente, setProductosCliente] = useState([]);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Modals
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [contactoModal, setContactoModal] = useState({ isOpen: false, contacto: null });
  const [deleteContactoModal, setDeleteContactoModal] = useState({ isOpen: false, contacto: null });
  const [formLoading, setFormLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // PERMISOS
  // ──────────────────────────────────────────────────────────────────────────

  const canEdit = hasPermission('clientes', 'editar');
  const canDelete = hasPermission('clientes', 'eliminar');
  const canManageUsers = hasPermission('usuarios', 'ver');

  // Ref para input file de logo
  const logoInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const response = await clientesService.uploadLogo(id, file);
      if (response?.success) {
        success('Logo actualizado correctamente');
        fetchCliente(id);
      }
    } catch (err) {
      apiError(err.message || 'Error al subir el logo');
    }
    // Reset input
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR DATOS
  // ──────────────────────────────────────────────────────────────────────────

  const loadContactos = useCallback(async (clienteId) => {
    setLoadingContactos(true);
    try {
      const response = await fetchContactos(clienteId);
      if (response?.success) {
        setContactos(response.data || []);
      }
    } catch (err) {
      console.error('Error cargando contactos:', err);
      setContactos([]);
    } finally {
      setLoadingContactos(false);
    }
  }, [fetchContactos]);

  // Cargar historial del cliente
  const loadHistorial = useCallback(async (clienteId) => {
    setLoadingHistorial(true);
    try {
      const response = await clientesService.getHistorial(clienteId, { limit: 50 });
      if (response?.success) {
        setHistorial(response.data || []);
      } else {
        setHistorial([]);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, []);

  // Cargar productos del cliente
  const loadProductosCliente = useCallback(async (clienteId) => {
    setLoadingProductos(true);
    try {
      const response = await inventarioService.getByCliente(clienteId);
      if (response?.success) {
        setProductosCliente(response.data || []);
      } else {
        setProductosCliente([]);
      }
    } catch (err) {
      console.error('Error cargando productos del cliente:', err);
      setProductosCliente([]);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCliente(id);
      loadContactos(id);
      loadProductosCliente(id);
      loadHistorial(id);
    }
  }, [id, fetchCliente, loadContactos, loadProductosCliente, loadHistorial]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleEditCliente = async (data) => {
    setFormLoading(true);
    try {
      await updateCliente(id, data);
      success('Cliente actualizado correctamente');
      setEditModal(false);
      fetchCliente(id);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCliente = async () => {
    setFormLoading(true);
    try {
      await deleteCliente(id);
      deleted('Cliente');
      navigate('/clientes');
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleSaveContacto = async (data) => {
    setFormLoading(true);
    try {
      if (contactoModal.contacto) {
        await updateContacto(id, contactoModal.contacto.id, data);
        success('Contacto actualizado');
      } else {
        await createContacto(id, data);
        success('Contacto agregado');
      }
      setContactoModal({ isOpen: false, contacto: null });
      loadContactos(id);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteContacto = async () => {
    setFormLoading(true);
    try {
      await deleteContacto(id, deleteContactoModal.contacto.id);
      deleted('Contacto');
      setDeleteContactoModal({ isOpen: false, contacto: null });
      loadContactos(id);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">

        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (error || !cliente) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">

        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Cliente no encontrado</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{error || 'El cliente solicitado no existe'}</p>
            <Button variant="primary" onClick={() => navigate('/clientes')}>
              Volver a Clientes
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  // ✅ TABS ACTUALIZADOS - Incluye Usuarios Portal
  const tabs = [
    { id: 'info', label: 'Información', icon: Building2 },
    { id: 'contactos', label: `Contactos (${contactos.length})`, icon: User },
    // ← NUEVO TAB (solo visible si tiene permisos)
    ...(canManageUsers ? [{ id: 'usuarios', label: 'Usuarios Portal', icon: Users }] : []),
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  // Calcular productos en bodega desde los datos cargados
  const productosEnBodega = productosCliente.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">


      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/clientes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="relative group">
                {cliente.logo_url ? (
                  <img
                    src={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${cliente.logo_url}`}
                    alt={cliente.razon_social}
                    className="w-14 h-14 rounded-2xl object-contain bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600"
                  />
                ) : (
                  <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
                    <Building2 className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                  </div>
                )}
                {canEdit && (
                  <>
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="absolute inset-0 bg-black/0 group-hover:bg-black/40 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Cambiar logo"
                    >
                      <Camera className="w-5 h-5 text-white" />
                    </button>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{cliente.razon_social}</h1>
                  <StatusChip status={cliente.estado} />
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  {cliente.codigo_cliente} • NIT: {cliente.nit}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {canEdit && (
              <Button variant="outline" icon={Pencil} onClick={() => setEditModal(true)}>
                Editar
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleteModal(true)}>
                Eliminar
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Operaciones del Mes"
            value={cliente.operaciones_mes || 0}
            icon={Truck}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <KpiCard
            title="Crédito Aprobado"
            value={formatCurrency(cliente.credito_aprobado)}
            icon={DollarSign}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KpiCard
            title="Productos en Bodega"
            value={loadingProductos ? '...' : productosEnBodega}
            icon={Package}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
            onClick={() => navigate(`/inventario?cliente_id=${id}`)}
            className="cursor-pointer hover:shadow-md transition-shadow"
          />
          <KpiCard
            title="Contactos"
            value={contactos.length}
            icon={User}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        {/* TABS */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6">
          <div className="border-b border-gray-100 dark:border-slate-700">
            <nav className="flex px-6">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-4 px-4 text-sm font-medium transition-colors relative flex items-center gap-2
                      ${activeTab === tab.id
                        ? 'text-orange-600 dark:text-orange-400'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }
                    `}
                  >
                    <TabIcon className="w-4 h-4" />
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Tab: Información */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Información General */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">Información General</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 dark:text-slate-400 w-32">Tipo:</span>
                      <span className="text-slate-800 dark:text-slate-200">{formatTipoCliente(cliente.tipo_cliente)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 dark:text-slate-400 w-32">Sector:</span>
                      <span className="text-slate-800 dark:text-slate-200">{formatSector(cliente.sector)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 dark:text-slate-400 w-32">Cliente desde:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {cliente.fecha_inicio_relacion
                          ? new Date(cliente.fecha_inicio_relacion).toLocaleDateString('es-CO')
                          : cliente.created_at
                            ? new Date(cliente.created_at).toLocaleDateString('es-CO')
                            : '-'
                        }
                      </span>
                    </div>
                    {cliente.codigo_wms && (
                      <div className="flex items-center gap-3 text-sm">
                        <Database className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <span className="text-slate-500 dark:text-slate-400 w-32">Código WMS:</span>
                        <span className="text-slate-800 dark:text-slate-200 font-mono">{cliente.codigo_wms}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información de Contacto */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">Contacto</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-slate-800 dark:text-slate-200">{cliente.direccion || '-'}</p>
                        {(cliente.ciudad || cliente.departamento) && (
                          <p className="text-slate-500 dark:text-slate-400">
                            {[cliente.ciudad, cliente.departamento].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-800 dark:text-slate-200">{cliente.telefono || '-'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-800 dark:text-slate-200">{cliente.email || '-'}</span>
                    </div>
                    {cliente.sitio_web && (
                      <div className="flex items-center gap-3 text-sm">
                        <Globe className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <a
                          href={cliente.sitio_web}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 dark:text-orange-400 hover:underline"
                        >
                          {cliente.sitio_web}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Información Comercial */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">Información Comercial</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <DollarSign className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 dark:text-slate-400 w-32">Crédito aprobado:</span>
                      <span className="text-slate-800 dark:text-slate-200">{formatCurrency(cliente.credito_aprobado)}</span>
                    </div>
                  </div>
                </div>

                {/* Observaciones */}
                {cliente.notas && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">Observaciones</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl whitespace-pre-wrap">
                      {cliente.notas}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Tab: Contactos */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'contactos' && (
              <div>
                {canEdit && (
                  <div className="flex justify-end mb-4">
                    <Button
                      variant="primary"
                      icon={Plus}
                      size="sm"
                      onClick={() => setContactoModal({ isOpen: true, contacto: null })}
                    >
                      Agregar Contacto
                    </Button>
                  </div>
                )}

                {loadingContactos ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-32 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : contactos.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 mb-4">No hay contactos registrados</p>
                    {canEdit && (
                      <Button
                        variant="primary"
                        icon={Plus}
                        size="sm"
                        onClick={() => setContactoModal({ isOpen: true, contacto: null })}
                      >
                        Agregar Primer Contacto
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {contactos.map((contacto) => (
                      <ContactCard
                        key={contacto.id}
                        contacto={contacto}
                        canEdit={canEdit}
                        onEdit={() => setContactoModal({ isOpen: true, contacto })}
                        onDelete={() => setDeleteContactoModal({ isOpen: true, contacto })}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Tab: Usuarios Portal (NUEVO) */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'usuarios' && canManageUsers && (
              <UsuariosCliente
                clienteId={cliente.id}
                clienteNombre={cliente.razon_social}
              />
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Tab: Historial */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'historial' && (
              <div>
                {loadingHistorial ? (
                  <div className="space-y-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="h-20 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : historial.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">No hay operaciones registradas</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      Las operaciones de entrada y salida del cliente aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historial.map((actividad) => (
                      <ActivityItem key={actividad.id} actividad={actividad} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>

      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ════════════════════════════════════════════════════════════════════ */}

      <ClienteForm
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        onSubmit={handleEditCliente}
        cliente={cliente}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteCliente}
        title="Eliminar Cliente"
        message={`¿Estás seguro de eliminar "${cliente.razon_social}"? Esta acción eliminará todos los datos asociados.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />

      <ContactoFormModal
        isOpen={contactoModal.isOpen}
        onClose={() => setContactoModal({ isOpen: false, contacto: null })}
        onSubmit={handleSaveContacto}
        contacto={contactoModal.contacto}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={deleteContactoModal.isOpen}
        onClose={() => setDeleteContactoModal({ isOpen: false, contacto: null })}
        onConfirm={handleDeleteContacto}
        title="Eliminar Contacto"
        message={`¿Eliminar a "${deleteContactoModal.contacto?.nombre}" de los contactos?`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default ClienteDetail;