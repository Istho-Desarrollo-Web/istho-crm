/**
 * ============================================================================
 * ISTHO CRM - Servicio de Inventario (Versión Corregida)
 * ============================================================================
 * Gestiona todas las operaciones relacionadas con inventario:
 * - CRUD de productos
 * - Movimientos (entradas/salidas/ajustes)
 * - Alertas de stock
 * - Estadísticas y KPIs
 * 
 * CORRECCIÓN v2.1.0:
 * - Eliminado .data extra (client.js ya devuelve response.data)
 * 
 * @author Coordinación TI ISTHO
 * @version 2.1.0
 * @date Enero 2026
 */

import apiClient from './client';
import { INVENTARIO_ENDPOINTS } from './endpoints';

// ════════════════════════════════════════════════════════════════════════════
// SERVICIO DE INVENTARIO
// ════════════════════════════════════════════════════════════════════════════

const inventarioService = {
  
  // ──────────────────────────────────────────────────────────────────────────
  // LISTAR INVENTARIO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener lista de inventario con filtros y paginación
   * 
   * @param {Object} params - Parámetros de búsqueda
   * @param {number} [params.page=1] - Número de página
   * @param {number} [params.limit=10] - Registros por página
   * @param {string} [params.search] - Búsqueda
   * @param {number} [params.cliente_id] - Filtro por cliente
   * @param {string} [params.categoria] - Filtro por categoría
   * @param {string} [params.bodega] - Filtro por bodega/zona
   * @param {string} [params.estado] - Filtro por estado
   * @returns {Promise<Object>}
   */
  getAll: async (params = {}) => {
    try {
      const response = await apiClient.get(INVENTARIO_ENDPOINTS.BASE, { params });
      // client.js ya devuelve response.data, así que response = { success, data, ... }
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener inventario',
        code: 'GET_INVENTARIO_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER POR ID
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener un producto de inventario por ID
   * 
   * @param {number|string} id - ID del producto
   * @returns {Promise<Object>}
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(INVENTARIO_ENDPOINTS.BY_ID(id));
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener producto',
        code: 'GET_PRODUCTO_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // OBTENER POR CLIENTE
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener inventario de un cliente específico
   * 
   * @param {number|string} clienteId - ID del cliente
   * @param {Object} [params] - Parámetros adicionales
   * @returns {Promise<Object>}
   */
  getByCliente: async (clienteId, params = {}) => {
    try {
      const response = await apiClient.get(
        INVENTARIO_ENDPOINTS.BY_CLIENTE(clienteId), 
        { params }
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener inventario del cliente',
        code: 'GET_CLIENTE_INVENTARIO_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // CREAR PRODUCTO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Crear un nuevo producto de inventario
   * 
   * @param {Object} data - Datos del producto
   * @returns {Promise<Object>}
   */
  create: async (data) => {
    try {
      const response = await apiClient.post(INVENTARIO_ENDPOINTS.BASE, data);
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al crear producto',
        errors: error.errors || [],
        code: 'CREATE_PRODUCTO_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR PRODUCTO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Actualizar un producto existente
   * 
   * @param {number|string} id - ID del producto
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>}
   */
  update: async (id, data) => {
    try {
      const response = await apiClient.put(INVENTARIO_ENDPOINTS.BY_ID(id), data);
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al actualizar producto',
        errors: error.errors || [],
        code: 'UPDATE_PRODUCTO_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // ELIMINAR PRODUCTO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Eliminar un producto de inventario
   * 
   * @param {number|string} id - ID del producto
   * @returns {Promise<Object>}
   */
  delete: async (id) => {
    try {
      const response = await apiClient.delete(INVENTARIO_ENDPOINTS.BY_ID(id));
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al eliminar producto',
        code: 'DELETE_PRODUCTO_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // AJUSTAR CANTIDAD (MOVIMIENTOS)
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Ajustar cantidad de un producto (entrada, salida, ajuste)
   * 
   * @param {number|string} id - ID del producto
   * @param {Object} data - Datos del ajuste
   * @param {number} data.cantidad - Cantidad
   * @param {string} data.tipo - 'entrada' | 'salida' | 'ajuste'
   * @param {string} [data.motivo] - Motivo del movimiento
   * @param {string} [data.documento_referencia] - Documento de referencia
   * @param {string} [data.observaciones] - Observaciones
   * @returns {Promise<Object>}
   */
  ajustar: async (id, data) => {
    try {
      const response = await apiClient.post(INVENTARIO_ENDPOINTS.AJUSTAR(id), data);
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al ajustar inventario',
        code: 'AJUSTAR_ERROR',
      };
    }
  },
  
  /**
   * Alias de ajustar para compatibilidad
   */
  registrarMovimiento: async (id, data) => {
    return inventarioService.ajustar(id, data);
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // MOVIMIENTOS (HISTORIAL)
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener historial de movimientos de un producto
   * 
   * @param {number|string} id - ID del producto
   * @param {Object} [params] - Parámetros (page, limit)
   * @returns {Promise<Object>}
   */
  getMovimientos: async (id, params = {}) => {
    try {
      const response = await apiClient.get(
        INVENTARIO_ENDPOINTS.MOVIMIENTOS(id), 
        { params }
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener movimientos',
        code: 'GET_MOVIMIENTOS_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADÍSTICAS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener estadísticas/KPIs generales de inventario
   * 
   * @param {Object} [params] - Parámetros (cliente_id)
   * @returns {Promise<Object>}
   */
  getStats: async (params = {}) => {
    try {
      const response = await apiClient.get(INVENTARIO_ENDPOINTS.STATS, { params });
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener estadísticas',
        code: 'GET_STATS_ERROR',
      };
    }
  },
  
  /**
   * Obtener estadísticas de movimientos de un producto (para gráficos)
   * 
   * @param {number|string} id - ID del producto
   * @param {Object} [params] - Parámetros (meses)
   * @returns {Promise<Object>}
   */
  getEstadisticasProducto: async (id, params = {}) => {
    try {
      const response = await apiClient.get(
        INVENTARIO_ENDPOINTS.ESTADISTICAS_PRODUCTO(id),
        { params }
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener estadísticas del producto',
        code: 'GET_ESTADISTICAS_PRODUCTO_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // ALERTAS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener alertas de inventario (stock bajo, agotados, vencimientos)
   * 
   * @param {Object} [params] - Parámetros de filtro
   * @param {number} [params.cliente_id] - Filtrar por cliente
   * @param {string} [params.tipo] - 'agotado' | 'bajo_stock' | 'vencimiento'
   * @returns {Promise<Object>}
   */
  getAlertas: async (params = {}) => {
    try {
      const response = await apiClient.get(INVENTARIO_ENDPOINTS.ALERTAS, { params });
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener alertas',
        code: 'GET_ALERTAS_ERROR',
      };
    }
  },
  
  /**
   * Marcar una alerta como atendida
   * 
   * @param {string} alertaId - ID de la alerta (formato: "tipo-productoId")
   * @param {Object} [data] - Datos adicionales (observaciones)
   * @returns {Promise<Object>}
   */
  atenderAlerta: async (alertaId, data = {}) => {
    try {
      const response = await apiClient.put(
        INVENTARIO_ENDPOINTS.ATENDER_ALERTA(alertaId),
        data
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al atender alerta',
        code: 'ATENDER_ALERTA_ERROR',
      };
    }
  },
  
  /**
   * Descartar una alerta
   * 
   * @param {string} alertaId - ID de la alerta
   * @returns {Promise<Object>}
   */
  descartarAlerta: async (alertaId) => {
    try {
      const response = await apiClient.delete(
        INVENTARIO_ENDPOINTS.DESCARTAR_ALERTA(alertaId)
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al descartar alerta',
        code: 'DESCARTAR_ALERTA_ERROR',
      };
    }
  },
  
  // ──────────────────────────────────────────────────────────────────────────
  // CAJAS (DETALLE POR OPERACIÓN)
  // ──────────────────────────────────────────────────────────────────────────

  getCajas: async (id) => {
    try {
      const response = await apiClient.get(INVENTARIO_ENDPOINTS.CAJAS(id));
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener cajas',
        code: 'GET_CAJAS_ERROR',
      };
    }
  },

  // ════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Buscar productos por término
   * 
   * @param {string} term - Término de búsqueda
   * @param {number} [clienteId] - Filtrar por cliente
   * @param {number} [limit=10] - Límite de resultados
   * @returns {Promise<Object>}
   */
  search: async (term, clienteId = null, limit = 10) => {
    const params = { search: term, limit };
    if (clienteId) params.cliente_id = clienteId;
    return inventarioService.getAll(params);
  },
  
  /**
   * Obtener productos con stock bajo
   * 
   * @param {number} [clienteId] - Filtrar por cliente
   * @returns {Promise<Object>}
   */
  getStockBajo: async (clienteId = null) => {
    const params = { stock_bajo: 'true' };
    if (clienteId) params.cliente_id = clienteId;
    return inventarioService.getAll(params);
  },
  
  /**
   * Obtener productos próximos a vencer
   * 
   * @param {number} [dias=30] - Días hasta vencimiento
   * @param {number} [clienteId] - Filtrar por cliente
   * @returns {Promise<Object>}
   */
  getProximosVencer: async (dias = 30, clienteId = null) => {
    const params = { por_vencer: 'true', dias_vencimiento: dias };
    if (clienteId) params.cliente_id = clienteId;
    return inventarioService.getAll(params);
  },
  
  /**
   * Obtener categorías disponibles
   * 
   * @returns {Array<{value: string, label: string}>}
   */
  getCategorias: () => {
    return [
      { value: 'lacteos', label: 'Lácteos' },
      { value: 'bebidas', label: 'Bebidas' },
      { value: 'construccion', label: 'Construcción' },
      { value: 'envases', label: 'Envases' },
      { value: 'quimicos', label: 'Químicos' },
      { value: 'alimentos', label: 'Alimentos' },
      { value: 'farmaceutico', label: 'Farmacéutico' },
      { value: 'textil', label: 'Textil' },
      { value: 'tecnologia', label: 'Tecnología' },
    ];
  },
  
  /**
   * Obtener zonas/bodegas disponibles
   * 
   * @returns {Array<{value: string, label: string}>}
   */
  getZonas: () => {
    return [
      { value: 'BOD-01', label: 'Área 01 - Refrigerados' },
      { value: 'BOD-02', label: 'Área 02 - Secos' },
      { value: 'BOD-03', label: 'Área 03 - Químicos' },
      { value: 'BOD-04', label: 'Área 04 - Construcción' },
    ];
  },
  
  /**
   * Obtener unidades de medida disponibles
   * 
   * @returns {Array<{value: string, label: string}>}
   */
  getUnidadesMedida: () => {
    return [
      { value: 'UND', label: 'Unidades' },
      { value: 'KG', label: 'Kilogramos' },
      { value: 'LT', label: 'Litros' },
      { value: 'CAJ', label: 'Cajas' },
      { value: 'PAQ', label: 'Paquetes' },
      { value: 'BTO', label: 'Bultos' },
      { value: 'GAL', label: 'Galones' },
      { value: 'M3', label: 'Metros cúbicos' },
    ];
  },
  
  /**
   * Obtener estados disponibles
   * 
   * @returns {Array<{value: string, label: string}>}
   */
  getEstados: () => {
    return [
      { value: 'disponible', label: 'Disponible' },
      { value: 'bajo_stock', label: 'Bajo Stock' },
      { value: 'agotado', label: 'Agotado' },
      { value: 'reservado', label: 'Reservado' },
      { value: 'cuarentena', label: 'Cuarentena' },
      { value: 'dañado', label: 'Dañado' },
      { value: 'vencido', label: 'Vencido' },
    ];
  },
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════════════════

export default inventarioService;