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
import { useParams, useNavigate, Link } from 'react-router-dom';
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
  Package,
  Camera,
  ClipboardCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Star,
  Bell,
} from 'lucide-react';

// Layout

// Components
import { Button, StatusChip, KpiCard, ConfirmDialog, FilterDropdown } from '../../components/common';
import S3Image from '../../components/common/S3Image';

// Local Components
import ClienteForm from './components/ClienteForm';
import UsuariosCliente from './components/UsuariosCliente';

// Hooks
import useClientes from '../../hooks/useClientes';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { formatDateShort } from '../../utils/formatDate';

// Services
import inventarioService from '../../api/inventario.service';
import clientesService from '../../api/clientes.service';
import solicitudesService from '../../api/solicitudes.service';
import adminService from '../../api/admin.service';
import contactosService from '@api/contactos.service';
import PageFooter from '@components/common/PageFooter';
import { comprimirImagen, COMPRESS_PRESETS } from '../../utils/compressImage';

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

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Item de actividad/historial
 */
const ESTADO_CONFIG = {
  cerrado: {
    label: 'Cerrado',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    color: 'text-emerald-700 dark:text-emerald-400',
  },
  en_proceso: {
    label: 'En Proceso',
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    color: 'text-blue-700 dark:text-blue-400',
  },
  anulado: {
    label: 'Anulado',
    bg: 'bg-red-100 dark:bg-red-900/30',
    color: 'text-red-700 dark:text-red-400',
  },
  borrador: {
    label: 'Borrador',
    bg: 'bg-slate-100 dark:bg-centhrix-surface',
    color: 'text-slate-700 dark:text-slate-300',
  },
};

