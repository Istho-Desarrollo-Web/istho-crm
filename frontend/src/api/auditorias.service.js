/**
 * ============================================================================
 * ISTHO CRM - Servicio de Auditorias (Entradas y Salidas WMS)
 * ============================================================================
 * Gestiona todas las operaciones del flujo de auditoria:
 * - Listado de entradas/salidas con filtros
 * - Detalle de una auditoria (lineas, logistica, evidencias)
 * - Verificacion/eliminacion/restauracion de lineas
 * - Datos logisticos (conductor, placa, etc.)
 * - Carga de evidencias (PDF + fotos)
 * - Cierre de auditoria
 * - KPIs y estadisticas
 *
 * @author Coordinacion TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import apiClient, { createUploadClient } from './client';
import { AUDITORIAS_ENDPOINTS } from './endpoints';

// ============================================================================
// SERVICIO DE AUDITORIAS
// ============================================================================

const auditoriasService = {

  // ══════════════════════════════════════════════════════════════════════════
  // ENTRADAS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener lista de entradas con filtros y paginacion
   *
   * @param {Object} [params] - Parametros de busqueda
   * @param {number} [params.page=1] - Pagina
   * @param {number} [params.limit=20] - Registros por pagina
   * @param {string} [params.search] - Busqueda por documento o cliente
   * @param {string} [params.estado] - 'pendiente' | 'en_proceso' | 'cerrado' | 'todos'
   * @returns {Promise<Object>}
   */
  getEntradas: async (params = {}) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.ENTRADAS, { params });
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener entradas',
        code: 'GET_ENTRADAS_ERROR',
      };
    }
  },

  /**
   * Obtener detalle de una entrada por ID
   * Incluye: lineas, datos logisticos, evidencias, estado
   *
   * @param {string} id - ID de la entrada (ej: 'ENT-2026-001')
   * @returns {Promise<Object>}
   */
  getEntradaById: async (id) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.ENTRADA_BY_ID(id));
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener entrada',
        code: 'GET_ENTRADA_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SALIDAS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener lista de salidas con filtros y paginacion
   *
   * @param {Object} [params] - Parametros de busqueda
   * @param {number} [params.page=1] - Pagina
   * @param {number} [params.limit=20] - Registros por pagina
   * @param {string} [params.search] - Busqueda por documento o cliente
   * @param {string} [params.estado] - 'pendiente' | 'en_proceso' | 'cerrado' | 'todos'
   * @returns {Promise<Object>}
   */
  getSalidas: async (params = {}) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.SALIDAS, { params });
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener salidas',
        code: 'GET_SALIDAS_ERROR',
      };
    }
  },

  /**
   * Obtener detalle de una salida por ID
   *
   * @param {string} id - ID de la salida (ej: 'SAL-2026-001')
   * @returns {Promise<Object>}
   */
  getSalidaById: async (id) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.SALIDA_BY_ID(id));
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener salida',
        code: 'GET_SALIDA_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // KARDEX
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener lista de kardex con filtros y paginacion
   */
  getKardex: async (params = {}) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.KARDEX, { params });
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener kardex',
        code: 'GET_KARDEX_ERROR',
      };
    }
  },

  /**
   * Obtener detalle de un kardex por ID
   */
  getKardexById: async (id) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.KARDEX_BY_ID(id));
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener kardex',
        code: 'GET_KARDEX_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ACCIONES SOBRE LINEAS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Verificar/desverificar una linea de operacion
   *
   * @param {string} auditoriaId - ID de la auditoria
   * @param {number} lineaId - ID de la linea
   * @param {boolean} verificado - Estado de verificacion
   * @returns {Promise<Object>}
   */
  verificarLinea: async (auditoriaId, lineaId, verificado) => {
    try {
      const response = await apiClient.put(
        AUDITORIAS_ENDPOINTS.VERIFICAR_LINEA(auditoriaId, lineaId),
        { verificado }
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al verificar linea',
        code: 'VERIFICAR_LINEA_ERROR',
      };
    }
  },

  /**
   * Eliminar (marcar como sobrante/faltante) una linea
   *
   * @param {string} auditoriaId - ID de la auditoria
   * @param {number} lineaId - ID de la linea
   * @returns {Promise<Object>}
   */
  eliminarLinea: async (auditoriaId, lineaId) => {
    try {
      const response = await apiClient.delete(
        AUDITORIAS_ENDPOINTS.ELIMINAR_LINEA(auditoriaId, lineaId)
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al eliminar linea',
        code: 'ELIMINAR_LINEA_ERROR',
      };
    }
  },

  /**
   * Restaurar una linea previamente eliminada
   *
   * @param {string} auditoriaId - ID de la auditoria
   * @param {number} lineaId - ID de la linea
   * @returns {Promise<Object>}
   */
  restaurarLinea: async (auditoriaId, lineaId) => {
    try {
      const response = await apiClient.put(
        AUDITORIAS_ENDPOINTS.RESTAURAR_LINEA(auditoriaId, lineaId)
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al restaurar linea',
        code: 'RESTAURAR_LINEA_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // DATOS LOGISTICOS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Guardar/actualizar datos logisticos de la auditoria
   *
   * @param {string} auditoriaId - ID de la auditoria
   * @param {Object} data - Datos logisticos
   * @param {string} data.conductor - Nombre del conductor
   * @param {string} data.cedula - Cedula del conductor
   * @param {string} data.placa - Placa del vehiculo
   * @param {string} data.telefono - Telefono del conductor
   * @param {string} data.origen - Origen
   * @param {string} data.destino - Destino
   * @param {string} [data.observaciones] - Observaciones
   * @returns {Promise<Object>}
   */
  guardarDatosLogisticos: async (auditoriaId, data) => {
    try {
      const response = await apiClient.put(
        AUDITORIAS_ENDPOINTS.DATOS_LOGISTICOS(auditoriaId),
        data
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al guardar datos logisticos',
        errors: error.errors || [],
        code: 'GUARDAR_LOGISTICA_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // EVIDENCIAS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Subir evidencias (PDF + fotos) para una auditoria
   * Validacion: Maximo 1 PDF + 5 imagenes
   *
   * @param {string} auditoriaId - ID de la auditoria
   * @param {File[]} files - Archivos a subir
   * @returns {Promise<Object>}
   */
  subirEvidencias: async (auditoriaId, files) => {
    try {
      const formData = new FormData();
      
      // Solo subir archivos que sean instancias de File (archivos nuevos)
      // Los archivos ya subidos vienen como objetos planos de la BD
      const filesToUpload = files.filter(f => f instanceof File || (f.isUploaded === false));
      
      if (filesToUpload.length === 0) {
        return { success: true, message: 'No hay archivos nuevos para subir', data: { archivos: [] } };
      }

      filesToUpload.forEach((file) => {
        formData.append('evidencias', file);
      });

      const uploadClient = createUploadClient();
      const response = await uploadClient.post(
        AUDITORIAS_ENDPOINTS.EVIDENCIAS(auditoriaId),
        formData
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al subir evidencias',
        code: 'SUBIR_EVIDENCIAS_ERROR',
      };
    }
  },

  /**
   * Eliminar una evidencia especifica
   *
   * @param {string} auditoriaId - ID de la auditoria
   * @param {string} evidenciaId - ID de la evidencia
   * @returns {Promise<Object>}
   */
  eliminarEvidencia: async (auditoriaId, evidenciaId) => {
    try {
      const response = await apiClient.delete(
        `${AUDITORIAS_ENDPOINTS.EVIDENCIAS(auditoriaId)}/${evidenciaId}`
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al eliminar evidencia',
        code: 'ELIMINAR_EVIDENCIA_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // AVERÍAS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Registrar una avería en una operación
   *
   * @param {number} operacionId - ID de la operación
   * @param {Object} data - Datos de la avería
   * @param {number} data.detalle_id - ID del detalle/línea afectada
   * @param {string} data.sku - SKU del producto
   * @param {number} data.cantidad - Cantidad averiada
   * @param {string} data.tipo_averia - Tipo de avería
   * @param {string} [data.descripcion] - Descripción adicional
   * @param {File} [data.foto] - Foto de evidencia
   * @returns {Promise<Object>}
   */
  registrarAveria: async (operacionId, data) => {
    try {
      const formData = new FormData();
      formData.append('detalle_id', data.detalle_id);
      formData.append('sku', data.sku);
      formData.append('cantidad', data.cantidad);
      formData.append('tipo_averia', data.tipo_averia);
      if (data.descripcion) formData.append('descripcion', data.descripcion);
      if (data.foto) formData.append('foto', data.foto);

      const uploadClient = createUploadClient();
      const response = await uploadClient.post(
        `/operaciones/${operacionId}/averias`,
        formData
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al registrar avería',
        code: 'REGISTRAR_AVERIA_ERROR',
      };
    }
  },

  /**
   * Obtener averías de una operación
   *
   * @param {number} operacionId - ID de la operación
   * @returns {Promise<Object>}
   */
  getAverias: async (operacionId) => {
    try {
      const response = await apiClient.get(`/operaciones/${operacionId}/averias`);
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener averías',
        code: 'GET_AVERIAS_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CIERRE
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Cerrar una auditoria
   * Requiere: todas las lineas verificadas, datos logisticos completos,
   * al menos 1 PDF y 1 foto de evidencia
   *
   * @param {string} auditoriaId - ID de la auditoria
   * @param {Object} [data] - Datos adicionales del cierre
   * @param {boolean} [data.enviar_correo=false] - Enviar notificacion por email
   * @param {string[]} [data.correos_destino] - Emails adicionales
   * @returns {Promise<Object>}
   */
  cerrar: async (auditoriaId, data = {}) => {
    try {
      const response = await apiClient.post(
        AUDITORIAS_ENDPOINTS.CERRAR(auditoriaId),
        data
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al cerrar auditoria',
        errors: error.errors || [],
        code: 'CERRAR_AUDITORIA_ERROR',
      };
    }
  },

  /**
   * Reenviar correo de cierre de una operación
   * @param {string} operacionId - ID de la operación
   * @param {Object} [data] - { correos_destino } opcional
   * @returns {Promise<Object>}
   */
  reenviarCorreo: async (operacionId, data = {}) => {
    try {
      const response = await apiClient.post(
        `/operaciones/${operacionId}/reenviar-correo`,
        data
      );
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al reenviar correo',
        errors: error.errors || [],
        code: 'REENVIAR_CORREO_ERROR',
      };
    }
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ESTADISTICAS Y KPIs
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Obtener KPIs de auditorias
   * Retorna: entradasPendientes, salidasPendientes, auditoriasCerradasMes, etc.
   *
   * @param {Object} [params] - Parametros de filtro
   * @returns {Promise<Object>}
   */
  getStats: async (params = {}) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.STATS, { params });
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener estadisticas',
        code: 'GET_AUDITORIA_STATS_ERROR',
      };
    }
  },

  /**
   * Obtener operaciones recientes (entradas + salidas)
   * Usado en el Dashboard
   *
   * @param {Object} [params] - Parametros
   * @param {number} [params.limit=5] - Cantidad de registros por tipo
   * @returns {Promise<Object>} { entradas: [...], salidas: [...] }
   */
  getRecientes: async (params = {}) => {
    try {
      const response = await apiClient.get(AUDITORIAS_ENDPOINTS.RECIENTES, { params });
      return response;
    } catch (error) {
      throw {
        success: false,
        message: error.message || 'Error al obtener operaciones recientes',
        code: 'GET_RECIENTES_ERROR',
      };
    }
  },
};

// ============================================================================
// EXPORT
// ============================================================================

export default auditoriasService;
