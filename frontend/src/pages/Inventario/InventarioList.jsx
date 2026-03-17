/**
 * ============================================================================
 * ISTHO CRM - InventarioList (Versión Corregida)
 * ============================================================================
 * Listado de productos conectado al backend real.
 * 
 * CORRECCIONES:
 * - Usa nombres correctos del hook useInventario
 * - snake_case para campos del backend
 * - Integración completa con API
 * - Corregidos errores de sintaxis en template literals
 * 
 * @author Coordinación TI ISTHO
 * @version 2.1.0
 * @date Enero 2026
 */

import { useState, useEffect } from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Filter,
  Download,
  Upload,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Package,
  PackagePlus,
  PackageMinus,
  AlertTriangle,
  Warehouse,
  RefreshCw,
} from 'lucide-react';

// Layout


// Components
import {
  Button,
  SearchBar,
  FilterDropdown,
  StatusChip,
  Pagination,
  ConfirmDialog,
  KpiCard,
} from '../../components/common';

// Local Components
import ProductoForm from './components/ProductoForm';
import MovimientoForm from './components/MovimientoForm';

// Hooks
import useInventario from '../../hooks/useInventario';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

// ════════════════════════════════════════════════════════════════════════════
// OPCIONES DE FILTROS
// ════════════════════════════════════════════════════════════════════════════

