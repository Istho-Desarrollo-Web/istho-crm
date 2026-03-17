/**
 * ============================================================================
 * ISTHO CRM - Componente de Acción Protegida
 * ============================================================================
 * Componente que muestra u oculta contenido basado en los permisos del usuario.
 * Útil para botones, menús y secciones que solo deben mostrarse a ciertos roles.
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Enero 2026
 */

import PropTypes from 'prop-types';
import usePermissions from '../../hooks/usePermissions';

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Componente que renderiza su contenido solo si el usuario tiene los permisos requeridos
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar si tiene permisos
 * @param {string} props.module - Módulo a verificar
 * @param {string|string[]} props.action - Acción(es) requerida(s)
 * @param {boolean} [props.requireAll=false] - Si true, requiere todos los permisos
 * @param {React.ReactNode} [props.fallback] - Contenido alternativo si no tiene permisos
 * 
 * @example
 * // Mostrar botón solo si puede crear clientes
 * <ProtectedAction module="clientes" action="crear">
 *   <Button onClick={handleCreate}>Nuevo Cliente</Button>
 * </ProtectedAction>
 * 
 * @example
 * // Mostrar si tiene al menos uno de los permisos
 * <ProtectedAction module="despachos" action={['editar', 'eliminar']}>
 *   <ActionsMenu />
 * </ProtectedAction>
 * 
 * @example
 * // Mostrar si tiene TODOS los permisos
 * <ProtectedAction module="inventario" action={['editar', 'ajustar']} requireAll>
 *   <AjusteCompleto />
 * </ProtectedAction>
 * 
 * @example
 * // Con contenido alternativo
 * <ProtectedAction 
 *   module="reportes" 
 *   action="exportar" 
 *   fallback={<span className="text-gray-400">No disponible</span>}
 * >
 *   <ExportButton />
 * </ProtectedAction>
 */
const ProtectedAction = ({
  children,
  module,
  action,
  requireAll = false,
  fallback = null,
}) => {
  const { can, canAny, canAll } = usePermissions();
  
  // Determinar si tiene permiso
  let hasPermission = false;
  
  if (Array.isArray(action)) {
    // Múltiples acciones
    hasPermission = requireAll 
      ? canAll(module, action) 
      : canAny(module, action);
  } else {
    // Una sola acción
    hasPermission = can(module, action);
  }
  
  // Renderizar según permiso
  if (hasPermission) {
    return children;
  }
  
  return fallback;
};

ProtectedAction.propTypes = {
  children: PropTypes.node.isRequired,
  module: PropTypes.string.isRequired,
  action: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.arrayOf(PropTypes.string),
  ]).isRequired,
  requireAll: PropTypes.bool,
  fallback: PropTypes.node,
};

// ============================================================================
// COMPONENTES ESPECIALIZADOS
// ============================================================================

/**
 * Solo visible para administradores
 */
export const AdminOnly = ({ children, fallback = null }) => {
  const { isAdmin } = usePermissions();
  return isAdmin ? children : fallback;
};

AdminOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Solo visible para supervisores y administradores
 */
export const SupervisorOnly = ({ children, fallback = null }) => {
  const { isSupervisorOrAbove } = usePermissions();
  return isSupervisorOrAbove ? children : fallback;
};

SupervisorOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Solo visible para operadores, supervisores y administradores
 */
export const OperadorOnly = ({ children, fallback = null }) => {
  const { isOperadorOrAbove } = usePermissions();
  return isOperadorOrAbove ? children : fallback;
};

OperadorOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Solo visible para clientes externos
 */
export const ClienteOnly = ({ children, fallback = null }) => {
  const { isCliente } = usePermissions();
  return isCliente ? children : fallback;
};

ClienteOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Visible para usuarios internos (no clientes)
 */
export const InternalOnly = ({ children, fallback = null }) => {
  const { isCliente } = usePermissions();
  return !isCliente ? children : fallback;
};

InternalOnly.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

/**
 * Verifica acceso a un módulo completo
 */
export const ModuleAccess = ({ module, children, fallback = null }) => {
  const { canAccessModule } = usePermissions();
  return canAccessModule(module) ? children : fallback;
};

ModuleAccess.propTypes = {
  module: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
};

// ============================================================================
// HOOK HELPER PARA LISTAS DE ACCIONES
// ============================================================================

/**
 * Hook que filtra una lista de acciones según los permisos del usuario
 * 
 * @example
 * const actions = [
 *   { key: 'ver', label: 'Ver', permission: 'ver' },
 *   { key: 'editar', label: 'Editar', permission: 'editar' },
 *   { key: 'eliminar', label: 'Eliminar', permission: 'eliminar' },
 * ];
 * 
 * const allowedActions = useFilteredActions('clientes', actions);
 * // Retorna solo las acciones que el usuario puede realizar
 */
export const useFilteredActions = (module, actions) => {
  const { can } = usePermissions();
  
  return actions.filter(action => {
    if (!action.permission) return true;
    return can(module, action.permission);
  });
};

// ============================================================================
// EXPORT
// ============================================================================

export default ProtectedAction;