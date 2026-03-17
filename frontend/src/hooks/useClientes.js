/**
 * ============================================================================
 * ISTHO CRM - Hook useClientes
 * ============================================================================
 * Hook personalizado para gestión de clientes.
 * Provee estado, funciones CRUD y utilidades para el módulo de clientes.
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Enero 2026
 */

import { useState, useCallback, useEffect } from 'react';
import clientesService from '../api/clientes.service';

// ============================================================================
// ESTADOS INICIALES
// ============================================================================

const INITIAL_LIST_STATE = {
  data: [],
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
  loading: false,
  error: null,
};

const INITIAL_DETAIL_STATE = {
  data: null,
  loading: false,
  error: null,
};

const INITIAL_STATS_STATE = {
  data: null,
  loading: false,
  error: null,
};

// ============================================================================
// HOOK PRINCIPAL
// ============================================================================

/**
 * Hook para gestión completa de clientes
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} [options.autoFetch=false] - Cargar lista automáticamente al montar
 * @param {Object} [options.initialFilters={}] - Filtros iniciales
 * @returns {Object} Estado y funciones de clientes
 * 
 * @example
 * const { 
 *   clientes, 
 *   loading, 
 *   fetchClientes, 
 *   createCliente 
 * } = useClientes({ autoFetch: true });
 */
