/**
 * ISTHO CRM - Servicio de Auditoría de Acciones
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import apiClient from './client';
import { AUDITORIA_ACCIONES_ENDPOINTS } from './endpoints';

const auditoriaAccionesService = {
  listar(params = {}) {
    return apiClient.get(AUDITORIA_ACCIONES_ENDPOINTS.BASE, { params });
  },

  getStats(params = {}) {
    return apiClient.get(AUDITORIA_ACCIONES_ENDPOINTS.STATS, { params });
  },

  getTablas() {
    return apiClient.get(AUDITORIA_ACCIONES_ENDPOINTS.TABLAS);
  },
};

export default auditoriaAccionesService;
