import apiClient from './client';
import { EMAIL_ENDPOINTS } from './endpoints';

const emailManualService = {
  enviar: (payload) => apiClient.post(EMAIL_ENDPOINTS.ENVIAR, payload).then((r) => r.data),
};

export default emailManualService;
