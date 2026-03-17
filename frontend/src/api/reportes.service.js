/**
 * ============================================================================
 * ISTHO CRM - Reportes Service
 * ============================================================================
 * Servicio para consumir endpoints de reportes y dashboard.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 * @date Enero 2026
 */

import apiClient from './client';
import { REPORTES_ENDPOINTS } from './endpoints';

// ════════════════════════════════════════════════════════════════════════════
// SERVICIO DE REPORTES
// ════════════════════════════════════════════════════════════════════════════

const reportesService = {
  
  // ──────────────────────────────────────────────────────────────────────────
  // DASHBOARD CONSOLIDADO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener datos consolidados del dashboard
   * Incluye: operaciones, inventario, clientes, últimas operaciones
   * 
   * @returns {Promise<Object>} Datos del dashboard
   * 
   * @example
   * const response = await reportesService.getDashboard();
   * // response.data = {
   * //   operaciones: { total, mes, semana, pendientes, porEstado, porTipo },
   * //   inventario: { totalItems, totalUnidades, valorTotal, alertas },
   * //   clientes: { total, activos, nuevosMes },
   * //   ultimasOperaciones: [...]
   * // }
   */
  getDashboard: async () => {
    try {
      const response = await apiClient.get(REPORTES_ENDPOINTS.DASHBOARD);
      return response;
    } catch (error) {
      console.error('❌ Error obteniendo dashboard:', error);
      // Retornar estructura vacía pero válida para evitar errores
      return {
        success: false,
        message: error.message || 'Error al obtener dashboard',
        data: {
          operaciones: {
            total: 0,
            mes: 0,
            semana: 0,
            pendientes: 0,
            porEstado: { pendiente: 0, en_proceso: 0, cerrado: 0, anulado: 0 },
            porTipo: { ingreso: 0, salida: 0 },
          },
          inventario: {
            totalItems: 0,
            totalUnidades: 0,
            valorTotal: 0,
            alertas: { stockBajo: 0, porVencer: 0 },
          },
          clientes: {
            total: 0,
            activos: 0,
            nuevosMes: 0,
          },
          ultimasOperaciones: [],
        },
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // REPORTES ESPECÍFICOS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener reporte de despachos
   * @param {Object} params - Parámetros de filtro
   * @returns {Promise<Object>}
   */
  getDespachos: async (params = {}) => {
    try {
      return await apiClient.get(REPORTES_ENDPOINTS.DESPACHOS, { params });
    } catch (error) {
      console.error('❌ Error obteniendo reporte de despachos:', error);
      throw error;
    }
  },
  
  /**
   * Obtener reporte de inventario
   * @param {Object} params - Parámetros de filtro
   * @returns {Promise<Object>}
   */
  getInventario: async (params = {}) => {
    try {
      return await apiClient.get(REPORTES_ENDPOINTS.INVENTARIO, { params });
    } catch (error) {
      console.error('❌ Error obteniendo reporte de inventario:', error);
      throw error;
    }
  },
  
  /**
   * Obtener reporte de clientes
   * @param {Object} params - Parámetros de filtro
   * @returns {Promise<Object>}
   */
  getClientes: async (params = {}) => {
    try {
      return await apiClient.get(REPORTES_ENDPOINTS.CLIENTES, { params });
    } catch (error) {
      console.error('❌ Error obteniendo reporte de clientes:', error);
      throw error;
    }
  },
  
  /**
   * Obtener reporte de operaciones
   * @param {Object} params - Parámetros de filtro
   * @returns {Promise<Object>}
   */
  getOperaciones: async (params = {}) => {
    try {
      return await apiClient.get(REPORTES_ENDPOINTS.OPERACIONES, { params });
    } catch (error) {
      console.error('❌ Error obteniendo reporte de operaciones:', error);
      throw error;
    }
  },

  // Enviar reporte por email
  enviarPorEmail: async (data) => {
    try {
      return await apiClient.post(REPORTES_ENDPOINTS.ENVIAR_EMAIL, data);
    } catch (error) {
      return { success: false, message: error.message || 'Error al enviar reporte' };
    }
  },

  // Reportes comparativos
  getComparativo: async (params = {}) => {
    try {
      return await apiClient.get(REPORTES_ENDPOINTS.COMPARATIVO, { params });
    } catch (error) {
      return { success: false, data: { meses: [], comparacion: {} } };
    }
  },

  // Reportes programados
  getProgramados: async () => {
    try {
      return await apiClient.get(REPORTES_ENDPOINTS.PROGRAMADOS);
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  crearProgramado: async (data) => {
    return await apiClient.post(REPORTES_ENDPOINTS.PROGRAMADOS, data);
  },

  actualizarProgramado: async (id, data) => {
    return await apiClient.put(REPORTES_ENDPOINTS.PROGRAMADO_BY_ID(id), data);
  },

  eliminarProgramado: async (id) => {
    return await apiClient.delete(REPORTES_ENDPOINTS.PROGRAMADO_BY_ID(id));
  },

  ejecutarProgramado: async (id) => {
    return await apiClient.post(REPORTES_ENDPOINTS.PROGRAMADO_EJECUTAR(id));
  },
};

export default reportesService;