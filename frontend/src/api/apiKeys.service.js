import apiClient from './client';
import { API_KEYS_ENDPOINTS } from './endpoints';

const apiKeysService = {
  listar() {
    return apiClient.get(API_KEYS_ENDPOINTS.BASE);
  },

  crear(data) {
    return apiClient.post(API_KEYS_ENDPOINTS.BASE, data);
  },

  toggle(id) {
    return apiClient.patch(API_KEYS_ENDPOINTS.TOGGLE(id));
  },

  eliminar(id) {
    return apiClient.delete(API_KEYS_ENDPOINTS.BY_ID(id));
  },
};

export default apiKeysService;
