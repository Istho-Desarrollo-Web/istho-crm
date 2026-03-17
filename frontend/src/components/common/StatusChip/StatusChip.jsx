/**
 * ISTHO CRM - StatusChip Component
 * Chip de estado reutilizable con colores dinámicos
 *
 * Dark Mode:
 * - Fondos suaves con transparencia
 * - Texto con buen contraste
 * - Mantiene semántica visual
 *
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import PropTypes from 'prop-types';

// ======================================================
// CONFIGURACIÓN DE ESTADOS (LIGHT + DARK)
// ======================================================
const STATUS_CONFIG = {
  // Despachos
  completado: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'completado',
  },
  en_transito: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'en tránsito',
  },
  en_preparacion: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    text: 'text-violet-700 dark:text-violet-400',
    label: 'en preparación',
  },
  programado: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'programado',
  },
  cancelado: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'cancelado',
  },
  pendiente: {
    bg: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
    label: 'pendiente',
  },

  // Productos / Inventario
  disponible: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'disponible',
  },
  bajo_stock: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'bajo stock',
  },
  agotado: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'agotado',
  },
  reservado: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'reservado',
  },

  // Clientes
  activo: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'activo',
  },
  inactivo: {
    bg: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
    label: 'inactivo',
  },
  suspendido: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'suspendido',
  },

  // Bodegas
  operativa: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'operativa',
  },
  mantenimiento: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'mantenimiento',
  },
  cerrada: {
    bg: 'bg-red-100 dark:bg-red-900/30',
    text: 'text-red-700 dark:text-red-400',
    label: 'cerrada',
  },
};

// ======================================================
// COMPONENTE
// ======================================================
const StatusChip = ({ status, customLabel, size = 'md' }) => {
  const config = STATUS_CONFIG[status] || {
    bg: 'bg-gray-100 dark:bg-slate-700',
    text: 'text-gray-700 dark:text-slate-300',
    label: status,
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
    lg: 'px-3 py-1.5 text-sm',
  };

  return (
    <span
      className={`
        inline-flex items-center rounded-full font-medium
        ${config.bg} ${config.text} ${sizeClasses[size]}
      `}
    >
      {customLabel || config.label}
    </span>
  );
};

StatusChip.propTypes = {
  /** Identificador del estado */
  status: PropTypes.string.isRequired,
  /** Label personalizado */
  customLabel: PropTypes.string,
  /** Tamaño del chip */
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

export default StatusChip;
