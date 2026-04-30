import apiClient from './client';
import { WMS_DASHBOARD_ENDPOINTS } from './endpoints';

const wmsUbicacionService = {
  getProductoUbicaciones: (inventarioId, warehouseId = null) => {
    const params = { inventarioId };
    if (warehouseId) params.warehouseId = warehouseId;
    return apiClient.get(WMS_DASHBOARD_ENDPOINTS.UBICACION_PRODUCTO, { params });
  },

  getPalletUbicacion: (palletId) =>
    apiClient.get(WMS_DASHBOARD_ENDPOINTS.UBICACION_PALLET(palletId)),
};

export default wmsUbicacionService;
