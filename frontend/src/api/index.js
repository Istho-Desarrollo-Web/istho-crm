/**
 * ============================================================================
 * ISTHO CRM - API Services Index (ACTUALIZADO)
 * ============================================================================
 * Exportación centralizada de todos los servicios de API
 * 
 * @example
 * // Importar servicios individuales
 * import { authService, clientesService, reportesService } from '@/api';
 * 
 * // Importar todo
 * import api from '@/api';
 * api.auth.login(...);
 * api.reportes.getDashboard();
 * 
 * @author Coordinación TI ISTHO
 * @version 1.1.0  ← ACTUALIZADO
 * @date Enero 2026
 */

// ============================================================================
// CLIENTE HTTP
// ============================================================================

export { 
  default as apiClient,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
  isAuthenticated,
  createUploadClient,
} from './client';

// ============================================================================
// ENDPOINTS
// ============================================================================

export {
  AUTH_ENDPOINTS,
  CLIENTES_ENDPOINTS,
  INVENTARIO_ENDPOINTS,
  OPERACIONES_ENDPOINTS,
  DESPACHOS_ENDPOINTS,
  REPORTES_ENDPOINTS,
  NOTIFICACIONES_ENDPOINTS,
  DOCUMENTOS_ENDPOINTS,
  ENDPOINTS,
} from './endpoints';

// ============================================================================
// SERVICIOS
// ============================================================================

export { default as authService } from './auth.service';
export { default as clientesService } from './clientes.service';
export { default as inventarioService } from './inventario.service';
export { default as despachosService } from './despachos.service';
export { default as reportesService } from './reportes.service';  // ← NUEVO
export { default as notificacionesService } from './notificaciones.service';  // ← NUEVO

// ============================================================================
// OBJETO API CONSOLIDADO
// ============================================================================

import authService from './auth.service';
import clientesService from './clientes.service';
import inventarioService from './inventario.service';
import despachosService from './despachos.service';
import reportesService from './reportes.service';  // ← NUEVO
import notificacionesService from './notificaciones.service';  // ← NUEVO

/**
 * Objeto API consolidado para acceso simplificado
 * 
 * @example
 * import api from '@/api';
 * 
 * // Autenticación
 * await api.auth.login({ email, password });
 * 
 * // Dashboard
 * const data = await api.reportes.getDashboard();
 * 
 * // Exportar a Excel
 * await api.reportes.descargarOperacionesExcel();
 */
const api = {
  auth: authService,
  clientes: clientesService,
  inventario: inventarioService,
  despachos: despachosService,
  operaciones: despachosService,
  reportes: reportesService,  // ← NUEVO
  notificaciones: notificacionesService,  // ← NUEVO
};

export default api;