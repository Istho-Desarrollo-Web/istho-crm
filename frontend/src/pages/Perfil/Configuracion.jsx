/**
 * ISTHO CRM - Configuracion Page
 * Preferencias del usuario con persistencia en backend.
 *
 * @author Coordinacion TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Clock,
  Calendar,
  Save,
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Play,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useThemeContext } from '../../context/ThemeContext';
import usuarioService from '../../api/usuarioService';
import backupService from '../../api/backupService';
import useNotification from '../../hooks/useNotification';
import PageFooter from '@components/common/PageFooter';

// ════════════════════════════════════════════════════════════════════════════
// TOGGLE SWITCH
// ════════════════════════════════════════════════════════════════════════════

const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
  <button
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`
      relative w-11 h-6 rounded-full transition-colors duration-200
      ${enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-centhrix-surface'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <span
      className={`
        absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm
        transition-transform duration-200
        ${enabled ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

// ════════════════════════════════════════════════════════════════════════════
// SELECT FIELD
// ════════════════════════════════════════════════════════════════════════════

const SelectField = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="px-3 py-2 bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-w-[180px]"
  >
    {options.map((opt) => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

// ════════════════════════════════════════════════════════════════════════════
// SETTING ROW
// ════════════════════════════════════════════════════════════════════════════

const SettingRow = ({ icon: Icon, title, description, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      {Icon && (
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-centhrix-surface mt-0.5">
          <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{title}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
    </div>
    <div className="flex-shrink-0 ml-4">
      {children}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// SECTION CARD
// ════════════════════════════════════════════════════════════════════════════

const SectionCard = ({ icon: Icon, title, children }) => (
  <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
    <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
        <Icon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
      </div>
      <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h2>
    </div>
    <div className="px-5 py-2">
      {children}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// HELPERS DE BACKUP
// ════════════════════════════════════════════════════════════════════════════

const formatBytes = (bytes) => {
  if (!bytes) return '—';
  const mb = Number(bytes) / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(Number(bytes) / 1024).toFixed(0)} KB`;
};

const formatFecha = (fecha) => {
  if (!fecha) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Bogota',
  }).format(new Date(fecha));
};

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN DE BACKUP (solo admin)
// ════════════════════════════════════════════════════════════════════════════

const SeccionBackup = () => {
  const { success: showSuccess, error: showError } = useNotification();
  const [data, setData] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ejecutando, setEjecutando] = useState(false);

  const cargarHistorial = useCallback(async () => {
    setCargando(true);
    try {
      const res = await backupService.obtenerHistorial();
      setData(res.data ?? res);
    } catch {
      showError('Error al cargar historial de backups');
    } finally {
      setCargando(false);
    }
  }, []); // eslint-disable-line

  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const handleEjecutar = async () => {
    setEjecutando(true);
    try {
      await backupService.ejecutarBackup();
      showSuccess('Backup iniciado. Estará listo en 2-5 minutos.');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Error al iniciar el backup';
      showError(msg);
    } finally {
      setEjecutando(false);
    }
  };

  const ultimoBackup = data?.registros?.[0] ?? null;
  const stats = data?.stats ?? {};
  const proximoBackup = data?.proximo_backup;

  return (
    <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Backups de Base de Datos</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={cargarHistorial}
            disabled={cargando}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-centhrix-surface text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            title="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
          <Button
            variant="primary"
            icon={Play}
            onClick={handleEjecutar}
            loading={ejecutando}
            size="sm"
          >
            Backup Manual
          </Button>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {
              label: 'Último estado',
              value: ultimoBackup
                ? ultimoBackup.estado === 'exitoso' ? 'Exitoso' : 'Fallido'
                : 'Sin datos',
              icon: ultimoBackup?.estado === 'exitoso' ? CheckCircle2 : ultimoBackup?.estado === 'fallido' ? XCircle : AlertTriangle,
              color: ultimoBackup?.estado === 'exitoso'
                ? 'text-emerald-600 dark:text-emerald-400'
                : ultimoBackup?.estado === 'fallido'
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-slate-400',
              bg: ultimoBackup?.estado === 'exitoso'
                ? 'bg-emerald-50 dark:bg-emerald-900/20'
                : ultimoBackup?.estado === 'fallido'
                  ? 'bg-red-50 dark:bg-red-900/20'
                  : 'bg-slate-50 dark:bg-centhrix-surface/40',
            },
            {
              label: 'Tasa de éxito',
              value: stats.total > 0 ? `${stats.tasa_exito}%` : '—',
              icon: CheckCircle2,
              color: 'text-blue-600 dark:text-blue-400',
              bg: 'bg-blue-50 dark:bg-blue-900/20',
            },
            {
              label: 'Tamaño promedio',
              value: formatBytes(stats.tamano_promedio_bytes),
              icon: Database,
              color: 'text-purple-600 dark:text-purple-400',
              bg: 'bg-purple-50 dark:bg-purple-900/20',
            },
            {
              label: 'Total registros',
              value: stats.total ?? '—',
              icon: Database,
              color: 'text-slate-600 dark:text-slate-300',
              bg: 'bg-slate-50 dark:bg-centhrix-surface/40',
            },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} className={`rounded-xl p-3 ${bg}`}>
              <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
                <Icon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{label}</span>
              </div>
              <p className={`text-lg font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Próximo backup */}
        {proximoBackup && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-centhrix-surface/40 rounded-xl px-4 py-2.5">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Próximo backup automático: <strong className="text-slate-700 dark:text-slate-200">{formatFecha(proximoBackup)}</strong> · Diario a las 2:00 AM</span>
          </div>
        )}

        {/* Historial */}
        {cargando ? (
          <div className="flex justify-center py-6">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : data?.registros?.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-centhrix-surface/50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tamaño</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duración</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {data.registros.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors">
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{formatFecha(r.fecha)}</td>
                    <td className="px-4 py-3">
                      {r.estado === 'exitoso' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Exitoso
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-500 dark:text-red-400 font-medium" title={r.error_mensaje ?? ''}>
                          <XCircle className="w-3.5 h-3.5" /> Fallido
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{formatBytes(r.tamano_bytes)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                      {r.duracion_segundos ? `${r.duracion_segundos}s` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        r.origen === 'manual'
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-centhrix-surface dark:text-slate-400'
                      }`}>
                        {r.origen === 'manual' ? 'Manual' : 'Automático'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No hay backups registrados aún</p>
            <p className="text-xs mt-1">El primer backup automático se ejecutará esta noche a las 2:00 AM</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ════════════════════════════════════════════════════════════════════════════

const DEFAULT_PREFS = {
  tema: 'light',
  notificaciones_email: false,
  notificaciones_sonido: true,
  alertas_despachos: true,
  alertas_inventario: true,
  alertas_clientes: true,
  alertas_viajes: true,
  zona_horaria: 'America/Bogota',
  formato_fecha: 'DD/MM/YYYY',
  tiempo_sesion: 30,
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const Configuracion = () => {
  const { user, updateUser } = useAuth();
  const { isDark, toggleDark } = useThemeContext();
  const { success, error: showError } = useNotification();

  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Cargar preferencias del usuario
  useEffect(() => {
    if (user?.preferencias) {
      setPrefs({ ...DEFAULT_PREFS, ...user.preferencias });
    }
  }, [user?.preferencias]);

  // Sincronizar tema con ThemeContext
  useEffect(() => {
    const temaActual = isDark ? 'dark' : 'light';
    if (prefs.tema !== temaActual) {
      setPrefs(prev => ({ ...prev, tema: temaActual }));
    }
  }, [isDark]); // eslint-disable-line

  const handleChange = (key, value) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);

    // Tema se aplica inmediatamente
    if (key === 'tema') {
      const shouldBeDark = value === 'dark';
      if (isDark !== shouldBeDark) toggleDark();
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await usuarioService.guardarPreferencias(prefs);
      if (response.success !== false) {
        updateUser({ preferencias: prefs });
        success('Preferencias guardadas correctamente');
        setHasChanges(false);
      }
    } catch (_err) {
      showError('Error al guardar preferencias');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">Configuración</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Personaliza tu experiencia en el CRM</p>
          </div>
          {hasChanges && (
            <Button variant="primary" icon={Save} onClick={handleSave} loading={loading}>
              Guardar
            </Button>
          )}
        </div>

        <div className="space-y-6">

          {/* ═══ APARIENCIA ═══ */}
          <SectionCard icon={Moon} title="Apariencia">
            <SettingRow
              icon={isDark ? Moon : Sun}
              title="Modo Oscuro"
              description="Cambia entre tema claro y oscuro"
            >
              <ToggleSwitch
                enabled={prefs.tema === 'dark'}
                onChange={(v) => handleChange('tema', v ? 'dark' : 'light')}
              />
            </SettingRow>
          </SectionCard>

          {/* ═══ NOTIFICACIONES ═══ */}
          <SectionCard icon={Bell} title="Notificaciones">
            <SettingRow
              icon={Bell}
              title="Sonidos de notificación"
              description="Reproducir sonido al recibir notificaciones"
            >
              <ToggleSwitch
                enabled={prefs.notificaciones_sonido}
                onChange={(v) => handleChange('notificaciones_sonido', v)}
              />
            </SettingRow>

            <div className="pt-2 pb-1">
              <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Alertas por Módulo</p>
            </div>

            <SettingRow title="Despachos" description="Entradas y salidas WMS">
              <ToggleSwitch
                enabled={prefs.alertas_despachos}
                onChange={(v) => handleChange('alertas_despachos', v)}
              />
            </SettingRow>
            <SettingRow title="Inventario" description="Stock bajo, agotados, vencimientos">
              <ToggleSwitch
                enabled={prefs.alertas_inventario}
                onChange={(v) => handleChange('alertas_inventario', v)}
              />
            </SettingRow>
            <SettingRow title="Clientes" description="Nuevos clientes y cambios">
              <ToggleSwitch
                enabled={prefs.alertas_clientes}
                onChange={(v) => handleChange('alertas_clientes', v)}
              />
            </SettingRow>
            <SettingRow title="Viajes y Caja Menor" description="Gastos pendientes, cajas abiertas">
              <ToggleSwitch
                enabled={prefs.alertas_viajes}
                onChange={(v) => handleChange('alertas_viajes', v)}
              />
            </SettingRow>
          </SectionCard>

          {/* ═══ REGIONAL ═══ */}
          <SectionCard icon={Globe} title="Regional">
            <SettingRow
              icon={Globe}
              title="Zona Horaria"
              description="Zona horaria para fechas y reportes"
            >
              <SelectField
                value={prefs.zona_horaria}
                onChange={(v) => handleChange('zona_horaria', v)}
                options={[
                  { value: 'America/Bogota', label: 'Bogotá (GMT-5)' },
                  { value: 'America/Mexico_City', label: 'México (GMT-6)' },
                  { value: 'America/Lima', label: 'Lima (GMT-5)' },
                  { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires (GMT-3)' },
                ]}
              />
            </SettingRow>
            <SettingRow
              icon={Calendar}
              title="Formato de Fecha"
              description="Formato para mostrar fechas en el sistema"
            >
              <SelectField
                value={prefs.formato_fecha}
                onChange={(v) => handleChange('formato_fecha', v)}
                options={[
                  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
                ]}
              />
            </SettingRow>
          </SectionCard>

          {/* ═══ SEGURIDAD ═══ */}
          <SectionCard icon={Shield} title="Seguridad">
            <SettingRow
              icon={Clock}
              title="Tiempo de Sesión"
              description="Cerrar sesión automáticamente después de inactividad"
            >
              <SelectField
                value={prefs.tiempo_sesion}
                onChange={(v) => handleChange('tiempo_sesion', Number(v))}
                options={[
                  { value: 15, label: '15 minutos' },
                  { value: 30, label: '30 minutos' },
                  { value: 60, label: '1 hora' },
                  { value: 120, label: '2 horas' },
                  { value: 0, label: 'Nunca' },
                ]}
              />
            </SettingRow>
          </SectionCard>

          {/* ═══ INFO SISTEMA (solo admin) ═══ */}
          {user?.rol === 'admin' && (
            <SectionCard icon={Settings} title="Información del Sistema">
              <SettingRow title="Versión" description="CRM ISTHO">
                <span className="text-sm font-mono text-slate-600 dark:text-slate-300">v1.0.0</span>
              </SettingRow>
              <SettingRow title="Entorno" description="Ambiente de ejecución">
                <span className="text-sm font-mono text-emerald-600 dark:text-emerald-400">Producción</span>
              </SettingRow>
              <SettingRow title="Base de Datos" description="Motor de base de datos">
                <span className="text-sm font-mono text-slate-600 dark:text-slate-300">MySQL 8.0</span>
              </SettingRow>
            </SectionCard>
          )}

          {/* ═══ BACKUPS (solo admin) ═══ */}
          {user?.rol === 'admin' && <SeccionBackup />}

        </div>

        {/* Floating save button (mobile) */}
        {hasChanges && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 sm:hidden">
            <Button variant="primary" icon={Save} onClick={handleSave} loading={loading} className="shadow-2xl">
              Guardar Cambios
            </Button>
          </div>
        )}

        {/* Footer */}
        <PageFooter />
      </main>
    </div>
  );
};

export default Configuracion;
