/**
 * ISTHO CRM - Servicio de Administración
 *
 * Gestiona usuarios internos, roles y permisos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import apiClient from './client';
import { ADMIN_ENDPOINTS } from './endpoints';

const adminService = {
  // ═══════════════════════════════════════════════════════════════════════════
  // USUARIOS
  // ═══════════════════════════════════════════════════════════════════════════

  getUsuarios(params = {}) {
    return apiClient.get(ADMIN_ENDPOINTS.USUARIOS, { params });
  },

  getUsuario(id) {
    return apiClient.get(ADMIN_ENDPOINTS.USUARIO_BY_ID(id));
  },

  crearUsuario(data) {
    return apiClient.post(ADMIN_ENDPOINTS.USUARIOS, data);
  },

  actualizarUsuario(id, data) {
    return apiClient.put(ADMIN_ENDPOINTS.USUARIO_BY_ID(id), data);
  },

  resetearPassword(id, data) {
    return apiClient.put(ADMIN_ENDPOINTS.USUARIO_RESET_PASSWORD(id), data);
  },

  desactivarUsuario(id) {
    return apiClient.delete(ADMIN_ENDPOINTS.USUARIO_BY_ID(id));
  },

  reenviarCredenciales(id) {
    return apiClient.post(ADMIN_ENDPOINTS.USUARIO_REENVIAR_CREDENCIALES(id));
  },

  getPermisosUsuario(id) {
    return apiClient.get(ADMIN_ENDPOINTS.USUARIO_PERMISOS(id));
  },

  actualizarPermisosUsuario(id, data) {
    return apiClient.put(ADMIN_ENDPOINTS.USUARIO_PERMISOS(id), data);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ROLES
  // ═══════════════════════════════════════════════════════════════════════════

  getRoles() {
    return apiClient.get(ADMIN_ENDPOINTS.ROLES);
  },

  getRol(id) {
    return apiClient.get(ADMIN_ENDPOINTS.ROL_BY_ID(id));
  },

  crearRol(data) {
    return apiClient.post(ADMIN_ENDPOINTS.ROLES, data);
  },

  actualizarRol(id, data) {
    return apiClient.put(ADMIN_ENDPOINTS.ROL_BY_ID(id), data);
  },

  eliminarRol(id) {
    return apiClient.delete(ADMIN_ENDPOINTS.ROL_BY_ID(id));
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PERMISOS
  // ═══════════════════════════════════════════════════════════════════════════

  getPermisos() {
    return apiClient.get(ADMIN_ENDPOINTS.PERMISOS);
  },
};

export default adminService;
