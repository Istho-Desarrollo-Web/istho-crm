/**
 * ============================================================================
 * ISTHO CRM - Hook useInventario (Versión Completa)
 * ============================================================================
 * Hook personalizado para gestión completa de inventario.
 * 
 * Incluye:
 * - CRUD de productos
 * - Movimientos (entradas/salidas/ajustes)
 * - Historial de movimientos
 * - Alertas
 * - Estadísticas y KPIs
 * 
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Enero 2026
 */

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import inventarioService from '../api/inventario.service';

// ════════════════════════════════════════════════════════════════════════════
// ESTADOS INICIALES
// ════════════════════════════════════════════════════════════════════════════

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

const INITIAL_MOVIMIENTOS_STATE = {
  data: [],
  pagination: null,
  loading: false,
  error: null,
};

const INITIAL_ALERTAS_STATE = {
  data: [],
  loading: false,
  error: null,
};

const INITIAL_STATS_STATE = {
  data: null,
  loading: false,
  error: null,
};

const INITIAL_ESTADISTICAS_STATE = {
  data: [],
  loading: false,
  error: null,
};

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

/**
 * Hook para gestión completa de inventario
 * 
 * @param {Object} options - Opciones de configuración
 * @param {boolean} [options.autoFetch=false] - Cargar lista automáticamente
 * @param {boolean} [options.autoFetchAlertas=false] - Cargar alertas automáticamente
 * @param {boolean} [options.autoFetchStats=false] - Cargar stats automáticamente
 * @param {Object} [options.initialFilters={}] - Filtros iniciales
 * @returns {Object} Estado y funciones de inventario
 */
