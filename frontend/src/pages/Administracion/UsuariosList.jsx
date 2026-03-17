/**
 * ISTHO CRM - Lista de Usuarios (Administración)
 *
 * CRUD completo de usuarios del sistema.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus, Search, RefreshCw, UserCheck, UserX, KeyRound,
  MoreVertical, Pencil, Trash2, Eye, ChevronLeft, ChevronRight, Shield, Mail
} from 'lucide-react';
import { useSnackbar } from 'notistack';
import adminService from '../../api/admin.service';
import UsuarioForm from './UsuarioForm';
import UsuarioPermisos from './UsuarioPermisos';
import { useAuth } from '../../context/AuthContext';

const UsuariosList = () => {
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filtroRol, setFiltroRol] = useState('');
  const [filtroActivo, setFiltroActivo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [menuOpen, setMenuOpen] = useState(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });
  const [showResetPassword, setShowResetPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [enviarCorreoReset, setEnviarCorreoReset] = useState(false);
  const [showPermisos, setShowPermisos] = useState(null);
  const [sendingCredentials, setSendingCredentials] = useState(null);
  const [credentialsMsg, setCredentialsMsg] = useState(null);

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filtroRol) params.rol_id = filtroRol;
      if (filtroActivo) params.activo = filtroActivo;

      const res = await adminService.getUsuarios(params);
      setUsuarios(res.data?.usuarios || []);
      setPagination(prev => ({ ...prev, ...res.data?.pagination }));
    } catch (error) {
      console.error('Error cargando usuarios:', error);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, filtroRol, filtroActivo]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await adminService.getRoles();
      setRoles(res.data || []);
    } catch (error) {
      console.error('Error cargando roles:', error);
    }
  }, []);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);
  useEffect(() => { fetchUsuarios(); }, [fetchUsuarios]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleToggleActivo = async (usuario) => {
    try {
      if (usuario.activo) {
        await adminService.desactivarUsuario(usuario.id);
      } else {
        await adminService.actualizarUsuario(usuario.id, { activo: true });
      }
      fetchUsuarios();
    } catch (error) {
      console.error('Error:', error);
    }
    setMenuOpen(null);
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) return;
    try {
      const response = await adminService.resetearPassword(showResetPassword.id, {
        password: newPassword,
        enviar_correo: enviarCorreoReset
      });
      const msg = response?.message || 'Contraseña reseteada exitosamente';
      enqueueSnackbar(msg, { variant: 'success' });
      setShowResetPassword(null);
      setNewPassword('');
      setEnviarCorreoReset(false);
    } catch (error) {
      const msg = error?.response?.data?.message || error?.message || 'Error al resetear la contraseña';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleReenviarCredenciales = async (user) => {
    setSendingCredentials(user.id);
    setMenuOpen(null);
    try {
      await adminService.reenviarCredenciales(user.id);
      setCredentialsMsg({ type: 'success', text: `Credenciales enviadas a ${user.email}` });
    } catch (error) {
      setCredentialsMsg({ type: 'error', text: error.response?.data?.message || 'Error al enviar credenciales' });
    }
    setSendingCredentials(null);
    setTimeout(() => setCredentialsMsg(null), 4000);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setEditingUser(null);
    fetchUsuarios();
  };

  return (
    <div className="space-y-4">
      {/* Toast de credenciales */}
      {credentialsMsg && (
        <div className={`px-4 py-3 rounded-xl text-sm flex items-center gap-2 ${
          credentialsMsg.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
        }`}>
          <Mail className="w-4 h-4 shrink-0" />
          {credentialsMsg.text}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, usuario o email..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Filtro Rol */}
        <select
          value={filtroRol}
          onChange={(e) => { setFiltroRol(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="">Todos los roles</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.nombre}</option>
          ))}
        </select>

        {/* Filtro Estado */}
        <select
          value={filtroActivo}
          onChange={(e) => { setFiltroActivo(e.target.value); setPagination(prev => ({ ...prev, page: 1 })); }}
          className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200"
        >
          <option value="">Todos</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>

        <button
          onClick={() => fetchUsuarios()}
          className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-gray-200 dark:border-slate-700 rounded-xl"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {hasPermission('usuarios', 'crear') && (
          <button
            onClick={() => { setEditingUser(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto rounded-t-2xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Usuario</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Rol</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Cliente</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Último acceso</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Cargando usuarios...</p>
                  </td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No se encontraron usuarios
                  </td>
                </tr>
              ) : (
                usuarios.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {user.nombre_completo || user.username}
                        </div>
                        <div className="text-xs text-slate-400">@{user.username}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.rolInfo ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: user.rolInfo.color || '#6B7280' }}
                        >
                          {user.rolInfo.nombre}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">{user.rol}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {user.cliente?.razon_social || '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${
                        user.activo
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {user.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs">
                      {user.ultimo_acceso
                        ? new Date(user.ultimo_acceso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                        : 'Nunca'
                      }
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          if (menuOpen === user.id) {
                            setMenuOpen(null);
                          } else {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                            setMenuOpen(user.id);
                          }
                        }}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {pagination.total} usuario(s) en total
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-300">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Form */}
      {showForm && (
        <UsuarioForm
          usuario={editingUser}
          roles={roles}
          onSave={handleFormSave}
          onClose={() => { setShowForm(false); setEditingUser(null); }}
        />
      )}

      {/* Modal: Reset Password */}
      {showResetPassword && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-5">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 mb-0.5">
              Resetear Contraseña
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              Usuario: <strong>{showResetPassword.nombre_completo || showResetPassword.username}</strong>
            </p>
            <input
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña (mínimo 6 caracteres)"
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 mb-3"
            />
            {/* Opción de enviar correo */}
            {showResetPassword.email && (
              <label className="flex items-start gap-2.5 p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enviarCorreoReset}
                  onChange={(e) => setEnviarCorreoReset(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 dark:border-slate-600 text-orange-500 focus:ring-orange-500 dark:bg-slate-700"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    Enviar correo con nueva contraseña
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Se enviará a: {showResetPassword.email}
                  </p>
                </div>
              </label>
            )}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setShowResetPassword(null); setNewPassword(''); setEnviarCorreoReset(false); }}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={newPassword.length < 6}
                className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50"
              >
                Resetear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Permisos */}
      {showPermisos && (
        <UsuarioPermisos
          usuario={showPermisos}
          onClose={() => setShowPermisos(null)}
          onSave={() => fetchUsuarios()}
        />
      )}

      {/* Dropdown menu (fixed, fuera del overflow de la tabla) */}
      {menuOpen && (() => {
        const user = usuarios.find(u => u.id === menuOpen);
        if (!user) return null;
        return (
          <>
            <div className="fixed inset-0 z-50" onClick={() => setMenuOpen(null)} />
            <div
              className="fixed z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg py-1 min-w-[180px]"
              style={{ top: menuPos.top, right: menuPos.right }}
            >
              {hasPermission('usuarios', 'editar') && (
                <button
                  onClick={() => { setEditingUser(user); setShowForm(true); setMenuOpen(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Pencil className="w-3.5 h-3.5" /> Editar
                </button>
              )}
              {hasPermission('usuarios', 'editar') && (
                <button
                  onClick={() => { setShowResetPassword(user); setMenuOpen(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Resetear contraseña
                </button>
              )}
              {hasPermission('usuarios', 'editar') && user.rol !== 'admin' && (
                <button
                  onClick={() => { setShowPermisos(user); setMenuOpen(null); }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <Shield className="w-3.5 h-3.5" /> Permisos
                </button>
              )}
              {hasPermission('usuarios', 'editar') && (
                <button
                  onClick={() => handleReenviarCredenciales(user)}
                  disabled={sendingCredentials === user.id}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {sendingCredentials === user.id ? 'Enviando...' : 'Reenviar credenciales'}
                </button>
              )}
              {hasPermission('usuarios', 'eliminar') && (
                <>
                  <div className="border-t border-gray-100 dark:border-slate-700 my-1" />
                  <button
                    onClick={() => handleToggleActivo(user)}
                    className={`w-full flex items-center gap-2 px-4 py-2 text-sm ${
                      user.activo
                        ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                    }`}
                  >
                    {user.activo
                      ? <><UserX className="w-3.5 h-3.5" /> Desactivar</>
                      : <><UserCheck className="w-3.5 h-3.5" /> Reactivar</>
                    }
                  </button>
                </>
              )}
            </div>
          </>
        );
      })()}
    </div>
  );
};

export default UsuariosList;
