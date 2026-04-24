/**
 * ISTHO CRM - Servicio de Auditoría de Acciones
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

import apiClient, { getAuthToken } from './client';
import { AUDITORIA_ACCIONES_ENDPOINTS } from './endpoints';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const descargarBlob = async (endpoint, params, nombreArchivo) => {
  const qs = params && Object.keys(params).length
    ? '?' + new URLSearchParams(params).toString()
    : '';
  const response = await fetch(`${API_BASE}${endpoint}${qs}`, {
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!response.ok) throw new Error('Error al generar el archivo');
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

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

  exportarExcel(params = {}) {
    const fecha = new Date().toISOString().split('T')[0];
    return descargarBlob(AUDITORIA_ACCIONES_ENDPOINTS.EXCEL, params, `auditoria_${fecha}.xlsx`);
  },

  exportarPDF(params = {}) {
    const fecha = new Date().toISOString().split('T')[0];
    return descargarBlob(AUDITORIA_ACCIONES_ENDPOINTS.PDF, params, `auditoria_${fecha}.pdf`);
  },
};

export default auditoriaAccionesService;
