/**
 * ============================================================================
 * ISTHO CRM - Contexto de Autenticación (CORREGIDO v1.2.0)
 * ============================================================================
 * Provee estado global de autenticación para toda la aplicación:
 * - Estado del usuario actual
 * - Funciones de login/logout
 * - Verificación de sesión
 * - Verificación de permisos
 * - Persistencia en localStorage
 * 
 * CORRECCIÓN v1.2.0:
 * - Agregada función hasPermission para verificación de permisos
 * 
 * @author Coordinación TI ISTHO
 * @version 1.2.0
 * @date Enero 2026
 */

import { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback,
  useMemo 
} from 'react';
import PropTypes from 'prop-types';
import authService from '../api/auth.service';
import { clearAuthToken, isAuthenticated as checkToken } from '../api/client';

// ============================================================================
// CONTEXTO
// ============================================================================

const AuthContext = createContext(null);

// ============================================================================
// ESTADOS INICIALES
// ============================================================================

const INITIAL_STATE = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// ============================================================================
// DEFINICIÓN DE PERMISOS POR ROL
// ============================================================================

/**
 * Matriz de permisos por rol
 * Define qué módulos y acciones tiene cada rol
 */
const PERMISOS_POR_ROL = {
  admin: {
    dashboard: ['ver', 'exportar'],
    clientes: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    inventario: ['ver', 'crear', 'editar', 'eliminar', 'ajustar', 'exportar'],
    operaciones: ['ver', 'crear', 'editar', 'cerrar', 'anular', 'exportar'],
    despachos: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    reportes: ['ver', 'crear', 'exportar'],
    usuarios: ['ver', 'crear', 'editar', 'eliminar'],
    configuracion: ['ver', 'editar'],
    notificaciones: ['ver', 'crear', 'editar', 'eliminar'],
  },
  supervisor: {
    dashboard: ['ver', 'exportar'],
    clientes: ['ver', 'crear', 'editar', 'exportar'],
    inventario: ['ver', 'crear', 'editar', 'ajustar', 'exportar'],
    operaciones: ['ver', 'crear', 'editar', 'cerrar', 'exportar'],
    despachos: ['ver', 'crear', 'editar', 'exportar'],
    reportes: ['ver', 'exportar'],
    usuarios: ['ver'],
    configuracion: ['ver'],
    notificaciones: ['ver', 'editar'],
  },
  operador: {
    dashboard: ['ver'],
    clientes: ['ver'],
    inventario: ['ver', 'ajustar'],
    operaciones: ['ver', 'crear', 'editar'],
    despachos: ['ver', 'crear', 'editar'],
    reportes: ['ver'],
    usuarios: [],
    configuracion: [],
    notificaciones: ['ver'],
  },
  cliente: {
    dashboard: ['ver'],
    clientes: [],
    inventario: ['ver'],
    operaciones: ['ver'],
    despachos: ['ver'],
    reportes: ['ver'],
    usuarios: [],
    configuracion: [],
    notificaciones: ['ver'],
  },
};

// ============================================================================
// PROVIDER
// ============================================================================

/**
 * Proveedor de contexto de autenticación
 * Envuelve la aplicación para proveer estado de auth global
 * 
 * @example
 * // En main.jsx o App.jsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 */
