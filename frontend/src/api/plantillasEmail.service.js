/**
 * ============================================================================
 * ISTHO CRM - Servicio de Plantillas de Email
 * ============================================================================
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 */

import apiClient, { createUploadClient } from './client';
import { PLANTILLAS_EMAIL_ENDPOINTS } from './endpoints';

const plantillasEmailService = {
  getAll: async (params = {}) => {
    return apiClient.get(PLANTILLAS_EMAIL_ENDPOINTS.BASE, { params });
  },

  getById: async (id) => {
    return apiClient.get(PLANTILLAS_EMAIL_ENDPOINTS.BY_ID(id));
  },

  getCampos: async (tipo) => {
    return apiClient.get(PLANTILLAS_EMAIL_ENDPOINTS.CAMPOS(tipo));
  },

  create: async (data) => {
    return apiClient.post(PLANTILLAS_EMAIL_ENDPOINTS.BASE, data);
  },

  update: async (id, data) => {
    return apiClient.put(PLANTILLAS_EMAIL_ENDPOINTS.BY_ID(id), data);
  },

  delete: async (id) => {
    return apiClient.delete(PLANTILLAS_EMAIL_ENDPOINTS.BY_ID(id));
  },

  preview: async (id, datos = {}) => {
    return apiClient.post(PLANTILLAS_EMAIL_ENDPOINTS.PREVIEW(id), { datos });
  },

  previewRaw: async (data) => {
    return apiClient.post(PLANTILLAS_EMAIL_ENDPOINTS.PREVIEW_RAW, data);
  },
  // Logo de firma
  getLogoFirma: async () => {
    return apiClient.get(PLANTILLAS_EMAIL_ENDPOINTS.LOGO_FIRMA);
  },

  uploadLogoFirma: async (file) => {
    const uploadClient = createUploadClient();
    const formData = new FormData();
    formData.append('logo', file);
    const response = await uploadClient.post(PLANTILLAS_EMAIL_ENDPOINTS.LOGO_FIRMA, formData);
    return response.data;
  },
};

export default plantillasEmailService;
