/**
 * ============================================================================
 * ISTHO CRM - Servicio de Solicitudes del Cliente
 * ============================================================================
 * Gestiona todas las operaciones del módulo de solicitudes:
 * - Listado con filtros y paginación
 * - Detalle de una solicitud
 * - Creación de solicitudes
 * - Cambio de estado (pendiente → en_revisión → respondida → cerrada)
 * - Vinculación a operación WMS
 * - Comentarios (internos y visibles al cliente)
 * - Subida de documentos adjuntos
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Mayo 2026
 */

import apiClient, { createUploadClient } from './client';

const BASE = '/solicitudes';

const solicitudesService = {
  /**
   * Obtener lista de solicitudes con filtros y paginación
   * @param {Object} [params] - Parámetros de búsqueda
   * @param {number} [params.page=1] - Página
   * @param {number} [params.limit=20] - Registros por página
   * @param {string} [params.estado] - Estado de la solicitud
   * @param {string} [params.tipo] - Tipo de solicitud
   * @param {string} [params.search] - Búsqueda por texto
   * @param {number} [params.cliente_id] - Filtrar por cliente
   * @returns {Promise<Object>}
   */
  getAll: (params = {}) => apiClient.get(BASE, { params }),

  /**
   * Obtener detalle de una solicitud por ID
   * @param {number} id - ID de la solicitud
   * @returns {Promise<Object>}
   */
  getById: (id) => apiClient.get(`${BASE}/${id}`),

  /**
   * Crear una nueva solicitud
   * @param {Object} data - Datos de la solicitud
   * @param {string} data.tipo - Tipo de solicitud
   * @param {string} data.asunto - Asunto
   * @param {string} data.descripcion - Descripción detallada
   * @param {string} [data.prioridad] - Prioridad ('baja'|'media'|'alta')
   * @returns {Promise<Object>}
   */
  crear: (data) => apiClient.post(BASE, data),

  /**
   * Cambiar el estado de una solicitud
   * @param {number} id - ID de la solicitud
   * @param {string} estado - Nuevo estado
   * @param {string} [motivo] - Motivo del cambio (requerido para cierre/rechazo)
   * @returns {Promise<Object>}
   */
  cambiarEstado: (id, estado, motivo) =>
    apiClient.patch(`${BASE}/${id}/estado`, { estado, motivo }),

  /**
   * Vincular una solicitud a una operación WMS
   * @param {number} id - ID de la solicitud
   * @param {number} operacion_id - ID de la operación
   * @returns {Promise<Object>}
   */
  vincular: (id, operacion_id) =>
    apiClient.patch(`${BASE}/${id}/vincular`, { operacion_id }),

  /**
   * Agregar un comentario a una solicitud
   * @param {number} id - ID de la solicitud
   * @param {string} mensaje - Contenido del comentario
   * @param {boolean} [es_interno=false] - Si es interno (no visible al cliente)
   * @returns {Promise<Object>}
   */
  agregarComentario: (id, mensaje, es_interno = false) =>
    apiClient.post(`${BASE}/${id}/comentarios`, { mensaje, es_interno }),

  /**
   * Subir un documento adjunto a una solicitud
   * Usa createUploadClient (mismo patrón que evidencias en auditorias)
   * @param {number} id - ID de la solicitud
   * @param {File} file - Archivo a subir
   * @returns {Promise<Object>}
   */
  subirDocumento: async (id, file) => {
    const formData = new FormData();
    formData.append('archivo', file);
    const uploadClient = createUploadClient();
    return uploadClient.post(`${BASE}/${id}/documento`, formData);
  },

  /**
   * Obtener solicitudes de un cliente específico
   * Atajo sobre getAll con cliente_id fijo
   * @param {number} clienteId - ID del cliente
   * @param {Object} [params] - Parámetros adicionales de filtro/paginación
   * @returns {Promise<Object>}
   */
  getPorCliente: (clienteId, params = {}) =>
    apiClient.get(BASE, { params: { ...params, cliente_id: clienteId } }),
};

export default solicitudesService;
