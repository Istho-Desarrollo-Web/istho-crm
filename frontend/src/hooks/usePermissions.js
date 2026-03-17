/**
 * ============================================================================
 * ISTHO CRM - Hook de Permisos
 * ============================================================================
 * Hook para verificar permisos del usuario basado en su rol.
 * Implementa la matriz de permisos definida en ROLES_PERMISOS_MODULOS.md
 * 
 * Roles disponibles:
 * - admin: Control total del sistema
 * - supervisor: Gestión operativa completa (sin config sistema)
 * - operador: Operaciones del día a día
 * - cliente: Solo consulta de su propia información
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Enero 2026
 */

import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

// ============================================================================
// MATRIZ DE PERMISOS
// ============================================================================

/**
 * Matriz completa de permisos por rol y módulo
 * Basada en ROLES_PERMISOS_MODULOS.md
 */
const PERMISSIONS = {
  // ──────────────────────────────────────────────────────────────────────────
  // ADMINISTRADOR - Control total
  // ──────────────────────────────────────────────────────────────────────────
  admin: {
    // Usuarios
    usuarios: ['ver', 'crear', 'editar', 'eliminar', 'activar', 'resetear_password', 'asignar_rol'],
    
    // Clientes
    clientes: ['ver', 'crear', 'editar', 'eliminar', 'exportar', 'stats', 'cambiar_estado', 'asignar_usuario'],
    
    // Contactos
    contactos: ['ver', 'crear', 'editar', 'eliminar', 'marcar_principal', 'configurar_notificaciones'],
    
    // Inventario
    inventario: ['ver', 'crear', 'editar', 'eliminar', 'ajustar', 'sincronizar_wms', 'exportar', 'configurar_alertas'],
    
    // Despachos (Operaciones)
    despachos: ['ver', 'crear', 'editar', 'eliminar', 'confirmar', 'cancelar', 'cambiar_estado', 'exportar', 'cerrar'],
    
    // Trazabilidad
    trazabilidad: ['ver', 'agregar_evento', 'subir_evidencia', 'editar_evento', 'eliminar_evento'],
    
    // Documentos
    documentos: ['ver', 'subir', 'editar', 'eliminar', 'descargar', 'archivar'],
    
    // Notificaciones
    notificaciones: ['ver', 'marcar_leida', 'eliminar', 'configurar', 'ver_log_emails', 'reenviar'],
    
    // Reportes
    reportes: ['ver', 'exportar_excel', 'exportar_pdf', 'programar', 'ver_metricas'],
    
    // Configuración
    configuracion: ['ver', 'editar', 'backup', 'restaurar'],
    
    // Dashboard
    dashboard: ['ver', 'ver_kpis', 'ver_graficos'],
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // SUPERVISOR - Gestión operativa (sin usuarios/config)
  // ──────────────────────────────────────────────────────────────────────────
  supervisor: {
    usuarios: [], // Sin acceso
    
    clientes: ['ver', 'crear', 'editar', 'exportar', 'stats', 'cambiar_estado', 'asignar_usuario'],
    
    contactos: ['ver', 'crear', 'editar', 'eliminar', 'marcar_principal', 'configurar_notificaciones'],
    
    inventario: ['ver', 'crear', 'editar', 'ajustar', 'sincronizar_wms', 'exportar', 'configurar_alertas'],
    
    despachos: ['ver', 'crear', 'editar', 'confirmar', 'cancelar', 'cambiar_estado', 'exportar', 'cerrar'],
    
    trazabilidad: ['ver', 'agregar_evento', 'subir_evidencia', 'editar_evento'],
    
    documentos: ['ver', 'subir', 'editar', 'eliminar', 'descargar', 'archivar'],
    
    notificaciones: ['ver', 'marcar_leida', 'eliminar', 'configurar', 'ver_log_emails', 'reenviar'],
    
    reportes: ['ver', 'exportar_excel', 'exportar_pdf', 'ver_metricas'],
    
    configuracion: ['ver'], // Solo lectura
    
    dashboard: ['ver', 'ver_kpis', 'ver_graficos'],
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // OPERADOR - Operaciones diarias
  // ──────────────────────────────────────────────────────────────────────────
  operador: {
    usuarios: [],
    
    clientes: ['ver'],
    
    contactos: ['ver'],
    
    inventario: ['ver'],
    
    despachos: ['ver', 'crear', 'editar', 'cambiar_estado'],
    
    trazabilidad: ['ver', 'agregar_evento', 'subir_evidencia', 'editar_evento_propio'],
    
    documentos: ['ver', 'subir', 'descargar'],
    
    notificaciones: ['ver', 'marcar_leida', 'eliminar', 'configurar'],
    
    reportes: ['ver'],
    
    configuracion: [],
    
    dashboard: ['ver', 'ver_kpis'],
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // CLIENTE - Solo consulta propia
  // ──────────────────────────────────────────────────────────────────────────
  cliente: {
    usuarios: [],
    
    clientes: ['ver_propio'],
    
    contactos: ['ver_propio'],
    
    inventario: ['ver_propio', 'exportar_propio'],
    
    despachos: ['ver_propios'],
    
    trazabilidad: ['ver_propios'],
    
    documentos: ['ver_propios', 'descargar_propios'],
    
    notificaciones: ['ver', 'marcar_leida', 'eliminar', 'configurar'],
    
    reportes: ['ver_propios', 'exportar_propios'],
    
    configuracion: [],
    
    dashboard: ['ver_propio'],
  },
};

// ============================================================================
// LABELS DE MÓDULOS
// ============================================================================

const MODULE_LABELS = {
  usuarios: 'Usuarios',
  clientes: 'Clientes',
  contactos: 'Contactos',
  inventario: 'Inventario',
  despachos: 'Despachos',
  trazabilidad: 'Trazabilidad',
  documentos: 'Documentos',
  notificaciones: 'Notificaciones',
  reportes: 'Reportes',
  configuracion: 'Configuración',
  dashboard: 'Dashboard',
};

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook para verificar permisos del usuario actual
 * 
 * @returns {Object} Funciones de verificación de permisos
 * 
 * @example
 * const { can, canAny, canAll, getModulePermissions } = usePermissions();
 * 
 * // Verificar permiso específico
 * if (can('clientes', 'crear')) {
 *   // Mostrar botón de crear
 * }
 * 
 * // Verificar si tiene alguno de varios permisos
 * if (canAny('despachos', ['crear', 'editar'])) {
 *   // Mostrar formulario
 * }
 */
const usePermissions = () => {
  const { user, isAuthenticated } = useAuth();
  
  // ──────────────────────────────────────────────────────────────────────────
  // Obtener permisos del rol actual
  // ──────────────────────────────────────────────────────────────────────────
  
  const rolePermissions = useMemo(() => {
    if (!user?.rol) return {};
    return PERMISSIONS[user.rol] || {};
  }, [user?.rol]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CAN - Verificar permiso específico
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verifica si el usuario puede realizar una acción en un módulo
   * @param {string} module - Nombre del módulo
   * @param {string} action - Acción a verificar
   * @returns {boolean}
   */
  const can = useCallback((module, action) => {
    if (!isAuthenticated || !user?.rol) return false;
    
    const modulePermissions = rolePermissions[module] || [];
    return modulePermissions.includes(action);
  }, [isAuthenticated, user?.rol, rolePermissions]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CAN ANY - Verificar si tiene alguno de varios permisos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verifica si el usuario tiene al menos uno de los permisos
   * @param {string} module - Nombre del módulo
   * @param {string[]} actions - Lista de acciones a verificar
   * @returns {boolean}
   */
  const canAny = useCallback((module, actions) => {
    if (!isAuthenticated || !user?.rol) return false;
    
    const modulePermissions = rolePermissions[module] || [];
    return actions.some(action => modulePermissions.includes(action));
  }, [isAuthenticated, user?.rol, rolePermissions]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CAN ALL - Verificar si tiene todos los permisos
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verifica si el usuario tiene todos los permisos especificados
   * @param {string} module - Nombre del módulo
   * @param {string[]} actions - Lista de acciones a verificar
   * @returns {boolean}
   */
  const canAll = useCallback((module, actions) => {
    if (!isAuthenticated || !user?.rol) return false;
    
    const modulePermissions = rolePermissions[module] || [];
    return actions.every(action => modulePermissions.includes(action));
  }, [isAuthenticated, user?.rol, rolePermissions]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CAN ACCESS MODULE - Verificar acceso al módulo
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verifica si el usuario tiene acceso a un módulo (al menos permiso 'ver')
   * @param {string} module - Nombre del módulo
   * @returns {boolean}
   */
  const canAccessModule = useCallback((module) => {
    if (!isAuthenticated || !user?.rol) return false;
    
    const modulePermissions = rolePermissions[module] || [];
    // Tiene acceso si puede ver o ver_propio o ver_propios
    return modulePermissions.some(p => 
      p === 'ver' || p === 'ver_propio' || p === 'ver_propios'
    );
  }, [isAuthenticated, user?.rol, rolePermissions]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // GET MODULE PERMISSIONS - Obtener todos los permisos de un módulo
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene todos los permisos del usuario para un módulo
   * @param {string} module - Nombre del módulo
   * @returns {string[]}
   */
  const getModulePermissions = useCallback((module) => {
    return rolePermissions[module] || [];
  }, [rolePermissions]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // GET ALL PERMISSIONS - Obtener todos los permisos del usuario
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene todos los permisos del usuario
   * @returns {Object}
   */
  const getAllPermissions = useCallback(() => {
    return rolePermissions;
  }, [rolePermissions]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // GET ACCESSIBLE MODULES - Obtener módulos accesibles
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtiene lista de módulos a los que el usuario tiene acceso
   * @returns {Array<{key: string, label: string}>}
   */
  const getAccessibleModules = useCallback(() => {
    return Object.keys(rolePermissions)
      .filter(module => {
        const perms = rolePermissions[module];
        return perms.length > 0 && perms.some(p => 
          p === 'ver' || p === 'ver_propio' || p === 'ver_propios'
        );
      })
      .map(module => ({
        key: module,
        label: MODULE_LABELS[module] || module,
      }));
  }, [rolePermissions]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // IS ROLE - Verificar rol específico
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verifica si el usuario tiene un rol específico
   * @param {string|string[]} roles - Rol o roles a verificar
   * @returns {boolean}
   */
  const isRole = useCallback((roles) => {
    if (!user?.rol) return false;
    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.rol);
  }, [user?.rol]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // HELPERS DE ROL
  // ──────────────────────────────────────────────────────────────────────────
  
  const isAdmin = useMemo(() => user?.rol === 'admin', [user?.rol]);
  const isSupervisor = useMemo(() => user?.rol === 'supervisor', [user?.rol]);
  const isOperador = useMemo(() => user?.rol === 'operador', [user?.rol]);
  const isCliente = useMemo(() => user?.rol === 'cliente', [user?.rol]);
  
  const isSupervisorOrAbove = useMemo(() => 
    ['admin', 'supervisor'].includes(user?.rol), 
    [user?.rol]
  );
  
  const isOperadorOrAbove = useMemo(() => 
    ['admin', 'supervisor', 'operador'].includes(user?.rol), 
    [user?.rol]
  );
  
  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────
  
  return {
    // Funciones de verificación
    can,
    canAny,
    canAll,
    canAccessModule,
    getModulePermissions,
    getAllPermissions,
    getAccessibleModules,
    isRole,
    
    // Helpers de rol
    isAdmin,
    isSupervisor,
    isOperador,
    isCliente,
    isSupervisorOrAbove,
    isOperadorOrAbove,
    
    // Datos
    role: user?.rol || null,
    permissions: rolePermissions,
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

export { PERMISSIONS, MODULE_LABELS };
export default usePermissions;