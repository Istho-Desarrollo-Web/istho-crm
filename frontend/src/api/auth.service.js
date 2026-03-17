/**
 * ============================================================================
 * ISTHO CRM - Servicio de Autenticación (CORREGIDO v1.2)
 * ============================================================================
 * Gestiona todas las operaciones relacionadas con autenticación.
 * 
 * ⚠️ IMPORTANTE: 
 * - Usa setAuthToken/clearAuthToken del client.js
 * - client.js ahora devuelve response.data directamente
 * 
 * @author Coordinación TI ISTHO
 * @version 1.2.0
 * @date Enero 2026
 */

import apiClient, { setAuthToken, clearAuthToken } from './client';
import { AUTH_ENDPOINTS } from './endpoints';

// ============================================================================
// CONSTANTES
// ============================================================================

const USER_KEY = 'istho_user';

// ============================================================================
// SERVICIO DE AUTENTICACIÓN
// ============================================================================

const authService = {

  // ──────────────────────────────────────────────────────────────────────────
  // LOGIN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Iniciar sesión en el sistema
   * @param {Object} credentials - Credenciales del usuario
   * @param {string} credentials.email - Email del usuario
   * @param {string} credentials.password - Contraseña
   * @returns {Promise<Object>} Datos del usuario y token
   */
  login: async (credentials) => {
    try {
      // client.js ahora devuelve response.data directamente
      // Así que response = { success, message, data: { user, token } }
      const response = await apiClient.post(AUTH_ENDPOINTS.LOGIN, credentials);

      if (response.success) {
        const { token, user } = response.data;

        // Guardar token usando función del client.js
        setAuthToken(token);

        // Guardar usuario en localStorage
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        console.log('✅ Login exitoso, token guardado');

        return {
          success: true,
          data: response.data,
          message: response.message || 'Inicio de sesión exitoso',
        };
      }

      return {
        success: false,
        message: response.message || 'Error al iniciar sesión',
      };
    } catch (error) {
      console.error('❌ Error en login:', error);
      return {
        success: false,
        message: error.message || 'Error al iniciar sesión',
        code: error.code || 'LOGIN_ERROR',
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // LOGOUT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Cerrar sesión del usuario
   * Limpia tokens y notifica al backend
   * @returns {Promise<Object>}
   */
  logout: async () => {
    try {
      // Notificar al backend (registra en auditoría)
      await apiClient.post(AUTH_ENDPOINTS.LOGOUT);
    } catch (error) {
      // Ignorar error si el token ya expiró
      console.warn('⚠️ Error al notificar logout al servidor:', error);
    } finally {
      // Limpiar tokens y datos locales
      clearAuthToken();
      localStorage.removeItem(USER_KEY);

      return {
        success: true,
        message: 'Sesión cerrada correctamente',
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER USUARIO ACTUAL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Obtener información del usuario actualmente autenticado
   * @returns {Promise<Object>} Datos del usuario
   */
  getCurrentUser: async () => {
    try {
      // client.js devuelve response.data directamente
      const response = await apiClient.get(AUTH_ENDPOINTS.ME);

      if (response.success) {
        // Actualizar usuario en localStorage
        localStorage.setItem(USER_KEY, JSON.stringify(response.data));

        return {
          success: true,
          data: response.data,
        };
      }

      return {
        success: false,
        message: response.message || 'Error al obtener usuario',
      };
    } catch (error) {
      console.error('❌ Error al obtener usuario:', error);
      return {
        success: false,
        message: error.message || 'Error al obtener usuario',
        code: error.code || 'GET_USER_ERROR',
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER USUARIO DE LOCALSTORAGE (sin petición)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene el usuario almacenado en localStorage
   * Útil para verificación rápida sin hacer petición al servidor
   * @returns {Object|null} Usuario o null si no hay sesión
   */
  getStoredUser: () => {
    try {
      const userStr = localStorage.getItem(USER_KEY);
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // REGISTRO DE USUARIO (Solo Admin)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Registrar nuevo usuario en el sistema
   * Solo puede ser ejecutado por administradores
   * 
   * @param {Object} userData - Datos del nuevo usuario
   * @returns {Promise<Object>}
   */
  register: async (userData) => {
    try {
      const response = await apiClient.post(AUTH_ENDPOINTS.REGISTRO, userData);
      return response; // Ya viene como { success, data, message }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al registrar usuario',
        errors: error.errors || [],
        code: error.code || 'REGISTER_ERROR',
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // CAMBIAR CONTRASEÑA
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Cambiar contraseña del usuario actual
   * @param {Object} passwords - Contraseñas
   * @param {string} passwords.password_actual - Contraseña actual
   * @param {string} passwords.password_nuevo - Nueva contraseña
   * @returns {Promise<Object>}
   */
  changePassword: async (passwords) => {
    try {
      const response = await apiClient.put(AUTH_ENDPOINTS.CAMBIAR_PASSWORD, passwords);
      return response; // Ya viene como { success, data, message }
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al cambiar contraseña',
        code: error.code || 'CHANGE_PASSWORD_ERROR',
      };
    }
  },


  /**
   * Solicitar recuperación de contraseña (enviar email)
   * @param {string} email
   */
  forgotPassword: async (email) => {
    try {
      const response = await apiClient.post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al solicitar recuperación',
        code: error.code || 'FORGOT_PASSWORD_ERROR',
      };
    }
  },

  /**
   * Restablecer Contraseña con token
   * @param {string} token
   * @param {string} password
   */
  resetPassword: async (token, password) => {
    try {
      const response = await apiClient.post(AUTH_ENDPOINTS.RESET_PASSWORD, { token, password });
      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Error al restablecer contraseña',
        code: error.code || 'RESET_PASSWORD_ERROR',
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Refrescar token JWT
   * Generalmente llamado automáticamente por el interceptor
   * @returns {Promise<Object>} Nuevo token
   */
  refreshToken: async () => {
    try {
      const response = await apiClient.post(AUTH_ENDPOINTS.REFRESH);

      if (response.success) {
        const { token } = response.data;
        setAuthToken(token);
        return response;
      }

      return {
        success: false,
        message: 'Error al refrescar token',
      };
    } catch (error) {
      // Si falla el refresh, limpiar sesión
      clearAuthToken();
      localStorage.removeItem(USER_KEY);
      return {
        success: false,
        message: 'Sesión expirada, por favor inicie sesión nuevamente',
        code: 'TOKEN_EXPIRED',
      };
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // VERIFICAR AUTENTICACIÓN
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si hay una sesión activa
   * @returns {Promise<boolean>}
   */
  verifyAuth: async () => {
    try {
      const token = localStorage.getItem('istho_token');
      if (!token) return false;

      const response = await apiClient.get(AUTH_ENDPOINTS.ME);
      return response.success === true;
    } catch {
      return false;
    }
  },

  // ──────────────────────────────────────────────────────────────────────────
  // VERIFICAR ROL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si el usuario tiene un rol específico
   * @param {string|string[]} roles - Rol o lista de roles permitidos
   * @returns {boolean}
   */
  hasRole: (roles) => {
    const user = authService.getStoredUser();
    if (!user) return false;

    const rolesArray = Array.isArray(roles) ? roles : [roles];
    return rolesArray.includes(user.rol);
  },

  /**
   * Verifica si el usuario actual es administrador
   * @returns {boolean}
   */
  isAdmin: () => authService.hasRole('admin'),

  /**
   * Verifica si el usuario actual es un cliente externo
   * @returns {boolean}
   */
  isCliente: () => authService.hasRole('cliente'),

  /**
   * Obtener token almacenado
   * @returns {string|null}
   */
  getToken: () => localStorage.getItem('istho_token'),

  /**
   * Verificar si hay sesión activa (sincrónico)
   * @returns {boolean}
   */
  isAuthenticated: () => !!localStorage.getItem('istho_token'),
};

// ============================================================================
// EXPORT
// ============================================================================

export default authService;