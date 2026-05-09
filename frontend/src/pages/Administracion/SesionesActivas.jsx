/**
 * ISTHO CRM - Sesiones Activas
 * Muestra usuarios con sesion activa y permite cerrar sesiones.
 *
 * @author Coordinacion TI ISTHO
 * @version 1.1.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  User,
  Shield,
  Clock,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import { ConfirmDialog, S3Image } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ADMIN_ENDPOINTS } from '../../api/endpoints';
import apiClient from '../../api/client';
import useNotification from '../../hooks/useNotification';
import { formatDate } from '../../utils/formatDate';

// ════════════════════════════════════════════════════════════════════════════
// ROL BADGE
// ════════════════════════════════════════════════════════════════════════════

const ROL_COLORS = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  supervisor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  financiera: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  operador: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  conductor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cliente: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const SesionesActivas = () => {
  const { user } = useAuth();
  const { connected } = useSocket();
  const { success, apiError } = useNotification();

  const [sesiones, setSesiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cerrarModal, setCerrarModal] = useState({ isOpen: false, usuario: null });
  const [cerrarLoading, setCerrarLoading] = useState(false);
  const [cerrarTodasModal, setCerrarTodasModal] = useState(false);
  const [cerrarTodasLoading, setCerrarTodasLoading] = useState(false);

  const fetchSesiones = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const response = await apiClient.get(ADMIN_ENDPOINTS.SESIONES);
      setSesiones(response.data || []);
    } catch (err) {
      console.error('Error cargando sesiones:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchSesiones();
    // Auto-refresh cada 15 segundos
    const interval = setInterval(() => fetchSesiones(true), 15000);
    return () => clearInterval(interval);
  }, [fetchSesiones]);

  // Refrescar cuando el socket se conecta (evita el delay inicial de polling)
  useEffect(() => {
    if (connected) fetchSesiones(true);
  }, [connected, fetchSesiones]);

  const handleCerrarSesion = async () => {
    if (!cerrarModal.usuario) return;
    setCerrarLoading(true);
    try {
      await apiClient.post(ADMIN_ENDPOINTS.SESION_CERRAR(cerrarModal.usuario.id));
      success(`Sesión de ${cerrarModal.usuario.nombre_completo} cerrada exitosamente`);
      setCerrarModal({ isOpen: false, usuario: null });
      fetchSesiones(true);
    } catch (err) {
      apiError(err);
    } finally {
      setCerrarLoading(false);
    }
  };

  const handleCerrarTodas = async () => {
    setCerrarTodasLoading(true);
    try {
      const res = await apiClient.post(ADMIN_ENDPOINTS.SESIONES_CERRAR_TODAS);
      const count = res.data?.count ?? 0;
      success(
        count > 0
          ? `${count} sesión${count !== 1 ? 'es' : ''} cerrada${count !== 1 ? 's' : ''} exitosamente`
          : 'No había otras sesiones activas'
      );
      setCerrarTodasModal(false);
      fetchSesiones(true);
    } catch (err) {
      apiError(err);
    } finally {
      setCerrarTodasLoading(false);
    }
  };

  // Usuarios distintos al admin actual con sesión activa
  const otrosUsuarios = sesiones.filter((s) => s.id !== user?.id);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Wifi className="w-5 h-5 text-emerald-500" />
          <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            {sesiones.length}
          </span>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            usuario{sesiones.length !== 1 && 's'} conectado{sesiones.length !== 1 && 's'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {otrosUsuarios.length > 0 && (
            <button
              onClick={() => setCerrarTodasModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800/50 rounded-xl transition-colors"
            >
              <AlertTriangle className="w-4 h-4" />
              Cerrar todas las sesiones
            </button>
          )}
          <button
            onClick={() => fetchSesiones(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-centhrix-surface transition-colors text-slate-600 dark:text-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400">Cargando sesiones...</p>
        </div>
      ) : sesiones.length === 0 ? (
        <div className="py-16 text-center">
          <WifiOff className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
            No hay sesiones activas
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Ningún usuario está conectado en este momento
          </p>
        </div>
      ) : (
        <div id="tour-admin-sesiones-tabla" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sesiones.map((s) => {
            const isMe = s.id === user?.id;
            const rolColor = ROL_COLORS[s.rol] || ROL_COLORS.operador;

            return (
              <div
                key={s.id}
                className={`bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border p-5 transition-all ${
                  isMe
                    ? 'border-emerald-300 dark:border-emerald-700 ring-1 ring-emerald-200 dark:ring-emerald-800'
                    : 'border-gray-100 dark:border-slate-700'
                }`}
              >
                {/* Header: avatar + nombre */}
                <div className="flex items-center gap-3 mb-4">
                  <S3Image
                    src={s.avatar_url}
                    className="w-12 h-12 rounded-full object-cover shadow-sm"
                    fallback={
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
                        {(s.nombre_completo || s.username || '?')[0].toUpperCase()}
                      </div>
                    }
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {s.nombre_completo || s.username}
                      {isMe && (
                        <span className="ml-2 text-xs font-normal text-emerald-600 dark:text-emerald-400">
                          (tú)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{s.email}</p>
                  </div>

                  {/* Indicador online */}
                  <div className="flex-shrink-0">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Rol
                    </span>
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${rolColor}`}
                    >
                      {s.rol}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <User className="w-3 h-3" /> Usuario
                    </span>
                    <span className="text-xs text-slate-700 dark:text-slate-200 font-mono">
                      {s.username}
                    </span>
                  </div>
                  {s.ultimo_acceso && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> Último acceso
                      </span>
                      <span className="text-xs text-slate-700 dark:text-slate-200">
                        {formatDate(s.ultimo_acceso)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Acción: cerrar sesión (no para ti mismo) */}
                {isMe ? (
                  <div className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <Wifi className="w-3.5 h-3.5" />
                    Sesión actual
                  </div>
                ) : (
                  <button
                    onClick={() => setCerrarModal({ isOpen: true, usuario: s })}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Cerrar sesión
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Cerrar sesión individual */}
      <ConfirmDialog
        isOpen={cerrarModal.isOpen}
        onClose={() => setCerrarModal({ isOpen: false, usuario: null })}
        onConfirm={handleCerrarSesion}
        title="Cerrar sesión"
        message={
          cerrarModal.usuario
            ? `¿Cerrar la sesión de ${cerrarModal.usuario.nombre_completo || cerrarModal.usuario.username}? El usuario será desconectado inmediatamente y verá una notificación en pantalla.`
            : ''
        }
        confirmText="Cerrar sesión"
        confirmVariant="danger"
        loading={cerrarLoading}
      />

      {/* Modal: Cerrar TODAS las sesiones */}
      <ConfirmDialog
        isOpen={cerrarTodasModal}
        onClose={() => setCerrarTodasModal(false)}
        onConfirm={handleCerrarTodas}
        title="Cerrar todas las sesiones"
        message={`¿Cerrar las sesiones de los ${otrosUsuarios.length} usuario${otrosUsuarios.length !== 1 ? 's' : ''} conectado${otrosUsuarios.length !== 1 ? 's' : ''}? Todos serán desconectados inmediatamente. Tu sesión no se verá afectada.`}
        confirmText="Cerrar todas"
        confirmVariant="danger"
        loading={cerrarTodasLoading}
      />
    </div>
  );
};

export default SesionesActivas;
