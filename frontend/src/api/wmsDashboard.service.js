import apiClient from './client';
import { WMS_DASHBOARD_ENDPOINTS } from './endpoints';

const wmsDashboardService = {
  getStatus: () =>
    apiClient.get(WMS_DASHBOARD_ENDPOINTS.STATUS),

  getEstadisticas: () =>
    apiClient.get(WMS_DASHBOARD_ENDPOINTS.ESTADISTICAS),

  getHistorial: (params = {}) =>
    apiClient.get(WMS_DASHBOARD_ENDPOINTS.HISTORIAL, { params }),

  reejecutar: (tipo = null) =>
    apiClient.post(WMS_DASHBOARD_ENDPOINTS.REEJECUTAR, tipo ? { tipo } : {}),
};

export default wmsDashboardService;