const useClientes = (options = {}) => {
  const { autoFetch = false, initialFilters = {} } = options;
  
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  const [listState, setListState] = useState(INITIAL_LIST_STATE);
  const [detailState, setDetailState] = useState(INITIAL_DETAIL_STATE);
  const [statsState, setStatsState] = useState(INITIAL_STATS_STATE);
  const [filters, setFilters] = useState(initialFilters);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FETCH LISTA DE CLIENTES
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener lista de clientes con filtros y paginación
   * @param {Object} params - Parámetros de búsqueda
   */
  const fetchClientes = useCallback(async (params = {}) => {
    setListState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const mergedParams = { ...filters, ...params };
      const response = await clientesService.getAll(mergedParams);
      
      if (response.success) {
        setListState({
          data: response.data || [],
          pagination: response.pagination || INITIAL_LIST_STATE.pagination,
          loading: false,
          error: null,
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar clientes';
      setListState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [filters]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FETCH CLIENTE POR ID
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener un cliente específico
   * @param {number|string} id - ID del cliente
   */
  const fetchCliente = useCallback(async (id) => {
    setDetailState({ data: null, loading: true, error: null });
    
    try {
      const response = await clientesService.getById(id);
      
      if (response.success) {
        setDetailState({
          data: response.data,
          loading: false,
          error: null,
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar cliente';
      setDetailState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CREAR CLIENTE
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Crear un nuevo cliente
   * @param {Object} clienteData - Datos del cliente
   */
  const createCliente = useCallback(async (clienteData) => {
    setListState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await clientesService.create(clienteData);
      
      if (response.success) {
        // Agregar el nuevo cliente a la lista
        setListState(prev => ({
          ...prev,
          data: [response.data, ...prev.data],
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total + 1,
          },
          loading: false,
        }));
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      setListState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR CLIENTE
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Actualizar un cliente existente
   * @param {number|string} id - ID del cliente
   * @param {Object} clienteData - Datos a actualizar
   */
  const updateCliente = useCallback(async (id, clienteData) => {
    try {
      const response = await clientesService.update(id, clienteData);
      
      if (response.success) {
        // Actualizar en la lista
        setListState(prev => ({
          ...prev,
          data: prev.data.map(cliente => 
            cliente.id === id ? { ...cliente, ...response.data } : cliente
          ),
        }));
        
        // Actualizar en detalle si es el mismo
        setDetailState(prev => {
          if (prev.data?.id === id) {
            return { ...prev, data: { ...prev.data, ...response.data } };
          }
          return prev;
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // ELIMINAR CLIENTE
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Eliminar un cliente (soft delete)
   * @param {number|string} id - ID del cliente
   */
  const deleteCliente = useCallback(async (id) => {
    try {
      const response = await clientesService.delete(id);
      
      if (response.success) {
        // Remover de la lista
        setListState(prev => ({
          ...prev,
          data: prev.data.filter(cliente => cliente.id !== id),
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total - 1,
          },
        }));
        
        // Limpiar detalle si es el mismo
        setDetailState(prev => {
          if (prev.data?.id === id) {
            return INITIAL_DETAIL_STATE;
          }
          return prev;
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CAMBIAR ESTADO
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Cambiar estado de un cliente
   * @param {number|string} id - ID del cliente
   * @param {string} estado - Nuevo estado
   */
  const changeStatus = useCallback(async (id, estado) => {
    return updateCliente(id, { estado });
  }, [updateCliente]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADÍSTICAS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Obtener estadísticas de clientes
   */
  const fetchStats = useCallback(async () => {
    setStatsState({ data: null, loading: true, error: null });
    
    try {
      const response = await clientesService.getStats();
      
      if (response.success) {
        setStatsState({
          data: response.data,
          loading: false,
          error: null,
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar estadísticas';
      setStatsState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);
  
  // ════════════════════════════════════════════════════════════════════════
  // CONTACTOS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener contactos de un cliente
   * @param {number|string} clienteId - ID del cliente
   */
  const fetchContactos = useCallback(async (clienteId) => {
    try {
      const response = await clientesService.getContactos(clienteId);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  /**
   * Crear contacto
   * @param {number|string} clienteId - ID del cliente
   * @param {Object} contactoData - Datos del contacto
   */
  const createContacto = useCallback(async (clienteId, contactoData) => {
    try {
      const response = await clientesService.createContacto(clienteId, contactoData);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  /**
   * Actualizar contacto
   * @param {number|string} clienteId - ID del cliente
   * @param {number|string} contactoId - ID del contacto
   * @param {Object} contactoData - Datos a actualizar
   */
  const updateContacto = useCallback(async (clienteId, contactoId, contactoData) => {
    try {
      const response = await clientesService.updateContacto(clienteId, contactoId, contactoData);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  /**
   * Eliminar contacto
   * @param {number|string} clienteId - ID del cliente
   * @param {number|string} contactoId - ID del contacto
   */
  const deleteContacto = useCallback(async (clienteId, contactoId) => {
    try {
      const response = await clientesService.deleteContacto(clienteId, contactoId);
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // PAGINACIÓN
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Cambiar página
   * @param {number} page - Número de página
   */
  const goToPage = useCallback((page) => {
    fetchClientes({ page });
  }, [fetchClientes]);
  
  /**
   * Cambiar cantidad por página
   * @param {number} limit - Registros por página
   */
  const setPageSize = useCallback((limit) => {
    fetchClientes({ page: 1, limit });
  }, [fetchClientes]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FILTROS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Aplicar filtros
   * @param {Object} newFilters - Nuevos filtros
   */
  const applyFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    fetchClientes({ ...newFilters, page: 1 });
  }, [fetchClientes]);
  
  /**
   * Limpiar filtros
   */
  const clearFilters = useCallback(() => {
    setFilters({});
    fetchClientes({ page: 1 });
  }, [fetchClientes]);
  
  /**
   * Buscar clientes
   * @param {string} term - Término de búsqueda
   */
  const search = useCallback((term) => {
    applyFilters({ search: term });
  }, [applyFilters]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Refrescar lista actual
   */
  const refresh = useCallback(() => {
    fetchClientes({ page: listState.pagination.page });
  }, [fetchClientes, listState.pagination.page]);
  
  /**
   * Limpiar estado de detalle
   */
  const clearDetail = useCallback(() => {
    setDetailState(INITIAL_DETAIL_STATE);
  }, []);
  
  /**
   * Limpiar errores
   */
  const clearErrors = useCallback(() => {
    setListState(prev => ({ ...prev, error: null }));
    setDetailState(prev => ({ ...prev, error: null }));
    setStatsState(prev => ({ ...prev, error: null }));
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // AUTO FETCH
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (autoFetch) {
      fetchClientes();
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────
  
  return {
    // Estado de lista
    clientes: listState.data,
    pagination: listState.pagination,
    loading: listState.loading,
    error: listState.error,
    
    // Estado de detalle
    cliente: detailState.data,
    loadingDetail: detailState.loading,
    errorDetail: detailState.error,
    
    // Estado de estadísticas
    stats: statsState.data,
    loadingStats: statsState.loading,
    errorStats: statsState.error,
    
    // Filtros
    filters,
    
    // Acciones principales
    fetchClientes,
    fetchCliente,
    createCliente,
    updateCliente,
    deleteCliente,
    changeStatus,
    fetchStats,
    
    // Contactos
    fetchContactos,
    createContacto,
    updateContacto,
    deleteContacto,
    
    // Paginación
    goToPage,
    setPageSize,
    
    // Filtros
    applyFilters,
    clearFilters,
    search,
    
    // Utilidades
    refresh,
    clearDetail,
    clearErrors,
  };
};

// ============================================================================
// HOOK PARA SELECTOR DE CLIENTES
// ============================================================================

/**
 * Hook simplificado para selectores de clientes
 * Solo carga clientes activos para dropdowns
 * 
 * @example
 * const { clientes, loading } = useClientesSelector();
 */
export const useClientesSelector = () => {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const fetchClientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await clientesService.getActivos();
      if (response.success) {
        setClientes(response.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);
  
  return { clientes, loading, error, refresh: fetchClientes };
};

// ============================================================================
// EXPORT
// ============================================================================

export default useClientes;