/**
 * ============================================================================
 * ISTHO CRM - Servicio API de Usuarios Cliente
 * ============================================================================
 * Servicio para comunicación con el backend de usuarios de cliente.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

import client from './client';

const BASE_PATH = '/clientes';

/**
 * Servicio de Usuarios Cliente
 */
const usuarioClienteService = {
  /**
   * Listar usuarios de un cliente
   * @param {number} clienteId - ID del cliente
   * @param {Object} params - Parámetros de búsqueda
   * @returns {Promise<Object>}
   */
  async listar(clienteId, params = {}) {
    const response = await client.get(`${BASE_PATH}/${clienteId}/usuarios`, { params });
    return response;
  },

  /**
   * Obtener un usuario específico
   * @param {number} clienteId - ID del cliente
   * @param {number} usuarioId - ID del usuario
   * @returns {Promise<Object>}
   */
  async obtenerPorId(clienteId, usuarioId) {
    const response = await client.get(`${BASE_PATH}/${clienteId}/usuarios/${usuarioId}`);
    return response;
  },

  /**
   * Crear nuevo usuario para un cliente
   * @param {number} clienteId - ID del cliente
   * @param {Object} data - Datos del usuario
   * @returns {Promise<Object>}
   */
  async crear(clienteId, data) {
    const response = await client.post(`${BASE_PATH}/${clienteId}/usuarios`, data);
    return response;
  },

  /**
   * Actualizar usuario
   * @param {number} clienteId - ID del cliente
   * @param {number} usuarioId - ID del usuario
   * @param {Object} data - Datos a actualizar
   * @returns {Promise<Object>}
   */
  async actualizar(clienteId, usuarioId, data) {
    const response = await client.put(`${BASE_PATH}/${clienteId}/usuarios/${usuarioId}`, data);
    return response;
  },

  /**
   * Desactivar usuario
   * @param {number} clienteId - ID del cliente
   * @param {number} usuarioId - ID del usuario
   * @param {string} motivo - Motivo de desactivación (opcional)
   * @returns {Promise<Object>}
   */
  async desactivar(clienteId, usuarioId, motivo = '') {
    const response = await client.delete(`${BASE_PATH}/${clienteId}/usuarios/${usuarioId}`, {
      data: { motivo }
    });
    return response;
  },

  /**
   * Reactivar usuario
   * @param {number} clienteId - ID del cliente
   * @param {number} usuarioId - ID del usuario
   * @returns {Promise<Object>}
   */
  async reactivar(clienteId, usuarioId) {
    const response = await client.post(`${BASE_PATH}/${clienteId}/usuarios/${usuarioId}/reactivar`);
    return response;
  },

  /**
   * Resetear contraseña de usuario
   * @param {number} clienteId - ID del cliente
   * @param {number} usuarioId - ID del usuario
   * @param {Object} options - Opciones
   * @returns {Promise<Object>}
   */
  async resetearPassword(clienteId, usuarioId, options = {}) {
    const response = await client.post(
      `${BASE_PATH}/${clienteId}/usuarios/${usuarioId}/resetear-password`,
      options
    );
    return response.data;
  },

  /**
   * Reenviar invitación por email
   * @param {number} clienteId - ID del cliente
   * @param {number} usuarioId - ID del usuario
   * @returns {Promise<Object>}
   */
  async reenviarInvitacion(clienteId, usuarioId) {
    const response = await client.post(
      `${BASE_PATH}/${clienteId}/usuarios/${usuarioId}/reenviar-invitacion`
    );
    return response.data;
  },

  /**
   * Obtener catálogo de permisos disponibles
   * @returns {Promise<Object>}
   */
  async obtenerCatalogoPermisos() {
    const response = await client.get('/usuarios/permisos-cliente');
    return response;
  }
};

export default usuarioClienteService;