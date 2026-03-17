/**
 * ISTHO CRM - Configuracion Page
 * Página de configuración del sistema
 * 
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings,
  Bell,
  Moon,
  Sun,
  Globe,
  Mail,
  Smartphone,
  Shield,
  Database,
  Cloud,
  HardDrive,
  Palette,
  Monitor,
  Volume2,
  VolumeX,
  Clock,
  Calendar,
  ChevronRight,
  Check,
  Info,
  AlertTriangle,
} from 'lucide-react';

// Layout


// Components
import { Button } from '../../components/common';

// ============================================
// TOGGLE SWITCH
// ============================================
const ToggleSwitch = ({ enabled, onChange, disabled = false }) => (
  <button
    onClick={() => !disabled && onChange(!enabled)}
    disabled={disabled}
    className={`
      relative w-11 h-6 rounded-full transition-colors duration-200
      ${enabled ? 'bg-orange-500' : 'bg-slate-200'}
      ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    `}
  >
    <span
      className={`
        absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm
        transition-transform duration-200
        ${enabled ? 'translate-x-5' : 'translate-x-0'}
      `}
    />
  </button>
);

// ============================================
// SETTING ITEM
// ============================================
const SettingItem = ({ icon: Icon, title, description, children }) => (
  <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
    <div className="flex items-center gap-4">
      {Icon && (
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-500" />
        </div>
      )}
      <div>
        <p className="font-medium text-slate-800">{title}</p>
        {description && <p className="text-sm text-slate-500">{description}</p>}
      </div>
    </div>
    <div className="flex items-center gap-2">
      {children}
    </div>
  </div>
);

// ============================================
// SETTING SECTION
// ============================================
const SettingSection = ({ title, children }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
    <div className="px-6 py-4 border-b border-gray-100 bg-slate-50">
      <h3 className="font-semibold text-slate-800">{title}</h3>
    </div>
    <div className="px-6">
      {children}
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
const Configuracion = () => {
  const navigate = useNavigate();

  // Estados de configuración
  const [settings, setSettings] = useState({
    // Apariencia
    darkMode: false,
    compactMode: false,
    animations: true,

    // Notificaciones
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    soundEnabled: true,

    // Notificaciones específicas
    notifyDespachos: true,
    notifyInventario: true,
    notifyClientes: true,
    notifyReportes: false,

    // Regional
    language: 'es',
    timezone: 'America/Bogota',
    dateFormat: 'DD/MM/YYYY',
    currency: 'COP',

    // Seguridad
    twoFactorAuth: false,
    sessionTimeout: '30',

    // Datos
    autoBackup: true,
    backupFrequency: 'daily',
  });

  const handleToggle = (key) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelect = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">


      <main className="pt-28 px-4 pb-8 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-800">Configuración</h1>
          <p className="text-slate-500 mt-1">
            Personaliza tu experiencia en el sistema
          </p>
        </div>

        {/* Apariencia */}
        <SettingSection title="Apariencia">
          <SettingItem
            icon={settings.darkMode ? Moon : Sun}
            title="Modo Oscuro"
            description="Cambiar entre tema claro y oscuro"
          >
            <ToggleSwitch
              enabled={settings.darkMode}
              onChange={() => handleToggle('darkMode')}
            />
          </SettingItem>

          <SettingItem
            icon={Monitor}
            title="Modo Compacto"
            description="Reduce el espaciado para mostrar más contenido"
          >
            <ToggleSwitch
              enabled={settings.compactMode}
              onChange={() => handleToggle('compactMode')}
            />
          </SettingItem>

          <SettingItem
            icon={Palette}
            title="Animaciones"
            description="Habilitar transiciones y efectos visuales"
          >
            <ToggleSwitch
              enabled={settings.animations}
              onChange={() => handleToggle('animations')}
            />
          </SettingItem>
        </SettingSection>

        {/* Notificaciones */}
        <SettingSection title="Notificaciones">
          <SettingItem
            icon={Mail}
            title="Notificaciones por Email"
            description="Recibir alertas en tu correo electrónico"
          >
            <ToggleSwitch
              enabled={settings.emailNotifications}
              onChange={() => handleToggle('emailNotifications')}
            />
          </SettingItem>

          <SettingItem
            icon={Bell}
            title="Notificaciones Push"
            description="Alertas en tiempo real en el navegador"
          >
            <ToggleSwitch
              enabled={settings.pushNotifications}
              onChange={() => handleToggle('pushNotifications')}
            />
          </SettingItem>

          <SettingItem
            icon={Smartphone}
            title="Notificaciones SMS"
            description="Mensajes de texto para alertas críticas"
          >
            <ToggleSwitch
              enabled={settings.smsNotifications}
              onChange={() => handleToggle('smsNotifications')}
            />
          </SettingItem>

          <SettingItem
            icon={settings.soundEnabled ? Volume2 : VolumeX}
            title="Sonidos"
            description="Reproducir sonido con las notificaciones"
          >
            <ToggleSwitch
              enabled={settings.soundEnabled}
              onChange={() => handleToggle('soundEnabled')}
            />
          </SettingItem>
        </SettingSection>

        {/* Alertas por Módulo */}
        <SettingSection title="Alertas por Módulo">
          <SettingItem
            title="Despachos"
            description="Nuevos despachos, cambios de estado, retrasos"
          >
            <ToggleSwitch
              enabled={settings.notifyDespachos}
              onChange={() => handleToggle('notifyDespachos')}
            />
          </SettingItem>

          <SettingItem
            title="Inventario"
            description="Stock bajo, productos agotados, vencimientos"
          >
            <ToggleSwitch
              enabled={settings.notifyInventario}
              onChange={() => handleToggle('notifyInventario')}
            />
          </SettingItem>

          <SettingItem
            title="Clientes"
            description="Nuevos clientes, actualizaciones, tickets"
          >
            <ToggleSwitch
              enabled={settings.notifyClientes}
              onChange={() => handleToggle('notifyClientes')}
            />
          </SettingItem>

          <SettingItem
            title="Reportes"
            description="Reportes programados completados"
          >
            <ToggleSwitch
              enabled={settings.notifyReportes}
              onChange={() => handleToggle('notifyReportes')}
            />
          </SettingItem>
        </SettingSection>

        {/* Regional */}
        <SettingSection title="Configuración Regional">
          <SettingItem
            icon={Globe}
            title="Idioma"
            description="Idioma de la interfaz"
          >
            <select
              value={settings.language}
              onChange={(e) => handleSelect('language', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </SettingItem>

          <SettingItem
            icon={Clock}
            title="Zona Horaria"
            description="Zona horaria para fechas y horas"
          >
            <select
              value={settings.timezone}
              onChange={(e) => handleSelect('timezone', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/Lima">Lima (GMT-5)</option>
              <option value="America/Buenos_Aires">Buenos Aires (GMT-3)</option>
            </select>
          </SettingItem>

          <SettingItem
            icon={Calendar}
            title="Formato de Fecha"
            description="Cómo se muestran las fechas"
          >
            <select
              value={settings.dateFormat}
              onChange={(e) => handleSelect('dateFormat', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </SettingItem>
        </SettingSection>

        {/* Seguridad */}
        <SettingSection title="Seguridad">
          <SettingItem
            icon={Shield}
            title="Autenticación de Dos Factores"
            description="Añade una capa extra de seguridad"
          >
            <ToggleSwitch
              enabled={settings.twoFactorAuth}
              onChange={() => handleToggle('twoFactorAuth')}
            />
          </SettingItem>

          <SettingItem
            icon={Clock}
            title="Tiempo de Sesión"
            description="Cerrar sesión automáticamente después de inactividad"
          >
            <select
              value={settings.sessionTimeout}
              onChange={(e) => handleSelect('sessionTimeout', e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            >
              <option value="15">15 minutos</option>
              <option value="30">30 minutos</option>
              <option value="60">1 hora</option>
              <option value="120">2 horas</option>
              <option value="never">Nunca</option>
            </select>
          </SettingItem>
        </SettingSection>

        {/* Datos y Respaldos */}
        <SettingSection title="Datos y Respaldos">
          <SettingItem
            icon={Cloud}
            title="Respaldo Automático"
            description="Crear copias de seguridad automáticamente"
          >
            <ToggleSwitch
              enabled={settings.autoBackup}
              onChange={() => handleToggle('autoBackup')}
            />
          </SettingItem>

          {settings.autoBackup && (
            <SettingItem
              icon={Database}
              title="Frecuencia de Respaldo"
              description="Cada cuánto se realiza el respaldo"
            >
              <select
                value={settings.backupFrequency}
                onChange={(e) => handleSelect('backupFrequency', e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              >
                <option value="daily">Diario</option>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
              </select>
            </SettingItem>
          )}

          <SettingItem
            icon={HardDrive}
            title="Exportar Datos"
            description="Descargar una copia de tus datos"
          >
            <Button variant="outline" size="sm">
              Exportar
            </Button>
          </SettingItem>
        </SettingSection>

        {/* Info del Sistema */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-slate-800 mb-4">Información del Sistema</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-500">Versión</p>
              <p className="font-medium text-slate-800">CRM ISTHO v1.0.0</p>
            </div>
            <div>
              <p className="text-slate-500">Última Actualización</p>
              <p className="font-medium text-slate-800">Enero 8, 2026</p>
            </div>
            <div>
              <p className="text-slate-500">Entorno</p>
              <p className="font-medium text-slate-800">Producción</p>
            </div>
            <div>
              <p className="text-slate-500">Base de Datos</p>
              <p className="font-medium text-slate-800">MySQL 8.0</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-slate-400">
              © 2026 ISTHO S.A.S. Todos los derechos reservados.
              Centro Logístico Industrial del Norte, Girardota - Antioquia
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button variant="primary" icon={Check}>
            Guardar Configuración
          </Button>
        </div>
      </main>
    </div>
  );
};

export default Configuracion;