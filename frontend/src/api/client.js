/**
 * ============================================================================
 * ISTHO CRM - Cliente HTTP (Axios)
 * ============================================================================
 * Configuración centralizada de Axios con:
 * - Interceptores de request (agrega token JWT)
 * - Interceptores de response (manejo de errores, refresh token)
 * - Configuración base para todas las peticiones
 * 
 * CORRECCIONES v1.1.0:
 * - Template literals corregidos en console.log
 * - Interceptor devuelve response.data directamente
 * 
 * @author Coordinación TI ISTHO
 * @version 1.1.0
 * @date Enero 2026
 */

import axios from 'axios';

// ============================================================================
// CONFIGURACIÓN BASE
// ============================================================================

/**
 * URL base de la API
 * En desarrollo: http://localhost:5000/api/v1
 * En producción: https://api.crm.istho.com.co/api/v1
 */
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

/**
 * Construir URL completa para archivos del servidor (uploads)
 * @param {string} filePath - Ruta relativa (ej: /uploads/avatars/file.jpg)
 * @returns {string|null} URL completa o null
 */
export const getServerFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  const serverBase = API_BASE_URL.replace('/api/v1', '');
  return `${serverBase}${filePath}`;
};

/**
 * Tiempo máximo de espera para peticiones (30 segundos)
 */
const TIMEOUT = 30000;

/**
 * Clave para almacenar el token en localStorage
 */
const TOKEN_KEY = 'istho_token';
const REFRESH_TOKEN_KEY = 'istho_refresh_token';

// ============================================================================
// INSTANCIA DE AXIOS
// ============================================================================

/**
 * Cliente HTTP configurado para el CRM ISTHO
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ============================================================================
// INTERCEPTOR DE REQUEST
// ============================================================================

/**
 * Interceptor que agrega el token JWT a todas las peticiones
 * También agrega headers adicionales si es necesario
 */
apiClient.interceptors.request.use(
  (config) => {
    // Obtener token del localStorage
    const token = localStorage.getItem(TOKEN_KEY);
    
    // Si existe token, agregarlo al header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log en desarrollo para debugging
    if (import.meta.env.DEV) {
      console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data ? '(data presente)' : undefined,
      });
    }
    
    return config;
  },
  (error) => {
    // Error en la configuración de la petición
    console.error('❌ [API] Error en request:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// INTERCEPTOR DE RESPONSE
// ============================================================================

/**
 * Interceptor que maneja las respuestas y errores
 * - Devuelve response.data directamente para simplificar el uso
 * - 401: Token inválido/expirado → Logout
 * - 403: Sin permisos → Notificar
 * - 500: Error del servidor → Notificar
 */
apiClient.interceptors.response.use(
  (response) => {
    // Log en desarrollo
    if (import.meta.env.DEV) {
      console.log(`📥 [API] ${response.status} ${response.config.url}`, {
        success: response.data?.success,
        data: response.data?.data ? '(data presente)' : undefined,
      });
    }
    
    // ═══════════════════════════════════════════════════════════════════════
    // IMPORTANTE: Devolver response.data directamente
    // Así los servicios reciben { success: true, data: {...} } directamente
    // ═══════════════════════════════════════════════════════════════════════
    return response.data;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Si no hay respuesta (network error)
    if (!error.response) {
      console.error('❌ [API] Error de red:', error.message);
      return Promise.reject({
        success: false,
        message: 'Error de conexión. Verifica tu conexión a internet.',
        code: 'NETWORK_ERROR',
      });
    }
    
    const { status, data } = error.response;
    
    // Log del error
    if (import.meta.env.DEV) {
      console.error(`❌ [API] ${status} ${originalRequest.url}`, data);
    }
    
    // Manejo por código de estado
    switch (status) {
      case 401:
        // Token inválido o expirado
        // Intentar refresh token si no es la ruta de login
        if (!originalRequest.url.includes('/auth/login') && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
            if (refreshToken) {
              const refreshResponse = await axios.post(
                `${API_BASE_URL}/auth/refresh`,
                {},
                { headers: { Authorization: `Bearer ${refreshToken}` } }
              );
              
              if (refreshResponse.data.success) {
                const newToken = refreshResponse.data.data.token;
                localStorage.setItem(TOKEN_KEY, newToken);
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return apiClient(originalRequest);
              }
            }
          } catch (refreshError) {
            // Refresh falló, hacer logout
            console.warn('⚠️ [API] Refresh token falló, cerrando sesión');
          }
        }
        
        // Limpiar tokens y redirigir a login
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem('istho_user');
        
        // Redirigir a login (solo si no estamos ya en login)
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        break;
        
      case 403:
        // Sin permisos para la acción - emitir evento global para toast
        console.warn('⚠️ [API] Sin permisos para esta acción');
        window.dispatchEvent(new CustomEvent('istho:permission-denied', {
          detail: { message: data?.message || 'No tienes permiso para realizar esta acción' }
        }));
        break;
        
      case 404:
        // Recurso no encontrado
        console.warn('⚠️ [API] Recurso no encontrado');
        break;
        
      case 422:
        // Error de validación
        console.warn('⚠️ [API] Error de validación:', data.errors);
        break;
        
      case 500:
        // Error interno del servidor
        console.error('❌ [API] Error interno del servidor');
        break;
    }
    
    // Retornar error formateado
    return Promise.reject({
      success: false,
      message: data?.message || 'Error en la petición',
      errors: data?.errors || [],
      code: data?.code || `HTTP_${status}`,
      status,
    });
  }
);

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Establece el token de autenticación
 * @param {string} token - Token JWT
 * @param {string} refreshToken - Refresh Token (opcional)
 */
export const setAuthToken = (token, refreshToken = null) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }
};

/**
 * Elimina los tokens de autenticación
 */
export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('istho_user');
};

/**
 * Obtiene el token actual
 * @returns {string|null} Token JWT o null
 */
export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Verifica si hay un token almacenado
 * @returns {boolean}
 */
export const isAuthenticated = () => {
  return !!localStorage.getItem(TOKEN_KEY);
};

/**
 * Crea una instancia de axios para uploads (multipart/form-data)
 * @returns {AxiosInstance}
 */
export const createUploadClient = () => {
  const uploadClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000, // 60 segundos para uploads
  });
  
  // Agregar token
  uploadClient.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });
  
  // También normalizar respuesta para uploads
  uploadClient.interceptors.response.use(
    (response) => response.data,
    (error) => Promise.reject({
      success: false,
      message: error.response?.data?.message || 'Error en upload',
      status: error.response?.status,
    })
  );
  
  return uploadClient;
};

// ============================================================================
// EXPORT
// ============================================================================

export default apiClient;