export const AuthProvider = ({ children }) => {
  // Estado de autenticación
  const [state, setState] = useState(INITIAL_STATE);
  
  // ──────────────────────────────────────────────────────────────────────────
  // INICIALIZACIÓN - Verificar sesión existente
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Verificar si hay token almacenado
        if (!checkToken()) {
          setState({
            ...INITIAL_STATE,
            isLoading: false,
          });
          return;
        }
        
        // Intentar obtener usuario actual
        const storedUser = authService.getStoredUser();
        
        if (storedUser) {
          // Usar usuario almacenado temporalmente
          setState({
            user: storedUser,
            isAuthenticated: true,
            isLoading: true,
            error: null,
          });
          
          // Verificar con el servidor en background
          try {
            const response = await authService.getCurrentUser();
            if (response.success) {
              setState({
                user: response.data,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            }
          } catch (verifyError) {
            // Token inválido, limpiar sesión
            console.warn('⚠️ Sesión inválida, cerrando...');
            clearAuthToken();
            setState({
              ...INITIAL_STATE,
              isLoading: false,
            });
          }
        } else {
          // Intentar obtener del servidor
          try {
            const response = await authService.getCurrentUser();
            if (response.success) {
              setState({
                user: response.data,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              });
            }
          } catch {
            clearAuthToken();
            setState({
              ...INITIAL_STATE,
              isLoading: false,
            });
          }
        }
      } catch (error) {
        console.error('❌ Error inicializando auth:', error);
        setState({
          ...INITIAL_STATE,
          isLoading: false,
          error: 'Error al verificar sesión',
        });
      }
    };
    
    initializeAuth();
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Iniciar sesión
   * @param {string} email - Email del usuario
   * @param {string} password - Contraseña
   * @returns {Promise<Object>} Resultado del login
   */
  const login = useCallback(async (email, password) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const result = await authService.login({ email, password });
      
      if (result.success) {
        setState({
          user: result.data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
        
        return { success: true, user: result.data.user };
      }
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: result.message || 'Error al iniciar sesión',
      }));
      
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error.message || 'Error al iniciar sesión';
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
      
      return { success: false, message: errorMessage };
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Cerrar sesión
   * Limpia el estado y los tokens almacenados
   */
  const logout = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      await authService.logout();
    } catch (error) {
      console.warn('⚠️ Error al notificar logout:', error);
    } finally {
      setState({
        ...INITIAL_STATE,
        isLoading: false,
      });
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR USUARIO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Actualizar datos del usuario en el estado
   * @param {Object} userData - Datos actualizados del usuario
   */
  const updateUser = useCallback((userData) => {
    setState(prev => ({
      ...prev,
      user: { ...prev.user, ...userData },
    }));
    
    // Actualizar en localStorage
    const currentUser = authService.getStoredUser();
    if (currentUser) {
      localStorage.setItem('istho_user', JSON.stringify({
        ...currentUser,
        ...userData,
      }));
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // REFRESCAR USUARIO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Refrescar datos del usuario desde el servidor
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success) {
        setState(prev => ({
          ...prev,
          user: response.data,
        }));
      }
    } catch (error) {
      console.error('Error refrescando usuario:', error);
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // LIMPIAR ERROR
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Limpiar mensaje de error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // VERIFICACIONES DE ROL
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verificar si el usuario tiene un rol específico
   * @param {string|string[]} roles - Rol o lista de roles
   * @returns {boolean}
   */
  const hasRole = useCallback((roles) => {
    if (!state.user) return false;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(state.user.rol);
  }, [state.user]);
  
  /**
   * Verificar si es administrador
   * @returns {boolean}
   */
  const isAdmin = useCallback(() => hasRole('admin'), [hasRole]);
  
  /**
   * Verificar si es supervisor o superior
   * @returns {boolean}
   */
  const isSupervisorOrAbove = useCallback(() => {
    return hasRole(['admin', 'supervisor']);
  }, [hasRole]);
  
  /**
   * Verificar si es operador o superior
   * @returns {boolean}
   */
  const isOperadorOrAbove = useCallback(() => {
    return hasRole(['admin', 'supervisor', 'operador']);
  }, [hasRole]);
  
  /**
   * Verificar si es cliente externo
   * @returns {boolean}
   */
  const isCliente = useCallback(() => hasRole('cliente'), [hasRole]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // VERIFICACIÓN DE PERMISOS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verificar si el usuario tiene un permiso específico
   * @param {string} modulo - Módulo (ej: 'clientes', 'inventario', 'despachos')
   * @param {string} accion - Acción (ej: 'ver', 'crear', 'editar', 'eliminar')
   * @returns {boolean}
   * 
   * @example
   * const canCreate = hasPermission('despachos', 'crear');
   * const canEdit = hasPermission('clientes', 'editar');
   */
  const hasPermission = useCallback((modulo, accion) => {
    if (!state.user) return false;

    // Admin siempre tiene todos los permisos
    if (state.user.permisos?.esAdmin) return true;

    // Intentar primero con permisos dinámicos del backend
    const backendPermisos = state.user.permisos?.permisos;
    if (backendPermisos && typeof backendPermisos === 'object') {
      // Formato backend: { modulo: ['accion1', 'accion2'] } o { modulo: { accion: true } }
      const moduloPermisos = backendPermisos[modulo];
      if (Array.isArray(moduloPermisos)) {
        return moduloPermisos.includes(accion);
      }
      if (moduloPermisos && typeof moduloPermisos === 'object') {
        return moduloPermisos[accion] === true;
      }
    }

    // Fallback a permisos hardcodeados por rol
    const rol = state.user.rol || 'cliente';
    const permisos = PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.cliente;

    return permisos[modulo]?.includes(accion) || false;
  }, [state.user]);
  
  /**
   * Verificar si el usuario puede acceder a un módulo
   * @param {string} modulo - Nombre del módulo
   * @returns {boolean}
   */
  const canAccess = useCallback((modulo) => {
    return hasPermission(modulo, 'ver');
  }, [hasPermission]);

  /**
   * Verificar permiso y mostrar toast si no tiene acceso
   * @param {string} modulo - Módulo
   * @param {string} accion - Acción
   * @returns {boolean} true si tiene permiso, false si no (y muestra toast)
   */
  const checkPermission = useCallback((modulo, accion) => {
    const allowed = hasPermission(modulo, accion);
    if (!allowed) {
      window.dispatchEvent(new CustomEvent('istho:permission-denied', {
        detail: { message: `No tienes permiso para ${accion} en ${modulo}` }
      }));
    }
    return allowed;
  }, [hasPermission]);
  
  /**
   * Obtener todos los permisos del usuario actual
   * @returns {Object} Permisos del usuario
   */
  const getPermisos = useCallback(() => {
    if (!state.user) return {};

    // Si hay permisos dinámicos del backend, usarlos
    if (state.user.permisos?.permisos) {
      return state.user.permisos.permisos;
    }

    // Fallback
    const rol = state.user.rol || 'cliente';
    return PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.cliente;
  }, [state.user]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // VALOR DEL CONTEXTO
  // ──────────────────────────────────────────────────────────────────────────
  
  const value = useMemo(() => ({
    // Estado
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    error: state.error,
    
    // Acciones
    login,
    logout,
    updateUser,
    refreshUser,
    clearError,
    
    // Verificaciones de rol
    hasRole,
    isAdmin,
    isSupervisorOrAbove,
    isOperadorOrAbove,
    isCliente,
    
    // ✅ NUEVO: Verificaciones de permisos
    hasPermission,
    checkPermission,
    canAccess,
    getPermisos,
  }), [
    state,
    login,
    logout,
    updateUser,
    refreshUser,
    clearError,
    hasRole,
    isAdmin,
    isSupervisorOrAbove,
    isOperadorOrAbove,
    isCliente,
    hasPermission,
    checkPermission,
    canAccess,
    getPermisos,
  ]);
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para acceder al contexto de autenticación
 * 
 * @returns {Object} Contexto de autenticación
 * @throws {Error} Si se usa fuera de AuthProvider
 * 
 * @example
 * const { user, login, logout, isAuthenticated, hasPermission } = useAuth();
 * 
 * // Verificar permisos
 * const canCreate = hasPermission('despachos', 'crear');
 * const canEdit = hasPermission('clientes', 'editar');
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  
  return context;
};

// ============================================================================
// EXPORT
// ============================================================================

export default AuthContext;