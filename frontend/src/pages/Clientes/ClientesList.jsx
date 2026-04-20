/**
 * ============================================================================
 * ISTHO CRM - ClientesList
 * ============================================================================
 * Lista de clientes conectada al backend real.
 * 
 * ACTUALIZADO: Filtros alineados con ENUMs del modelo Cliente
 * 
 * @author Coordinación TI ISTHO
 * @version 2.1.0
 * @date Enero 2026
 */

import { useState, useRef } from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import {
  Plus,
  Filter,
  Download,
  Upload,
  FileDown,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Building2,
  RefreshCw,
  List,
  LayoutGrid,
  CheckCircle,
  Loader2,
  XCircle,
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
  Modal,
} from '../../components/common';

// Local Components
import ClienteForm from './components/ClienteForm';
import PageFooter from '@components/common/PageFooter';

// Hooks
import useClientes from '../../hooks/useClientes';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';
import useSort from '@hooks/useSort';
import SortIcon from '@components/common/SortIcon';
import { descargarArchivo, fechaDescarga } from '../../utils/descargas';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE FILTROS (Alineados con modelo Cliente del Backend)
// ════════════════════════════════════════════════════════════════════════════

const FILTER_OPTIONS = {
  // Tipos según ENUM del modelo Cliente
  tipo_cliente: [
    { value: 'corporativo', label: 'Corporativo' },
    { value: 'pyme', label: 'PyME' },
    { value: 'persona_natural', label: 'Persona Natural' },
  ],
  // Sectores disponibles
  sector: [
    { value: 'alimentos', label: 'Alimentos y Bebidas' },
    { value: 'construccion', label: 'Construcción' },
    { value: 'manufactura', label: 'Manufactura' },
    { value: 'retail', label: 'Retail' },
    { value: 'farmaceutico', label: 'Farmacéutico' },
    { value: 'quimico', label: 'Químico' },
    { value: 'textil', label: 'Textil' },
    { value: 'tecnologia', label: 'Tecnología' },
    { value: 'servicios', label: 'Servicios' },
  ],
  // Estados según ENUM del modelo Cliente
  estado: [
    { value: 'activo', label: 'Activo' },
    { value: 'inactivo', label: 'Inactivo' },
    { value: 'suspendido', label: 'Suspendido' },
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Formatear tipo de cliente
// ════════════════════════════════════════════════════════════════════════════

const formatTipoCliente = (tipo) => {
  const tipos = {
    corporativo: 'Corporativo',
    pyme: 'PyME',
    persona_natural: 'Persona Natural',
  };
  return tipos[tipo] || tipo || '-';
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE ROW ACTIONS
// ════════════════════════════════════════════════════════════════════════════

const RowActions = ({ cliente, onView, onEdit, onDelete, onChangeStatus }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { isDark } = useThemeContext();
  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} size="small">
        <MoreVertical className="w-4 h-4 text-slate-400" />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          elevation: 0,
          sx: {
            overflow: 'visible',
            filter: isDark ? 'drop-shadow(0px 2px 8px rgba(0,0,0,0.4))' : 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 0.5,
            borderRadius: '0.75rem',
            border: isDark ? '1px solid #334155' : '1px solid #f3f4f6',
            backgroundColor: isDark ? '#0F1023' : '#ffffff',
            minWidth: '170px',
            '& .MuiMenuItem-root': {
              fontSize: '0.875rem',
              color: isDark ? '#e2e8f0' : '#334155',
              padding: '8px 16px',
              gap: '8px',
              '&:hover': { backgroundColor: isDark ? '#334155' : '#f8fafc' },
            },
          },
        }}
      >
        <MenuItem onClick={() => { onView(cliente); setAnchorEl(null); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        <ProtectedAction module="clientes" action="editar">
          <MenuItem onClick={() => { onEdit(cliente); setAnchorEl(null); }}>
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        </ProtectedAction>

        <ProtectedAction module="clientes" action="cambiar_estado">
          <MenuItem
            onClick={() => { onChangeStatus(cliente); setAnchorEl(null); }}
            sx={{ color: '#d97706 !important', '&:hover': { backgroundColor: isDark ? '#451a03 !important' : '#fffbeb !important' } }}
          >
            <RefreshCw className="w-4 h-4" />
            Cambiar Estado
          </MenuItem>
        </ProtectedAction>

        <ProtectedAction module="clientes" action="eliminar">
          <MenuItem
            onClick={() => { onDelete(cliente); setAnchorEl(null); }}
            sx={{ color: '#dc2626 !important', '&:hover': { backgroundColor: isDark ? '#451a1a !important' : '#fef2f2 !important' } }}
          >
            <Trash2 className="w-4 h-4" />
            Eliminar
          </MenuItem>
        </ProtectedAction>
      </Menu>
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ClientesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user: _user, user } = useAuth();

  // Portal cliente → redirigir directamente a su empresa
  if (user?.rol === 'cliente' && user?.cliente_id) {
    return <Navigate to={`/clientes/${user.cliente_id}`} replace />;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // HOOKS
  // ──────────────────────────────────────────────────────────────────────────
  const { success: notifySuccess, apiError, saved, deleted, error: notifyError } = useNotification();
  const fileInputRef = useRef(null);
  const [importModal, setImportModal] = useState({ isOpen: false });
  const [importFile, setImportFile] = useState(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResultados, setImportResultados] = useState(null);
  const [importErroresExpanded, setImportErroresExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleExport = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      await descargarArchivo(`${baseUrl}/reportes/clientes/excel`, `clientes-${fechaDescarga()}.xlsx`);
    } catch {
      notifyError('Error al exportar la lista de clientes');
    }
  };

  const handleDownloadPlantilla = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      await descargarArchivo(`${baseUrl}/clientes/plantilla-importacion`, 'plantilla-importacion.xlsx');
    } catch {
      notifyError('Error al descargar la plantilla de importación');
    }
  };

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
      fetchClientes();
    }
  };

  const handleImportFileChange = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      notifyError('Solo se permiten archivos Excel (.xlsx, .xls) o CSV');
      return;
    }
    setImportFile(file);
    setImportResultados(null);
    setImportPreview(null);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
      if (rows.length === 0) { notifyError('El archivo no contiene datos'); return; }
      setImportPreview(rows.slice(0, 20));
    } catch (_err) {
      // El servidor validará si falla el parse local
    }
  };

  const handleImportDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleImportFileChange(e.dataTransfer.files[0]);
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;
    setImportLoading(true);
    const formData = new FormData();
    formData.append('archivo', importFile);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const token = localStorage.getItem('istho_token');
      const res = await fetch(`${baseUrl}/clientes/importar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        const { creados, actualizados, errores } = data.data;
        setImportPreview(null);
        setImportFile(null);
        setImportResultados({ creados, actualizados, errores: errores || [] });
      } else {
        notifyError(data.message || 'Error al importar');
      }
    } catch (_err) {
      notifyError('Error al importar archivo');
    } finally {
      setImportLoading(false);
    }
  };

  const {
    clientes,
    pagination,
    loading,
    error,
    fetchClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    changeStatus,
    goToPage,
    applyFilters,
    clearFilters,
    search,
    refresh,
  } = useClientes({
    autoFetch: true,
    initialFilters: {
      estado: searchParams.get('estado') || undefined,
      sector: searchParams.get('sector') || undefined,
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // ORDENAMIENTO
  // ──────────────────────────────────────────────────────────────────────────
  const { sortField, sortDir, handleSort: _handleSort } = useSort('created_at', 'DESC');
  const handleSort = (field) => {
    const newDir = sortField === field ? (sortDir === 'ASC' ? 'DESC' : 'ASC') : 'ASC';
    const newField = sortField === field ? sortField : field;
    _handleSort(field);
    applyFilters({ sort: newField, order: newDir });
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS LOCALES
  // ──────────────────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipo_cliente: searchParams.get('tipo_cliente') || '',
    sector: searchParams.get('sector') || '',
    estado: searchParams.get('estado') || '',
  });
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');

  // Modales
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'cards' : 'table');
  const [formModal, setFormModal] = useState({ isOpen: false, cliente: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, cliente: null });
  const [statusModal, setStatusModal] = useState({ isOpen: false, cliente: null });
  const [formLoading, setFormLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS DE BÚSQUEDA Y FILTROS
  // ──────────────────────────────────────────────────────────────────────────

  const handleSearch = (value) => {
    setSearchTerm(value);
    search(value);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value || undefined };
    setFilters(newFilters);
    applyFilters(newFilters);

    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params);
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchTerm('');
    clearFilters();
    setSearchParams({});
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setFormModal({ isOpen: true, cliente: null });
  };

  const handleEdit = (cliente) => {
    setFormModal({ isOpen: true, cliente });
  };

  const handleView = (cliente) => {
    navigate(`/clientes/${cliente.id}`);
  };

  const handleDelete = (cliente) => {
    setDeleteModal({ isOpen: true, cliente });
  };

  const handleChangeStatus = (cliente) => {
    setStatusModal({ isOpen: true, cliente });
  };

  const handleFormSubmit = async (data) => {
    setFormLoading(true);
    try {
      if (formModal.cliente) {
        await updateCliente(formModal.cliente.id, data);
        saved('Cliente');
      } else {
        await createCliente(data);
        saved('Cliente');
      }
      setFormModal({ isOpen: false, cliente: null });
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);
    try {
      await deleteCliente(deleteModal.cliente.id);
      deleted('Cliente');
      setDeleteModal({ isOpen: false, cliente: null });
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmStatusChange = async (nuevoEstado) => {
    setFormLoading(true);
    try {
      await changeStatus(statusModal.cliente.id, nuevoEstado);
      notifySuccess(`Estado cambiado a ${nuevoEstado}`);
      setStatusModal({ isOpen: false, cliente: null });
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">


      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">Clientes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gestiona la información de tus clientes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={() => fetchClientes()}
              title="Actualizar datos"
            />

            <ProtectedAction module="clientes" action="exportar">
              <Button variant="outline" icon={Download} size="md" onClick={handleExport} title="Exportar">
                <span className="hidden sm:inline">Exportar</span>
              </Button>
            </ProtectedAction>

            <ProtectedAction module="clientes" action="importar">
              <Button variant="outline" icon={Upload} size="md" onClick={handleOpenImport} title="Importar">
                <span className="hidden sm:inline">Importar</span>
              </Button>
            </ProtectedAction>

          </div>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            <p className="font-medium">Error al cargar clientes</p>
            <p className="text-sm">{error}</p>
            <button
              onClick={refresh}
              className="mt-2 text-sm underline hover:no-underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* SEARCH & FILTERS BAR */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Buscar por nombre, NIT o ciudad..."
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
              {Object.values(filters).filter(Boolean).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {Object.values(filters).filter(Boolean).length}
                </span>
              )}
            </Button>

            <ProtectedAction module="clientes" action="crear">
              <Button variant="primary" icon={Plus} onClick={handleCreate}>
                <span className="hidden sm:inline">Nuevo Cliente</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </ProtectedAction>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FilterDropdown
                  label="Tipo de Cliente"
                  options={FILTER_OPTIONS.tipo_cliente}
                  value={filters.tipo_cliente}
                  onChange={(v) => handleFilterChange('tipo_cliente', v)}
                  placeholder="Todos los tipos"
                />
                <FilterDropdown
                  label="Sector"
                  options={FILTER_OPTIONS.sector}
                  value={filters.sector}
                  onChange={(v) => handleFilterChange('sector', v)}
                  placeholder="Todos los sectores"
                />
                <FilterDropdown
                  label="Estado"
                  options={FILTER_OPTIONS.estado}
                  value={filters.estado}
                  onChange={(v) => handleFilterChange('estado', v)}
                  placeholder="Todos los estados"
                />
              </div>

              {Object.values(filters).filter(Boolean).length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                    Limpiar filtros
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RESULTS COUNT + VIEW TOGGLE */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pagination.total} cliente{pagination.total !== 1 && 's'} encontrado{pagination.total !== 1 && 's'}
          </p>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-centhrix-card rounded-lg p-1">
            <button onClick={() => setViewMode('table')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-centhrix-surface shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('cards')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-centhrix-surface shadow-sm text-slate-800 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABLE / CARDS */}
        {loading ? (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b border-gray-50 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : clientes.length === 0 ? (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
              No se encontraron clientes
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {searchTerm || Object.values(filters).filter(Boolean).length > 0
                ? 'Intenta ajustar los filtros de búsqueda'
                : 'Comienza agregando tu primer cliente'}
            </p>
            {!searchTerm && Object.values(filters).filter(Boolean).length === 0 && (
              <ProtectedAction module="clientes" action="crear">
                <Button variant="primary" icon={Plus} onClick={handleCreate}>
                  Nuevo Cliente
                </Button>
              </ProtectedAction>
            )}
          </div>
        ) : viewMode === 'table' ? (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th
                      onClick={() => handleSort('razon_social')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Cliente <SortIcon field="razon_social" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      NIT
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th
                      onClick={() => handleSort('ciudad')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Ciudad <SortIcon field="ciudad" sortField={sortField} sortDir={sortDir} />
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
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr
                      key={cliente.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-orange-600" />
                          </div>
                          <div>
                            <p
                              className="text-sm font-medium text-slate-800 dark:text-slate-100 hover:text-orange-600 cursor-pointer"
                              onClick={() => handleView(cliente)}
                            >
                              {cliente.razon_social}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {cliente.codigo_cliente} • {cliente.email || 'Sin email'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300 font-mono">
                        {cliente.nit}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                        {formatTipoCliente(cliente.tipo_cliente)}
                      </td>
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                        {cliente.ciudad || '-'}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <StatusChip status={cliente.estado} />
                      </td>
                      <td className="py-4 px-4  text-center">
                        <RowActions
                          cliente={cliente}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onChangeStatus={handleChangeStatus}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!loading && pagination.totalPages > 1 && (
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
              {clientes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="bg-white dark:bg-centhrix-card/50 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-md transition p-5 cursor-pointer relative group"
                  onClick={() => handleView(cliente)}
                >
                  {/* Actions menu */}
                  <div className="absolute top-3 right-3" onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      cliente={cliente}
                      onView={handleView}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onChangeStatus={handleChangeStatus}
                    />
                  </div>

                  {/* Icon + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center shrink-0">
                      <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                        {cliente.razon_social}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {cliente.codigo_cliente}
                      </p>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">NIT</span>
                      <span className="text-slate-700 dark:text-slate-200 font-mono text-xs">{cliente.nit}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Ciudad</span>
                      <span className="text-slate-700 dark:text-slate-200">{cliente.ciudad || '-'}</span>
                    </div>
                  </div>

                  {/* Footer: Estado */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <StatusChip status={cliente.estado} />
                    <span className="text-xs text-slate-400">{formatTipoCliente(cliente.tipo_cliente)}</span>
                  </div>
                </div>
              ))}
            </div>

            {!loading && pagination.totalPages > 1 && (
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

        {/* FOOTER */}
        <PageFooter />
      </main>

      {/* MODALS */}
      <ClienteForm
        isOpen={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, cliente: null })}
        onSubmit={handleFormSubmit}
        cliente={formModal.cliente}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, cliente: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Cliente"
        message={`¿Estás seguro de eliminar a "${deleteModal.cliente?.razon_social}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />

      {statusModal.isOpen && (
        <ConfirmDialog
          isOpen={statusModal.isOpen}
          onClose={() => setStatusModal({ isOpen: false, cliente: null })}
          title="Cambiar Estado"
          message={`Selecciona el nuevo estado para "${statusModal.cliente?.razon_social}"`}
          type="warning"
          loading={formLoading}
          customContent={
            <div className="space-y-2">
              {FILTER_OPTIONS.estado.map(opt => {
                const isActual = statusModal.cliente?.estado === opt.value;
                const colores = {
                  activo: { active: 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' },
                  inactivo: { active: 'border-slate-400 bg-slate-50 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300', badge: 'bg-slate-100 dark:bg-centhrix-surface text-slate-500 dark:text-slate-400' },
                  suspendido: { active: 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', badge: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' },
                };
                const c = colores[opt.value] || colores.inactivo;
                return (
                  <button
                    key={opt.value}
                    onClick={() => !isActual && handleConfirmStatusChange(opt.value)}
                    disabled={isActual || formLoading}
                    className={`
                      w-full p-3 flex items-center justify-between rounded-xl border-2 transition-all text-sm font-medium
                      ${isActual
                        ? `${c.active} cursor-not-allowed opacity-80`
                        : 'bg-white dark:bg-centhrix-card border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer'
                      }
                    `}
                  >
                    <span>{opt.label}</span>
                    {isActual && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${c.badge}`}>Estado actual</span>
                    )}
                  </button>
                );
              })}
            </div>
          }
          hideConfirmButton
        />
      )}

      {/* MODAL IMPORTACIÓN CLIENTES */}
      <Modal
        isOpen={importModal.isOpen}
        onClose={handleCloseImport}
        title="Importar Clientes"
        subtitle="Carga masiva desde archivo Excel (.xlsx)"
        size="lg"
      >
        <div className="space-y-5">

          {/* Plantilla */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-centhrix-card/60 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <FileDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Plantilla de importación</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Descarga el formato correcto con columnas y ejemplos</p>
              </div>
            </div>
            <Button variant="outline" size="sm" icon={FileDown} onClick={handleDownloadPlantilla}>
              Descargar
            </Button>
          </div>

          {/* Dropzone */}
          {!importPreview && !importResultados && (
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Selecciona el archivo Excel
              </p>
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                  ${isDragOver
                    ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/10'
                    : importFile
                      ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/10'
                      : 'border-slate-300 dark:border-slate-600 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/10'
                  }`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleImportDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleImportFileChange(e.target.files[0])}
                />
                {importFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{importFile.name}</p>
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
                    <p className="text-xs text-slate-400">o haz clic para seleccionarlo · .xlsx, .xls, .csv</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Vista previa */}
          {importPreview && !importResultados && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Vista previa — {importPreview.length >= 20 ? 'primeros 20 registros' : `${importPreview.length} registros`}
                  <span className="ml-2 text-xs font-normal text-slate-400">({importFile?.name})</span>
                </p>
                <button
                  type="button"
                  onClick={() => { setImportPreview(null); setImportFile(null); }}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline underline-offset-2"
                >
                  Cambiar archivo
                </button>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-auto max-h-64">
                <table className="w-full text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-slate-50 dark:bg-centhrix-card">
                      <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase">#</th>
                      {Object.keys(importPreview[0] || {}).slice(0, 8).map((key) => (
                        <th key={key} className="text-left py-2 px-3 text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">
                          {key}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, idx) => (
                      <tr key={idx} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-card/30">
                        <td className="py-2 px-3 text-slate-400 text-xs">{idx + 1}</td>
                        {Object.values(row).slice(0, 8).map((val, i) => (
                          <td key={i} className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[180px] truncate text-xs">
                            {val != null && val !== '' ? String(val) : <span className="text-slate-300 dark:text-slate-600">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Resultados */}
          {importResultados && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Resultado de la importación</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{importResultados.creados}</p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">Creados</p>
                </div>
                <div className="rounded-xl p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-center">
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{importResultados.actualizados}</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">Actualizados</p>
                </div>
                <div className={`rounded-xl p-3 border text-center ${importResultados.errores?.length > 0 ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700' : 'bg-slate-50 dark:bg-centhrix-card border-slate-200 dark:border-slate-700'}`}>
                  <p className={`text-2xl font-bold ${importResultados.errores?.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                    {importResultados.errores?.length || 0}
                  </p>
                  <p className={`text-xs mt-0.5 ${importResultados.errores?.length > 0 ? 'text-red-700 dark:text-red-300' : 'text-slate-500'}`}>
                    Errores
                  </p>
                </div>
              </div>
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
                    {importErroresExpanded ? '▲' : '▼'}
                  </button>
                  {importErroresExpanded && (
                    <div className="max-h-48 overflow-y-auto divide-y divide-red-100 dark:divide-red-900/30">
                      {importResultados.errores.map((err, idx) => (
                        <div key={idx} className="px-4 py-2 flex items-start gap-3 bg-white dark:bg-centhrix-card">
                          <span className="text-xs text-slate-400 shrink-0 mt-0.5 font-mono">F{err.fila}</span>
                          {err.nit && <span className="text-xs font-mono text-slate-500 shrink-0 mt-0.5">{err.nit}</span>}
                          <span className="text-xs text-red-600 dark:text-red-400">{err.error}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <button
                type="button"
                onClick={() => { setImportResultados(null); setImportFile(null); }}
                className="text-xs text-slate-500 hover:text-orange-600 dark:text-slate-400 dark:hover:text-orange-400 underline underline-offset-2"
              >
                Importar otro archivo
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
            <Button variant="ghost" onClick={handleCloseImport} disabled={importLoading}>
              {importResultados ? 'Cerrar' : 'Cancelar'}
            </Button>
            {!importResultados && (
              <Button
                variant="primary"
                icon={importLoading ? Loader2 : Upload}
                onClick={handleImportConfirm}
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

export default ClientesList;