const ActivityItem = ({ actividad }) => {
  const iconConfig = {
    operacion: {
      icon: Truck,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      color: 'text-blue-600 dark:text-blue-400',
    },
    despacho: {
      icon: Truck,
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      color: 'text-blue-600 dark:text-blue-400',
    },
    llamada: {
      icon: Phone,
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      color: 'text-emerald-600 dark:text-emerald-400',
    },
    documento: {
      icon: FileCheck,
      bg: 'bg-violet-100 dark:bg-violet-900/30',
      color: 'text-violet-600 dark:text-violet-400',
    },
    nota: {
      icon: MessageSquare,
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      color: 'text-amber-600 dark:text-amber-400',
    },
    creacion: {
      icon: Building2,
      bg: 'bg-slate-100 dark:bg-centhrix-surface',
      color: 'text-slate-600 dark:text-slate-300',
    },
    actualizar: {
      icon: Pencil,
      bg: 'bg-orange-100 dark:bg-orange-900/30',
      color: 'text-orange-600 dark:text-orange-400',
    },
    login: {
      icon: User,
      bg: 'bg-green-100 dark:bg-green-900/30',
      color: 'text-green-600 dark:text-green-400',
    },
  };

  const config = iconConfig[actividad.tipo] || iconConfig[actividad.accion] || iconConfig.nota;
  const Icon = config.icon;
  const estadoConfig = ESTADO_CONFIG[actividad.estado];

  return (
    <div className="flex gap-4">
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.bg}`}
      >
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
            <span
              className={`text-xs px-2 py-1 rounded-full ${estadoConfig.bg} ${estadoConfig.color}`}
            >
              {estadoConfig.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(actividad.fecha || actividad.created_at).toLocaleString('es-CO')}
          </span>
          {actividad.usuario && (
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {actividad.usuario}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ClienteDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission, isAdmin, isCliente } = useAuth();
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
  } = useClientes({ autoFetch: false });

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS LOCALES
  // ──────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState('info');

  // Contactos M:N
  const [contactosCliente, setContactosCliente] = useState([]);
  const [loadingContactos, setLoadingContactos] = useState(false);
  const [contactoParaAsignar, setContactoParaAsignar] = useState('');
  const [esPrincipalAsignar, setEsPrincipalAsignar] = useState(false);
  const [showAsignarForm, setShowAsignarForm] = useState(false);
  const [confirmDesasignar, setConfirmDesasignar] = useState(null); // { id, nombre }
  const [opcionesContactos, setOpcionesContactos] = useState([]);
  const [asignandoContacto, setAsignandoContacto] = useState(false);

  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [historialPage, setHistorialPage] = useState(1);
  const HISTORIAL_POR_PAGINA = 15;

  // Estado para productos del cliente
  const [_productosCliente, setProductosCliente] = useState([]);
  const [totalProductos, setTotalProductos] = useState(0);
  const [loadingProductos, setLoadingProductos] = useState(false);

  // Solicitudes
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudesLoading, setSolicitudesLoading] = useState(false);
  const [solicitudesPag, setSolicitudesPag] = useState({ total: 0, page: 1, totalPages: 1 });

  // Responsables
  const [responsables, setResponsables] = useState([]);
  const [responsablesLoading, setResponsablesLoading] = useState(false);
  const [usuariosInternos, setUsuariosInternos] = useState([]);
  const [nuevoResponsableId, setNuevoResponsableId] = useState('');
  const [agregandoResponsable, setAgregandoResponsable] = useState(false);

  // Modals
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // PERMISOS
  // ──────────────────────────────────────────────────────────────────────────

  const canEdit = hasPermission('clientes', 'editar');
  const canEditLogo = canEdit && user?.rol !== 'supervisor';
  const canDelete = hasPermission('clientes', 'eliminar');
  const canManageUsers = hasPermission('usuarios', 'ver');

  // Ref para input file de logo
  const logoInputRef = useRef(null);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const fileComprimido = await comprimirImagen(file, COMPRESS_PRESETS.AVATAR);
      const response = await clientesService.uploadLogo(id, fileComprimido);
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

  const fetchContactosCliente = useCallback(async (clienteId) => {
    setLoadingContactos(true);
    try {
      const res = await contactosService.getContactosCliente(clienteId);
      const raw = res?.data;
      setContactosCliente(Array.isArray(raw) ? raw : (raw?.rows ?? res?.rows ?? []));
    } catch (err) {
      apiError(err.message || 'Error al cargar contactos');
      setContactosCliente([]);
    } finally {
      setLoadingContactos(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchOpcionesContactos = useCallback(async (clienteId) => {
    try {
      const res = await contactosService.getAll({ activo: true, limit: 200 });
      const raw = res?.data;
      setOpcionesContactos(Array.isArray(raw) ? raw : (raw?.rows ?? res?.rows ?? []));
    } catch {
      setOpcionesContactos([]);
    }
  }, []);

  // Cargar historial del cliente
  const loadHistorial = useCallback(async (clienteId) => {
    setLoadingHistorial(true);
    try {
      const response = await clientesService.getHistorial(clienteId, { limit: 300 });
      if (response?.success) {
        setHistorial(response.data || []);
        setHistorialPage(1);
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
        setTotalProductos(response.paginacion?.total ?? (response.data?.length || 0));
      } else {
        setProductosCliente([]);
        setTotalProductos(0);
      }
    } catch (err) {
      console.error('Error cargando productos del cliente:', err);
      setProductosCliente([]);
      setTotalProductos(0);
    } finally {
      setLoadingProductos(false);
    }
  }, []);

  useEffect(() => {
    if (id) {
      fetchCliente(id);
      fetchContactosCliente(id);
      fetchOpcionesContactos(id);
      loadProductosCliente(id);
      loadHistorial(id);
    }
  }, [id, fetchCliente, fetchContactosCliente, fetchOpcionesContactos, loadProductosCliente, loadHistorial]);

  const fetchSolicitudesCliente = async () => {
    if (!id) return;
    setSolicitudesLoading(true);
    try {
      const res = await solicitudesService.getPorCliente(id, { limit: 20, page: solicitudesPag.page });
      setSolicitudes(res.data || []);
      if (res.pagination) setSolicitudesPag(res.pagination);
    } catch {
      // silencioso
    } finally {
      setSolicitudesLoading(false);
    }
  };

  const fetchResponsables = async () => {
    if (!id) return;
    setResponsablesLoading(true);
    try {
      const res = await clientesService.getResponsables(id);
      setResponsables(res.data || []);
    } catch {
      // silencioso
    } finally {
      setResponsablesLoading(false);
    }
  };

  const fetchUsuariosInternos = async () => {
    try {
      const res = await adminService.getUsuarios({ limit: 200 });
      const usuarios = Array.isArray(res.data) ? res.data : res.data?.rows || res.data?.usuarios || [];
      setUsuariosInternos(usuarios.filter((u) => ['admin', 'supervisor', 'operador'].includes(u.rol)));
    } catch {
      // silencioso
    }
  };

  useEffect(() => {
    if (activeTab === 'solicitudes') {
      fetchSolicitudesCliente();
      fetchResponsables();
      fetchUsuariosInternos();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, id]);

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

  const handleAsignarContacto = async () => {
    if (!contactoParaAsignar) return;
    setAsignandoContacto(true);
    try {
      await contactosService.asignarACliente(id, {
        contacto_id: Number(contactoParaAsignar),
        es_principal: esPrincipalAsignar,
      });
      success('Contacto asignado');
      setContactoParaAsignar('');
      setEsPrincipalAsignar(false);
      setShowAsignarForm(false);
      fetchContactosCliente(id);
      fetchOpcionesContactos(id);
    } catch (err) {
      apiError(err.message || 'Error al asignar contacto');
    } finally {
      setAsignandoContacto(false);
    }
  };

  const handleDesasignarContacto = async () => {
    if (!confirmDesasignar) return;
    try {
      await contactosService.desasignarDeCliente(id, confirmDesasignar.id);
      success('Contacto desasignado');
      setConfirmDesasignar(null);
      fetchContactosCliente(id);
      fetchOpcionesContactos(id);
    } catch (err) {
      apiError(err.message || 'Error al desasignar contacto');
    }
  };

  const handleMarcarPrincipal = async (contactoId) => {
    try {
      await contactosService.asignarACliente(id, {
        contacto_id: contactoId,
        es_principal: true,
      });
      success('Contacto marcado como principal');
      fetchContactosCliente(id);
    } catch (err) {
      apiError(err.message || 'Error al marcar como principal');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <main className="pt-28 px-4 pb-8 max-w-[1700px] mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-centhrix-surface rounded w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-centhrix-surface rounded-2xl" />
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-centhrix-surface rounded-2xl" />
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
        <main className="pt-28 px-4 pb-8 max-w-[1700px] mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Cliente no encontrado
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {error || 'El cliente solicitado no existe'}
            </p>
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

  const tabs = [
    { id: 'info', label: 'Información', icon: Building2 },
    { id: 'contactos', label: `Contactos (${contactosCliente.length})`, icon: User },
    ...(canManageUsers ? [{ id: 'usuarios', label: 'Usuarios Portal', icon: Users }] : []),
    ...(!isCliente() ? [{ id: 'solicitudes', label: 'Solicitudes', icon: ClipboardCheck }] : []),
    { id: 'historial', label: 'Historial', icon: Clock },
  ];

  const productosEnBodega = cliente?.total_productos ?? totalProductos;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-[1700px] mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 gap-2">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={() => navigate('/clientes')}
              className="p-2 flex-shrink-0 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-centhrix-card rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="relative group flex-shrink-0">
                <S3Image
                  src={cliente.logo_url}
                  alt={cliente.razon_social}
                  className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl object-contain bg-white dark:bg-centhrix-surface border border-slate-200 dark:border-slate-600"
                  placeholderCls="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl"
                  fallback={
                    <div className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 sm:w-7 sm:h-7 text-orange-600 dark:text-orange-400" />
                    </div>
                  }
                />
                {canEditLogo && (
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
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-bold text-slate-800 dark:text-slate-100 truncate">
                    {cliente.razon_social}
                  </h1>
                  <StatusChip status={cliente.estado} />
                </div>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate">
                  {cliente.codigo_cliente} • NIT: {cliente.nit}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            {canEdit && (
              <Button
                variant="outline"
                icon={Pencil}
                onClick={() => setEditModal(true)}
                title="Editar"
              >
                <span className="hidden sm:inline">Editar</span>
              </Button>
            )}
            {canDelete && (
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => setDeleteModal(true)}
                title="Eliminar"
              >
                <span className="hidden sm:inline">Eliminar</span>
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div id="tour-cliente-kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <KpiCard
            title="Operaciones del Mes"
            value={cliente.operaciones_mes || 0}
            icon={Truck}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
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
            value={contactosCliente.length}
            icon={User}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
          />
        </div>

        {/* TABS */}
        <div id="tour-cliente-tabs" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 mb-6">
          <div className="border-b border-gray-100 dark:border-slate-700 overflow-x-auto">
            <nav className="flex px-2 sm:px-6 min-w-max">
              {tabs.map((tab) => {
                const TabIcon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      py-3 sm:py-4 px-3 sm:px-4 text-xs sm:text-sm font-medium transition-colors relative flex items-center gap-1.5 whitespace-nowrap
                      ${
                        activeTab === tab.id
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                      }
                    `}
                    title={tab.label}
                  >
                    <TabIcon className="w-4 h-4 flex-shrink-0" />
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
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                    Información General
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Building2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 dark:text-slate-400 w-32">Tipo:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {formatTipoCliente(cliente.tipo_cliente)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <FileText className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 dark:text-slate-400 w-32">Sector:</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {formatSector(cliente.sector)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-500 dark:text-slate-400 w-32">
                        Cliente desde:
                      </span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {cliente.fecha_inicio_relacion
                          ? formatDateShort(cliente.fecha_inicio_relacion)
                          : formatDateShort(cliente.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Información de Contacto */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">Contacto</h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <MapPin className="w-5 h-5 text-slate-400 dark:text-slate-500 mt-0.5" />
                      <div>
                        <p className="text-slate-800 dark:text-slate-200">
                          {cliente.direccion || '-'}
                        </p>
                        {(cliente.ciudad || cliente.departamento) && (
                          <p className="text-slate-500 dark:text-slate-400">
                            {[cliente.ciudad, cliente.departamento].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Phone className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-800 dark:text-slate-200">
                        {cliente.telefono || '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                      <span className="text-slate-800 dark:text-slate-200">
                        {cliente.email || '-'}
                      </span>
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

                {/* Observaciones */}
                {cliente.notas && (
                  <div className="space-y-4">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                      Observaciones
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-centhrix-bg/50 p-4 rounded-xl whitespace-pre-wrap">
                      {cliente.notas}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Tab: Contactos (M:N - asignación) */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'contactos' && (
              <div>
                {/* Header del tab */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                      Contactos asignados
                    </h4>
                    <span className="text-xs bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                      {contactosCliente.length}
                    </span>
                  </div>
                  {hasPermission('contactos', 'editar') && (
                    <Button
                      variant="primary"
                      icon={Plus}
                      size="sm"
                      onClick={() => setShowAsignarForm((v) => !v)}
                    >
                      Asignar contacto
                    </Button>
                  )}
                </div>

                {/* Formulario de asignación (expandible) */}
                {showAsignarForm && (
                  <div className="mb-4 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-centhrix-bg/50 space-y-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Seleccionar contacto para asignar
                    </p>
                    <FilterDropdown
                      options={[
                        { value: '', label: 'Seleccionar contacto...' },
                        ...opcionesContactos
                          .filter((c) => !contactosCliente.find((a) => a.id === c.id))
                          .map((c) => ({
                            value: String(c.id),
                            label: `${c.nombre}${c.cargo ? ` — ${c.cargo}` : ''}`,
                          })),
                      ]}
                      value={String(contactoParaAsignar || '')}
                      onChange={(v) => setContactoParaAsignar(v)}
                    />
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={esPrincipalAsignar}
                        onChange={(e) => setEsPrincipalAsignar(e.target.checked)}
                        className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        Marcar como principal
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleAsignarContacto}
                        loading={asignandoContacto}
                        disabled={!contactoParaAsignar}
                      >
                        Confirmar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setShowAsignarForm(false);
                          setContactoParaAsignar('');
                          setEsPrincipalAsignar(false);
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Tabla de contactos asignados */}
                {loadingContactos ? (
                  <div className="space-y-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-12 bg-gray-100 dark:bg-centhrix-surface rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : contactosCliente.length === 0 ? (
                  <div className="text-center py-12">
                    <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 mb-1">
                      No hay contactos asignados a este cliente.
                    </p>
                    {hasPermission('contactos', 'ver') && (
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        Ve al{' '}
                        <Link
                          to="/contactos"
                          className="text-orange-500 hover:text-orange-600 dark:hover:text-orange-400 underline"
                        >
                          Directorio de Contactos
                        </Link>{' '}
                        para crear y gestionar el directorio global.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-700">
                          {['Nombre', 'Tipo', 'Cargo', 'Email', 'Teléfono', 'Notificaciones', 'Principal', ''].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                        {contactosCliente.map((c) => (
                          <tr
                            key={c.id}
                            className="hover:bg-slate-50 dark:hover:bg-centhrix-surface/50 transition-colors"
                          >
                            <td className="px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200">
                              {c.nombre}
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  c.tipo === 'istho'
                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                    : 'bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                {c.tipo === 'istho' ? 'ISTHO' : 'Externo'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                              {c.cargo || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                              {c.email || '—'}
                            </td>
                            <td className="px-3 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                              {c.telefono_principal || c.telefono || '—'}
                            </td>
                            <td className="px-3 py-2.5">
                              {c.recibe_notificaciones ? (
                                <div className="flex flex-wrap gap-1">
                                  {(c.tipos_notificacion || ['todas']).includes('todas') ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium bg-[#E74C3C]/15 text-[#E74C3C]">
                                      <Bell className="w-2.5 h-2.5" />
                                      Todas
                                    </span>
                                  ) : (
                                    <>
                                      {(c.tipos_notificacion || []).includes('ingreso') && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                          Ingreso
                                        </span>
                                      )}
                                      {(c.tipos_notificacion || []).includes('salida') && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                          Salida
                                        </span>
                                      )}
                                      {(c.tipos_notificacion || []).includes('kardex') && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-600 dark:text-violet-400">
                                          Kardex
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-600 italic">Sin notif.</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {c.es_principal ? (
                                <span className="text-amber-400" title="Contacto principal">
                                  <Star className="w-4 h-4" fill="currentColor" />
                                </span>
                              ) : user?.rol === 'admin' ? (
                                <button
                                  onClick={() => handleMarcarPrincipal(c.id)}
                                  className="text-slate-300 hover:text-amber-400 dark:text-slate-600 dark:hover:text-amber-400 transition-colors"
                                  title="Marcar como principal"
                                >
                                  <Star className="w-4 h-4" />
                                </button>
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">
                                  <Star className="w-4 h-4" />
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              {hasPermission('contactos', 'editar') && (
                                <button
                                  onClick={() =>
                                    setConfirmDesasignar({ id: c.id, nombre: c.nombre })
                                  }
                                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                >
                                  Desasignar
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                canCreate={hasPermission('usuarios', 'crear')}
              />
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Tab: Solicitudes */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'solicitudes' && (
              <div className="space-y-6">
                {/* Tabla de solicitudes del cliente */}
                <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Solicitudes del Cliente</h3>
                    <button
                      onClick={() => fetchSolicitudesCliente()}
                      className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" /> Actualizar
                    </button>
                  </div>
                  {solicitudesLoading ? (
                    <div className="py-8 text-center text-slate-400 text-sm">Cargando...</div>
                  ) : solicitudes.length === 0 ? (
                    <div className="py-8 text-center text-slate-400 text-sm">Sin solicitudes</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100 dark:border-slate-700">
                          {['N° Solicitud', 'Tipo', 'Fecha', 'Estado'].map((h) => (
                            <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                        {solicitudes.map((s) => {
                          const ESTADO_COLOR = {
                            recibida: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                            en_proceso: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                            completada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            rechazada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          };
                          return (
                            <tr
                              key={s.id}
                              onClick={() => navigate(`/solicitudes/${s.id}`)}
                              className="hover:bg-slate-50 dark:hover:bg-centhrix-surface cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-2.5 text-sm font-mono text-slate-700 dark:text-slate-200">{s.numero_solicitud}</td>
                              <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 capitalize">
                                {s.tipo === 'ingreso' ? 'Ingreso' : 'Despacho'}
                              </td>
                              <td className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">
                                {s.fecha_estimada
                                  ? new Date(s.fecha_estimada + 'T00:00:00').toLocaleDateString('es-CO')
                                  : new Date(s.created_at).toLocaleDateString('es-CO')}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ESTADO_COLOR[s.estado] || ''}`}>
                                  {s.estado}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Sección responsables — solo admin */}
                {isAdmin() && (
                  <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
                    <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Equipo ISTHO Asignado</h3>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
                      Estos usuarios reciben las notificaciones y emails cuando este cliente envía una solicitud.
                    </p>

                    {/* Lista de responsables */}
                    <div className="space-y-2 mb-4">
                      {responsablesLoading ? (
                        <div className="py-4 text-center text-slate-400 text-sm">Cargando...</div>
                      ) : responsables.length === 0 ? (
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Sin responsables asignados. Las solicitudes se notificarán a todos los administradores.
                        </p>
                      ) : (
                        responsables.map((r) => (
                          <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-centhrix-surface rounded-xl">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600">
                                {(r.nombre_completo || r.nombre || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.nombre_completo || `${r.nombre || ''} ${r.apellido || ''}`.trim() || r.email}</p>
                                <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{r.rol} · {r.email}</p>
                              </div>
                            </div>
                            <button
                              onClick={async () => {
                                try {
                                  await clientesService.removeResponsable(id, r.usuario_id);
                                  fetchResponsables();
                                } catch {
                                  apiError('Error al remover responsable');
                                }
                              }}
                              className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              Quitar
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Agregar responsable */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <FilterDropdown
                          options={[
                            { value: '', label: 'Seleccionar usuario...' },
                            ...usuariosInternos
                              .filter((u) => !responsables.find((r) => r.usuario_id === u.id))
                              .map((u) => ({ value: String(u.id), label: `${u.nombre_completo || `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.username} (${u.rol})` })),
                          ]}
                          value={nuevoResponsableId}
                          onChange={setNuevoResponsableId}
                        />
                      </div>
                      <button
                        disabled={!nuevoResponsableId || agregandoResponsable}
                        onClick={async () => {
                          setAgregandoResponsable(true);
                          try {
                            await clientesService.addResponsable(id, Number(nuevoResponsableId));
                            setNuevoResponsableId('');
                            fetchResponsables();
                            success('Responsable asignado correctamente');
                          } catch (err) {
                            apiError(err.message || 'Error al asignar responsable');
                          } finally {
                            setAgregandoResponsable(false);
                          }
                        }}
                        className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors"
                      >
                        {agregandoResponsable ? 'Asignando...' : 'Asignar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ══════════════════════════════════════════════════════════════ */}
            {/* Tab: Historial */}
            {/* ══════════════════════════════════════════════════════════════ */}
            {activeTab === 'historial' && (
              <div>
                {loadingHistorial ? (
                  <div className="space-y-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="h-20 bg-gray-100 dark:bg-centhrix-surface rounded-xl animate-pulse"
                      />
                    ))}
                  </div>
                ) : historial.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400">
                      No hay operaciones registradas
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                      Las operaciones de entrada y salida del cliente aparecerán aquí
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {historial
                        .slice((historialPage - 1) * HISTORIAL_POR_PAGINA, historialPage * HISTORIAL_POR_PAGINA)
                        .map((actividad) => (
                          <ActivityItem key={actividad.id} actividad={actividad} />
                        ))}
                    </div>
                    {historial.length > HISTORIAL_POR_PAGINA && (
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {(historialPage - 1) * HISTORIAL_POR_PAGINA + 1}–
                          {Math.min(historialPage * HISTORIAL_POR_PAGINA, historial.length)} de {historial.length}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setHistorialPage((p) => Math.max(1, p - 1))}
                            disabled={historialPage === 1}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-centhrix-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <span className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                            {historialPage} / {Math.ceil(historial.length / HISTORIAL_POR_PAGINA)}
                          </span>
                          <button
                            onClick={() => setHistorialPage((p) => Math.min(Math.ceil(historial.length / HISTORIAL_POR_PAGINA), p + 1))}
                            disabled={historialPage === Math.ceil(historial.length / HISTORIAL_POR_PAGINA)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-centhrix-surface disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <PageFooter />
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

      <ConfirmDialog
        isOpen={!!confirmDesasignar}
        onClose={() => setConfirmDesasignar(null)}
        onConfirm={handleDesasignarContacto}
        title="Desasignar Contacto"
        message={`¿Desasignar a "${confirmDesasignar?.nombre}" de este cliente?`}
        confirmText="Desasignar"
        type="danger"
      />

    </div>
  );
};

export default ClienteDetail;