const FILTER_OPTIONS = {
  estado: [
    { value: 'disponible', label: 'Disponible' },
    { value: 'bajo_stock', label: 'Bajo Stock' },
    { value: 'agotado', label: 'Agotado' },
    { value: 'reservado', label: 'Reservado' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Menú de acciones por fila
 */
const RowActions = ({ producto, onView, onEdit, onDelete, onEntrada, onSalida, canEdit, canDelete }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const stockActual = producto.stock_actual || producto.cantidad || 0;
  const esWMS = !!(producto.codigo_wms);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <IconButton
        onClick={handleClick}
        size="small"
        className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 0.5,
            borderRadius: '0.75rem',
            border: '1px solid #f3f4f6',
            minWidth: '180px',
            '& .MuiMenuItem-root': {
              fontSize: '0.875rem',
              color: '#334155',
              padding: '8px 16px',
              gap: '8px',
              '&:hover': {
                backgroundColor: '#f8fafc',
              }
            },
            '& .MuiDivider-root': {
              margin: '4px 0',
            }
          },
        }}
      >
        <MenuItem onClick={() => { onView(producto); handleClose(); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        {canEdit && !esWMS && (
          <MenuItem onClick={() => { onEdit(producto); handleClose(); }}>
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        )}

        {canEdit && !esWMS && (
          <div className="border-t border-gray-100 my-1" />
        )}

        {canEdit && !esWMS && (
          <MenuItem
            onClick={() => { onEntrada(producto); handleClose(); }}
            sx={{ color: '#059669 !important', '&:hover': { backgroundColor: '#ecfdf5 !important' } }}
          >
            <PackagePlus className="w-4 h-4" />
            Registrar Entrada
          </MenuItem>
        )}

        {canEdit && !esWMS && (
          <MenuItem
            onClick={() => { onSalida(producto); handleClose(); }}
            disabled={stockActual === 0}
            sx={{
              color: stockActual === 0 ? '#cbd5e1 !important' : '#2563eb !important',
              '&:hover': { backgroundColor: stockActual === 0 ? 'transparent' : '#eff6ff !important' }
            }}
          >
            <PackageMinus className="w-4 h-4" />
            Registrar Salida
          </MenuItem>
        )}

        {esWMS && canEdit && (
          <MenuItem disabled sx={{ fontSize: '0.75rem !important', color: '#94a3b8 !important' }}>
            Producto gestionado por WMS
          </MenuItem>
        )}

        {canDelete && !esWMS && (
          <div className="border-t border-gray-100 my-1" />
        )}

        {canDelete && !esWMS && (
          <MenuItem
            onClick={() => { onDelete(producto); handleClose(); }}
            sx={{ color: '#dc2626 !important', '&:hover': { backgroundColor: '#fef2f2 !important' } }}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

/**
 * Indicador visual de stock
 */
const StockIndicator = ({ actual, minimo }) => {
  let porcentaje;
  let colorClass;

  if (!actual || actual <= 0) {
    porcentaje = 0;
    colorClass = 'bg-red-500';
  } else if (minimo > 0) {
    porcentaje = Math.min((actual / minimo) * 100, 100);
    colorClass = actual <= minimo ? 'bg-amber-500' : 'bg-emerald-500';
  } else {
    porcentaje = 100;
    colorClass = 'bg-emerald-500';
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${colorClass}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {actual.toLocaleString()}
      </span>
    </div>
  );
};


// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const InventarioList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, hasPermission } = useAuth();
  const { success, error: notifyError, saved, deleted, stockAlert } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // HOOK DE INVENTARIO (nombres correctos)
  // ──────────────────────────────────────────────────────────────────────────
  const {
    // Lista
    productos,
    pagination,
    loading,
    error,
    // KPIs
    kpis,
    // Estado
    isRefreshing,
    // Acciones
    refresh,
    search: hookSearch,
    applyFilters,
    goToPage,
    createProducto,
    updateProducto,
    deleteProducto,
    registrarMovimiento,
    // Stats
    fetchStats,
  } = useInventario({
    autoFetch: true,
    autoFetchStats: true,
    initialFilters: user?.rol === 'cliente' ? { cliente_id: user.cliente_id } : {},
  });

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS LOCALES
  // ──────────────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [formModal, setFormModal] = useState({ isOpen: false, producto: null });
  const [movimientoModal, setMovimientoModal] = useState({ isOpen: false, tipo: 'entrada', producto: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, producto: null });
  const [formLoading, setFormLoading] = useState(false);

  // Permisos dinámicos desde la BD
  const canCreate = hasPermission('inventario', 'crear');
  const canEdit = hasPermission('inventario', 'editar');
  const canDelete = hasPermission('inventario', 'eliminar');
  const canExport = hasPermission('inventario', 'exportar');
  const canImport = hasPermission('inventario', 'importar');

  // ──────────────────────────────────────────────────────────────────────────
  // APLICAR FILTRO DE URL
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const filterParam = searchParams.get('filter');
    if (filterParam === 'alertas') {
      setFilters({ estado: 'bajo_stock' });
      applyFilters({ estado: 'bajo_stock' });
    } else if (filterParam === 'agotados') {
      setFilters({ estado: 'agotado' });
      applyFilters({ estado: 'agotado' });
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // NOTIFICAR ALERTAS AL CARGAR
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (kpis && (kpis.bajoStock + kpis.agotados) > 0 && !loading) {
      stockAlert(kpis.bajoStock + kpis.agotados);
    }
  }, [kpis?.bajoStock, kpis?.agotados]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleSearch = (value) => {
    setSearchTerm(value);
    hookSearch(value);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters };
    if (value) {
      newFilters[key] = value;
    } else {
      delete newFilters[key];
    }
    setFilters(newFilters);
    applyFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    applyFilters({});
    hookSearch('');
  };

  const handleCreate = () => {
    setFormModal({ isOpen: true, producto: null });
  };

  const handleEdit = (producto) => {
    setFormModal({ isOpen: true, producto });
  };

  const handleView = (producto) => {
    navigate(`/inventario/productos/${producto.id}`);
  };

  const handleDelete = (producto) => {
    setDeleteModal({ isOpen: true, producto });
  };

  const handleEntrada = (producto) => {
    setMovimientoModal({ isOpen: true, tipo: 'entrada', producto });
  };

  const handleSalida = (producto) => {
    setMovimientoModal({ isOpen: true, tipo: 'salida', producto });
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);
    try {
      if (formModal.producto) {
        await updateProducto(formModal.producto.id, data);
        saved('Producto');
      } else {
        await createProducto(data);
        saved('Producto');
      }
      setFormModal({ isOpen: false, producto: null });
    } catch (err) {
      notifyError(err.message || 'Error al guardar producto');
    } finally {
      setFormLoading(false);
    }
  };

  const handleMovimientoSubmit = async (data) => {
    setFormLoading(true);
    try {
      await registrarMovimiento(movimientoModal.producto.id, {
        tipo: movimientoModal.tipo,
        cantidad: data.cantidad,
        motivo: data.motivo,
        documento_referencia: data.documento_referencia || data.documento,
        observaciones: data.observaciones,
      });
      success(`Movimiento de ${movimientoModal.tipo} registrado correctamente`);
      setMovimientoModal({ isOpen: false, tipo: 'entrada', producto: null });
    } catch (err) {
      notifyError(err.message || 'Error al registrar movimiento');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);
    try {
      await deleteProducto(deleteModal.producto.id);
      deleted('Producto');
      setDeleteModal({ isOpen: false, producto: null });
    } catch (err) {
      notifyError(err.message || 'Error al eliminar producto');
    } finally {
      setFormLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // FORMATTERS
  // ──────────────────────────────────────────────────────────────────────────

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // OPCIONES DINÁMICAS DE FILTRO (CLIENTES)
  // ──────────────────────────────────────────────────────────────────────────
  const clienteOptions = [...new Map(
    productos
      .filter(p => p.cliente_nombre && p.cliente_id)
      .map(p => [p.cliente_id, { value: String(p.cliente_id), label: p.cliente_nombre }])
  ).values()];

  // ──────────────────────────────────────────────────────────────────────────
  // KPIs PARA DISPLAY
  // ──────────────────────────────────────────────────────────────────────────

  const displayKpis = kpis || {
    total: productos.length,
    disponibles: productos.filter(p => p.estado === 'disponible').length,
    bajoStock: productos.filter(p => p.estado === 'bajo_stock' || p.stock_bajo).length,
    agotados: productos.filter(p => p.cantidad === 0 || p.estado === 'agotado').length,
    valorTotal: productos.reduce((sum, p) => {
      return sum + ((p.stock_actual || p.cantidad || 0) * (p.costo_unitario || 0));
    }, 0),
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">


      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PAGE HEADER */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Inventario</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gestiona el inventario de productos
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={refresh}
              loading={isRefreshing}
              title="Actualizar datos"
            />

            {canExport && (
              <Button variant="outline" icon={Download} size="md">
                Exportar
              </Button>
            )}

            {canImport && (
              <Button variant="outline" icon={Upload} size="md">
                Importar
              </Button>
            )}

            {canCreate && (
              <Button variant="primary" icon={Plus} onClick={handleCreate}>
                Nuevo Producto
              </Button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* KPIs */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Productos"
            value={displayKpis.total}
            icon={Package}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <KpiCard
            title="Disponibles"
            value={displayKpis.disponibles}
            change={displayKpis.total > 0 ? `${Math.round((displayKpis.disponibles / displayKpis.total) * 100)}% del total` : '0%'}
            positive={true}
            icon={Warehouse}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KpiCard
            title="Stock Bajo / Agotado"
            value={displayKpis.bajoStock + displayKpis.agotados}
            change={displayKpis.agotados > 0 ? `${displayKpis.agotados} agotados` : 'Sin agotados'}
            positive={displayKpis.agotados === 0}
            icon={AlertTriangle}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            onClick={() => handleFilterChange('estado', 'bajo_stock')}
            className="cursor-pointer hover:shadow-md transition-shadow"
          />
          <KpiCard
            title="Valor Total"
            value={formatCurrency(displayKpis.valorTotal)}
            icon={Package}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SEARCH & FILTERS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Buscar por nombre, SKU o cliente..."
                value={searchTerm}
                onChange={handleSearch}
                onClear={() => handleSearch('')}
              />
            </div>

            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtros
              {Object.keys(filters).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {Object.keys(filters).length}
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FilterDropdown
                  label="Cliente"
                  options={clienteOptions}
                  value={filters.cliente_id}
                  onChange={(v) => handleFilterChange('cliente_id', v)}
                  placeholder="Todos los clientes"
                />
                <FilterDropdown
                  label="Estado"
                  options={FILTER_OPTIONS.estado}
                  value={filters.estado}
                  onChange={(v) => handleFilterChange('estado', v)}
                  placeholder="Todos los estados"
                />
              </div>

              {Object.keys(filters).length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* RESULTS COUNT */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="mb-4">
          <p className="text-sm text-slate-500">
            {pagination?.total || productos.length} producto{(pagination?.total || productos.length) !== 1 ? 's' : ''} encontrado{(pagination?.total || productos.length) !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Active filter chips */}
        {Object.keys(filters).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              let label = value;
              if (key === 'cliente_id') {
                label = clienteOptions.find(c => c.value === value)?.label || value;
              } else if (key === 'estado') {
                label = FILTER_OPTIONS.estado.find(c => c.value === value)?.label || value;
              }
              return (
                <span key={key} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                  {label}
                  <button onClick={() => handleFilterChange(key, null)} className="hover:text-orange-900 dark:hover:text-orange-100">×</button>
                </span>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TABLE */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-50 animate-pulse">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                  </div>
                  <div className="h-6 w-16 bg-gray-200 rounded-full" />
                </div>
              ))}
            </div>
          ) : productos.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 mb-1">
                No se encontraron productos
              </h3>
              <p className="text-slate-500 mb-4">
                {searchTerm || Object.keys(filters).length > 0
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza agregando tu primer producto'}
              </p>
              {!searchTerm && Object.keys(filters).length === 0 && canCreate && (
                <Button variant="primary" icon={Plus} onClick={handleCreate}>
                  Nuevo Producto
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Stock
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto) => {
                    // Usar snake_case para campos del backend
                    const stockActual = producto.stock_actual || producto.cantidad || 0;
                    const stockMinimo = producto.stock_minimo || 0;
                    const costoUnitario = producto.costo_unitario || 0;

                    return (
                      <tr
                        key={producto.id}
                        className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                              <p
                                className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
                                onClick={() => handleView(producto)}
                              >
                                {producto.nombre || producto.producto}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{producto.codigo || producto.sku}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                          {producto.cliente_nombre || '-'}
                        </td>
                        <td className="py-4 px-4">
                          <StockIndicator
                            actual={stockActual}
                            minimo={stockMinimo}
                          />
                        </td>
                        <td className="py-4 px-4 text-center">
                          <StatusChip status={producto.estado} />
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-800 dark:text-slate-200 text-right font-medium">
                          {formatCurrency(stockActual * costoUnitario)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <RowActions
                            producto={producto}
                            onView={handleView}
                            onEdit={handleEdit}
                            onDelete={handleDelete}
                            onEntrada={handleEntrada}
                            onSalida={handleSalida}
                            canEdit={canEdit}
                            canDelete={canDelete}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!loading && pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={pagination.limit}
              onPageChange={goToPage}
            />
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <ProductoForm
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, producto: null })}
        onSubmit={handleFormSubmit}
        producto={formModal.producto}
        loading={formLoading}
      />

      <MovimientoForm
        isOpen={movimientoModal.isOpen}
        onClose={() => setMovimientoModal({ isOpen: false, tipo: 'entrada', producto: null })}
        onSubmit={handleMovimientoSubmit}
        tipo={movimientoModal.tipo}
        producto={movimientoModal.producto}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, producto: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${deleteModal.producto?.nombre || deleteModal.producto?.producto || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default InventarioList;