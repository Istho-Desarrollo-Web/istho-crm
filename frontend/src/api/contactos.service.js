/**
 * ============================================================================
 * ISTHO CRM - Servicio de Contactos
 * ============================================================================
 * Capa de acceso a datos para el módulo de Directorio (Contactos).
 * Expone métodos para CRUD y relaciones con clientes.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Junio 2026
 */

import apiClient from './client';
import { CONTACTOS_ENDPOINTS } from './endpoints';

const contactosService = {
  // ── Directorio ──────────────────────────────────────────────────────────
  /**
   * Obtiene lista paginada de contactos con filtros opcionales
   * @param {Object} params - Parámetros de paginación y filtrado
   * @returns {Promise} { rows: [...], count: N }
   */
  getAll: async (params = {}) => {
    try {
      return await apiClient.get(CONTACTOS_ENDPOINTS.BASE, { params });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al obtener contactos' };
    }
  },

  /**
   * Obtiene un contacto específico por ID
   * @param {number} id - ID del contacto
   * @returns {Promise} Objeto contacto
   */
  getById: async (id) => {
    try {
      return await apiClient.get(CONTACTOS_ENDPOINTS.BY_ID(id));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al obtener el contacto' };
    }
  },

  /**
   * Crea un nuevo contacto
   * @param {Object} data - Datos del contacto (nombre, email, telefono, etc.)
   * @returns {Promise} Contacto creado
   */
  create: async (data) => {
    try {
      return await apiClient.post(CONTACTOS_ENDPOINTS.BASE, data);
    } catch (error) {
      throw { success: false, message: error.message || 'Error al crear el contacto' };
    }
  },

  /**
   * Actualiza un contacto existente
   * @param {number} id - ID del contacto
   * @param {Object} data - Datos a actualizar
   * @returns {Promise} Contacto actualizado
   */
  update: async (id, data) => {
    try {
      return await apiClient.put(CONTACTOS_ENDPOINTS.BY_ID(id), data);
    } catch (error) {
      throw { success: false, message: error.message || 'Error al actualizar el contacto' };
    }
  },

  /**
   * Desactiva (elimina lógicamente) un contacto
   * @param {number} id - ID del contacto
   * @returns {Promise}
   */
  deactivate: async (id) => {
    try {
      return await apiClient.delete(CONTACTOS_ENDPOINTS.BY_ID(id));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al desactivar el contacto' };
    }
  },

  desactivarMasivo: async (ids) => {
    try {
      return await apiClient.delete(CONTACTOS_ENDPOINTS.BULK, { data: { ids } });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al desactivar los contactos' };
    }
  },

  activarMasivo: async (ids) => {
    try {
      return await apiClient.patch(CONTACTOS_ENDPOINTS.BULK, { ids });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al activar los contactos' };
    }
  },

  /**
   * Asigna un cliente a un contacto
   * @param {number} contactoId - ID del contacto
   * @param {Object} payload - { cliente_id, es_principal }
   * @returns {Promise}
   */
  asignarCliente: async (contactoId, { cliente_id, es_principal = false }) => {
    try {
      return await apiClient.post(CONTACTOS_ENDPOINTS.CLIENTES_DE_CONTACTO(contactoId), {
        cliente_id,
        es_principal,
      });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al asignar cliente' };
    }
  },

  /**
   * Desasigna un cliente de un contacto
   * @param {number} contactoId - ID del contacto
   * @param {number} clienteId - ID del cliente
   * @returns {Promise}
   */
  desasignarCliente: async (contactoId, clienteId) => {
    try {
      return await apiClient.delete(CONTACTOS_ENDPOINTS.CLIENTE_DE_CONTACTO(contactoId, clienteId));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al desasignar cliente' };
    }
  },

  // ── Desde ClienteDetail ──────────────────────────────────────────────────
  /**
   * Obtiene contactos asignados a un cliente
   * @param {number} clienteId - ID del cliente
   * @returns {Promise} { rows: [...], count: N }
   */
  getContactosCliente: async (clienteId) => {
    try {
      return await apiClient.get(CONTACTOS_ENDPOINTS.CONTACTOS_DE_CLIENTE(clienteId));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al obtener contactos del cliente' };
    }
  },

  /**
   * Asigna un contacto a un cliente
   * @param {number} clienteId - ID del cliente
   * @param {Object} payload - { contacto_id, es_principal }
   * @returns {Promise}
   */
  asignarACliente: async (clienteId, { contacto_id, es_principal = false }) => {
    try {
      return await apiClient.post(CONTACTOS_ENDPOINTS.ASIGNAR_A_CLIENTE(clienteId), {
        contacto_id,
        es_principal,
      });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al asignar contacto' };
    }
  },

  /**
   * Desasigna un contacto de un cliente
   * @param {number} clienteId - ID del cliente
   * @param {number} contactoId - ID del contacto
   * @returns {Promise}
   */
  desasignarDeCliente: async (clienteId, contactoId) => {
    try {
      return await apiClient.delete(CONTACTOS_ENDPOINTS.DESASIGNAR_DE_CLIENTE(clienteId, contactoId));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al desasignar contacto' };
    }
  },
};

export default contactosService;
