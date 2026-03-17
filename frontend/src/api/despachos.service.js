/**
 * ============================================================================
 * ISTHO CRM - Servicio de Despachos
 * ============================================================================
 * 
 * ⚠️ NOTA DE NOMENCLATURA:
 * - El FRONTEND usa "Despachos" (más intuitivo para usuarios)
 * - El BACKEND usa "Operaciones" (integración con WMS)
 * - Este servicio hace el MAPEO TRANSPARENTE
 * 
 * CORRECCIÓN v1.1.0:
 * - Compatible con client.js v1.1.0 (ya devuelve response.data)
 * - Eliminado doble acceso a .data
 * 
 * Gestiona todas las operaciones relacionadas con despachos:
 * - CRUD de despachos (operaciones)
 * - Integración con documentos WMS
 * - Gestión de transporte
 * - Registro de averías con fotos
 * - Documentos de cumplido
 * - Cierre con notificación por email
 * 
 * @author Coordinación TI ISTHO
 * @version 1.1.0
 * @date Enero 2026
 */

import apiClient, { createUploadClient } from './client';
import { OPERACIONES_ENDPOINTS } from './endpoints';

// ============================================================================
// SERVICIO DE DESPACHOS
// ============================================================================

const despachosService = {
  
  // ════════════════════════════════════════════════════════════════════════
  // INTEGRACIÓN WMS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener documentos disponibles en el WMS para crear despachos
   * El despacho se crea a partir de un documento WMS (ingreso/salida)
   * 
   * @param {Object} [params] - Parámetros de filtro
   * @param {string} [params.tipo] - Tipo de documento ('ingreso'|'salida')
   * @param {string} [params.cliente_codigo] - Código del cliente
   * @returns {Promise<Object>} Lista de documentos WMS disponibles
   */
  getDocumentosWMS: async (params = {}) => {
    try {
      const response = await apiClient.get(OPERACIONES_ENDPOINTS.WMS_DOCUMENTOS, { params });
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener documentos WMS',
        code: error.code || 'GET_WMS_DOCS_ERROR',
      };
    }
  },
  
  /**
   * Obtener detalle de un documento WMS específico
   * Incluye lista de productos del documento
   * 
   * @param {string} numeroDocumento - Número del documento WMS
   * @returns {Promise<Object>} Detalle del documento con productos
   */
  getDocumentoWMS: async (numeroDocumento) => {
    try {
      const response = await apiClient.get(OPERACIONES_ENDPOINTS.WMS_DOCUMENTO(numeroDocumento));
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener documento WMS',
        code: error.code || 'GET_WMS_DOC_ERROR',
      };
    }
  },
  
  // ════════════════════════════════════════════════════════════════════════
  // CRUD DE DESPACHOS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener lista de despachos con filtros y paginación
   * 
   * @param {Object} params - Parámetros de búsqueda
   * @param {number} [params.page=1] - Número de página
   * @param {number} [params.limit=10] - Registros por página
   * @param {string} [params.search] - Búsqueda por número de operación, documento WMS
   * @param {string} [params.tipo] - Tipo ('ingreso'|'salida'|'todos')
   * @param {string} [params.estado] - Estado ('pendiente'|'en_proceso'|'cerrado'|'anulado'|'todos')
   * @param {number} [params.cliente_id] - Filtro por cliente
   * @param {string} [params.fecha_desde] - Fecha desde (YYYY-MM-DD)
   * @param {string} [params.fecha_hasta] - Fecha hasta (YYYY-MM-DD)
   * @returns {Promise<Object>} Lista de despachos con paginación
   */
  getAll: async (params = {}) => {
    try {
      const response = await apiClient.get(OPERACIONES_ENDPOINTS.BASE, { params });
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener despachos',
        code: error.code || 'GET_DESPACHOS_ERROR',
      };
    }
  },
  
  /**
   * Obtener un despacho específico por ID
   * Incluye detalle de productos, averías, documentos
   * 
   * @param {number|string} id - ID del despacho (operación)
   * @returns {Promise<Object>} Datos completos del despacho
   */
  getById: async (id) => {
    try {
      const response = await apiClient.get(OPERACIONES_ENDPOINTS.BY_ID(id));
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener despacho',
        code: error.code || 'GET_DESPACHO_ERROR',
      };
    }
  },
  
  /**
   * Crear un nuevo despacho desde documento WMS
   * 
   * @param {Object} despachoData - Datos del despacho
   * @param {string} despachoData.tipo - Tipo ('ingreso'|'salida')
   * @param {string} despachoData.documento_wms - Número del documento WMS
   * @param {number} despachoData.cliente_id - ID del cliente
   * @param {string} [despachoData.observaciones] - Observaciones generales
   * @param {string} [despachoData.proveedor] - Proveedor (para ingresos)
   * @param {string} [despachoData.destino] - Destino (para salidas)
   * @returns {Promise<Object>} Despacho creado
   */
  create: async (despachoData) => {
    try {
      const response = await apiClient.post(OPERACIONES_ENDPOINTS.BASE, despachoData);
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al crear despacho',
        errors: error.errors || [],
        code: error.code || 'CREATE_DESPACHO_ERROR',
      };
    }
  },
  
  /**
   * Anular un despacho
   * Solo si está en estado pendiente o en_proceso
   * 
   * @param {number|string} id - ID del despacho
   * @param {string} motivo - Motivo de la anulación
   * @returns {Promise<Object>}
   */
  anular: async (id, motivo) => {
    try {
      const response = await apiClient.delete(OPERACIONES_ENDPOINTS.BY_ID(id), {
        data: { motivo }
      });
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al anular despacho',
        code: error.code || 'ANULAR_DESPACHO_ERROR',
      };
    }
  },
  
  // ════════════════════════════════════════════════════════════════════════
  // TRANSPORTE
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Actualizar información de transporte del despacho
   * 
   * @param {number|string} id - ID del despacho
   * @param {Object} transporteData - Datos del transporte
   * @param {string} [transporteData.vehiculo_placa] - Placa del vehículo
   * @param {string} [transporteData.vehiculo_tipo] - Tipo de vehículo
   * @param {string} [transporteData.conductor_nombre] - Nombre del conductor
   * @param {string} [transporteData.conductor_cedula] - Cédula del conductor
   * @param {string} [transporteData.conductor_celular] - Celular del conductor
   * @returns {Promise<Object>} Despacho actualizado
   */
  updateTransporte: async (id, transporteData) => {
    try {
      const response = await apiClient.put(
        OPERACIONES_ENDPOINTS.TRANSPORTE(id), 
        transporteData
      );
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al actualizar transporte',
        errors: error.errors || [],
        code: error.code || 'UPDATE_TRANSPORTE_ERROR',
      };
    }
  },
  
  // ════════════════════════════════════════════════════════════════════════
  // AVERÍAS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Registrar una avería con evidencia fotográfica
   * 
   * @param {number|string} id - ID del despacho
   * @param {Object} averiaData - Datos de la avería
   * @param {string} averiaData.tipo_averia - Tipo ('daño_fisico'|'faltante'|'humedad'|'contaminacion'|'otro')
   * @param {string} averiaData.producto - Nombre del producto afectado
   * @param {number} averiaData.cantidad_afectada - Cantidad afectada
   * @param {string} [averiaData.unidad_medida='UND'] - Unidad de medida
   * @param {string} [averiaData.descripcion] - Descripción detallada
   * @param {File} [averiaData.foto] - Archivo de foto como evidencia
   * @returns {Promise<Object>} Avería registrada
   */
  registrarAveria: async (id, averiaData) => {
    try {
      // Si averiaData es un objeto normal, convertir a FormData
      let formData = averiaData;
      if (!(averiaData instanceof FormData)) {
        formData = new FormData();
        Object.entries(averiaData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });
      }
      
      const uploadClient = createUploadClient();
      const response = await uploadClient.post(
        OPERACIONES_ENDPOINTS.AVERIAS(id), 
        formData
      );
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al registrar avería',
        errors: error.errors || [],
        code: error.code || 'REGISTRAR_AVERIA_ERROR',
      };
    }
  },
  
  /**
   * Obtener tipos de avería disponibles
   * @returns {Array} Lista de tipos de avería
   */
  getTiposAveria: () => [
    { value: 'daño_fisico', label: 'Daño Físico' },
    { value: 'faltante', label: 'Faltante' },
    { value: 'humedad', label: 'Humedad' },
    { value: 'contaminacion', label: 'Contaminación' },
    { value: 'otro', label: 'Otro' },
  ],
  
  // ════════════════════════════════════════════════════════════════════════
  // DOCUMENTOS DE CUMPLIDO
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Subir documento de cumplido
   * ⚠️ OBLIGATORIO antes de cerrar el despacho
   * 
   * @param {number|string} id - ID del despacho
   * @param {Object|FormData} documentoData - Datos del documento
   * @param {File} documentoData.archivo - Archivo (PDF, imagen)
   * @param {string} documentoData.tipo_documento - Tipo ('cumplido'|'factura'|'remision'|'acta_entrega'|'otro')
   * @param {string} [documentoData.nombre] - Nombre descriptivo
   * @param {string} [documentoData.descripcion] - Descripción
   * @returns {Promise<Object>} Documento subido
   */
  subirDocumento: async (id, documentoData) => {
    try {
      let formData = documentoData;
      if (!(documentoData instanceof FormData)) {
        formData = new FormData();
        Object.entries(documentoData).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            formData.append(key, value);
          }
        });
      }
      
      const uploadClient = createUploadClient();
      const response = await uploadClient.post(
        OPERACIONES_ENDPOINTS.DOCUMENTOS(id), 
        formData
      );
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al subir documento',
        errors: error.errors || [],
        code: error.code || 'SUBIR_DOCUMENTO_ERROR',
      };
    }
  },
  
  /**
   * Obtener tipos de documento disponibles
   * @returns {Array} Lista de tipos de documento
   */
  getTiposDocumento: () => [
    { value: 'cumplido', label: 'Cumplido' },
    { value: 'factura', label: 'Factura' },
    { value: 'remision', label: 'Remisión' },
    { value: 'acta_entrega', label: 'Acta de Entrega' },
    { value: 'documento_importacion', label: 'Documento de Importación' },
    { value: 'otro', label: 'Otro' },
  ],
  
  // ════════════════════════════════════════════════════════════════════════
  // CIERRE
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Cerrar un despacho
   * ⚠️ Requiere que se haya subido al menos un documento de cumplido
   * 
   * @param {number|string} id - ID del despacho
   * @param {Object} cierreData - Datos del cierre
   * @param {string} [cierreData.observaciones_cierre] - Observaciones de cierre
   * @param {boolean} [cierreData.enviar_correo=false] - Enviar notificación por email
   * @param {string[]} [cierreData.correos_destino] - Emails adicionales para notificar
   * @returns {Promise<Object>} Resultado del cierre
   */
  cerrar: async (id, cierreData = {}) => {
    try {
      const response = await apiClient.post(
        OPERACIONES_ENDPOINTS.CERRAR(id), 
        cierreData
      );
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al cerrar despacho',
        errors: error.errors || [],
        code: error.code || 'CERRAR_DESPACHO_ERROR',
      };
    }
  },
  
  // ════════════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener estadísticas de despachos
   * 
   * @param {Object} [params] - Parámetros de filtro
   * @param {number} [params.cliente_id] - Filtrar por cliente
   * @param {string} [params.fecha_desde] - Fecha desde
   * @param {string} [params.fecha_hasta] - Fecha hasta
   * @returns {Promise<Object>} Estadísticas
   */
  getStats: async (params = {}) => {
    try {
      const response = await apiClient.get(OPERACIONES_ENDPOINTS.STATS, { params });
      return response; // ✅ Sin .data adicional
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener estadísticas',
        code: error.code || 'GET_STATS_ERROR',
      };
    }
  },
  
  // ════════════════════════════════════════════════════════════════════════
  // UTILIDADES
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Buscar despachos por término
   * Busca en número de operación, documento WMS
   * 
   * @param {string} term - Término de búsqueda
   * @param {number} [limit=10] - Límite de resultados
   * @returns {Promise<Object>} Resultados de búsqueda
   */
  search: async (term, limit = 10) => {
    return despachosService.getAll({ search: term, limit });
  },
  
  /**
   * Obtener despachos pendientes
   * 
   * @param {number} [clienteId] - Filtrar por cliente
   * @returns {Promise<Object>} Despachos pendientes
   */
  getPendientes: async (clienteId = null) => {
    const params = { estado: 'pendiente' };
    if (clienteId) params.cliente_id = clienteId;
    return despachosService.getAll(params);
  },
  
  /**
   * Obtener despachos en proceso
   * 
   * @param {number} [clienteId] - Filtrar por cliente
   * @returns {Promise<Object>} Despachos en proceso
   */
  getEnProceso: async (clienteId = null) => {
    const params = { estado: 'en_proceso' };
    if (clienteId) params.cliente_id = clienteId;
    return despachosService.getAll(params);
  },
  
  /**
   * Obtener estados disponibles
   * @returns {Array} Lista de estados con colores
   */
  getEstados: () => [
    { value: 'pendiente', label: 'Pendiente', color: 'slate' },
    { value: 'en_proceso', label: 'En Proceso', color: 'blue' },
    { value: 'cerrado', label: 'Cerrado', color: 'emerald' },
    { value: 'anulado', label: 'Anulado', color: 'red' },
  ],
  
  /**
   * Obtener tipos de despacho
   * @returns {Array} Lista de tipos
   */
  getTipos: () => [
    { value: 'ingreso', label: 'Ingreso', icon: 'PackageCheck' },
    { value: 'salida', label: 'Salida', icon: 'Truck' },
  ],
};

// ============================================================================
// EXPORT
// ============================================================================

export default despachosService;