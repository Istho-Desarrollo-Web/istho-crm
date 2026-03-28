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
  Building2,
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
} from '../../components/common';

// Local Components
import ClienteForm from './components/ClienteForm';

// Hooks
import useClientes from '../../hooks/useClientes';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';

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
  const open = Boolean(anchorEl);
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };

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
            minWidth: '160px',
            '& .MuiMenuItem-root': {
              fontSize: '0.875rem',
              color: '#334155',
              padding: '8px 16px',
              gap: '8px',
              '&:hover': {
                backgroundColor: '#f8fafc',
              }
            },
          },
        }}
      >
        <MenuItem onClick={() => { onView(cliente); handleClose(); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        <ProtectedAction module="clientes" action="editar">
          <MenuItem onClick={() => { onEdit(cliente); handleClose(); }}>
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        </ProtectedAction>

        <ProtectedAction module="clientes" action="cambiar_estado">
          <MenuItem 
            onClick={() => { onChangeStatus(cliente); handleClose(); }}
            sx={{ color: '#d97706 !important', '&:hover': { backgroundColor: '#fffbeb !important' } }}
          >
            <RefreshCw className="w-4 h-4" />
            Cambiar Estado
          </MenuItem>
        </ProtectedAction>

        <ProtectedAction module="clientes" action="eliminar">
          <MenuItem 
            onClick={() => { onDelete(cliente); handleClose(); }}
            sx={{ color: '#dc2626 !important', '&:hover': { backgroundColor: '#fef2f2 !important' } }}
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
  const { user } = useAuth();

  // ──────────────────────────────────────────────────────────────────────────
  // HOOKS
  // ──────────────────────────────────────────────────────────────────────────
  const { success: notifySuccess, apiError, saved, deleted, error: notifyError } = useNotification();
  const importInputRef = useRef(null);
  const [importPreview, setImportPreview] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);

  const handleExport = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    window.open(`${baseUrl}/reportes/clientes/excel?token=${token}`, '_blank');
  };

  const handleImportSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const XLSX = (await import('xlsx')).default;
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

      if (rows.length === 0) {
        notifyError('El archivo no contiene datos');
        return;
      }

      setImportFile(file);
      setImportPreview(rows.slice(0, 50)); // Max 50 filas en preview
    } catch (err) {
      notifyError('Error al leer el archivo. Verifique que sea un Excel válido.');
    }
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
        notifySuccess(`Importación completada: ${data.data.creados} creados, ${data.data.actualizados} actualizados${data.data.errores?.length ? `, ${data.data.errores.length} errores` : ''}`);
        fetchClientes();
        setImportPreview(null);
        setImportFile(null);
      } else {
        notifyError(data.message || 'Error al importar');
      }
    } catch (err) {
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
  // ESTADOS LOCALES
  // ──────────────────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    tipo_cliente: searchParams.get('tipo_cliente') || '',
    sector: searchParams.get('sector') || '',
    estado: searchParams.get('estado') || '',
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">


      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Clientes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Gestiona la información de tus clientes
            </p>
          </div>

          <div className="flex items-center gap-3">
            <ProtectedAction module="clientes" action="exportar">
              <Button variant="outline" icon={Download} size="md" onClick={handleExport}>
                Exportar
              </Button>
            </ProtectedAction>

            <ProtectedAction module="clientes" action="importar">
              <Button variant="outline" icon={Upload} size="md" onClick={() => importInputRef.current?.click()}>
                Importar
              </Button>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleImportSelect}
              />
            </ProtectedAction>

            <ProtectedAction module="clientes" action="crear">
              <Button variant="primary" icon={Plus} onClick={handleCreate}>
                Nuevo Cliente
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
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
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

            <Button
              variant="outline"
              icon={RefreshCw}
              onClick={refresh}
              loading={loading}
            >
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
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

        {/* RESULTS COUNT */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pagination.total} cliente{pagination.total !== 1 && 's'} encontrado{pagination.total !== 1 && 's'}
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-4">
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
            <div className="py-16 text-center">
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
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      NIT
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Ciudad
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Estado
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
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
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
          )}

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

        {/* FOOTER */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
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
          loading={formLoading}
          customContent={
            <div className="space-y-2 mt-4">
              {FILTER_OPTIONS.estado.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleConfirmStatusChange(opt.value)}
                  disabled={statusModal.cliente?.estado === opt.value}
                  className={`
                    w-full p-3 text-left rounded-xl border transition-colors
                    ${statusModal.cliente?.estado === opt.value
                      ? 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-400 cursor-not-allowed'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20'
                    }
                  `}
                >
                  {opt.label}
                  {statusModal.cliente?.estado === opt.value && (
                    <span className="text-xs ml-2">(actual)</span>
                  )}
                </button>
              ))}
            </div>
          }
          hideConfirmButton
        />
      )}

      {/* MODAL VISTA PREVIA IMPORTACIÓN */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-[#1A1B3A] rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Vista Previa de Importación</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {importPreview.length} registros encontrados{importPreview.length >= 50 ? ' (mostrando primeros 50)' : ''} — {importFile?.name}
                </p>
              </div>
              <button
                onClick={() => { setImportPreview(null); setImportFile(null); }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 py-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/50">
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
                    <tr key={idx} className="border-t border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="py-2 px-3 text-slate-400 text-xs">{idx + 1}</td>
                      {Object.values(row).slice(0, 8).map((val, i) => (
                        <td key={i} className="py-2 px-3 text-slate-700 dark:text-slate-300 whitespace-nowrap max-w-[200px] truncate">
                          {val != null ? String(val) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 rounded-b-2xl">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Columnas esperadas: NIT, Razón Social, Tipo, Sector, Dirección, Ciudad, Teléfono, Email
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setImportPreview(null); setImportFile(null); }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImportConfirm}
                  disabled={importLoading}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-[#E74C3C] hover:bg-[#C0392B] rounded-xl transition-colors disabled:opacity-50"
                >
                  {importLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Confirmar Importación ({importPreview.length} registros)
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientesList;