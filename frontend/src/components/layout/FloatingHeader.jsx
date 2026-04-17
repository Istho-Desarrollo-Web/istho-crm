/**
 * ============================================================================
 * ISTHO CRM - FloatingHeader (Ultimate Edition)
 * ============================================================================
 * Header con modo oscuro, atajos de teclado y optimizaciones avanzadas.
 * 
 * @author Coordinación TI ISTHO
 * @version 4.0.0
 * @date Enero 2026
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import {
  ChevronDown,
  Search,
  Bell,
  FileSpreadsheet,
  LayoutDashboard,
  Users,
  Building2,
  Package,
  AlertCircle,
  AlertTriangle,
  Truck,
  FileText,
  Info,
  CheckCheck,
  ExternalLink,
  ClipboardList,
  BarChart3,
  LogOut,
  Settings,
  UserCircle,
  Shield,
  Menu,
  X,
  Sun,
  Moon,
  Keyboard,
  Mail,
  Activity,
  RefreshCw,
  MapPin,
  Wallet,
  Receipt,
  CarFront,
  Download,
  Upload,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import { useNotificaciones } from '../../context/NotificacionesContext';
import { formatDateShort as formatDateSafe } from '../../utils/formatDate';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const getTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Ahora';
  if (mins < 60) return `Hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return formatDateSafe(dateStr);
};

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DEL MENÚ
// ════════════════════════════════════════════════════════════════════════════
const allMenuConfig = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    basePath: '/dashboard',
    shortcut: 'D',
    items: [
      { icon: LayoutDashboard, label: 'Vista General', href: '/dashboard', shortcut: 'G D' },
      { icon: BarChart3, label: 'Reportes', href: '/reportes', shortcut: 'G R' },
      { icon: Building2, label: 'Mi Empresa', href: '/mi-empresa', soloPortal: true },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: Users,
    basePath: '/clientes',
    shortcut: 'C',
    soloInternos: true, // No visible para rol cliente
    items: [
      { icon: Users, label: 'Lista de Clientes', href: '/clientes', shortcut: 'G C' },
      { icon: Mail, label: 'Plantillas de Email', href: '/plantillas-email', shortcut: 'G P' },
    ],
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Package,
    basePath: '/inventario',
    shortcut: 'I',
    items: [
      { icon: Package, label: 'Maestro de Productos', href: '/inventario', shortcut: 'G I' },
      { icon: AlertCircle, label: 'Alertas de Productos', href: '/inventario/alertas', shortcut: 'G L' },
    ],
  },
  {
    id: 'operaciones',
    label: 'Operaciones',
    icon: ClipboardList,
    basePath: '/operaciones',
    shortcut: 'N',
    items: [
      { icon: Download, label: 'Entradas', href: '/operaciones/entradas', shortcut: 'G E' },
      { icon: Upload, label: 'Salidas', href: '/operaciones/salidas', shortcut: 'G S' },
      { icon: RefreshCw, label: 'Kardex', href: '/operaciones/kardex', shortcut: 'G K' },
    ],
  },
  {
    id: 'viajes',
    label: 'Viajes',
    icon: MapPin,
    basePath: '/viajes',
    shortcut: 'V',
    soloInternos: true,
    items: [
      { icon: CarFront, label: 'Vehículos', href: '/viajes/vehiculos', shortcut: 'G V' },
      { icon: Wallet, label: 'Cajas Menores', href: '/viajes/cajas-menores', shortcut: 'G M' },
      { icon: MapPin, label: 'Viajes', href: '/viajes/viajes', shortcut: 'G T' },
      { icon: Receipt, label: 'Movimientos', href: '/viajes/movimientos', shortcut: 'G O' },
    ],
  },
  {
    id: 'admin',
    label: 'Administración',
    icon: Shield,
    basePath: '/administracion',
    shortcut: 'A',
    soloAdmin: true,
    items: [
      { icon: Settings, label: 'Usuarios y Roles', href: '/administracion', shortcut: 'G U' },
      { icon: Activity, label: 'Auditoría de Acciones', href: '/auditoria-acciones', shortcut: 'G X' },
      { icon: Truck, label: 'Configuración WMS', href: '/configuracion-wms' },
    ],
  },
];

/**
 * Filtra menús según el rol del usuario y permisos de portal
 * @param {string} rol - Rol del usuario
 * @param {Function} hasPermission - Función para verificar permisos de portal
 */
/**
 * Mapeo de menú → módulo de permisos
 * Cada menú requiere al menos un permiso para mostrarse
 */
const MENU_PERMISSION_MAP = {
  dashboard: ['dashboard.ver'],
  clientes: ['clientes.ver'],
  inventario: ['inventario.ver', 'inventario.alertas'],
  operaciones: ['operaciones.ver'],
  viajes: ['vehiculos.ver', 'viajes.ver', 'caja_menor.ver', 'movimientos.ver'],
  admin: ['usuarios.ver', 'roles.ver', 'configuracion_wms.ver'],
};

const getMenuForRole = (rol, hasPermission) => {
  // Admin ve todo
  if (rol === 'admin') return allMenuConfig;

  return allMenuConfig
    .filter(menu => {
      // Ocultar menús soloAdmin para no-admins
      if (menu.soloAdmin) return false;
      // Ocultar menús soloInternos para clientes
      if (menu.soloInternos && rol === 'cliente') return false;

      // Verificar si el usuario tiene al menos UN permiso del menú
      const permisos = MENU_PERMISSION_MAP[menu.id];
      if (permisos) {
        return permisos.some(p => {
          const [modulo, accion] = p.split('.');
          return hasPermission(modulo, accion);
        });
      }
      return true;
    })
    .map(menu => {
      // Filtrar sub-items según permisos específicos
      const filteredItems = menu.items.filter(item => {
        // Mi Empresa solo visible para portal cliente
        if (item.soloPortal) return rol === 'cliente' && hasPermission('clientes', 'ver');
        // Alertas de inventario requiere permiso especial
        if (item.href === '/inventario/alertas') return hasPermission('inventario', 'alertas');
        // Maestro de productos requiere inventario.ver
        if (item.href === '/inventario') return hasPermission('inventario', 'ver');
        // Operaciones (Entradas, Salidas, Kardex)
        if (item.href === '/operaciones/entradas') return hasPermission('operaciones', 'ver');
        if (item.href === '/operaciones/salidas') return hasPermission('operaciones', 'ver');
        if (item.href === '/operaciones/kardex') return hasPermission('operaciones', 'ver');
        // Reportes requiere permiso
        if (item.href === '/reportes') return hasPermission('reportes', 'ver');
        // Configuración WMS requiere permiso
        if (item.href === '/configuracion-wms') return hasPermission('configuracion_wms', 'ver');
        // Plantillas de email requiere permiso específico
        if (item.href === '/plantillas-email') return hasPermission('plantillas_email', 'ver');
        // Lista de clientes requiere permiso
        if (item.href === '/clientes') return hasPermission('clientes', 'ver');
        // Sub-items de viajes por módulo
        if (item.href === '/viajes/vehiculos') return hasPermission('vehiculos', 'ver');
        if (item.href === '/viajes/viajes') return hasPermission('viajes', 'ver');
        if (item.href === '/viajes/cajas-menores') return hasPermission('caja_menor', 'ver');
        if (item.href === '/viajes/movimientos') return hasPermission('movimientos', 'ver');
        return true;
      });

      // Si no quedan sub-items visibles, ocultar el menú
      if (filteredItems.length === 0) return null;

      return { ...menu, items: filteredItems };
    })
    .filter(Boolean);
};

// ════════════════════════════════════════════════════════════════════════════
// CUSTOM HOOKS
// ════════════════════════════════════════════════════════════════════════════

import { useThemeContext } from '../../context/ThemeContext';
import logoNegro from '../../assets/logo-negro.png';
import logoBlanco from '../../assets/logo-blanco.png';
import { getServerFileUrl } from '../../api/client';

/**
 * Hook para atajos de teclado
 */
const useKeyboardShortcuts = (shortcuts, enabled = true) => {
  // Ref para acceder siempre al array más reciente sin re-registrar el listener
  const shortcutsRef = useRef(shortcuts);
  const sequenceRef = useRef([]);
  const timeoutRef = useRef(null);

  // Sincronizar la ref en cada render sin disparar el effect
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const current = shortcutsRef.current;

      // Ignorar si está escribiendo en un input (excepto Ctrl/Cmd)
      if (!e.ctrlKey && !e.metaKey && ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      // Atajos especiales con modificadores (Ctrl en Windows, Cmd en Mac)
      if (e.ctrlKey || e.metaKey) {
        // Ignorar en inputs solo si NO hay un shortcut registrado para esa combinación
        const key = e.key.toUpperCase();
        const shortcut = current.find(s => {
          const sKey = s.key.toUpperCase();
          return sKey === `CMD+${key}` || sKey === `CTRL+${key}`;
        });
        if (shortcut) {
          e.preventDefault();
          shortcut.action();
        }
        return;
      }

      // Ignorar inputs para secuencias
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      // Secuencias (ej: "G D" para ir a dashboard)
      const key = e.key.toUpperCase();
      sequenceRef.current.push(key);

      // Limpiar secuencia después de 1 segundo
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        sequenceRef.current = [];
      }, 1000);

      // Verificar secuencia
      const sequence = sequenceRef.current.join(' ');
      const shortcut = current.find(s => s.key === sequence);
      if (shortcut) {
        e.preventDefault();
        shortcut.action();
        sequenceRef.current = [];
      }
    };

    // capture:true garantiza que este listener se ejecuta antes que cualquier handler de elemento
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
      clearTimeout(timeoutRef.current);
    };
  }, [enabled]); // Solo se re-registra si enabled cambia, no en cada render
};

/**
 * Hook para detectar scroll
 */
const useScrollBehavior = (threshold = 10) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isAtTop, setIsAtTop] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setIsAtTop(currentScrollY < threshold);

      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current) {
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { isVisible, isAtTop };
};

/**
 * Hook para cerrar menús al hacer click fuera
 */
const useClickOutside = (ref, callback) => {
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, callback]);
};

/**
 * Hook para manejar teclas de escape
 */
