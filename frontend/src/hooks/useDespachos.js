/**
 * ============================================================================
 * ISTHO CRM - Hook useDespachos
 * ============================================================================
 * Hook personalizado para gestión de despachos (operaciones).
 * 
 * ⚠️ NOTA DE NOMENCLATURA:
 * - El FRONTEND usa "Despachos" (más intuitivo)
 * - El BACKEND usa "Operaciones" (integración WMS)
 * - Este hook abstrae esta diferencia
 * 
 * Provee estado, funciones CRUD, integración WMS y flujo completo.
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Enero 2026
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import despachosService from '../api/despachos.service';

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

const INITIAL_WMS_STATE = {
  documentos: [],
  documentoActual: null,
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
 * Hook para gestión completa de despachos/operaciones
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} [options.autoFetch=false] - Cargar lista automáticamente
 * @param {number} [options.clienteId] - Filtrar por cliente específico
 * @param {Object} [options.initialFilters={}] - Filtros iniciales
 * @returns {Object} Estado y funciones de despachos
 * 
 * @example
 * const { 
 *   despachos, 
 *   loading, 
 *   fetchDespachos, 
 *   crearDespacho,
 *   cerrarDespacho
 * } = useDespachos({ autoFetch: true });
 */
const useDespachos = (options = {}) => {
  const { 
    autoFetch = false, 
    clienteId = null,
    initialFilters = {} 
  } = options;
  
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  const [listState, setListState] = useState(INITIAL_LIST_STATE);
  const [detailState, setDetailState] = useState(INITIAL_DETAIL_STATE);
  const [wmsState, setWmsState] = useState(INITIAL_WMS_STATE);
  const [statsState, setStatsState] = useState(INITIAL_STATS_STATE);
  const [filters, setFilters] = useState({
    ...initialFilters,
    ...(clienteId ? { cliente_id: clienteId } : {}),
  });
  
  // Estado de operaciones en curso
  const [operationLoading, setOperationLoading] = useState({
    transporte: false,
    averia: false,
    documento: false,
    cierre: false,
  });
  
  // ════════════════════════════════════════════════════════════════════════
  // INTEGRACIÓN WMS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener documentos disponibles en el WMS
   * @param {Object} params - Parámetros de filtro
   * @param {string} [params.tipo] - Tipo ('ingreso'|'salida')
   * @param {string} [params.cliente_codigo] - Código del cliente
   */
  const fetchDocumentosWMS = useCallback(async (params = {}) => {
    setWmsState(prev => ({ ...prev, documentos: [], loading: true, error: null }));
    
    try {
      const response = await despachosService.getDocumentosWMS(params);
      
      if (response.success) {
        setWmsState(prev => ({
          ...prev,
          documentos: response.data || [],
          loading: false,
        }));
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar documentos WMS';
      setWmsState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);
  
  /**
   * Obtener detalle de un documento WMS específico
   * @param {string} numeroDocumento - Número del documento
   */
  const fetchDocumentoWMS = useCallback(async (numeroDocumento) => {
    setWmsState(prev => ({ ...prev, documentoActual: null, loading: true, error: null }));
    
    try {
      const response = await despachosService.getDocumentoWMS(numeroDocumento);
      
      if (response.success) {
        setWmsState(prev => ({
          ...prev,
          documentoActual: response.data,
          loading: false,
        }));
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar documento WMS';
      setWmsState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);
  
  /**
   * Limpiar documento WMS seleccionado
   */
  const clearDocumentoWMS = useCallback(() => {
    setWmsState(prev => ({ ...prev, documentoActual: null }));
  }, []);
  
  // ════════════════════════════════════════════════════════════════════════
  // CRUD DE DESPACHOS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener lista de despachos con filtros y paginación
   * @param {Object} params - Parámetros de búsqueda
   */
  const fetchDespachos = useCallback(async (params = {}) => {
    setListState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const mergedParams = { ...filters, ...params };
      const response = await despachosService.getAll(mergedParams);
      
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
      const errorMessage = error.message || 'Error al cargar despachos';
      setListState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [filters]);
  
  /**
   * Obtener un despacho específico por ID
   * @param {number|string} id - ID del despacho
   */
  const fetchDespacho = useCallback(async (id) => {
    setDetailState({ data: null, loading: true, error: null });
    
    try {
      const response = await despachosService.getById(id);
      
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
      const errorMessage = error.message || 'Error al cargar despacho';
      setDetailState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);
  
  /**
   * Crear un nuevo despacho desde documento WMS
   * @param {Object} despachoData - Datos del despacho
   */
  const crearDespacho = useCallback(async (despachoData) => {
    setListState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await despachosService.create(despachoData);
      
      if (response.success) {
        // Agregar a la lista
        setListState(prev => ({
          ...prev,
          data: [response.data, ...prev.data],
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total + 1,
          },
          loading: false,
        }));
        
        // Limpiar documento WMS usado
        clearDocumentoWMS();
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      setListState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [clearDocumentoWMS]);
  
  /**
   * Anular un despacho
   * @param {number|string} id - ID del despacho
   * @param {string} motivo - Motivo de anulación
   */
  const anularDespacho = useCallback(async (id, motivo) => {
    try {
      const response = await despachosService.anular(id, motivo);
      
      if (response.success) {
        // Actualizar estado en la lista
        setListState(prev => ({
          ...prev,
          data: prev.data.map(despacho => 
            despacho.id === id ? { ...despacho, estado: 'anulado' } : despacho
          ),
        }));
        
        // Actualizar detalle si es el mismo
        setDetailState(prev => {
          if (prev.data?.id === id) {
            return { ...prev, data: { ...prev.data, estado: 'anulado' } };
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
  
  // ════════════════════════════════════════════════════════════════════════
  // TRANSPORTE
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Actualizar información de transporte
   * @param {number|string} id - ID del despacho
   * @param {Object} transporteData - Datos del transporte
   */
  const actualizarTransporte = useCallback(async (id, transporteData) => {
    setOperationLoading(prev => ({ ...prev, transporte: true }));
    
    try {
      const response = await despachosService.updateTransporte(id, transporteData);
      
      if (response.success) {
        // Actualizar detalle
        setDetailState(prev => {
          if (prev.data?.id === id) {
            return { ...prev, data: { ...prev.data, ...response.data } };
          }
          return prev;
        });
        
        // Actualizar en lista
        setListState(prev => ({
          ...prev,
          data: prev.data.map(d => 
            d.id === id ? { ...d, ...response.data } : d
          ),
        }));
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, transporte: false }));
    }
  }, []);
  
  // ════════════════════════════════════════════════════════════════════════
  // AVERÍAS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Registrar una avería con evidencia fotográfica
   * @param {number|string} id - ID del despacho
   * @param {Object|FormData} averiaData - Datos de la avería
   */
  const registrarAveria = useCallback(async (id, averiaData) => {
    setOperationLoading(prev => ({ ...prev, averia: true }));
    
    try {
      const response = await despachosService.registrarAveria(id, averiaData);
      
      if (response.success) {
        // Refrescar detalle para obtener la nueva avería
        if (detailState.data?.id === id) {
          await fetchDespacho(id);
        }
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, averia: false }));
    }
  }, [detailState.data?.id, fetchDespacho]);
  
  // ════════════════════════════════════════════════════════════════════════
  // DOCUMENTOS DE CUMPLIDO
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Subir documento de cumplido
   * @param {number|string} id - ID del despacho
   * @param {Object|FormData} documentoData - Datos del documento
   */
  const subirDocumento = useCallback(async (id, documentoData) => {
    setOperationLoading(prev => ({ ...prev, documento: true }));
    
    try {
      const response = await despachosService.subirDocumento(id, documentoData);
      
      if (response.success) {
        // Refrescar detalle para obtener el nuevo documento
        if (detailState.data?.id === id) {
          await fetchDespacho(id);
        }
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, documento: false }));
    }
  }, [detailState.data?.id, fetchDespacho]);
  
  // ════════════════════════════════════════════════════════════════════════
  // CIERRE
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Cerrar un despacho
   * @param {number|string} id - ID del despacho
   * @param {Object} cierreData - Datos del cierre
   */
  const cerrarDespacho = useCallback(async (id, cierreData = {}) => {
    setOperationLoading(prev => ({ ...prev, cierre: true }));
    
    try {
      const response = await despachosService.cerrar(id, cierreData);
      
      if (response.success) {
        // Actualizar estado en la lista
        setListState(prev => ({
          ...prev,
          data: prev.data.map(despacho => 
            despacho.id === id ? { ...despacho, estado: 'cerrado', ...response.data } : despacho
          ),
        }));
        
        // Actualizar detalle
        setDetailState(prev => {
          if (prev.data?.id === id) {
            return { ...prev, data: { ...prev.data, estado: 'cerrado', ...response.data } };
          }
          return prev;
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    } finally {
      setOperationLoading(prev => ({ ...prev, cierre: false }));
    }
  }, []);
  
  // ════════════════════════════════════════════════════════════════════════
  // ESTADÍSTICAS
  // ════════════════════════════════════════════════════════════════════════
  
  /**
   * Obtener estadísticas de despachos
   * @param {Object} params - Parámetros de filtro
   */
  const fetchStats = useCallback(async (params = {}) => {
    setStatsState({ data: null, loading: true, error: null });
    
    try {
      const mergedParams = clienteId ? { ...params, cliente_id: clienteId } : params;
      const response = await despachosService.getStats(mergedParams);
      
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
  }, [clienteId]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // PAGINACIÓN
  // ──────────────────────────────────────────────────────────────────────────
  
  const goToPage = useCallback((page) => {
    fetchDespachos({ page });
  }, [fetchDespachos]);
  
  const setPageSize = useCallback((limit) => {
    fetchDespachos({ page: 1, limit });
  }, [fetchDespachos]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FILTROS
  // ──────────────────────────────────────────────────────────────────────────
  
  const applyFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    fetchDespachos({ ...newFilters, page: 1 });
  }, [fetchDespachos]);
  
  const clearFilters = useCallback(() => {
    const baseFilters = clienteId ? { cliente_id: clienteId } : {};
    setFilters(baseFilters);
    fetchDespachos({ page: 1, ...baseFilters });
  }, [fetchDespachos, clienteId]);
  
  const search = useCallback((term) => {
    applyFilters({ search: term });
  }, [applyFilters]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FILTROS ESPECIALIZADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Filtrar por estado
   * @param {string} estado - Estado del despacho
   */
  const filterByEstado = useCallback((estado) => {
    applyFilters({ estado });
  }, [applyFilters]);
  
  /**
   * Filtrar por tipo
   * @param {string} tipo - Tipo ('ingreso'|'salida')
   */
  const filterByTipo = useCallback((tipo) => {
    applyFilters({ tipo });
  }, [applyFilters]);
  
  /**
   * Filtrar por rango de fechas
   * @param {string} fechaDesde - Fecha desde
   * @param {string} fechaHasta - Fecha hasta
   */
  const filterByFechas = useCallback((fechaDesde, fechaHasta) => {
    applyFilters({ fecha_desde: fechaDesde, fecha_hasta: fechaHasta });
  }, [applyFilters]);
  
  /**
   * Mostrar solo pendientes
   */
  const showPendientes = useCallback(() => {
    filterByEstado('pendiente');
  }, [filterByEstado]);
  
  /**
   * Mostrar solo en proceso
   */
  const showEnProceso = useCallback(() => {
    filterByEstado('en_proceso');
  }, [filterByEstado]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ──────────────────────────────────────────────────────────────────────────
  
  const refresh = useCallback(() => {
    fetchDespachos({ page: listState.pagination.page });
  }, [fetchDespachos, listState.pagination.page]);
  
  const refreshDetail = useCallback(() => {
    if (detailState.data?.id) {
      fetchDespacho(detailState.data.id);
    }
  }, [detailState.data?.id, fetchDespacho]);
  
  const clearDetail = useCallback(() => {
    setDetailState(INITIAL_DETAIL_STATE);
  }, []);
  
  const clearErrors = useCallback(() => {
    setListState(prev => ({ ...prev, error: null }));
    setDetailState(prev => ({ ...prev, error: null }));
    setWmsState(prev => ({ ...prev, error: null }));
    setStatsState(prev => ({ ...prev, error: null }));
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // DATOS CALCULADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  /**
   * Despachos agrupados por estado
   */
  const despachosPorEstado = useMemo(() => {
    const grouped = {
      pendiente: [],
      en_proceso: [],
      cerrado: [],
      anulado: [],
    };
    
    listState.data.forEach(despacho => {
      if (grouped[despacho.estado]) {
        grouped[despacho.estado].push(despacho);
      }
    });
    
    return grouped;
  }, [listState.data]);
  
  /**
   * Conteo por estado
   */
  const conteoEstados = useMemo(() => ({
    pendiente: despachosPorEstado.pendiente.length,
    en_proceso: despachosPorEstado.en_proceso.length,
    cerrado: despachosPorEstado.cerrado.length,
    anulado: despachosPorEstado.anulado.length,
  }), [despachosPorEstado]);
  
  /**
   * Verificar si el despacho actual puede cerrarse
   */
  const puedeCerrar = useMemo(() => {
    const despacho = detailState.data;
    if (!despacho) return false;
    
    // Solo se puede cerrar si está en_proceso y tiene documentos
    const tieneDocumentos = despacho.documentos?.length > 0;
    const estadoValido = ['pendiente', 'en_proceso'].includes(despacho.estado);
    
    return estadoValido && tieneDocumentos;
  }, [detailState.data]);
  
  /**
   * Constantes útiles
   */
  const estados = useMemo(() => despachosService.getEstados(), []);
  const tipos = useMemo(() => despachosService.getTipos(), []);
  const tiposAveria = useMemo(() => despachosService.getTiposAveria(), []);
  const tiposDocumento = useMemo(() => despachosService.getTiposDocumento(), []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // AUTO FETCH
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (autoFetch) {
      fetchDespachos();
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────
  
  return {
    // Estado de lista
    despachos: listState.data,
    despachosPorEstado,
    conteoEstados,
    pagination: listState.pagination,
    loading: listState.loading,
    error: listState.error,
    
    // Estado de detalle
    despacho: detailState.data,
    loadingDetail: detailState.loading,
    errorDetail: detailState.error,
    puedeCerrar,
    
    // Estado de WMS
    documentosWMS: wmsState.documentos,
    documentoWMS: wmsState.documentoActual,
    loadingWMS: wmsState.loading,
    errorWMS: wmsState.error,
    
    // Estado de estadísticas
    stats: statsState.data,
    loadingStats: statsState.loading,
    errorStats: statsState.error,
    
    // Estados de operaciones
    operationLoading,
    
    // Filtros
    filters,
    
    // WMS
    fetchDocumentosWMS,
    fetchDocumentoWMS,
    clearDocumentoWMS,
    
    // CRUD
    fetchDespachos,
    fetchDespacho,
    crearDespacho,
    anularDespacho,
    
    // Acciones de despacho
    actualizarTransporte,
    registrarAveria,
    subirDocumento,
    cerrarDespacho,
    
    // Estadísticas
    fetchStats,
    
    // Paginación
    goToPage,
    setPageSize,
    
    // Filtros
    applyFilters,
    clearFilters,
    search,
    filterByEstado,
    filterByTipo,
    filterByFechas,
    showPendientes,
    showEnProceso,
    
    // Utilidades
    refresh,
    refreshDetail,
    clearDetail,
    clearErrors,
    
    // Constantes
    estados,
    tipos,
    tiposAveria,
    tiposDocumento,
  };
};

// ============================================================================
// HOOK PARA DESPACHO INDIVIDUAL
// ============================================================================

/**
 * Hook simplificado para gestionar un despacho individual
 * Ideal para páginas de detalle
 * 
 * @param {number|string} id - ID del despacho
 * @param {boolean} [autoFetch=true] - Cargar automáticamente
 * 
 * @example
 * const { despacho, loading, actualizarTransporte, cerrar } = useDespachoDetail(id);
 */
export const useDespachoDetail = (id, autoFetch = true) => {
  const hook = useDespachos();
  
  useEffect(() => {
    if (autoFetch && id) {
      hook.fetchDespacho(id);
    }
  }, [id, autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps
  
  return {
    despacho: hook.despacho,
    loading: hook.loadingDetail,
    error: hook.errorDetail,
    puedeCerrar: hook.puedeCerrar,
    operationLoading: hook.operationLoading,
    
    // Acciones
    refresh: () => hook.fetchDespacho(id),
    actualizarTransporte: (data) => hook.actualizarTransporte(id, data),
    registrarAveria: (data) => hook.registrarAveria(id, data),
    subirDocumento: (data) => hook.subirDocumento(id, data),
    cerrar: (data) => hook.cerrarDespacho(id, data),
    anular: (motivo) => hook.anularDespacho(id, motivo),
    
    // Constantes
    tiposAveria: hook.tiposAveria,
    tiposDocumento: hook.tiposDocumento,
  };
};

// ============================================================================
// EXPORT
// ============================================================================

export default useDespachos;