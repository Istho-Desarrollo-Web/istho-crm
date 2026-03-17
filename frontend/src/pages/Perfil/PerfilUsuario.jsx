/**
 * ============================================================================
 * ISTHO CRM - PerfilUsuario
 * ============================================================================
 * Página de perfil de usuario con datos reales, modo oscuro y adaptación
 * para usuarios portal (cliente).
 *
 * @author Coordinación TI ISTHO
 * @version 3.0.0
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Shield,
  Bell,
  Key,
  Camera,
  Pencil,
  Save,
  X,
  Clock,
  Award,
  Activity,
  FileText,
  Settings,
  LogOut,
  CheckCircle,
  Eye,
  EyeOff,
  AlertTriangle,
} from 'lucide-react';

// Components
import { Button, Modal, StatusChip } from '../../components/common';

// Hooks e integración
import { useAuth } from '../../context/AuthContext';
import useNotification from '../../hooks/useNotification';
import authService from '../../api/auth.service';
import usuarioService from '../../api/usuarioService';
import { getServerFileUrl } from '../../api/client';

// ════════════════════════════════════════════════════════════════════════════
// MODAL EDITAR PERFIL
// ════════════════════════════════════════════════════════════════════════════
const EditProfileModal = ({ isOpen, onClose, usuario, onSave, loading }) => {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre || '',
        apellido: usuario.apellido || '',
        telefono: usuario.telefono || '',
        cargo: usuario.cargo || '',
        departamento: usuario.departamento || '',
      });
    }
  }, [usuario]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    onSave(formData);
  };

  const inputClasses = 'w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';
  const readOnlyClasses = 'w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Perfil"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Save} onClick={handleSubmit} loading={loading}>
            Guardar Cambios
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre</label>
            <input
              type="text"
              value={formData.nombre || ''}
              onChange={(e) => handleChange('nombre', e.target.value)}
              className={inputClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Apellido</label>
            <input
              type="text"
              value={formData.apellido || ''}
              onChange={(e) => handleChange('apellido', e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
          <input
            type="tel"
            value={formData.telefono || ''}
            onChange={(e) => handleChange('telefono', e.target.value)}
            className={inputClasses}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cargo</label>
            <input
              type="text"
              value={formData.cargo || ''}
              readOnly
              className={readOnlyClasses}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Departamento</label>
            <input
              type="text"
              value={formData.departamento || ''}
              readOnly
              className={readOnlyClasses}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// INPUT DE CONTRASEÑA (fuera del modal para evitar re-mount en cada render)
// ════════════════════════════════════════════════════════════════════════════
const passwordInputClasses = 'w-full px-4 py-2.5 pr-10 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500';

const PasswordInput = ({ label, field, value, show, onChange, onToggleShow }) => (
  <div>
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(field, e.target.value)}
        className={passwordInputClasses}
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// MODAL CAMBIAR CONTRASEÑA
// ════════════════════════════════════════════════════════════════════════════
const ChangePasswordModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleShow = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (formData.newPassword.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (!/[A-Z]/.test(formData.newPassword)) {
      setError('Debe contener al menos una mayúscula');
      return;
    }
    if (!/[0-9]/.test(formData.newPassword)) {
      setError('Debe contener al menos un número');
      return;
    }
    onSubmit(formData);
  };

  useEffect(() => {
    if (isOpen) {
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
      setError('');
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cambiar Contraseña"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon={Key} onClick={handleSubmit} loading={loading}>
            Cambiar Contraseña
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <PasswordInput label="Contraseña Actual" field="currentPassword" value={formData.currentPassword} show={showPasswords.current} onChange={handleChange} onToggleShow={() => toggleShow('current')} />
        <PasswordInput label="Nueva Contraseña" field="newPassword" value={formData.newPassword} show={showPasswords.new} onChange={handleChange} onToggleShow={() => toggleShow('new')} />
        <PasswordInput label="Confirmar Contraseña" field="confirmPassword" value={formData.confirmPassword} show={showPasswords.confirm} onChange={handleChange} onToggleShow={() => toggleShow('confirm')} />

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-3 space-y-1">
          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Requisitos:</p>
          {[
            { ok: formData.newPassword.length >= 8, text: 'Mínimo 8 caracteres' },
            { ok: /[A-Z]/.test(formData.newPassword), text: 'Al menos una mayúscula' },
            { ok: /[a-z]/.test(formData.newPassword), text: 'Al menos una minúscula' },
            { ok: /[0-9]/.test(formData.newPassword), text: 'Al menos un número' },
          ].map((req, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center ${
                req.ok ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
              }`}>
                {req.ok && <span className="text-white text-[8px]">✓</span>}
              </div>
              <span className={req.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ════════════════════════════════════════════════════════════════════════════

const InfoCard = ({ title, icon: Icon, children, action }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />}
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      </div>
      {action}
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const StatCardMini = ({ icon: Icon, label, value, color }) => (
  <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-transparent dark:border-slate-700">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
    <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtener iniciales del usuario
 */
