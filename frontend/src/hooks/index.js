/**
 * ============================================================================
 * ISTHO CRM - Hooks de Datos Index
 * ============================================================================
 * Exportación centralizada de todos los hooks de datos.
 * 
 * Los hooks de autenticación (useAuth, usePermissions) están en:
 * - src/context/AuthContext.jsx (useAuth)
 * - src/hooks/usePermissions.js
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Enero 2026
 */

// ════════════════════════════════════════════════════════════════════════════
// HOOKS DE DATOS
// ════════════════════════════════════════════════════════════════════════════

// Clientes
export {
  default as useClientes,
  useClientesSelector
} from './useClientes';

// Inventario
export {
  default as useInventario,
  useInventarioAlertas
} from './useInventario';

// Despachos (Operaciones)
export {
  default as useDespachos,
  useDespachoDetail
} from './useDespachos';

// Dashboard
export {
  default as useDashboard,
  useDashboardAlertas,
  useDashboardKpis,
} from './useDashboard';

// Notificaciones
export { default as useNotification } from './useNotification.js';

// ════════════════════════════════════════════════════════════════════════════
// RE-EXPORTS DE AUTENTICACIÓN
// (Para imports centralizados desde @/hooks)
// ════════════════════════════════════════════════════════════════════════════

// Estos se mantienen en sus archivos originales pero se re-exportan aquí
// para facilitar imports centralizados

// export { useAuth } from '../context/AuthContext';
// export { default as usePermissions, PERMISSIONS, MODULE_LABELS } from './usePermissions';