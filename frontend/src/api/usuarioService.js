/**
 * ============================================================================
 * ISTHO CRM - Servicio de Usuario (CORREGIDO v1.2.0)
 * ============================================================================
 * Gestiona operaciones del perfil de usuario.
 * 
 * getPermisos obtiene permisos reales desde el backend (GET /auth/me).
 * Fallback a permisos locales si el backend no responde.
 * 
 * CORRECCIONES v1.2.0:
 * - Compatible con client.js v1.1.0 (ya devuelve response.data)
 * - Eliminada definición duplicada de actualizarPerfil
 * - Eliminado doble acceso a .data
 * 
 * @author Coordinación TI ISTHO
 * @version 1.2.0
 * @date Enero 2026
 */

import apiClient, { createUploadClient } from './client';
import { AUTH_ENDPOINTS } from './endpoints';

// ============================================================================
// DEFINICIÓN DE PERMISOS POR ROL
// ============================================================================

/**
 * Fallback local de permisos (solo se usa si el backend no responde)
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
    roles: ['ver', 'crear', 'editar', 'eliminar'],
    auditoria: ['ver', 'exportar', 'reenviar_correo'],
    kardex: ['ver', 'exportar'],
    configuracion: ['ver', 'editar'],
    configuracion_wms: ['ver', 'crear', 'editar', 'eliminar'],
    notificaciones: ['ver', 'crear', 'editar', 'eliminar'],
    vehiculos: ['ver', 'crear', 'editar', 'eliminar'],
    viajes: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    caja_menor: ['ver', 'crear', 'editar', 'cerrar', 'aprobar', 'eliminar', 'exportar'],
    movimientos: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
    perfil: ['ver', 'cambiar_password'],
  },
  supervisor: {
    dashboard: ['ver', 'exportar'],
    clientes: ['ver', 'crear', 'editar', 'exportar'],
    inventario: ['ver', 'crear', 'editar', 'ajustar', 'exportar'],
    operaciones: ['ver', 'crear', 'editar', 'cerrar', 'exportar'],
    despachos: ['ver', 'crear', 'editar', 'exportar'],
    reportes: ['ver', 'exportar'],
    usuarios: ['ver'],
    auditoria: ['ver', 'exportar', 'reenviar_correo'],
    kardex: ['ver', 'exportar'],
    configuracion: ['ver'],
    configuracion_wms: ['ver'],
    notificaciones: ['ver', 'editar'],
    vehiculos: ['ver', 'crear', 'editar', 'eliminar'],
    viajes: ['ver', 'crear', 'editar', 'eliminar', 'exportar'],
    caja_menor: ['ver', 'crear', 'editar', 'cerrar', 'aprobar', 'eliminar', 'exportar'],
    movimientos: ['ver', 'crear', 'editar', 'eliminar', 'aprobar'],
    perfil: ['ver', 'cambiar_password'],
  },
  financiera: {
    dashboard: ['ver'],
    clientes: ['ver'],
    reportes: ['ver', 'exportar'],
    notificaciones: ['ver'],
    vehiculos: ['ver', 'crear', 'editar'],
    viajes: ['ver', 'exportar'],
    caja_menor: ['ver', 'crear', 'editar', 'cerrar', 'aprobar', 'exportar'],
    movimientos: ['ver', 'crear', 'editar', 'aprobar'],
    perfil: ['ver', 'cambiar_password'],
  },
  operador: {
    dashboard: ['ver'],
    clientes: ['ver'],
    inventario: ['ver', 'ajustar', 'alertas'],
    operaciones: ['ver', 'crear', 'editar'],
    despachos: ['ver', 'crear', 'editar'],
    reportes: ['ver'],
    auditoria: ['ver'],
    kardex: ['ver'],
    caja_menor: ['ver'],
    movimientos: ['ver', 'crear', 'editar'],
    notificaciones: ['ver'],
    perfil: ['ver', 'cambiar_password'],
  },
  conductor: {
    dashboard: ['ver'],
    notificaciones: ['ver'],
    vehiculos: ['ver'],
    viajes: ['ver', 'crear', 'editar'],
    caja_menor: ['ver'],
    movimientos: ['ver', 'crear', 'editar'],
    perfil: ['ver', 'cambiar_password'],
  },
  cliente: {
    dashboard: ['ver'],
    inventario: ['ver'],
    operaciones: ['ver'],
    despachos: ['ver'],
    reportes: ['ver', 'exportar'],
    auditoria: ['ver'],
    kardex: ['ver'],
    notificaciones: ['ver'],
    perfil: ['ver', 'cambiar_password'],
  },
};

// ============================================================================
// SERVICIO DE USUARIO
// ============================================================================

const usuarioService = {
  
  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER PERFIL
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener datos del perfil del usuario actual
   * @returns {Promise<Object>} Datos del usuario
   */
  getPerfil: async () => {
    try {
      // client.js v1.1.0 ya devuelve response.data directamente
      const response = await apiClient.get(AUTH_ENDPOINTS.ME);
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener perfil',
        code: error.code || 'GET_PERFIL_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR PERFIL
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Actualizar datos del perfil
   * @param {Object} datos - Datos a actualizar (nombre, apellido, telefono)
   * @returns {Promise<Object>}
   */
  actualizarPerfil: async (datos) => {
    try {
      // client.js v1.1.0 ya devuelve response.data directamente
      const response = await apiClient.put(AUTH_ENDPOINTS.ME, datos);
      
      // Actualizar también en localStorage
      if (response.success && response.data) {
        const currentUser = usuarioService.getStoredUser();
        if (currentUser) {
          localStorage.setItem('istho_user', JSON.stringify({
            ...currentUser,
            ...response.data,
          }));
        }
      }
      
      return response; // ✅ Sin .data adicional
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al actualizar perfil',
        code: error.code || 'UPDATE_PERFIL_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // CAMBIAR CONTRASEÑA
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Cambiar contraseña del usuario
   * @param {Object} passwords - { password_actual, password_nuevo }
   * @returns {Promise<Object>}
   */
  cambiarPassword: async (passwords) => {
    try {
      const response = await apiClient.put(AUTH_ENDPOINTS.CAMBIAR_PASSWORD, passwords);
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al cambiar contraseña',
        code: error.code || 'CHANGE_PASSWORD_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER PERMISOS (GENERADOS LOCALMENTE)
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener permisos del usuario actual desde el backend
   * Fallback a permisos locales si el backend no responde
   * @returns {Promise<Object>} Permisos del usuario
   */
  getPermisos: async () => {
    try {
      // Obtener datos actualizados del backend (incluye permisos reales de BD)
      const response = await apiClient.get(AUTH_ENDPOINTS.ME);
      if (response.success && response.data) {
        const user = response.data;
        const permisos = user.permisos?.permisos || user.permisos || {};
        return {
          success: true,
          data: {
            rol: user.rol,
            permisos: permisos,
            permisosArray: Object.entries(permisos).flatMap(([modulo, acciones]) =>
              Array.isArray(acciones)
                ? acciones.map(accion => `${modulo}.${accion}`)
                : Object.keys(acciones).filter(k => acciones[k]).map(accion => `${modulo}.${accion}`)
            ),
          },
        };
      }
      return { success: false, message: 'No se pudieron obtener permisos', data: null };
    } catch (error) {
      console.error('Error obteniendo permisos:', error);
      // Fallback a permisos locales si el backend no responde
      try {
        const userStr = localStorage.getItem('istho_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          const permisos = PERMISOS_POR_ROL[user.rol] || {};
          return {
            success: true,
            data: { rol: user.rol, permisos, permisosArray: [] },
          };
        }
      } catch { /* ignore */ }
      return { success: false, message: 'Error al obtener permisos', data: null };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // VERIFICAR PERMISO ESPECÍFICO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Verificar si el usuario tiene un permiso específico
   * @param {string} modulo - Módulo (ej: 'clientes', 'inventario')
   * @param {string} accion - Acción (ej: 'ver', 'crear', 'editar')
   * @returns {boolean}
   */
  tienePermiso: (modulo, accion) => {
    try {
      const userStr = localStorage.getItem('istho_user');
      if (!userStr) return false;
      
      const user = JSON.parse(userStr);
      const rol = user.rol || 'cliente';
      const permisos = PERMISOS_POR_ROL[rol] || {};
      
      return permisos[modulo]?.includes(accion) || false;
    } catch {
      return false;
    }
  },
  
  /**
   * Verificar si el usuario puede acceder a un módulo
   * @param {string} modulo - Nombre del módulo
   * @returns {boolean}
   */
  puedeAcceder: (modulo) => {
    return usuarioService.tienePermiso(modulo, 'ver');
  },
  
  /**
   * Verificar si el usuario puede crear en un módulo
   * @param {string} modulo - Nombre del módulo
   * @returns {boolean}
   */
  puedeCrear: (modulo) => {
    return usuarioService.tienePermiso(modulo, 'crear');
  },
  
  /**
   * Verificar si el usuario puede editar en un módulo
   * @param {string} modulo - Nombre del módulo
   * @returns {boolean}
   */
  puedeEditar: (modulo) => {
    return usuarioService.tienePermiso(modulo, 'editar');
  },
  
  /**
   * Verificar si el usuario puede eliminar en un módulo
   * @param {string} modulo - Nombre del módulo
   * @returns {boolean}
   */
  puedeEliminar: (modulo) => {
    return usuarioService.tienePermiso(modulo, 'eliminar');
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER USUARIO ALMACENADO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener usuario del localStorage (sin petición)
   * @returns {Object|null}
   */
  getStoredUser: () => {
    try {
      const userStr = localStorage.getItem('istho_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER ROL
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener rol del usuario actual
   * @returns {string|null}
   */
  getRol: () => {
    const user = usuarioService.getStoredUser();
    return user?.rol || null;
  },
  
  /**
   * Subir foto de perfil
   * @param {File} file - Archivo de imagen
   * @returns {Promise<Object>}
   */
  guardarPreferencias: async (preferencias) => {
    try {
      const response = await apiClient.put(AUTH_ENDPOINTS.ME_PREFERENCIAS, preferencias);
      return response;
    } catch (error) {
      console.error('Error guardando preferencias:', error);
      throw error;
    }
  },

  subirAvatar: async (file) => {
    try {
      const uploadClient = createUploadClient();
      const formData = new FormData();
      formData.append('avatar', file);
      // uploadClient interceptor ya extrae response.data (body completo)
      const response = await uploadClient.post(AUTH_ENDPOINTS.ME_AVATAR, formData);
      return response;  // devuelve { success, message, data: { avatar_url } }
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || error.message || 'Error al subir la foto',
      };
    }
  },

  /**
   * Eliminar foto de perfil
   * @returns {Promise<Object>}
   */
  eliminarAvatar: async () => {
    try {
      const response = await apiClient.delete(AUTH_ENDPOINTS.ME_AVATAR);
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al eliminar la foto',
      };
    }
  },

  /**
   * Verificar si es admin
   * @returns {boolean}
   */
  isAdmin: () => usuarioService.getRol() === 'admin',
  
  /**
   * Verificar si es supervisor
   * @returns {boolean}
   */
  isSupervisor: () => ['admin', 'supervisor'].includes(usuarioService.getRol()),
  
  /**
   * Verificar si es operador o superior
   * @returns {boolean}
   */
  isOperador: () => ['admin', 'supervisor', 'operador'].includes(usuarioService.getRol()),
};

// ============================================================================
// EXPORT
// ============================================================================

// Named export (para: import { usuarioService } from '...')
export { usuarioService };

// Default export (para: import usuarioService from '...')
export default usuarioService;