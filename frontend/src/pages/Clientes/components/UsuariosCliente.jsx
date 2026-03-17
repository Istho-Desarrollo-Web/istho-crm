/**
 * ============================================================================
 * ISTHO CRM - Componente UsuariosCliente
 * ============================================================================
 * Tab de gestión de usuarios con acceso al portal para un cliente específico.
 * 
 * Se integra en ClienteDetail como un tab adicional.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Plus,
  Search,
  Mail,
  Phone,
  Shield,
  MoreVertical,
  Pencil,
  Trash2,
  RefreshCw,
  Key,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  UserCheck,
  UserX,
} from 'lucide-react';

// Components
import { Button, StatusChip, ConfirmDialog, EmptyState } from '../../../components/common';

// Local Components
import UsuarioClienteForm from './UsuarioClienteForm';
import UsuarioClientePermisos from './UsuarioClientePermisos';

// Services
import usuarioClienteService from '../../../api/usuarioCliente.service';

// Hooks
import useNotification from '../../../hooks/useNotification';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE FILA DE USUARIO
// ════════════════════════════════════════════════════════════════════════════

const UsuarioRow = ({ 
  usuario, 
  onEdit, 
  onPermisos, 
  onDesactivar, 
  onReactivar, 
  onResetPassword, 
  onReenviarInvitacion 
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  
  const tieneAccesoReciente = () => {
    if (!usuario.ultimo_acceso) return false;
    const ultimoAcceso = new Date(usuario.ultimo_acceso);
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    return ultimoAcceso > hace30Dias;
  };

  
  
  return (
    <div className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
      usuario.activo
        ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600'
        : 'bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 opacity-75'
    }`}>
      {/* Avatar */}
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
        usuario.activo ? 'bg-orange-500' : 'bg-gray-400 dark:bg-gray-600'
      }`}>
        {usuario.nombre_completo?.charAt(0).toUpperCase() || 'U'}
      </div>

      {/* Info Principal */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-slate-800 dark:text-slate-100 truncate">
            {usuario.nombre_completo}
          </h4>
          {!usuario.activo && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
              Inactivo
            </span>
          )}
          {usuario.activo && usuario.requiere_cambio_password && !usuario.ultimo_acceso && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
              Pendiente activación
            </span>
          )}
          {usuario.activo && usuario.ultimo_acceso && (
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Activo
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{usuario.cargo || 'Sin cargo'}</p>
      </div>

      {/* Contacto */}
      <div className="hidden md:flex flex-col gap-1 min-w-[200px]">
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <span className="truncate">{usuario.email}</span>
        </div>
        {usuario.telefono && (
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <span>{usuario.telefono}</span>
          </div>
        )}
      </div>

      {/* Último acceso */}
      <div className="hidden lg:flex flex-col items-end min-w-[120px]">
        <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
          <Clock className="w-3 h-3" />
          <span>Último acceso</span>
        </div>
        <span className={`text-sm ${tieneAccesoReciente() ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
          {usuario.ultimo_acceso
            ? new Date(usuario.ultimo_acceso).toLocaleDateString('es-CO', {
                day: 'numeric',
                month: 'short'
              })
            : 'Nunca'
          }
        </span>
      </div>

      {/* Acciones */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          <MoreVertical className="w-5 h-5" />
        </button>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 z-20">
              <button
                onClick={() => { onEdit(usuario); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Pencil className="w-4 h-4" />
                Editar información
              </button>
              <button
                onClick={() => { onPermisos(usuario); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Shield className="w-4 h-4" />
                Gestionar permisos
              </button>
              <hr className="my-1 border-gray-100 dark:border-slate-700" />
              <button
                onClick={() => { onResetPassword(usuario); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Key className="w-4 h-4" />
                Resetear contraseña
              </button>
              <button
                onClick={() => { onReenviarInvitacion(usuario); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Send className="w-4 h-4" />
                Reenviar invitación
              </button>
              <hr className="my-1 border-gray-100 dark:border-slate-700" />
              {usuario.activo ? (
                <button
                  onClick={() => { onDesactivar(usuario); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <UserX className="w-4 h-4" />
                  Desactivar usuario
                </button>
              ) : (
                <button
                  onClick={() => { onReactivar(usuario); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                >
                  <UserCheck className="w-4 h-4" />
                  Reactivar usuario
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const UsuariosCliente = ({ clienteId, clienteNombre }) => {
  // Estado
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('todos');
  
  // Modals
  const [formModal, setFormModal] = useState({ open: false, usuario: null });
  const [permisosModal, setPermisosModal] = useState({ open: false, usuario: null });
  const [confirmModal, setConfirmModal] = useState({ open: false, tipo: null, usuario: null });
  
  // Notificaciones
  const { success, apiError } = useNotification();
  
  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR USUARIOS
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchUsuarios = useCallback(async () => {
    if (!clienteId) return;
    
    setLoading(true);
    try {
      const response = await usuarioClienteService.listar(clienteId, {
        search: searchTerm,
        activo: filtroActivo === 'todos' ? undefined : filtroActivo === 'activos'
      });
      
      if (response.success) {
        setUsuarios(response.data || []);
      }
    } catch (err) {
      apiError(err);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }, [clienteId, searchTerm, filtroActivo, apiError]);
  
  useEffect(() => {
    fetchUsuarios();
  }, [fetchUsuarios]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  
  const handleCrear = () => {
    setFormModal({ open: true, usuario: null });
  };
  
  const handleEditar = (usuario) => {
    setFormModal({ open: true, usuario });
  };
  
  const handlePermisos = (usuario) => {
    setPermisosModal({ open: true, usuario });
  };
  
  const handleFormSubmit = async (data) => {
    try {
      if (formModal.usuario) {
        // Actualizar
        await usuarioClienteService.actualizar(clienteId, formModal.usuario.id, data);
        success('Usuario actualizado correctamente');
      } else {
        // Crear
        await usuarioClienteService.crear(clienteId, data);
        success('Usuario creado correctamente. Se ha enviado un email con las credenciales.');
      }
      setFormModal({ open: false, usuario: null });
      fetchUsuarios();
    } catch (err) {
      apiError(err);
      throw err;
    }
  };
  
  const handlePermisosSubmit = async (permisos) => {
    try {
      await usuarioClienteService.actualizar(clienteId, permisosModal.usuario.id, {
        permisos_cliente: permisos
      });
      // Actualizar estado local inmediatamente (optimistic update)
      setUsuarios(prev => prev.map(u =>
        u.id === permisosModal.usuario.id
          ? { ...u, permisos_cliente: permisos }
          : u
      ));
      success('Permisos actualizados correctamente');
      setPermisosModal({ open: false, usuario: null });
      fetchUsuarios();
    } catch (err) {
      apiError(err);
      throw err;
    }
  };
  
  const handleDesactivar = (usuario) => {
    setConfirmModal({ open: true, tipo: 'desactivar', usuario });
  };
  
  const handleReactivar = (usuario) => {
    setConfirmModal({ open: true, tipo: 'reactivar', usuario });
  };
  
  const handleResetPassword = (usuario) => {
    setConfirmModal({ open: true, tipo: 'resetPassword', usuario });
  };
  
  const handleReenviarInvitacion = (usuario) => {
    setConfirmModal({ open: true, tipo: 'reenviarInvitacion', usuario });
  };
  
  const handleConfirmAction = async () => {
    const { tipo, usuario } = confirmModal;
    
    try {
      switch (tipo) {
        case 'desactivar':
          await usuarioClienteService.desactivar(clienteId, usuario.id);
          success('Usuario desactivado correctamente');
          break;
        case 'reactivar':
          await usuarioClienteService.reactivar(clienteId, usuario.id);
          success('Usuario reactivado correctamente');
          break;
        case 'resetPassword':
          await usuarioClienteService.resetearPassword(clienteId, usuario.id);
          success('Contraseña reseteada. Se ha enviado un email con las nuevas credenciales.');
          break;
        case 'reenviarInvitacion':
          await usuarioClienteService.reenviarInvitacion(clienteId, usuario.id);
          success('Invitación reenviada correctamente');
          break;
        default:
          break;
      }
      setConfirmModal({ open: false, tipo: null, usuario: null });
      fetchUsuarios();
    } catch (err) {
      apiError(err);
    }
  };
  
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADÍSTICAS
  // ──────────────────────────────────────────────────────────────────────────
  
  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.activo).length,
    inactivos: usuarios.filter(u => !u.activo).length,
    pendientes: usuarios.filter(u => u.activo && u.requiere_cambio_password && !u.ultimo_acceso).length
  };
  
  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────
  
  return (
    <div className="space-y-6">
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Usuarios del Portal
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Usuarios con acceso al portal de {clienteNombre || 'cliente'}
          </p>
        </div>
        
        <Button
          variant="primary"
          icon={Plus}
          onClick={handleCrear}
        >
          Crear Usuario
        </Button>
      </div>
      
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* ESTADÍSTICAS RÁPIDAS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activos}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Activos</p>
        </div>
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendientes}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Pendientes</p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.inactivos}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Inactivos</p>
        </div>
      </div>
      
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* FILTROS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      
      <div className="flex items-center gap-4">
        {/* Búsqueda */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>
        
        {/* Filtro de estado */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {['todos', 'activos', 'inactivos'].map((filtro) => (
            <button
              key={filtro}
              onClick={() => setFiltroActivo(filtro)}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                filtroActivo === filtro
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {filtro.charAt(0).toUpperCase() + filtro.slice(1)}
            </button>
          ))}
        </div>
        
        {/* Refresh */}
        <Button
          variant="ghost"
          icon={RefreshCw}
          onClick={fetchUsuarios}
          title="Actualizar lista"
        />
      </div>
      
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* LISTA DE USUARIOS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      
      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : usuarios.length === 0 ? (
          // Empty state
          <EmptyState
            icon={Users}
            title="Sin usuarios"
            description={
              searchTerm 
                ? 'No se encontraron usuarios con esos criterios'
                : 'Este cliente aún no tiene usuarios con acceso al portal'
            }
            action={
              !searchTerm && (
                <Button variant="primary" icon={Plus} onClick={handleCrear}>
                  Crear primer usuario
                </Button>
              )
            }
          />
        ) : (
          // Lista de usuarios
          usuarios.map((usuario) => (
            <UsuarioRow
              key={usuario.id}
              usuario={usuario}
              onEdit={handleEditar}
              onPermisos={handlePermisos}
              onDesactivar={handleDesactivar}
              onReactivar={handleReactivar}
              onResetPassword={handleResetPassword}
              onReenviarInvitacion={handleReenviarInvitacion}
            />
          ))
        )}
      </div>
      
      {/* ════════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ════════════════════════════════════════════════════════════════════ */}
      
      {/* Modal de Crear/Editar */}
      <UsuarioClienteForm
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, usuario: null })}
        onSubmit={handleFormSubmit}
        usuario={formModal.usuario}
        clienteNombre={clienteNombre}
      />
      
      {/* Modal de Permisos */}
      <UsuarioClientePermisos
        isOpen={permisosModal.open}
        onClose={() => setPermisosModal({ open: false, usuario: null })}
        onSubmit={handlePermisosSubmit}
        usuario={permisosModal.usuario}
      />
      
      {/* Confirm Dialog - Desactivar */}
      <ConfirmDialog
        isOpen={confirmModal.open && confirmModal.tipo === 'desactivar'}
        onClose={() => setConfirmModal({ open: false, tipo: null, usuario: null })}
        onConfirm={handleConfirmAction}
        title="Desactivar Usuario"
        message={`¿Estás seguro de desactivar a "${confirmModal.usuario?.nombre_completo}"? El usuario perderá acceso al portal.`}
        confirmText="Desactivar"
        type="danger"
      />
      
      {/* Confirm Dialog - Reactivar */}
      <ConfirmDialog
        isOpen={confirmModal.open && confirmModal.tipo === 'reactivar'}
        onClose={() => setConfirmModal({ open: false, tipo: null, usuario: null })}
        onConfirm={handleConfirmAction}
        title="Reactivar Usuario"
        message={`¿Reactivar a "${confirmModal.usuario?.nombre_completo}"? El usuario recuperará acceso al portal.`}
        confirmText="Reactivar"
        type="success"
      />
      
      {/* Confirm Dialog - Reset Password */}
      <ConfirmDialog
        isOpen={confirmModal.open && confirmModal.tipo === 'resetPassword'}
        onClose={() => setConfirmModal({ open: false, tipo: null, usuario: null })}
        onConfirm={handleConfirmAction}
        title="Resetear Contraseña"
        message={`Se generará una nueva contraseña para "${confirmModal.usuario?.nombre_completo}" y se enviará por email.`}
        confirmText="Resetear"
        type="warning"
      />
      
      {/* Confirm Dialog - Reenviar Invitación */}
      <ConfirmDialog
        isOpen={confirmModal.open && confirmModal.tipo === 'reenviarInvitacion'}
        onClose={() => setConfirmModal({ open: false, tipo: null, usuario: null })}
        onConfirm={handleConfirmAction}
        title="Reenviar Invitación"
        message={`Se enviará un nuevo email de invitación a "${confirmModal.usuario?.email}" con credenciales actualizadas.`}
        confirmText="Reenviar"
        type="info"
      />
    </div>
  );
};

export default UsuariosCliente;