const getInitials = (user) => {
  if (user.nombre && user.apellido) {
    return `${user.nombre[0]}${user.apellido[0]}`.toUpperCase();
  }
  if (user.nombre_completo) {
    const parts = user.nombre_completo.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0][0].toUpperCase();
  }
  return (user.username || 'U')[0].toUpperCase();
};

/**
 * Obtener nombre display
 */
const getDisplayName = (user) => {
  if (user.nombre && user.apellido) return `${user.nombre} ${user.apellido}`;
  if (user.nombre_completo) return user.nombre_completo;
  return user.username || 'Usuario';
};

/**
 * Calcular antigüedad
 */
const calcularAntiguedad = (fecha) => {
  if (!fecha) return '-';
  const ingreso = new Date(fecha);
  const hoy = new Date();
  const diff = hoy - ingreso;
  const years = Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  const months = Math.floor((diff % (365.25 * 24 * 60 * 60 * 1000)) / (30.44 * 24 * 60 * 60 * 1000));

  if (years > 0) return `${years} año${years > 1 ? 's' : ''}, ${months} mes${months > 1 ? 'es' : ''}`;
  if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  return `${days} día${days !== 1 ? 's' : ''}`;
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const PerfilUsuario = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser, hasPermission, isCliente, checkPermission } = useAuth();
  const { success, error: apiError } = useNotification();

  // Estados
  const [permisos, setPermisos] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');

  // Modals
  const [editModal, setEditModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);

  // Cargar permisos
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const permisosResponse = await usuarioService.getPermisos();
        if (permisosResponse.success && permisosResponse.data) {
          setPermisos(permisosResponse.data);
        }
      } catch (err) {
        console.error('Error cargando permisos:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchData();
  }, [user]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleSaveProfile = async (data) => {
    setFormLoading(true);
    try {
      const response = await usuarioService.actualizarPerfil(data);
      if (response.success) {
        if (updateUser) updateUser(response.data || data);
        success('Perfil actualizado correctamente');
        setEditModal(false);
      } else {
        throw new Error(response.message || 'Error al actualizar perfil');
      }
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleChangePassword = async (data) => {
    setFormLoading(true);
    try {
      const result = await authService.changePassword({
        password_actual: data.currentPassword,
        password_nuevo: data.newPassword,
        confirmar_password: data.confirmPassword,
      });
      if (result.success) {
        success('Contraseña actualizada correctamente');
        setPasswordModal(false);
      } else {
        throw new Error(result.message || 'Error al cambiar contraseña');
      }
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      apiError('Solo se permiten archivos de imagen');
      return;
    }

    // Validar tamaño (2MB)
    if (file.size > 2 * 1024 * 1024) {
      apiError('La imagen no debe superar los 2MB');
      return;
    }

    setAvatarLoading(true);
    try {
      const response = await usuarioService.subirAvatar(file);
      if (response.success) {
        // Agregar cache-buster para forzar recarga de la imagen
        const avatarUrl = response.data.avatar_url;
        const bustUrl = avatarUrl.includes('?') ? `${avatarUrl}&t=${Date.now()}` : `${avatarUrl}?t=${Date.now()}`;
        updateUser({ avatar_url: bustUrl });
        success('Foto de perfil actualizada');
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      apiError(err);
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handleAvatarDelete = async () => {
    setAvatarLoading(true);
    try {
      const response = await usuarioService.eliminarAvatar();
      if (response.success) {
        updateUser({ avatar_url: null });
        success('Foto de perfil eliminada');
      } else {
        throw new Error(response.message);
      }
    } catch (err) {
      apiError(err);
    } finally {
      setAvatarLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 h-96 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIABLES DERIVADAS
  // ──────────────────────────────────────────────────────────────────────────

  const isPortalUser = user.rol === 'cliente';
  const clienteInfo = user.cliente_info;
  const displayName = getDisplayName(user);
  const initials = getInitials(user);

  // Permisos de perfil (usuarios internos siempre pueden, clientes dependen de permisos_cliente)
  const canChangePassword = isPortalUser ? hasPermission('perfil', 'cambiar_password') : true;
  const canEditProfile = isPortalUser ? hasPermission('perfil', 'editar') : true;

  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'permisos', label: 'Permisos' },
  ];

  // Construir tabla de permisos según tipo de usuario
  const permisosTabla = (() => {
    // Portal: usar permisos_cliente del user en AuthContext
    if (isPortalUser) {
      const portalPermisos = user.permisos?.permisos;
      if (!portalPermisos || typeof portalPermisos !== 'object') return [];
      return Object.entries(portalPermisos).map(([modulo, acciones]) => ({
        modulo,
        acciones: typeof acciones === 'object' ? acciones : {},
      }));
    }
    // Interno: usar permisos del servicio (array format)
    if (!permisos?.permisos) return [];
    return Object.entries(permisos.permisos).map(([modulo, acciones]) => ({
      modulo,
      acciones: Array.isArray(acciones)
        ? acciones.reduce((acc, a) => ({ ...acc, [a]: true }), {})
        : (typeof acciones === 'object' ? acciones : {}),
    }));
  })();

  // Catálogo de labels para portal
  const PORTAL_MODULO_LABELS = {
    inventario: 'Inventario',
    despachos: 'Despachos',
    reportes: 'Reportes',
    facturacion: 'Facturación',
    perfil: 'Perfil',
  };
  const PORTAL_ACCION_LABELS = {
    ver: 'Ver',
    exportar: 'Exportar',
    alertas: 'Alertas',
    crear_solicitud: 'Crear Solicitud',
    descargar_documentos: 'Descargar Documentos',
    descargar: 'Descargar',
    editar: 'Editar',
    cambiar_password: 'Cambiar Contraseña',
    crear: 'Crear',
    eliminar: 'Eliminar',
  };

  const diasActivo = Math.floor(
    (new Date() - new Date(user.created_at || Date.now())) / (1000 * 60 * 60 * 24)
  );

  // Rol label
  const rolLabels = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    operador: 'Operador',
    cliente: 'Portal Cliente',
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* HEADER CARD */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            {/* Avatar */}
            <div className="relative group">
              {user.avatar_url ? (
                <img
                  src={getServerFileUrl(user.avatar_url)}
                  alt={displayName}
                  className="w-24 h-24 rounded-2xl object-cover shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                  {initials}
                </div>
              )}
              {avatarLoading ? (
                <div className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <div className="absolute -bottom-2 -right-2 flex gap-1">
                  <label className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-md hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors cursor-pointer">
                    <Camera className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                  {user.avatar_url && (
                    <button
                      onClick={handleAvatarDelete}
                      className="p-2 bg-white dark:bg-slate-700 rounded-xl shadow-md hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                      title="Eliminar foto"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {displayName}
                </h1>
                <StatusChip status={user.activo !== false ? 'activo' : 'inactivo'} />
              </div>
              <p className="text-slate-500 dark:text-slate-400 mb-2">
                {user.cargo || rolLabels[user.rol] || 'Usuario'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </span>
                {user.telefono && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {user.telefono}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  <span className="capitalize">{rolLabels[user.rol] || user.rol}</span>
                </span>
                {isPortalUser && clienteInfo && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-4 h-4" />
                    {clienteInfo.razon_social}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {canChangePassword && (
                <Button variant="outline" icon={Key} onClick={() => setPasswordModal(true)}>
                  Cambiar Contraseña
                </Button>
              )}
              {canEditProfile && (
                <Button variant="primary" icon={Pencil} onClick={() => setEditModal(true)}>
                  Editar Perfil
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* STATS ROW */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCardMini icon={Activity} label="Rol" value={rolLabels[user.rol] || user.rol} color="bg-blue-500" />
          <StatCardMini icon={Building2} label={isPortalUser ? 'Cliente' : 'Departamento'} value={isPortalUser ? (clienteInfo?.razon_social?.split(' ')[0] || '-') : (user.departamento || 'Operaciones')} color="bg-emerald-500" />
          <StatCardMini icon={Clock} label="Último Acceso" value={user.ultimo_acceso ? new Date(user.ultimo_acceso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : 'N/A'} color="bg-violet-500" />
          <StatCardMini icon={Award} label="Días Activo" value={diasActivo} color="bg-amber-500" />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* MAIN GRID */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              {/* Tabs */}
              <div className="border-b border-gray-100 dark:border-slate-700">
                <nav className="flex px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-4 text-sm font-medium transition-colors relative ${
                        activeTab === tab.id
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                      }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Tab: Información */}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Datos Personales</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Nombre Completo</p>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{displayName}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Mail className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Correo Electrónico</p>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Teléfono</p>
                            <p className="font-medium text-slate-800 dark:text-slate-100">{user.telefono || 'No registrado'}</p>
                          </div>
                        </div>
                        {user.username && (
                          <div className="flex items-center gap-3 text-sm">
                            <User className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">Usuario</p>
                              <p className="font-medium text-slate-800 dark:text-slate-100 font-mono">{user.username}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Información Laboral</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Empresa</p>
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {isPortalUser && clienteInfo ? clienteInfo.razon_social : 'ISTHO S.A.S'}
                            </p>
                          </div>
                        </div>
                        {!isPortalUser && (
                          <div className="flex items-center gap-3 text-sm">
                            <MapPin className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">Sede</p>
                              <p className="font-medium text-slate-800 dark:text-slate-100">Centro Logístico Industrial del Norte</p>
                              <p className="text-xs text-slate-400">Girardota, Antioquia</p>
                            </div>
                          </div>
                        )}
                        {user.cargo && (
                          <div className="flex items-center gap-3 text-sm">
                            <Award className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">Cargo</p>
                              <p className="font-medium text-slate-800 dark:text-slate-100">{user.cargo}</p>
                            </div>
                          </div>
                        )}
                        {user.departamento && !isPortalUser && (
                          <div className="flex items-center gap-3 text-sm">
                            <Settings className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                            <div>
                              <p className="text-slate-500 dark:text-slate-400">Departamento</p>
                              <p className="font-medium text-slate-800 dark:text-slate-100">{user.departamento}</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                          <div>
                            <p className="text-slate-500 dark:text-slate-400">Fecha de Registro</p>
                            <p className="font-medium text-slate-800 dark:text-slate-100">
                              {user.created_at
                                ? new Date(user.created_at).toLocaleDateString('es-CO', {
                                    year: 'numeric', month: 'long', day: 'numeric'
                                  })
                                : 'No disponible'
                              }
                            </p>
                            {user.created_at && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">
                                Antigüedad: {calcularAntiguedad(user.created_at)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab: Permisos */}
                {activeTab === 'permisos' && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">Rol actual:</span>
                        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-sm font-medium">
                          {rolLabels[user.rol] || user.rol}
                        </span>
                      </div>
                    </div>

                    {permisosTabla.length > 0 ? (
                      isPortalUser ? (
                        /* Portal: mostrar cada módulo con sus acciones específicas */
                        <div className="space-y-3">
                          {permisosTabla.map((permiso, idx) => (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-700/30 rounded-lg p-4">
                              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">
                                {PORTAL_MODULO_LABELS[permiso.modulo] || permiso.modulo}
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(permiso.acciones).map(([accion, habilitado]) => (
                                  <span
                                    key={accion}
                                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                                      habilitado
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                        : 'bg-slate-200 dark:bg-slate-600/30 text-slate-400 dark:text-slate-500 line-through'
                                    }`}
                                  >
                                    {habilitado ? (
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    ) : (
                                      <X className="w-3.5 h-3.5" />
                                    )}
                                    {PORTAL_ACCION_LABELS[accion] || accion}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        /* Interno: tabla clásica con columnas fijas */
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-700/50">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Módulo</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Ver</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Crear</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Editar</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Eliminar</th>
                                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Exportar</th>
                              </tr>
                            </thead>
                            <tbody>
                              {permisosTabla.map((permiso, idx) => (
                                <tr key={idx} className="border-b border-gray-50 dark:border-slate-700">
                                  <td className="py-3 px-4 text-sm font-medium text-slate-800 dark:text-slate-200 capitalize">
                                    {permiso.modulo}
                                  </td>
                                  {['ver', 'crear', 'editar', 'eliminar', 'exportar'].map((accion) => (
                                    <td key={accion} className="py-3 px-4 text-center">
                                      {permiso.acciones[accion] ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto" />
                                      ) : (
                                        <X className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                        <Shield className="w-12 h-12 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                        <p>No se pudieron cargar los permisos</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sesión */}
            <InfoCard title="Sesión Actual" icon={Shield}>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Estado</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Activo
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">Último acceso</span>
                  <span className="text-slate-800 dark:text-slate-200 text-xs">
                    {user.ultimo_acceso
                      ? new Date(user.ultimo_acceso).toLocaleString('es-CO')
                      : 'Ahora'
                    }
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">ID Usuario</span>
                  <span className="text-slate-800 dark:text-slate-200 font-mono">{user.id || '-'}</span>
                </div>
                {user.username && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">Username</span>
                    <span className="text-slate-800 dark:text-slate-200 font-mono text-xs">{user.username}</span>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
                <Button variant="outline" icon={LogOut} fullWidth onClick={handleLogout}>
                  Cerrar Sesión
                </Button>
              </div>
            </InfoCard>

            {/* Acciones Rápidas */}
            <InfoCard title="Acciones Rápidas" icon={Settings}>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  icon={Bell}
                  fullWidth
                  className="justify-start"
                  onClick={() => navigate('/notificaciones')}
                >
                  Ver Notificaciones
                </Button>
                {canChangePassword && (
                  <Button
                    variant="ghost"
                    icon={Key}
                    fullWidth
                    className="justify-start"
                    onClick={() => setPasswordModal(true)}
                  >
                    Cambiar Contraseña
                  </Button>
                )}
                <Button
                  variant="ghost"
                  icon={Shield}
                  fullWidth
                  className="justify-start"
                  onClick={() => setActiveTab('permisos')}
                >
                  Ver Permisos
                </Button>
              </div>
            </InfoCard>

            {/* Soporte */}
            <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
              <h3 className="font-semibold mb-2">¿Necesitas ayuda?</h3>
              <p className="text-sm text-orange-100 mb-4">
                Contacta al equipo de soporte técnico para resolver tus dudas.
              </p>
              <Button variant="secondary" fullWidth>
                Contactar Soporte
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <EditProfileModal
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        usuario={user}
        onSave={handleSaveProfile}
        loading={formLoading}
      />

      <ChangePasswordModal
        isOpen={passwordModal}
        onClose={() => setPasswordModal(false)}
        onSubmit={handleChangePassword}
        loading={formLoading}
      />
    </div>
  );
};

export default PerfilUsuario;