const useInventario = (options = {}) => {
  const { 
    autoFetch = false, 
    autoFetchAlertas = false,
    autoFetchStats = false,
    initialFilters = {} 
  } = options;
  
  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  const [listState, setListState] = useState(INITIAL_LIST_STATE);
  const [detailState, setDetailState] = useState(INITIAL_DETAIL_STATE);
  const [movimientosState, setMovimientosState] = useState(INITIAL_MOVIMIENTOS_STATE);
  const [alertasState, setAlertasState] = useState(INITIAL_ALERTAS_STATE);
  const [statsState, setStatsState] = useState(INITIAL_STATS_STATE);
  const [estadisticasState, setEstadisticasState] = useState(INITIAL_ESTADISTICAS_STATE);
  const [filters, setFilters] = useState(initialFilters);
  const filtersRef = useRef(initialFilters);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH LISTA DE PRODUCTOS
  // ──────────────────────────────────────────────────────────────────────────

  const fetchInventario = useCallback(async (params = {}) => {
    setListState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const mergedParams = { ...filtersRef.current, ...params };
      const response = await inventarioService.getAll(mergedParams);

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
      const errorMessage = error.message || 'Error al cargar inventario';
      setListState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FETCH PRODUCTO POR ID
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchById = useCallback(async (id) => {
    setDetailState({ data: null, loading: true, error: null });
    
    try {
      const response = await inventarioService.getById(id);
      
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
      const errorMessage = error.message || 'Error al cargar producto';
      setDetailState({
        data: null,
        loading: false,
        error: errorMessage,
      });
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FETCH MOVIMIENTOS DE UN PRODUCTO
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchMovimientos = useCallback(async (productoId, params = {}) => {
    setMovimientosState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await inventarioService.getMovimientos(productoId, params);
      
      if (response.success) {
        setMovimientosState({
          data: response.data || [],
          pagination: response.pagination || null,
          loading: false,
          error: null,
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar movimientos';
      setMovimientosState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FETCH ESTADÍSTICAS DE UN PRODUCTO (PARA GRÁFICOS)
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchEstadisticas = useCallback(async (productoId, meses = 6) => {
    setEstadisticasState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await inventarioService.getEstadisticasProducto(productoId, { meses });
      
      if (response.success) {
        setEstadisticasState({
          data: response.data || [],
          loading: false,
          error: null,
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar estadísticas';
      setEstadisticasState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FETCH STATS/KPIS GENERALES
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchStats = useCallback(async (params = {}) => {
    setStatsState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await inventarioService.getStats(params);
      
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
      setStatsState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FETCH ALERTAS
  // ──────────────────────────────────────────────────────────────────────────
  
  const fetchAlertas = useCallback(async (params = {}) => {
    setAlertasState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await inventarioService.getAlertas(params);
      
      if (response.success) {
        setAlertasState({
          data: response.data || [],
          loading: false,
          error: null,
        });
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      const errorMessage = error.message || 'Error al cargar alertas';
      setAlertasState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // CREAR PRODUCTO
  // ──────────────────────────────────────────────────────────────────────────
  
  const createProducto = useCallback(async (data) => {
    try {
      const response = await inventarioService.create(data);
      
      if (response.success) {
        // Agregar a la lista
        setListState(prev => ({
          ...prev,
          data: [response.data, ...prev.data],
          pagination: {
            ...prev.pagination,
            total: prev.pagination.total + 1,
          },
        }));
        
        // Refrescar stats
        fetchStats();
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, [fetchStats]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // ACTUALIZAR PRODUCTO
  // ──────────────────────────────────────────────────────────────────────────
  
  const updateProducto = useCallback(async (id, data) => {
    try {
      const response = await inventarioService.update(id, data);
      
      if (response.success) {
        // Actualizar en la lista
        setListState(prev => ({
          ...prev,
          data: prev.data.map(item => 
            item.id === id ? { ...item, ...response.data } : item
          ),
        }));
        
        // Actualizar detalle si es el mismo
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
  // ELIMINAR PRODUCTO
  // ──────────────────────────────────────────────────────────────────────────
  
  const deleteProducto = useCallback(async (id) => {
    try {
      const response = await inventarioService.delete(id);
      
      if (response.success) {
        // Remover de la lista
        setListState(prev => ({
          ...prev,
          data: prev.data.filter(item => item.id !== id),
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
        
        // Refrescar stats
        fetchStats();
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, [fetchStats]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // REGISTRAR MOVIMIENTO (ENTRADA/SALIDA/AJUSTE)
  // ──────────────────────────────────────────────────────────────────────────
  
  const registrarMovimiento = useCallback(async (productoId, data) => {
    try {
      const response = await inventarioService.ajustar(productoId, data);
      
      if (response.success) {
        // Actualizar cantidad en la lista
        setListState(prev => ({
          ...prev,
          data: prev.data.map(item => {
            if (item.id === productoId) {
              return {
                ...item,
                cantidad: response.data.cantidad_nueva,
                stock_actual: response.data.cantidad_nueva,
              };
            }
            return item;
          }),
        }));
        
        // Actualizar detalle si es el mismo
        setDetailState(prev => {
          if (prev.data?.id === productoId) {
            return {
              ...prev,
              data: {
                ...prev.data,
                cantidad: response.data.cantidad_nueva,
                stock_actual: response.data.cantidad_nueva,
              },
            };
          }
          return prev;
        });
        
        // Refrescar movimientos si están cargados
        if (movimientosState.data.length > 0) {
          fetchMovimientos(productoId);
        }
        
        // Refrescar stats y alertas
        fetchStats();
        fetchAlertas();
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, [fetchStats, fetchAlertas, fetchMovimientos, movimientosState.data.length]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // GESTIÓN DE ALERTAS
  // ──────────────────────────────────────────────────────────────────────────
  
  const atenderAlerta = useCallback(async (alertaId, observaciones = '') => {
    try {
      const response = await inventarioService.atenderAlerta(alertaId, { observaciones });
      
      if (response.success) {
        // Remover alerta del listado (ya fue silenciada en el backend)
        setAlertasState(prev => ({
          ...prev,
          data: prev.data.filter(alerta => alerta.id !== alertaId),
        }));
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  const descartarAlerta = useCallback(async (alertaId) => {
    try {
      const response = await inventarioService.descartarAlerta(alertaId);
      
      if (response.success) {
        // Remover alerta del listado
        setAlertasState(prev => ({
          ...prev,
          data: prev.data.filter(alerta => alerta.id !== alertaId),
        }));
      } else {
        throw new Error(response.message);
      }
      
      return response;
    } catch (error) {
      throw error;
    }
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // PAGINACIÓN
  // ──────────────────────────────────────────────────────────────────────────
  
  const goToPage = useCallback((page) => {
    fetchInventario({ page });
  }, [fetchInventario]);
  
  const setPageSize = useCallback((limit) => {
    fetchInventario({ page: 1, limit });
  }, [fetchInventario]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // FILTROS
  // ──────────────────────────────────────────────────────────────────────────
  
  const applyFilters = useCallback((newFilters) => {
    filtersRef.current = newFilters;
    setFilters(newFilters);
    fetchInventario({ ...newFilters, page: 1 });
  }, [fetchInventario]);

  const clearFilters = useCallback(() => {
    filtersRef.current = {};
    setFilters({});
    fetchInventario({ page: 1 });
  }, [fetchInventario]);
  
  const search = useCallback((term) => {
    applyFilters({ search: term });
  }, [applyFilters]);
  
  // ──────────────────────────────────────────────────────────────────────────
  // UTILIDADES
  // ──────────────────────────────────────────────────────────────────────────
  
  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchInventario({ page: listState.pagination.page });
      await fetchStats();
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchInventario, fetchStats, listState.pagination.page]);
  
  const refreshAlertas = useCallback(() => {
    fetchAlertas();
  }, [fetchAlertas]);
  
  const clearDetail = useCallback(() => {
    setDetailState(INITIAL_DETAIL_STATE);
    setMovimientosState(INITIAL_MOVIMIENTOS_STATE);
    setEstadisticasState(INITIAL_ESTADISTICAS_STATE);
  }, []);
  
  const clearErrors = useCallback(() => {
    setListState(prev => ({ ...prev, error: null }));
    setDetailState(prev => ({ ...prev, error: null }));
    setMovimientosState(prev => ({ ...prev, error: null }));
    setAlertasState(prev => ({ ...prev, error: null }));
    setStatsState(prev => ({ ...prev, error: null }));
    setEstadisticasState(prev => ({ ...prev, error: null }));
  }, []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // DATOS CALCULADOS
  // ──────────────────────────────────────────────────────────────────────────
  
  // KPIs para compatibilidad con componentes
  const kpis = useMemo(() => {
    if (statsState.data) {
      return statsState.data;
    }
    
    // Calcular desde la lista si no hay stats
    const productos = listState.data;
    return {
      total: productos.length,
      disponibles: productos.filter(p => p.estado === 'disponible').length,
      bajoStock: productos.filter(p => p.stock_bajo || p.estado === 'bajo_stock').length,
      agotados: productos.filter(p => p.cantidad === 0 || p.estado === 'agotado').length,
      valorTotal: productos.reduce((sum, p) => {
        return sum + ((p.stock_actual || p.cantidad || 0) * (p.costo_unitario || 0));
      }, 0),
    };
  }, [statsState.data, listState.data]);
  
  // Constantes útiles
  const categorias = useMemo(() => inventarioService.getCategorias(), []);
  const zonas = useMemo(() => inventarioService.getZonas(), []);
  const unidadesMedida = useMemo(() => inventarioService.getUnidadesMedida(), []);
  const estados = useMemo(() => inventarioService.getEstados(), []);
  
  // ──────────────────────────────────────────────────────────────────────────
  // AUTO FETCH
  // ──────────────────────────────────────────────────────────────────────────
  
  useEffect(() => {
    if (autoFetch) {
      fetchInventario();
    }
  }, [autoFetch]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (autoFetchAlertas) {
      fetchAlertas();
    }
  }, [autoFetchAlertas]); // eslint-disable-line react-hooks/exhaustive-deps
  
  useEffect(() => {
    if (autoFetchStats) {
      fetchStats();
    }
  }, [autoFetchStats]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // ──────────────────────────────────────────────────────────────────────────
  // RETURN
  // ──────────────────────────────────────────────────────────────────────────
  
  return {
    // ═══════════════════════════════════════════════════════════════════════
    // ESTADO DE LISTA (nombres compatibles con componentes)
    // ═══════════════════════════════════════════════════════════════════════
    productos: listState.data,          // Alias para InventarioList
    inventario: listState.data,         // Nombre original
    pagination: listState.pagination,
    loading: listState.loading,
    error: listState.error,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ESTADO DE DETALLE
    // ═══════════════════════════════════════════════════════════════════════
    currentProducto: detailState.data,  // Alias para ProductoDetail
    item: detailState.data,             // Nombre original
    loadingDetail: detailState.loading,
    errorDetail: detailState.error,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ESTADO DE MOVIMIENTOS
    // ═══════════════════════════════════════════════════════════════════════
    movimientos: movimientosState.data,
    loadingMovimientos: movimientosState.loading,
    errorMovimientos: movimientosState.error,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ESTADO DE ALERTAS
    // ═══════════════════════════════════════════════════════════════════════
    alertas: alertasState.data,
    loadingAlertas: alertasState.loading,
    errorAlertas: alertasState.error,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ESTADO DE STATS/KPIS
    // ═══════════════════════════════════════════════════════════════════════
    stats: statsState.data,
    kpis: kpis,                         // Alias para InventarioList
    loadingStats: statsState.loading,
    errorStats: statsState.error,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ESTADO DE ESTADÍSTICAS (GRÁFICOS)
    // ═══════════════════════════════════════════════════════════════════════
    estadisticas: estadisticasState.data,
    loadingEstadisticas: estadisticasState.loading,
    errorEstadisticas: estadisticasState.error,
    
    // ═══════════════════════════════════════════════════════════════════════
    // UTILIDADES DE ESTADO
    // ═══════════════════════════════════════════════════════════════════════
    isRefreshing,
    filters,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ACCIONES CRUD (nombres compatibles con componentes)
    // ═══════════════════════════════════════════════════════════════════════
    fetchInventario,
    fetchById,                          // Alias para ProductoDetail
    fetchItem: fetchById,               // Nombre alternativo
    createProducto,                     // Alias para InventarioList
    createItem: createProducto,         // Nombre alternativo
    updateProducto,                     // Alias para InventarioList
    updateItem: updateProducto,         // Nombre alternativo
    deleteProducto,                     // Alias para InventarioList
    deleteItem: deleteProducto,         // Nombre alternativo
    
    // ═══════════════════════════════════════════════════════════════════════
    // ACCIONES DE MOVIMIENTOS
    // ═══════════════════════════════════════════════════════════════════════
    registrarMovimiento,                // Alias para componentes
    ajustarCantidad: registrarMovimiento, // Nombre alternativo
    fetchMovimientos,
    fetchEstadisticas,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ACCIONES DE ALERTAS
    // ═══════════════════════════════════════════════════════════════════════
    fetchAlertas,
    atenderAlerta,
    descartarAlerta,
    
    // ═══════════════════════════════════════════════════════════════════════
    // ACCIONES DE STATS
    // ═══════════════════════════════════════════════════════════════════════
    fetchStats,
    
    // ═══════════════════════════════════════════════════════════════════════
    // PAGINACIÓN
    // ═══════════════════════════════════════════════════════════════════════
    goToPage,
    setPageSize,
    
    // ═══════════════════════════════════════════════════════════════════════
    // FILTROS
    // ═══════════════════════════════════════════════════════════════════════
    applyFilters,
    clearFilters,
    search,
    
    // ═══════════════════════════════════════════════════════════════════════
    // UTILIDADES
    // ═══════════════════════════════════════════════════════════════════════
    refresh,
    refreshAlertas,
    clearDetail,
    clearErrors,
    
    // ═══════════════════════════════════════════════════════════════════════
    // CONSTANTES
    // ═══════════════════════════════════════════════════════════════════════
    categorias,
    zonas,
    unidadesMedida,
    estados,
  };
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORT
// ════════════════════════════════════════════════════════════════════════════

export default useInventario;