const useEscapeKey = (callback) => {
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') callback();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback]);
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Badge de notificaciones
 */
const NotificationBadge = ({ count }) => {
  if (!count || count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-slate-800">
      {count > 9 ? '+9' : count}
    </span>
  );
};

NotificationBadge.propTypes = {
  count: PropTypes.number,
};

/**
 * Shortcut Badge
 */
const ShortcutBadge = ({ shortcut }) => {
  if (!shortcut) return null;

  return (
    <span className="ml-auto text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
      {shortcut}
    </span>
  );
};

ShortcutBadge.propTypes = {
  shortcut: PropTypes.string,
};

/**
 * Modal de atajos de teclado
 */
const KeyboardShortcutsModal = ({ isOpen, onClose }) => {
  useEscapeKey(onClose);

  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Navegación General', items: [
        { keys: ['G', 'D'], description: 'Ir a Dashboard' },
        { keys: ['G', 'R'], description: 'Ir a Reportes' },
        { keys: ['G', 'C'], description: 'Ir a Clientes' },
        { keys: ['G', 'P'], description: 'Ir a Plantillas Email' },
      ]
    },
    {
      category: 'Inventario', items: [
        { keys: ['G', 'I'], description: 'Maestro de Productos' },
        { keys: ['G', 'L'], description: 'Alertas de Productos' },
      ]
    },
    {
      category: 'Operaciones', items: [
        { keys: ['G', 'E'], description: 'Entradas' },
        { keys: ['G', 'S'], description: 'Salidas' },
        { keys: ['G', 'K'], description: 'Kardex' },
      ]
    },
    {
      category: 'Viajes y Cajas', items: [
        { keys: ['G', 'V'], description: 'Vehículos' },
        { keys: ['G', 'T'], description: 'Viajes' },
        { keys: ['G', 'M'], description: 'Cajas Menores' },
        { keys: ['G', 'O'], description: 'Movimientos' },
      ]
    },
    {
      category: 'Administración', items: [
        { keys: ['G', 'U'], description: 'Usuarios y Roles' },
        { keys: ['G', 'X'], description: 'Auditoría de Acciones' },
      ]
    },
    {
      category: 'Acciones Rápidas', items: [
        { keys: ['Ctrl', 'K'], description: 'Abrir búsqueda' },
        { keys: ['Ctrl', 'B'], description: 'Toggle modo oscuro' },
        { keys: ['Ctrl', '/'], description: 'Ver atajos de teclado' },
        { keys: ['ESC'], description: 'Cerrar modal/menú' },
      ]
    },
  ];

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 z-[60] backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#E74C3C] to-[#C0392B] rounded-lg flex items-center justify-center">
                <Keyboard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-white">Atajos de Teclado</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Aumenta tu productividad</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {shortcuts.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
                  {section.category}
                </h3>
                <div className="space-y-2">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <span className="text-sm text-slate-700 dark:text-slate-200">{item.description}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIdx) => (
                          <kbd
                            key={keyIdx}
                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono rounded border border-slate-300 dark:border-slate-600 shadow-sm"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

KeyboardShortcutsModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

/**
 * Item del menú dropdown
 */
const DropdownMenuItem = ({ icon: Icon, label, href, isActive, onClick, badge, shortcut }) => (
  <button
    onClick={() => onClick(href)}
    className={`
      flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors
      ${isActive
        ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 font-medium'
        : 'text-slate-600 dark:text-slate-300 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-slate-700'
      }
    `}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      {label}
    </div>
    <div className="flex items-center gap-2">
      {badge && (
        <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
          {badge}
        </span>
      )}
      <ShortcutBadge shortcut={shortcut} />
    </div>
  </button>
);

DropdownMenuItem.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  href: PropTypes.string.isRequired,
  isActive: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  shortcut: PropTypes.string,
};

/**
 * Menú dropdown de navegación (Desktop)
 */
