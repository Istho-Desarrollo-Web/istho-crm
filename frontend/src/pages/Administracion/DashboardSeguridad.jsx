/**
 * ISTHO CRM - Dashboard de Seguridad
 *
 * Métricas de seguridad: usuarios bloqueados, actividad reciente,
 * logins, tokens revocados y estadísticas de auditoría.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  Lock,
  Unlock,
  LogIn,
  LogOut,
  CheckCircle,
  RefreshCw,
  KeyRound,
  Activity,
  Ban,
  Loader2,
  Clock,
  Globe,
} from 'lucide-react';

import apiClient from '@api/client';
import { ADMIN_ENDPOINTS } from '@api/endpoints';
import useNotification from '@hooks/useNotification';
import { formatDate } from '@utils/formatDate';
import { ConfirmDialog } from '@components/common';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const ACCION_CONFIG = {
  login: {
    label: 'Login',
    icon: LogIn,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  logout: {
    label: 'Logout',
    icon: LogOut,
    color: 'text-slate-500 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-800/50',
  },
  crear: {
    label: 'Crear',
    icon: CheckCircle,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  actualizar: {
    label: 'Editar',
    icon: Activity,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  eliminar: {
    label: 'Eliminar',
    icon: Ban,
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-50 dark:bg-red-900/20',
  },
};

const ROL_COLORS = {
  admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  supervisor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  financiera: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  operador: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  conductor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  cliente: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
};

const tiempoRestante = (fechaBloqueo) => {
  const diff = new Date(fechaBloqueo) - new Date();
  if (diff <= 0) return 'Expirado';
  const min = Math.ceil(diff / 60000);
  return min < 60 ? `${min} min` : `${Math.ceil(min / 60)}h`;
};

// ════════════════════════════════════════════════════════════════════════════
// KPI CARD
// ════════════════════════════════════════════════════════════════════════════

const KpiCard = ({ icon: Icon, label, value, sub, colorIcon, colorBg, alerta }) => (
  <div
    className={`bg-white dark:bg-centhrix-card rounded-xl border ${alerta ? 'border-red-200 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'} p-4 flex items-center gap-4`}
  >
    <div
      className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colorBg}`}
    >
      <Icon className={`w-6 h-6 ${colorIcon}`} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value ?? '—'}</p>
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate">{label}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const DashboardSeguridad = () => {
  const { success: notifSuccess, error: notifError } = useNotification();
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [confirmDesbloquear, setConfirmDesbloquear] = useState(null);
  const [desbloqueando, setDesbloqueando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const res = await apiClient.get(ADMIN_ENDPOINTS.SEGURIDAD);
      setDatos(res.data);
    } catch {
      notifError('Error al cargar métricas de seguridad');
    } finally {
      setCargando(false);
    }
  }, [notifError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const confirmarDesbloquear = (usuario) => setConfirmDesbloquear(usuario);

  const ejecutarDesbloquear = async () => {
    if (!confirmDesbloquear) return;
    setDesbloqueando(true);
    try {
      await apiClient.post(ADMIN_ENDPOINTS.USUARIO_DESBLOQUEAR(confirmDesbloquear.id));
      notifSuccess(`Usuario "${confirmDesbloquear.username}" desbloqueado`);
      setConfirmDesbloquear(null);
      cargar();
    } catch {
      notifError('Error al desbloquear usuario');
    } finally {
      setDesbloqueando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!datos) return null;

  const { kpis, usuarios_bloqueados, actividad_reciente, logins_recientes, stats_auditoria_7d } =
    datos;

  const statsMap = {};
  stats_auditoria_7d.forEach((s) => {
    statsMap[s.accion] = parseInt(s.total);
  });

  return (
    <div id="tour-admin-seguridad-panel" className="space-y-6">
      {/* Header acciones */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Métricas en tiempo real · Actividad de las últimas 24h
        </p>
        <button
          onClick={cargar}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={Users}
          label="Usuarios activos"
          value={kpis.usuarios_activos}
          sub={`${kpis.usuarios_inactivos} inactivos`}
          colorIcon="text-emerald-600 dark:text-emerald-400"
          colorBg="bg-emerald-100 dark:bg-emerald-900/30"
        />
        <KpiCard
          icon={Activity}
          label="Sesiones activas"
          value={kpis.sesiones_activas}
          sub="WebSocket conectados"
          colorIcon="text-blue-600 dark:text-blue-400"
          colorBg="bg-blue-100 dark:bg-blue-900/30"
        />
        <KpiCard
          icon={Lock}
          label="Usuarios bloqueados"
          value={kpis.bloqueados}
          sub={
            kpis.con_intentos_fallidos > 0
              ? `+${kpis.con_intentos_fallidos} con intentos fallidos`
              : 'Sin intentos fallidos'
          }
          colorIcon={kpis.bloqueados > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}
          colorBg={
            kpis.bloqueados > 0 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-slate-100 dark:bg-slate-800'
          }
          alerta={kpis.bloqueados > 0}
        />
        <KpiCard
          icon={KeyRound}
          label="Tokens revocados hoy"
          value={kpis.tokens_revocados_hoy}
          sub={`${kpis.requiere_cambio_password} pendientes cambio clave`}
          colorIcon="text-amber-600 dark:text-amber-400"
          colorBg="bg-amber-100 dark:bg-amber-900/30"
        />
      </div>

      {/* Estadísticas auditoría 7d */}
      <div className="bg-white dark:bg-centhrix-card rounded-xl border border-slate-200 dark:border-slate-700 p-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-orange-500" />
          Actividad últimos 7 días
        </h3>
        <div className="flex flex-wrap gap-3">
          {Object.entries(ACCION_CONFIG).map(([accion, cfg]) => {
            const Icon = cfg.icon;
            const total = statsMap[accion] || 0;
            return (
              <div
                key={accion}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg}`}
              >
                <Icon className={`w-4 h-4 ${cfg.color}`} />
                <span className={`text-sm font-medium ${cfg.color}`}>{cfg.label}</span>
                <span className={`text-base font-bold ${cfg.color}`}>{total}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usuarios bloqueados */}
        <div className="bg-white dark:bg-centhrix-card rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-500" />
              Usuarios bloqueados
              {kpis.bloqueados > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 rounded-full">
                  {kpis.bloqueados}
                </span>
              )}
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {usuarios_bloqueados.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-slate-400 dark:text-slate-500">
                <CheckCircle className="w-8 h-8 mb-2 text-emerald-400" />
                <span className="text-sm">Sin usuarios bloqueados</span>
              </div>
            ) : (
              usuarios_bloqueados.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-4 h-4 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {u.nombre_completo || u.username}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-xs rounded-full font-medium ${ROL_COLORS[u.rol] || ROL_COLORS.cliente}`}
                      >
                        {u.rolInfo?.nombre || u.rol}
                      </span>
                      <span className="text-xs text-red-500 dark:text-red-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tiempoRestante(u.bloqueado_hasta)}
                      </span>
                      <span className="text-xs text-slate-400">{u.intentos_fallidos} intentos</span>
                    </div>
                  </div>
                  <button
                    onClick={() => confirmarDesbloquear(u)}
                    title="Desbloquear usuario"
                    className="flex-shrink-0 p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <Unlock className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logins recientes */}
        <div className="bg-white dark:bg-centhrix-card rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <LogIn className="w-4 h-4 text-emerald-500" />
              Logins recientes (7 días)
            </h3>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-72 overflow-y-auto">
            {logins_recientes.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">Sin registros</div>
            ) : (
              logins_recientes.map((log) => (
                <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <LogIn className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {log.usuario_nombre}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {log.ip_address || '—'}
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatDate(log.created_at, { tiempo: true })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Actividad reciente */}
      <div className="bg-white dark:bg-centhrix-card rounded-xl border border-slate-200 dark:border-slate-700">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <Shield className="w-4 h-4 text-orange-500" />
            Actividad reciente (24h)
          </h3>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50 max-h-80 overflow-y-auto">
          {actividad_reciente.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-400">Sin actividad reciente</div>
          ) : (
            actividad_reciente.map((evt) => {
              const cfg = ACCION_CONFIG[evt.accion] || ACCION_CONFIG.actualizar;
              const Icon = cfg.icon;
              return (
                <div key={evt.id} className="flex items-start gap-3 px-4 py-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700 dark:text-slate-300 truncate">
                      <span className="font-medium">{evt.usuario_nombre}</span>
                      {' — '}
                      <span className="text-slate-500 dark:text-slate-400">
                        {evt.descripcion || `${evt.accion} en ${evt.tabla}`}
                      </span>
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                      <span className="text-xs text-slate-400">{evt.tabla}</span>
                      {evt.ip_address && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {evt.ip_address}
                        </span>
                      )}
                      <span className="text-xs text-slate-400 ml-auto">
                        {formatDate(evt.created_at, { tiempo: true })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Diálogo desbloquear */}
      <ConfirmDialog
        isOpen={!!confirmDesbloquear}
        onClose={() => setConfirmDesbloquear(null)}
        onConfirm={ejecutarDesbloquear}
        loading={desbloqueando}
        title="Desbloquear usuario"
        message={`¿Desbloquear a "${confirmDesbloquear?.username}"? Se restablecerán sus intentos fallidos y podrá iniciar sesión inmediatamente.`}
        confirmText="Desbloquear"
        type="success"
      />
    </div>
  );
};

export default DashboardSeguridad;
