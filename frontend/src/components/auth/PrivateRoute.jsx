/**
 * ============================================================================
 * ISTHO CRM - PrivateRoute & ProtectedAction Components
 * ============================================================================
 * Componentes de autorización para rutas y acciones protegidas.
 * 
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Enero 2026
 */

import { Navigate, useLocation } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../../context/AuthContext';

// ════════════════════════════════════════════════════════════════════════════
// PRIVATE ROUTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Componente para proteger rutas que requieren autenticación
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar si está autenticado
 * @param {string[]} [props.roles] - Roles permitidos (opcional)
 * @param {string} [props.redirectTo='/login'] - Ruta de redirección si no autenticado
 * 
 * @example
 * <PrivateRoute>
 *   <Dashboard />
 * </PrivateRoute>
 * 
 * @example
 * <PrivateRoute roles={['admin', 'supervisor']}>
 *   <AdminPanel />
 * </PrivateRoute>
 */
export function PrivateRoute(props) {
  var children = props.children;
  var roles = props.roles;
  var redirectTo = props.redirectTo || '/login';
  
  var auth = useAuth();
  var isAuthenticated = auth.isAuthenticated;
  var user = auth.user;
  var loading = auth.loading;
  var location = useLocation();

  // Mostrar loading mientras se verifica autenticación
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Redirigir si no está autenticado
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Verificar roles si se especificaron
  if (roles && roles.length > 0 && user) {
    var userRole = user.rol || user.role;
    if (!roles.includes(userRole)) {
      // Usuario autenticado pero sin rol permitido
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}

PrivateRoute.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string),
  redirectTo: PropTypes.string,
};

// ════════════════════════════════════════════════════════════════════════════
// PROTECTED ACTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Componente para proteger acciones específicas basadas en permisos
 * Renderiza children solo si el usuario tiene el permiso requerido
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar si tiene permiso
 * @param {string} props.module - Módulo del permiso (clientes, inventario, despachos, etc.)
 * @param {string} props.action - Acción del permiso (ver, crear, editar, eliminar)
 * @param {React.ReactNode} [props.fallback] - Contenido alternativo si no tiene permiso
 * @param {boolean} [props.hide=true] - Si true, oculta el elemento; si false, lo deshabilita
 * 
 * @example
 * <ProtectedAction module="clientes" action="crear">
 *   <Button>Nuevo Cliente</Button>
 * </ProtectedAction>
 * 
 * @example
 * <ProtectedAction module="inventario" action="eliminar" hide={false}>
 *   <Button>Eliminar</Button>
 * </ProtectedAction>
 */
export function ProtectedAction(props) {
  var children = props.children;
  var module = props.module;
  var action = props.action;
  var fallback = props.fallback || null;
  var hide = props.hide !== false; // default true
  
  var auth = useAuth();
  var hasPermission = auth.hasPermission;

  // Verificar permiso
  var permitted = hasPermission ? hasPermission(module, action) : true;

  // Si tiene permiso, renderizar children
  if (permitted) {
    return children;
  }

  // Si no tiene permiso y hide=true, ocultar completamente
  if (hide) {
    return fallback;
  }

  // Si no tiene permiso y hide=false, renderizar children deshabilitados
  // Esto clona el elemento y añade disabled=true
  if (children && children.props) {
    var clonedElement = Object.assign({}, children, {
      props: Object.assign({}, children.props, {
        disabled: true,
        title: 'No tienes permiso para esta acción',
        className: (children.props.className || '') + ' opacity-50 cursor-not-allowed',
      }),
    });
    return clonedElement;
  }

  return fallback;
}

ProtectedAction.propTypes = {
  children: PropTypes.node.isRequired,
  module: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
  fallback: PropTypes.node,
  hide: PropTypes.bool,
};

// ════════════════════════════════════════════════════════════════════════════
// ROLE GUARD
// ════════════════════════════════════════════════════════════════════════════

/**
 * Componente para mostrar contenido solo a ciertos roles
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar
 * @param {string[]} props.roles - Roles permitidos
 * @param {React.ReactNode} [props.fallback] - Contenido alternativo
 * 
 * @example
 * <RoleGuard roles={['admin']}>
 *   <AdminTools />
 * </RoleGuard>
 */
export function RoleGuard(props) {
  var children = props.children;
  var roles = props.roles;
  var fallback = props.fallback || null;
  
  var auth = useAuth();
  var user = auth.user;

  if (!user) {
    return fallback;
  }

  var userRole = user.rol || user.role;
  
  if (roles.includes(userRole)) {
    return children;
  }

  return fallback;
}

RoleGuard.propTypes = {
  children: PropTypes.node.isRequired,
  roles: PropTypes.arrayOf(PropTypes.string).isRequired,
  fallback: PropTypes.node,
};

// ════════════════════════════════════════════════════════════════════════════
// ADMIN ROUTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ruta exclusiva para administradores
 * Shortcut para PrivateRoute con roles=['admin']
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar
 * 
 * @example
 * <AdminRoute>
 *   <ConfiguracionSistema />
 * </AdminRoute>
 */
export function AdminRoute(props) {
  var children = props.children;
  
  return (
    <PrivateRoute roles={['admin', 'administrador']}>
      {children}
    </PrivateRoute>
  );
}

AdminRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// ════════════════════════════════════════════════════════════════════════════
// SUPERVISOR ROUTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ruta para supervisores y administradores
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar
 */
export function SupervisorRoute(props) {
  var children = props.children;
  
  return (
    <PrivateRoute roles={['admin', 'administrador', 'supervisor']}>
      {children}
    </PrivateRoute>
  );
}

SupervisorRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// ════════════════════════════════════════════════════════════════════════════
// OPERADOR ROUTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ruta para operadores, supervisores y administradores
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar
 */
export function OperadorRoute(props) {
  var children = props.children;
  
  return (
    <PrivateRoute roles={['admin', 'administrador', 'supervisor', 'operador']}>
      {children}
    </PrivateRoute>
  );
}

OperadorRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// ════════════════════════════════════════════════════════════════════════════
// CLIENTE ROUTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ruta para clientes (acceso limitado a su propia información)
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar
 */
export function ClienteRoute(props) {
  var children = props.children;
  
  return (
    <PrivateRoute roles={['admin', 'administrador', 'supervisor', 'operador', 'cliente']}>
      {children}
    </PrivateRoute>
  );
}

ClienteRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

// ════════════════════════════════════════════════════════════════════════════
// PORTAL PERMISSION ROUTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Ruta protegida por permisos de portal para usuarios tipo cliente.
 * Usuarios internos siempre pasan. Usuarios portal necesitan el permiso.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Contenido a renderizar
 * @param {string} props.module - Módulo del permiso (inventario, reportes, etc.)
 * @param {string} props.action - Acción del permiso (ver, exportar, etc.)
 *
 * @example
 * <PortalPermissionRoute module="inventario" action="ver">
 *   <InventarioList />
 * </PortalPermissionRoute>
 */
export function PortalPermissionRoute(props) {
  var children = props.children;
  var module = props.module;
  var action = props.action;

  var auth = useAuth();
  var user = auth.user;
  var hasPermission = auth.hasPermission;

  // Internal users always pass
  if (user && user.rol !== 'cliente') {
    return children;
  }

  // Portal clients check permission
  if (hasPermission && hasPermission(module, action)) {
    return children;
  }

  return <Navigate to="/dashboard" replace />;
}

PortalPermissionRoute.propTypes = {
  children: PropTypes.node.isRequired,
  module: PropTypes.string.isRequired,
  action: PropTypes.string.isRequired,
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

export default PrivateRoute;