const DropdownMenu = ({ menu, isActive, isCurrentSection, onMouseEnter, onMouseLeave, onNavigate, currentPath }) => {
  const Icon = menu.icon;
  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        className={`
          group relative flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
          ${isCurrentSection
            ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20'
            : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700'
          }
        `}
        aria-expanded={isActive}
        aria-haspopup="true"
      >
        {Icon && <Icon className="w-5 h-5" />}
        <ChevronDown
          className={`w-3 h-3 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}
        />
        {!isActive && (
          <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-1 text-xs font-medium text-white bg-slate-800 dark:bg-slate-600 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-[60]">
            {menu.label}
          </span>
        )}
      </button>

      {isActive && (
        <div className="absolute top-full left-0 pt-2 w-56 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-100 dark:border-slate-700 py-2 animate-fadeIn">
            {menu.items.map((item, idx) => (
              <DropdownMenuItem
                key={idx}
                icon={item.icon}
                label={item.label}
                href={item.href}
                isActive={currentPath === item.href.split('?')[0]}
                onClick={onNavigate}
                badge={item.badge}
                shortcut={item.shortcut}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

DropdownMenu.propTypes = {
  menu: PropTypes.shape({
    id: PropTypes.string,
    label: PropTypes.string,
    icon: PropTypes.elementType,
    items: PropTypes.array,
  }).isRequired,
  isActive: PropTypes.bool.isRequired,
  isCurrentSection: PropTypes.bool,
  onMouseEnter: PropTypes.func.isRequired,
  onMouseLeave: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  currentPath: PropTypes.string,
};

/**
 * Sección expandible para móvil
 */
const MobileMenuSection = ({ menu, isExpanded, onToggle, onNavigate, currentPath }) => (
  <div className="border-b border-gray-100 dark:border-slate-700 last:border-0">
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      aria-expanded={isExpanded}
    >
      <span className="font-medium text-slate-800 dark:text-white">{menu.label}</span>
      <ChevronDown
        className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
      />
    </button>

    {isExpanded && (
      <div className="pb-2 bg-slate-50/50 dark:bg-slate-800/50">
        {menu.items.map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentPath === item.href.split('?')[0];

          return (
            <button
              key={idx}
              onClick={() => onNavigate(item.href)}
              className={`
                flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors
                ${isActive
                  ? 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 font-medium'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700'
                }
              `}
            >
              <div className="flex items-center gap-3 ml-4">
                <Icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.badge && (
                <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

MobileMenuSection.propTypes = {
  menu: PropTypes.object.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  onNavigate: PropTypes.func.isRequired,
  currentPath: PropTypes.string,
};

/**
 * Menú lateral móvil
 */
const MobileMenu = ({ isOpen, onClose, user, onNavigate, onLogout, currentPath, isDark, onToggleDark, _onShowShortcuts, menuItems }) => {
  const [expandedSection, setExpandedSection] = useState(null);
  const menuRef = useRef(null);

  useEscapeKey(onClose);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const roleConfig = {
    admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', label: 'Administrador' },
    supervisor: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', label: 'Supervisor' },
    financiera: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Financiera' },
    operador: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', label: 'Operador' },
    conductor: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', label: 'Conductor' },
    cliente: { bg: 'bg-violet-100 dark:bg-violet-900/30', text: 'text-violet-700 dark:text-violet-300', label: 'Cliente' },
  };

  const roleStyle = roleConfig[user?.rol] || roleConfig.operador;

  const handleNavigation = (href) => {
    onNavigate(href);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 md:hidden transition-opacity duration-300"
        onClick={onClose}
      />

      <div
        ref={menuRef}
        className="fixed top-0 left-0 h-full w-80 max-w-[85vw] bg-white dark:bg-slate-900 z-50 shadow-2xl md:hidden overflow-y-auto transform transition-transform duration-300"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 px-4 py-4 z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img src={logoBlanco} alt="ISTHO" className="w-8 h-8 rounded-lg dark:hidden" />
              <img src={logoNegro} alt="ISTHO" className="w-8 h-8 rounded-lg hidden dark:block" />
              <span className="text-xl font-bold text-slate-800 dark:text-white">CRM</span>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Cerrar menú"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            {user?.avatar_url ? (
              <img src={getServerFileUrl(user.avatar_url)} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0 shadow-md" />
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-white font-bold">
                  {getInitials(user?.nombre_completo)}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800 dark:text-white truncate text-sm">
                {user?.nombre_completo || 'Usuario'}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                {user?.email || 'email@istho.com'}
              </p>
              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${roleStyle.bg} ${roleStyle.text}`}>
                <Shield className="w-3 h-3" />
                {roleStyle.label}
              </span>
            </div>
          </div>

          {/* Portal Cliente Badge (móvil) */}
          {user?.rol === 'cliente' && user?.cliente_info && (
            <div className="flex items-center gap-3 mt-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800">
              {user.cliente_info.logo_url ? (
                <img
                  src={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${user.cliente_info.logo_url}`}
                  alt={user.cliente_info.razon_social}
                  className="w-10 h-10 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-600"
                />
              ) : (
                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400">Portal Cliente</p>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{user.cliente_info.razon_social}</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="py-2">
          {menuItems.map((menu) => (
            <MobileMenuSection
              key={menu.id}
              menu={menu}
              isExpanded={expandedSection === menu.id}
              onToggle={() => setExpandedSection(expandedSection === menu.id ? null : menu.id)}
              onNavigate={handleNavigation}
              currentPath={currentPath}
            />
          ))}
        </div>

        {/* Quick Actions */}
        <div className="border-t border-gray-200 dark:border-slate-700 mt-2 p-4 space-y-2">
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-2 mb-3">
            Acciones Rápidas
          </p>
          {!['conductor', 'cliente'].includes(user?.rol) && (
            <button
              onClick={() => handleNavigation('/reportes')}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Reportes
            </button>
          )}
          <button
            onClick={() => handleNavigation('/perfil')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <UserCircle className="w-4 h-4" />
            Mi Perfil
          </button>
          <button
            onClick={() => handleNavigation('/configuracion')}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4" />
            Configuración
          </button>
          <button
            onClick={onToggleDark}
            className="flex items-center justify-between w-full px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-3">
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              Modo {isDark ? 'Claro' : 'Oscuro'}
            </div>
            <ShortcutBadge shortcut="⌘B" />
          </button>
        </div>

        {/* Logout */}
        <div className="border-t border-gray-200 dark:border-slate-700 p-4">
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-3 w-full px-4 py-3 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 rounded-lg transition-colors shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>

        {/* Footer */}
        <div className="p-4 text-center border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            © 2026 ISTHO CRM v2.0.0
          </p>
        </div>
      </div>
    </>
  );
};

MobileMenu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  user: PropTypes.object,
  onNavigate: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
  currentPath: PropTypes.string,
  isDark: PropTypes.bool.isRequired,
  onToggleDark: PropTypes.func.isRequired,
  onShowShortcuts: PropTypes.func.isRequired,
};

/**
 * Avatar con Dropdown de usuario
 */
const AvatarDropdown = ({ user, onNavigate, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));
  useEscapeKey(() => setIsOpen(false));

  const getInitials = (u) => {
    if (u?.nombre && u?.apellido) return `${u.nombre[0]}${u.apellido[0]}`.toUpperCase();
    if (u?.nombre_completo) {
      const parts = u.nombre_completo.trim().split(/\s+/);
      return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : parts[0][0].toUpperCase();
    }
    return (u?.username || 'U')[0].toUpperCase();
  };

  const roleLabels = {
    admin: 'Administrador',
    supervisor: 'Supervisor',
    financiera: 'Financiera',
    operador: 'Operador',
    conductor: 'Conductor',
    cliente: 'Portal Cliente',
  };

  const handleNavigate = (path) => {
    onNavigate(path);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="hidden sm:flex items-center ml-2 relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1 pr-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-full border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-all"
      >
        {user?.avatar_url ? (
          <img src={getServerFileUrl(user.avatar_url)} alt="" className="w-8 h-8 rounded-full object-cover shadow-md" />
        ) : (
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium shadow-md text-sm">
            {getInitials(user)}
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50 animate-fadeIn">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-3">
              {user?.avatar_url ? (
                <img src={getServerFileUrl(user.avatar_url)} alt="" className="w-10 h-10 rounded-full object-cover shadow-md" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                  {getInitials(user)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                  {user?.nombre_completo || user?.username || 'Usuario'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full">
                  {roleLabels[user?.rol] || user?.rol}
                </span>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={() => handleNavigate('/perfil')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <UserCircle className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Ver Perfil
            </button>

            <button
              onClick={() => handleNavigate('/configuracion')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Configuración
            </button>

            <button
              onClick={() => handleNavigate('/notificaciones')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
            >
              <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              Notificaciones
            </button>
          </div>

          {/* Logout */}
          <div className="border-t border-gray-100 dark:border-slate-700 py-1">
            <button
              onClick={() => { setIsOpen(false); onLogout(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/40 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

AvatarDropdown.propTypes = {
  user: PropTypes.object,
  onNavigate: PropTypes.func.isRequired,
  onLogout: PropTypes.func.isRequired,
};

/**
 * Header Flotante Principal
 */
const FloatingHeader = () => {
  const navigate = useNavigate();
  const { user, logout, hasPermission } = useAuth();
  const { isDark, toggleDark } = useThemeContext();
  const { isVisible, isAtTop } = useScrollBehavior();
  const { enqueueSnackbar } = useSnackbar();

  // Menú filtrado por rol y permisos de portal
  const menuConfig = getMenuForRole(user?.rol, hasPermission);

  // Estados locales
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);

  // Notificaciones reales
  const { unreadCount: notificationCount, notificaciones, ultimaNotificacion, fetchRecientes, marcarLeida, marcarTodasLeidas, loading: loadingNotifs } = useNotificaciones();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef(null);
  const lastNotifRef = useRef(null);

  // Toast cuando llega notificación en tiempo real
  useEffect(() => {
    if (ultimaNotificacion && ultimaNotificacion !== lastNotifRef.current) {
      lastNotifRef.current = ultimaNotificacion;
      enqueueSnackbar(ultimaNotificacion.titulo || 'Nueva notificación', {
        variant: ultimaNotificacion.prioridad === 'urgente' ? 'error'
          : ultimaNotificacion.prioridad === 'alta' ? 'warning'
          : 'info',
        autoHideDuration: 5000,
      });
    }
  }, [ultimaNotificacion, enqueueSnackbar]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const handleBellClick = () => {
    if (!isNotifOpen) fetchRecientes();
    setIsNotifOpen(prev => !prev);
  };

  // Configurar atajos
  const shortcuts = [
    { key: 'CMD+B', action: toggleDark },
    { key: 'CMD+/', action: () => setIsShortcutsOpen(true) },
    // Navegación
    ...menuConfig.flatMap(menu =>
      menu.items
        .filter(item => item.shortcut)
        .map(item => ({
          key: item.shortcut,
          action: () => navigate(item.href)
        }))
    )
  ];

  useKeyboardShortcuts(shortcuts);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header
        className={`
          fixed z-40 transition-all duration-500 ease-in-out
          left-4 right-4 md:left-8 md:right-8 lg:left-1/2 lg:w-full lg:max-w-7xl lg:-translate-x-1/2
          ${isVisible ? 'top-4 translate-y-0' : '-top-24 -translate-y-full'}
          bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-slate-700
          ${isAtTop
            ? 'shadow-lg shadow-gray-200/50 dark:shadow-black/20'
            : 'shadow-xl shadow-gray-200/50 dark:shadow-black/40 ring-1 ring-black/5'
          }
        `}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">

            {/* Logo & Mobile Toggle */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div
                className="hidden sm:flex items-center gap-2 cursor-pointer"
                onClick={() => navigate('/dashboard')}
              >
                <img
                  src={logoBlanco}
                  alt="ISTHO"
                  className="w-10 h-10 rounded-lg shadow-lg shadow-orange-500/20 dark:hidden"
                />
                <img
                  src={logoNegro}
                  alt="ISTHO"
                  className="w-10 h-10 rounded-lg shadow-lg shadow-orange-500/20 hidden dark:block"
                />
                <span className="hidden sm:block text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-white dark:to-slate-300">
                  CRM
                </span>
              </div>

              {/* Portal Cliente - Logo y nombre del cliente */}
              {user?.rol === 'cliente' && user?.cliente_info && (
                <div className="hidden sm:flex items-center gap-2 ml-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                  {user.cliente_info.logo_url ? (
                    <img
                      src={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000'}${user.cliente_info.logo_url}`}
                      alt={user.cliente_info.razon_social}
                      className="w-7 h-7 rounded-lg object-contain bg-white border border-slate-200 dark:border-slate-600"
                    />
                  ) : (
                    <div className="w-7 h-7 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-violet-600 dark:text-violet-400 leading-tight">
                      Portal Cliente
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight truncate max-w-[140px]">
                      {user.cliente_info.razon_social}
                    </span>
                  </div>
                </div>
              )}

              {/* Badge de Rol (no-cliente) */}
              {user?.rol && user.rol !== 'cliente' && (() => {
                const rolBadges = {
                  admin: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: 'Admin' },
                  supervisor: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', label: 'Supervisor' },
                  financiera: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: 'Financiera' },
                  operador: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', label: 'Operador' },
                  conductor: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400', label: 'Conductor' },
                };
                const badge = rolBadges[user.rol];
                if (!badge) return null;
                return (
                  <div className="flex items-center ml-2 pl-3 border-l border-slate-200 dark:border-slate-700">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {menuConfig.map((menu) => (
                <DropdownMenu
                  key={menu.id}
                  menu={menu}
                  isActive={activeMenu === menu.id}
                  isCurrentSection={location.pathname.startsWith(menu.basePath)}
                  onMouseEnter={() => setActiveMenu(menu.id)}
                  onMouseLeave={() => setActiveMenu(null)}
                  onNavigate={(href) => {
                    navigate(href);
                    setActiveMenu(null);
                  }}
                  currentPath={location.pathname}
                />
              ))}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Search - abre GlobalSearch modal */}
              <button
                onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
                className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Buscar (Ctrl+K)"
              >
                <Search className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1 sm:gap-2 border-l border-gray-200 dark:border-slate-700 pl-2 sm:pl-4">
                <button
                  onClick={toggleDark}
                  className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                  title={`Modo ${isDark ? 'Claro' : 'Oscuro'} (⌘B)`}
                >
                  {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div ref={notifRef} className="relative">
                  <button
                    onClick={handleBellClick}
                    className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
                    title="Notificaciones"
                  >
                    <Bell className="w-5 h-5" />
                    <NotificationBadge count={notificationCount} />
                  </button>

                  {/* Dropdown de notificaciones */}
                  {isNotifOpen && (
                    <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-[384px] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden z-50 -mr-2 sm:mr-0">
                      {/* Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
                        <h3 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Notificaciones</h3>
                        <div className="flex items-center gap-2">
                          {notificationCount > 0 && (
                            <button
                              onClick={() => marcarTodasLeidas()}
                              className="text-xs text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                            >
                              <CheckCheck className="w-3.5 h-3.5" />
                              Marcar todas
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Lista */}
                      <div className="max-h-80 overflow-y-auto">
                        {loadingNotifs ? (
                          <div className="p-4 space-y-3">
                            {[0, 1, 2].map(i => (
                              <div key={i} className="h-14 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                            ))}
                          </div>
                        ) : notificaciones.length === 0 ? (
                          <div className="py-10 text-center">
                            <Bell className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-500 dark:text-slate-400">No hay notificaciones</p>
                          </div>
                        ) : (
                          [...notificaciones].sort((a, b) => (a.leida === b.leida ? 0 : a.leida ? 1 : -1)).map((notif) => {
                            const typeConfig = {
                              despacho: { icon: Truck, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600' },
                              alerta: { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600' },
                              cliente: { icon: Users, bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600' },
                              reporte: { icon: FileText, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600' },
                              sistema: { icon: Info, bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-600 dark:text-slate-300' },
                              inventario: { icon: Package, bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600' },
                            };
                            const cfg = typeConfig[notif.tipo] || typeConfig.sistema;
                            const Icon = cfg.icon;
                            const timeAgo = getTimeAgo(notif.created_at);

                            return (
                              <button
                                key={notif.id}
                                onClick={() => {
                                  if (!notif.leida) marcarLeida(notif.id);
                                  if (notif.accion_url) {
                                    navigate(notif.accion_url);
                                    setIsNotifOpen(false);
                                  }
                                }}
                                className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-gray-50 dark:border-slate-700/50 last:border-0 ${!notif.leida ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                                  <Icon className={`w-4 h-4 ${cfg.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm truncate ${!notif.leida ? 'font-semibold text-slate-800 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-300'}`}>
                                      {notif.titulo}
                                    </p>
                                    {!notif.leida && (
                                      <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{notif.mensaje}</p>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{timeAgo}</p>
                                </div>
                                {notif.accion_url && (
                                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-1" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t border-gray-100 dark:border-slate-700 p-2">
                        <button
                          onClick={() => {
                            navigate('/notificaciones');
                            setIsNotifOpen(false);
                          }}
                          className="w-full text-center text-sm text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 py-2 rounded-lg transition-colors font-medium"
                        >
                          Ver todas las notificaciones
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <AvatarDropdown user={user} onNavigate={navigate} onLogout={handleLogout} />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        user={user}
        onNavigate={(href) => {
          navigate(href);
          setIsMobileMenuOpen(false);
        }}
        onLogout={handleLogout}
        currentPath={location.pathname}
        isDark={isDark}
        onToggleDark={toggleDark}
        onShowShortcuts={() => setIsShortcutsOpen(true)}
        menuItems={menuConfig}
      />

      {/* Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
    </>
  );
};

export default FloatingHeader;

