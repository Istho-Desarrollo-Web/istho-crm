/**
 * ISTHO CRM - Servicio de Viajes (unificado)
 * Gestiona vehículos, cajas menores, viajes y movimientos.
 * @version 1.0.0
 */

import apiClient from './client';
import { VEHICULOS_ENDPOINTS, CAJAS_MENORES_ENDPOINTS, VIAJES_ENDPOINTS, MOVIMIENTOS_ENDPOINTS } from './endpoints';

// ════════════════════════════════════════════════════════════════════════════
// VEHÍCULOS
// ════════════════════════════════════════════════════════════════════════════

export const vehiculosService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(VEHICULOS_ENDPOINTS.BASE, { params });
    return response;
  },
  getById: async (id) => {
    const response = await apiClient.get(VEHICULOS_ENDPOINTS.BY_ID(id));
    return response;
  },
  create: async (data) => {
    const response = await apiClient.post(VEHICULOS_ENDPOINTS.BASE, data);
    return response;
  },
  update: async (id, data) => {
    const response = await apiClient.put(VEHICULOS_ENDPOINTS.BY_ID(id), data);
    return response;
  },
  delete: async (id) => {
    const response = await apiClient.delete(VEHICULOS_ENDPOINTS.BY_ID(id));
    return response;
  },
  getConductores: async () => {
    const response = await apiClient.get(VEHICULOS_ENDPOINTS.CONDUCTORES);
    return response;
  },
  getAlertas: async () => {
    const response = await apiClient.get(VEHICULOS_ENDPOINTS.ALERTAS);
    return response;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// CAJAS MENORES
// ════════════════════════════════════════════════════════════════════════════

export const cajasMenoresService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(CAJAS_MENORES_ENDPOINTS.BASE, { params });
    return response;
  },
  getById: async (id) => {
    const response = await apiClient.get(CAJAS_MENORES_ENDPOINTS.BY_ID(id));
    return response;
  },
  create: async (data) => {
    const response = await apiClient.post(CAJAS_MENORES_ENDPOINTS.BASE, data);
    return response;
  },
  update: async (id, data) => {
    const response = await apiClient.put(CAJAS_MENORES_ENDPOINTS.BY_ID(id), data);
    return response;
  },
  cerrar: async (id, data) => {
    const response = await apiClient.put(CAJAS_MENORES_ENDPOINTS.CERRAR(id), data);
    return response;
  },
  delete: async (id) => {
    const response = await apiClient.delete(CAJAS_MENORES_ENDPOINTS.BY_ID(id));
    return response;
  },
  getStats: async () => {
    const response = await apiClient.get(CAJAS_MENORES_ENDPOINTS.STATS);
    return response;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// VIAJES
// ════════════════════════════════════════════════════════════════════════════

export const viajesService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(VIAJES_ENDPOINTS.BASE, { params });
    return response;
  },
  getById: async (id) => {
    const response = await apiClient.get(VIAJES_ENDPOINTS.BY_ID(id));
    return response;
  },
  create: async (data) => {
    const response = await apiClient.post(VIAJES_ENDPOINTS.BASE, data);
    return response;
  },
  update: async (id, data) => {
    const response = await apiClient.put(VIAJES_ENDPOINTS.BY_ID(id), data);
    return response;
  },
  delete: async (id) => {
    const response = await apiClient.delete(VIAJES_ENDPOINTS.BY_ID(id));
    return response;
  }
};

// ════════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS CAJA MENOR
// ════════════════════════════════════════════════════════════════════════════

export const movimientosService = {
  getAll: async (params = {}) => {
    const response = await apiClient.get(MOVIMIENTOS_ENDPOINTS.BASE, { params });
    return response;
  },
  getById: async (id) => {
    const response = await apiClient.get(MOVIMIENTOS_ENDPOINTS.BY_ID(id));
    return response;
  },
  create: async (data) => {
    // Si tiene archivo, usar FormData
    if (data instanceof FormData) {
      const response = await apiClient.post(MOVIMIENTOS_ENDPOINTS.BASE, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response;
    }
    const response = await apiClient.post(MOVIMIENTOS_ENDPOINTS.BASE, data);
    return response;
  },
  update: async (id, data) => {
    if (data instanceof FormData) {
      const response = await apiClient.put(MOVIMIENTOS_ENDPOINTS.BY_ID(id), data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response;
    }
    const response = await apiClient.put(MOVIMIENTOS_ENDPOINTS.BY_ID(id), data);
    return response;
  },
  aprobar: async (id, data) => {
    const response = await apiClient.put(MOVIMIENTOS_ENDPOINTS.APROBAR(id), data);
    return response;
  },
  aprobarMasivo: async (data) => {
    const response = await apiClient.put(MOVIMIENTOS_ENDPOINTS.APROBAR_MASIVO, data);
    return response;
  },
  delete: async (id) => {
    const response = await apiClient.delete(MOVIMIENTOS_ENDPOINTS.BY_ID(id));
    return response;
  },
  getConceptos: async () => {
    const response = await apiClient.get(MOVIMIENTOS_ENDPOINTS.CONCEPTOS);
    return response;
  }
};
