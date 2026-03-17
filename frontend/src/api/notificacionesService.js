/**
 * ============================================================================
 * ISTHO CRM - Servicio de Notificaciones (Frontend)
 * ============================================================================
 * Conecta con el API de notificaciones del backend.
 *
 * CORRECCIÓN v1.2.0:
 * - Parseo robusto de respuestas (compatible con client.js interceptor)
 * - getAll retorna estructura completa { data, pagination }
 * - getCount con múltiples estrategias de parseo
 *
 * @author Coordinación TI ISTHO
 * @version 1.2.0
 * @date Marzo 2026
 */

import client from './client';

const BASE_URL = '/notificaciones';

/**
 * Extrae el count de la respuesta del backend de forma robusta.
 * El interceptor de client.js devuelve response.data (el body JSON).
 * Backend retorna: { success: true, data: { count: N } }
 * Después del interceptor: { success: true, data: { count: N } }
 */
const parseCount = (response) => {
  if (response == null) return 0;

  // Caso principal: { success: true, data: { count: N } }
  if (typeof response.data?.count === 'number') return response.data.count;

  // Fallback: { count: N } (si el interceptor extrajo .data)
  if (typeof response.count === 'number') return response.count;

  // Fallback: respuesta es directamente un número
  if (typeof response === 'number') return response;

  return 0;
};

/**
 * Extrae la lista de notificaciones de la respuesta del backend.
 * Backend retorna: { success: true, data: [...], pagination: {...} }
 * Después del interceptor: { success: true, data: [...], pagination: {...} }
 */
const parseList = (response) => {
  if (response == null) return { data: [], pagination: null };

  // Caso principal: { success: true, data: [...], pagination: {...} }
  if (response.success && Array.isArray(response.data)) {
    return { data: response.data, pagination: response.pagination || null };
  }

  // Fallback: la respuesta ya es un array (doble unwrap)
  if (Array.isArray(response)) {
    return { data: response, pagination: null };
  }

  // Fallback: { data: [...] } sin success
  if (Array.isArray(response.data)) {
    return { data: response.data, pagination: response.pagination || null };
  }

  return { data: [], pagination: null };
};

const notificacionesService = {
  /**
   * Obtener todas las notificaciones del usuario
   * @param {Object} params - { page, limit, tipo, no_leidas }
   * @returns {Promise<{ data: Array, pagination: Object|null }>}
   */
  async getAll(params = {}) {
    try {
      const response = await client.get(BASE_URL, { params });
      return parseList(response);
    } catch (error) {
      console.error('[notificacionesService] Error en getAll:', error);
      return { data: [], pagination: null };
    }
  },

  /**
   * Contar notificaciones no leídas
   * @returns {Promise<number>}
   */
  async getCount() {
    try {
      const response = await client.get(`${BASE_URL}/count`);
      return parseCount(response);
    } catch (error) {
      console.error('[notificacionesService] Error en getCount:', error);
      return 0;
    }
  },

  /**
   * Marcar una notificación como leída
   * @param {number} id - ID de la notificación
   * @returns {Promise<boolean>}
   */
  async marcarLeida(id) {
    try {
      await client.put(`${BASE_URL}/${id}/leer`);
      return true;
    } catch (error) {
      console.error('[notificacionesService] Error en marcarLeida:', error);
      throw error;
    }
  },

  /**
   * Marcar todas las notificaciones como leídas
   * @returns {Promise<boolean>}
   */
  async marcarTodasLeidas() {
    try {
      await client.put(`${BASE_URL}/leer-todas`);
      return true;
    } catch (error) {
      console.error('[notificacionesService] Error en marcarTodasLeidas:', error);
      throw error;
    }
  },

  /**
   * Eliminar una notificación
   * @param {number} id - ID de la notificación
   * @returns {Promise<boolean>}
   */
  async eliminar(id) {
    try {
      await client.delete(`${BASE_URL}/${id}`);
      return true;
    } catch (error) {
      console.error('[notificacionesService] Error en eliminar:', error);
      throw error;
    }
  },

  /**
   * Eliminar todas las notificaciones leídas
   * @returns {Promise<boolean>}
   */
  async eliminarLeidas() {
    try {
      await client.delete(`${BASE_URL}/leidas`);
      return true;
    } catch (error) {
      console.error('[notificacionesService] Error en eliminarLeidas:', error);
      throw error;
    }
  },

  /**
   * Crear una notificación (admin)
   * @param {Object} data - { usuario_id, tipo, titulo, mensaje, prioridad, accion_url }
   * @returns {Promise<Object>}
   */
  async crear(data) {
    try {
      const response = await client.post(BASE_URL, data);
      return response.data || response;
    } catch (error) {
      console.error('[notificacionesService] Error en crear:', error);
      throw error;
    }
  },
};

export default notificacionesService;
