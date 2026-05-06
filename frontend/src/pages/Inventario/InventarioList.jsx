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

import { useState, useEffect, useRef } from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Plus,
  Filter,
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
  List,
  LayoutGrid,
  Upload,
  FileDown,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';

// Layout

// Components
import {
  Button,
  Modal,
  SearchBar,
  FilterDropdown,
  StatusChip,
  Pagination,
  ConfirmDialog,
  KpiCard,
} from '../../components/common';

// Service
import inventarioService from '../../api/inventario.service';

// Local Components
import ProductoForm from './components/ProductoForm';
import MovimientoForm from './components/MovimientoForm';

// Hooks
import useInventario from '../../hooks/useInventario';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import apiClient from '../../api/client';
import { CLIENTES_ENDPOINTS } from '../../api/endpoints';
import PageFooter from '@components/common/PageFooter';
import useSort from '@hooks/useSort';
import SortIcon from '@components/common/SortIcon';

// ════════════════════════════════════════════════════════════════════════════
// OPCIONES DE FILTROS
// ════════════════════════════════════════════════════════════════════════════

const FILTER_OPTIONS = {
  estado: [
    { value: 'disponible', label: 'Disponible' },
    { value: 'bajo_stock', label: 'Bajo Stock' },
    { value: 'agotado', label: 'Agotado' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Menú de acciones por fila
 */
const RowActions = ({
  producto,
  onView,
  onEdit,
  onDelete,
  onEntrada,
  onSalida,
  canEdit,
  canDelete,
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const stockActual = producto.stock_actual || producto.cantidad || 0;
  const esWMS = !!producto.codigo_wms;

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
              },
            },
            '& .MuiDivider-root': {
              margin: '4px 0',
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            onView(producto);
            handleClose();
          }}
        >
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        {canEdit && !esWMS && (
          <MenuItem
            onClick={() => {
              onEdit(producto);
              handleClose();
            }}
          >
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        )}

        {canEdit && !esWMS && <div className="border-t border-gray-100 my-1" />}

        {canEdit && !esWMS && (
          <MenuItem
            onClick={() => {
              onEntrada(producto);
              handleClose();
            }}
            sx={{
              color: '#059669 !important',
              '&:hover': { backgroundColor: '#ecfdf5 !important' },
            }}
          >
            <PackagePlus className="w-4 h-4" />
            Registrar Entrada
          </MenuItem>
        )}

        {canEdit && !esWMS && (
          <MenuItem
            onClick={() => {
              onSalida(producto);
              handleClose();
            }}
            disabled={stockActual === 0}
            sx={{
              color: stockActual === 0 ? '#cbd5e1 !important' : '#2563eb !important',
              '&:hover': {
                backgroundColor: stockActual === 0 ? 'transparent' : '#eff6ff !important',
              },
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

        {canDelete && !esWMS && <div className="border-t border-gray-100 my-1" />}

        {canDelete && !esWMS && (
          <MenuItem
            onClick={() => {
              onDelete(producto);
              handleClose();
            }}
            sx={{
              color: '#dc2626 !important',
              '&:hover': { backgroundColor: '#fef2f2 !important' },
            }}
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
      <div className="w-16 sm:w-20 h-2 bg-slate-200 dark:bg-centhrix-surface rounded-full overflow-hidden">
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
    error: _error,
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
    fetchStats: _fetchStats,
  } = useInventario({
    autoFetch: true,
    autoFetchStats: true,
    initialFilters: user?.rol === 'cliente' ? { cliente_id: user.cliente_id } : {},
  });

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS LOCALES
  // ──────────────────────────────────────────────────────────────────────────
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'cards' : 'table');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);

  // Modals
  const [formModal, setFormModal] = useState({ isOpen: false, producto: null });
  const [movimientoModal, setMovimientoModal] = useState({
    isOpen: false,
    tipo: 'entrada',
    producto: null,
  });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, producto: null });
  const [formLoading, setFormLoading] = useState(false);

  // Clientes para filtro
  const [clienteOptions, setClienteOptions] = useState([]);

  useEffect(() => {
    if (user?.rol === 'cliente') return;
    const cargarTodosLosClientes = async () => {
      let todos = [];
      let pagina = 1;
      const porPagina = 100;
      while (true) {
        const data = await apiClient.get(CLIENTES_ENDPOINTS.BASE, {
          params: { limit: porPagina, page: pagina, estado: 'activo' },
        });
        const clientes = data?.clientes || data?.data || [];
        todos = [...todos, ...clientes];
        const total = data?.paginacion?.total ?? data?.total ?? clientes.length;
        if (todos.length >= total || clientes.length < porPagina) break;
        pagina++;
      }
      setClienteOptions(todos.map((c) => ({ value: String(c.id), label: c.razon_social })));
    };
    cargarTodosLosClientes().catch(() => {});
  }, [user?.rol]);

  // Modal de importación
  const [importModal, setImportModal] = useState({ isOpen: false });
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResultados, setImportResultados] = useState(null);
  const [importErroresExpanded, setImportErroresExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Permisos dinámicos desde la BD
  const canCreate = hasPermission('inventario', 'crear');
  const canEdit = hasPermission('inventario', 'editar');
  const canDelete = hasPermission('inventario', 'eliminar');
  const _canExport = hasPermission('inventario', 'exportar');
  const _canImport = hasPermission('inventario', 'importar');

  // ──────────────────────────────────────────────────────────────────────────
  // ORDENAMIENTO
  // ──────────────────────────────────────────────────────────────────────────
  const { sortField, sortDir, handleSort: _handleSort } = useSort('created_at', 'DESC');

  const handleSort = (field) => {
    const newDir = sortField === field ? (sortDir === 'ASC' ? 'DESC' : 'ASC') : 'ASC';
    const newField = sortField === field ? sortField : field;
    _handleSort(field);
    applyFilters({ ...filters, sort: newField, order: newDir });
  };

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
    if (kpis && kpis.bajoStock + kpis.agotados > 0 && !loading) {
      stockAlert(kpis.bajoStock + kpis.agotados);
    }
  }, [kpis?.bajoStock, kpis?.agotados]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const searchTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);

  const handleSearch = (value) => {
    setSearchTerm(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => hookSearch(value), 300);
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
  // HANDLERS DE IMPORTACIÓN
  // ──────────────────────────────────────────────────────────────────────────

  const handleOpenImport = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportResultados(null);
    setImportErroresExpanded(false);
    setImportModal({ isOpen: true });
  };

  const handleCloseImport = () => {
    if (importLoading) return;
    setImportModal({ isOpen: false });
    if (importResultados && (importResultados.creados > 0 || importResultados.actualizados > 0)) {
      refresh();
    }
  };

  const handleImportFileChange = async (file) => {
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      notifyError('Solo se permiten archivos Excel (.xlsx)');
      return;
    }
    setImportFile(file);
    setImportResultados(null);
    setImportPreview(null);
    try {
      const readXlsxFile = (await import('read-excel-file/browser')).default;
      const rawRows = await readXlsxFile(file);
      if (rawRows.length >= 2) {
        const [headers, ...dataRows] = rawRows;
        const rows = dataRows.map((row) =>
          Object.fromEntries(headers.map((h, i) => [String(h ?? ''), row[i] ?? '']))
        );
        setImportPreview(rows.slice(0, 20));
      }
    } catch (_) {
      // Si falla el parse local, el servidor lo validará al importar
    }
  };

  const handleImportDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    handleImportFileChange(file);
  };

  const handleImportSubmit = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', importFile);
      const response = await inventarioService.importarProductos(formData);
      const resultados = response.data || response;
      setImportPreview(null);
      setImportResultados(resultados);
      if (resultados.errores?.length === 0) {
        success(
          `Importación completada: ${resultados.creados} creados, ${resultados.actualizados} actualizados`
        );
      } else {
        notifyError(`Importación con ${resultados.errores.length} error(es). Revisa los detalles.`);
      }
    } catch (err) {
      notifyError(err.message || 'Error al importar productos');
    } finally {
      setImportLoading(false);
    }
  };

  const handleDescargarPlantilla = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
      const token = localStorage.getItem('istho_token');
      await inventarioService.descargarPlantilla(apiBaseUrl, token);
    } catch {
      notifyError('Error al descargar la plantilla de importación');
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
  // KPIs PARA DISPLAY
  // ──────────────────────────────────────────────────────────────────────────

  const displayKpis = kpis || {
    total: productos.length,
    disponibles: productos.filter((p) => p.estado === 'disponible').length,
    bajoStock: productos.filter((p) => p.estado === 'bajo_stock' || p.stock_bajo).length,
    agotados: productos.filter((p) => p.cantidad === 0 || p.estado === 'agotado').length,
    valorTotal: productos.reduce((sum, p) => {
      return sum + (p.stock_actual || p.cantidad || 0) * (p.costo_unitario || 0);
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
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
              Inventario
            </h1>
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

            {canCreate && (
              <Button variant="outline" icon={Upload} onClick={handleOpenImport}>
                <span className="hidden sm:inline">Importar</span>
                <span className="sm:hidden">Imp.</span>
              </Button>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* KPIs */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
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
            change={
              displayKpis.total > 0
                ? `${Math.round((displayKpis.disponibles / displayKpis.total) * 100)}% del total`
                : '0%'
            }
            positive={true}
            icon={Warehouse}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KpiCard
            title="Bajo Stock"
            value={displayKpis.bajoStock}
            change="Stock mínimo alcanzado"
            positive={displayKpis.bajoStock === 0}
            icon={AlertTriangle}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            onClick={() => handleFilterChange('estado', 'bajo_stock')}
            className="cursor-pointer hover:shadow-md transition-shadow"
          />
          <KpiCard
            title="Agotado"
            value={displayKpis.agotados}
            change="Sin unidades disponibles"
            positive={displayKpis.agotados === 0}
            icon={AlertTriangle}
            iconBg="bg-red-100"
            iconColor="text-red-600"
            onClick={() => handleFilterChange('estado', 'agotado')}
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
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
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

            {canCreate && (
              <Button variant="primary" icon={Plus} onClick={handleCreate}>
                <span className="hidden sm:inline">Nuevo Producto</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            )}
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
        {/* RESULTS COUNT + VIEW TOGGLE */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pagination?.total || productos.length} producto
            {(pagination?.total || productos.length) !== 1 ? 's' : ''} encontrado
            {(pagination?.total || productos.length) !== 1 ? 's' : ''}
          </p>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-centhrix-card rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-centhrix-surface shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-centhrix-surface shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Active filter chips */}
        {Object.keys(filters).length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              let label = value;
              if (key === 'cliente_id') {
                label = clienteOptions.find((c) => c.value === value)?.label || value;
              } else if (key === 'estado') {
                label = FILTER_OPTIONS.estado.find((c) => c.value === value)?.label || value;
              }
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300"
                >
                  {label}
                  <button
                    onClick={() => handleFilterChange(key, null)}
                    className="hover:text-orange-900 dark:hover:text-orange-100"
                  >
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TABLE / CARDS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {loading ? (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 py-4 border-b border-gray-50 animate-pulse"
              >
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
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 mb-1">No se encontraron productos</h3>
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
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th
                      onClick={() => handleSort('producto')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Producto{' '}
                        <SortIcon field="producto" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="hidden sm:table-cell text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th
                      onClick={() => handleSort('cantidad')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Stock <SortIcon field="cantidad" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('estado')}
                      className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Estado <SortIcon field="estado" sortField={sortField} sortDir={sortDir} />
                      </span>
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
                    const stockActual = producto.stock_actual || producto.cantidad || 0;
                    const stockMinimo = producto.stock_minimo || 0;
                    const costoUnitario = producto.costo_unitario || 0;

                    return (
                      <tr
                        key={producto.id}
                        className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-centhrix-surface rounded-lg flex items-center justify-center">
                              <Package className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                            </div>
                            <div>
                              <p
                                className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer"
                                onClick={() => handleView(producto)}
                              >
                                {producto.nombre || producto.producto}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {producto.codigo || producto.sku}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                          {producto.cliente_nombre || '-'}
                        </td>
                        <td className="py-4 px-4">
                          <StockIndicator actual={stockActual} minimo={stockMinimo} />
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
        ) : (
          /* CARD VIEW */
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {productos.map((producto) => {
                const stockActual = producto.stock_actual || producto.cantidad || 0;
                const stockMinimo = producto.stock_minimo || 0;
                const costoUnitario = producto.costo_unitario || 0;

                const getStockBadge = () => {
                  if (stockActual <= 0)
                    return {
                      label: 'Agotado',
                      classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                    };
                  if (stockMinimo > 0 && stockActual <= stockMinimo)
                    return {
                      label: 'Bajo stock',
                      classes:
                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                    };
                  return {
                    label: 'Disponible',
                    classes:
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  };
                };
                const stockBadge = getStockBadge();

                return (
                  <div
                    key={producto.id}
                    className="bg-white dark:bg-centhrix-card/50 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition p-5 cursor-pointer relative group"
                    onClick={() => handleView(producto)}
                  >
                    {/* Actions menu */}
                    <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
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
                    </div>

                    {/* Icon + Name */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-centhrix-surface rounded-xl flex items-center justify-center shrink-0">
                        <Package className="w-6 h-6 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                          {producto.nombre || producto.producto}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                          {producto.codigo || producto.sku}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Cliente</span>
                        <span className="text-slate-700 dark:text-slate-200 truncate ml-2">
                          {producto.cliente_nombre || '-'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Stock</span>
                        <span className="text-slate-800 dark:text-slate-100 font-semibold">
                          {stockActual.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Footer: Estado badge */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${stockBadge.classes}`}
                      >
                        {stockBadge.label}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        {formatCurrency(stockActual * costoUnitario)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!loading && pagination && pagination.totalPages > 1 && (
              <div className="mt-4 bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  itemsPerPage={pagination.limit}
                  onPageChange={goToPage}
                />
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <PageFooter />
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

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DE IMPORTACIÓN MASIVA */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={importModal.isOpen}
        onClose={handleCloseImport}
        title="Importar Productos"
        subtitle="Carga masiva desde archivo Excel (.xlsx)"
        size="lg"
      >
        <div className="space-y-5">
          {/* Paso 1 — Descargar plantilla */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-centhrix-card/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                  Plantilla de importación
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Descarga el formato correcto con columnas y ejemplos
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={FileDown} onClick={handleDescargarPlantilla}>
              Descargar
            </Button>
          </div>

          {/* Paso 2 — Dropzone (sin preview ni resultado) */}
          {!importPreview && !importResultados && (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Selecciona el archivo Excel
              </p>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                  ${
                    isDragOver
                      ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10'
                      : importFile
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                        : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10'
                  }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleImportDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={(e) => handleImportFileChange(e.target.files[0])}
                />
                {importFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      {importFile.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {(importFile.size / 1024).toFixed(1)} KB · Haz clic para cambiar el archivo
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                      Arrastra y suelta el archivo aquí
                    </p>
                    <p className="text-xs text-slate-400">
                      o haz clic para seleccionarlo · Solo .xlsx
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paso 2b — Vista previa */}
          {importPreview && !importResultados && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Vista previa —{' '}
                  {importPreview.length >= 20
                    ? 'primeros 20 registros'
                    : `${importPreview.length} registros`}
                  <span className="ml-2 text-xs font-normal text-slate-400">
                    ({importFile?.name})
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setImportPreview(null);
                    setImportFile(null);
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline underline-offset-2"
                >
                  Cambiar archivo
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 dark:bg-centhrix-card">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">
                        #
                      </th>
                      {Object.keys(importPreview[0] || {})
                        .slice(0, 8)
                        .map((key) => (
                          <th
                            key={key}
                            className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap"
                          >
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, idx) => (
                      <tr
                        key={idx}
                        className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-card/30"
                      >
                        <td className="py-2 px-3 text-slate-400 text-xs">{idx + 1}</td>
                        {Object.values(row)
                          .slice(0, 8)
                          .map((val, i) => (
                            <td
                              key={i}
                              className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[180px] truncate text-xs"
                            >
                              {val != null && val !== '' ? (
                                String(val)
                              ) : (
                                <span className="text-slate-300 dark:text-slate-600">—</span>
                              )}
                            </td>
                          ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Paso 3 — Resultados */}
          {importResultados && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Resultado de la importación
              </p>

              {/* Resumen KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    {importResultados.creados}
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Creados</p>
                </div>
                <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {importResultados.actualizados}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Actualizados</p>
                </div>
                <div
                  className={`rounded-xl p-3 border text-center ${importResultados.errores?.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-slate-50 dark:bg-centhrix-card border-slate-200 dark:border-slate-700'}`}
                >
                  <p
                    className={`text-2xl font-bold ${importResultados.errores?.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}
                  >
                    {importResultados.errores?.length || 0}
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${importResultados.errores?.length > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-500'}`}
                  >
                    Errores
                  </p>
                </div>
              </div>

              {/* Lista de errores colapsable */}
              {importResultados.errores?.length > 0 && (
                <div className="rounded-xl border border-red-200 dark:border-red-800 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                    onClick={() => setImportErroresExpanded(!importErroresExpanded)}
                  >
                    <span className="flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Ver {importResultados.errores.length} error(es)
                    </span>
                    {importErroresExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                  {importErroresExpanded && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30">
                      {importResultados.errores.map((err, idx) => (
                        <div
                          key={idx}
                          className="px-4 py-2 flex items-start gap-3 bg-white dark:bg-centhrix-card"
                        >
                          <span className="text-xs text-slate-400 shrink-0 mt-0.5">
                            Fila {err.fila}
                          </span>
                          {err.sku && (
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400 shrink-0 mt-0.5">
                              {err.sku}
                            </span>
                          )}
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {err.mensaje}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Opción de reimportar */}
              <button
                type="button"
                onClick={() => {
                  setImportResultados(null);
                  setImportFile(null);
                }}
                className="text-xs text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 underline underline-offset-2"
              >
                Importar otro archivo
              </button>
            </div>
          )}

          {/* Footer del modal */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button variant="ghost" onClick={handleCloseImport} disabled={importLoading}>
              {importResultados ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!importResultados && (
              <Button
                variant="primary"
                icon={importLoading ? Loader2 : Upload}
                onClick={handleImportSubmit}
                disabled={!importFile || importLoading}
                loading={importLoading}
              >
                {importLoading
                  ? 'Importando...'
                  : importPreview
                    ? `Confirmar importación (${importPreview.length} registros)`
                    : 'Importar'}
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default InventarioList;
