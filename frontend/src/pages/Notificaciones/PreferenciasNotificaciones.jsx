import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ArrowLeft,
  Volume2,
  VolumeX,
  Truck,
  Package,
  Users,
  Car,
  FileText,
  AlertTriangle,
  Save,
  Loader2,
} from 'lucide-react';
import notificacionesService from '@api/notificacionesService';
import { useAuth } from '@context/AuthContext';
import useNotification from '@hooks/useNotification';

// ─────────────────────────────────────────────────────────────────────────────
// Definición de categorías de preferencias
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIAS = [
  {
    key: 'alertas_despachos',
    titulo: 'Despachos y Operaciones',
    descripcion: 'Entradas y salidas de mercancía, sincronizaciones con WMS Copérnico.',
    icono: Truck,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
  },
  {
    key: 'alertas_inventario',
    titulo: 'Inventario',
    descripcion: 'Stock bajo, productos agotados y exceso de stock.',
    icono: Package,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
  },
  {
    key: 'alertas_clientes',
    titulo: 'Clientes',
    descripcion: 'Creación, modificación y eliminación de clientes.',
    icono: Users,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
  },
  {
    key: 'alertas_viajes',
    titulo: 'Viajes y Gastos',
    descripcion: 'Cajas menores abiertas, gastos pendientes de aprobación y viajes completados.',
    icono: Car,
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
  },
  {
    key: 'alertas_reportes',
    titulo: 'Reportes',
    descripcion: 'Reportes programados generados y enviados automáticamente.',
    icono: FileText,
    color: 'text-cyan-500',
    bg: 'bg-cyan-50 dark:bg-cyan-900/20',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Componente Toggle
// ─────────────────────────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className="relative shrink-0 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-centhrix-accent focus:ring-offset-2 dark:focus:ring-offset-centhrix-card"
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      width: '44px',
      height: '24px',
      padding: 0,
      border: 'none',
      backgroundColor: checked ? '#E74C3C' : 'var(--toggle-off, #d1d5db)',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
      flexShrink: 0,
    }}
  >
    <span
      style={{
        display: 'block',
        width: '20px',
        height: '20px',
        borderRadius: '9999px',
        backgroundColor: 'white',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        transform: checked ? 'translateX(22px)' : 'translateX(2px)',
        transition: 'transform 200ms ease-in-out',
        pointerEvents: 'none',
        flexShrink: 0,
      }}
    />
  </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function PreferenciasNotificaciones() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();

  const [prefs, setPrefs] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const data = await notificacionesService.getPreferencias();
      if (data) setPrefs(data);
    } catch {
      showError('No se pudieron cargar las preferencias');
    } finally {
      setCargando(false);
    }
  }, [showError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const togglePref = (key) => {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const guardar = async () => {
    if (!prefs) return;
    setGuardando(true);
    try {
      await notificacionesService.updatePreferencias(prefs);
      await refreshUser();
      showSuccess('Preferencias guardadas correctamente');
    } catch {
      showError('Error al guardar las preferencias');
    } finally {
      setGuardando(false);
    }
  };

  const activasCount = prefs ? CATEGORIAS.filter((c) => prefs[c.key]).length : 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-centhrix-bg">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white dark:hover:bg-centhrix-surface dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-centhrix-accent/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-centhrix-accent" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white font-display">
                Preferencias de Notificaciones
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Controla qué alertas recibes en el sistema
              </p>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-centhrix-accent" />
          </div>
        ) : !prefs ? (
          <div className="text-center py-20 text-gray-500 dark:text-gray-400">
            No se pudieron cargar las preferencias
          </div>
        ) : (
          <div className="space-y-4">
            {/* Nota urgente */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Las notificaciones de prioridad <strong>urgente</strong> se envían siempre,
                independientemente de estas preferencias.
              </p>
            </div>

            {/* Categorías */}
            <div className="bg-white dark:bg-centhrix-card rounded-2xl border border-gray-100 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800">
              {CATEGORIAS.map(({ key, titulo, descripcion, icono: Icono, color, bg }) => (
                <div key={key} className="flex items-center gap-3 px-4 py-4">
                  <div
                    className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0`}
                  >
                    <Icono className={`w-4 h-4 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate" title={titulo}>{titulo}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{descripcion}</p>
                  </div>
                  <Toggle
                    checked={prefs[key] !== false}
                    onChange={() => togglePref(key)}
                    disabled={guardando}
                  />
                </div>
              ))}
            </div>

            {/* Sonido */}
            <div className="bg-white dark:bg-centhrix-card rounded-2xl border border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-3 px-4 py-4">
                <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                  {prefs.notificaciones_sonido ? (
                    <Volume2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Sonido de notificaciones
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Reproduce un sonido al recibir nuevas notificaciones en tiempo real.
                  </p>
                </div>
                <Toggle
                  checked={prefs.notificaciones_sonido !== false}
                  onChange={() => togglePref('notificaciones_sonido')}
                  disabled={guardando}
                />
              </div>
            </div>

            {/* Resumen + Guardar */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {activasCount} de {CATEGORIAS.length} categorías activas
              </p>
              <button
                onClick={guardar}
                disabled={guardando}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-centhrix-accent hover:bg-centhrix-hover text-white text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {guardando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Guardar preferencias
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
