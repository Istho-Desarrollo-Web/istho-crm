/**
 * ISTHO CRM - Configuracion Page
 * Preferencias del usuario con persistencia en backend.
 *
 * @author Coordinacion TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
import {
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Shield,
  Clock,
  Calendar,
  Check,
  Loader2,
  Save,
} from 'lucide-react';

import { Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useThemeContext } from '../../context/ThemeContext';
import usuarioService from '../../api/usuarioService';
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
      ${enabled ? 'bg-orange-500' : 'bg-slate-300 dark:bg-slate-600'}
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
    className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all min-w-[180px]"
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
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 mt-0.5">
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
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
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
    } catch (err) {
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
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Configuración</h1>
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
