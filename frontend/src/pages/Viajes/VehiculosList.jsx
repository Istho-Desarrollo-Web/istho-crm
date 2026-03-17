/**
 * ============================================================================
 * ISTHO CRM - VehiculosList
 * ============================================================================
 * Lista de vehículos conectada al backend real.
 * Incluye alertas de vencimiento de SOAT y Tecnicomecánica.
 * Diseño alineado con EntradasList (auditorías).
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import { useThemeContext } from '../../context/ThemeContext';
import {
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Truck,
  AlertTriangle,
  Search,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Wrench,
  ShieldAlert,
  User,
  Loader2,
} from 'lucide-react';

// Components
import { Pagination, ConfirmDialog } from '../../components/common';
import { ProtectedAction } from '../../components/auth/PrivateRoute';

// Local Components
import VehiculoForm from './components/VehiculoForm';

// Hooks
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

// Services
import { vehiculosService } from '../../api/viajes.service';

// Utils
import { exportToCsv } from '../../utils/exportCsv';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const formatTipoVehiculo = (tipo) => {
  const tipos = {
    sencillo: 'Sencillo',
    tractomula: 'Tractomula',
    turbo: 'Turbo',
    dobletroque: 'Doble Troque',
    minimula: 'Minimula',
    otro: 'Otro',
  };
  return tipos[tipo] || tipo || '-';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Calcula el estado de vencimiento de un documento.
 * @returns 'vencido' | 'por_vencer' | 'vigente' | null
 */
const getVencimientoStatus = (fechaVencimiento) => {
  if (!fechaVencimiento) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const vencimiento = new Date(fechaVencimiento);
  vencimiento.setHours(0, 0, 0, 0);

  const diffMs = vencimiento - hoy;
  const diffDias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDias < 0) return { status: 'vencido', dias: Math.abs(diffDias) };
  if (diffDias <= 30) return { status: 'por_vencer', dias: diffDias };
  return { status: 'vigente', dias: diffDias };
};

// ════════════════════════════════════════════════════════════════════════════
// VENCIMIENTO BADGE
// ════════════════════════════════════════════════════════════════════════════

const VencimientoBadge = ({ fecha }) => {
  const result = getVencimientoStatus(fecha);
  if (!result) return <span className="text-sm text-slate-400 dark:text-slate-500">-</span>;

  const { status, dias } = result;

  const config = {
    vencido: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-700 dark:text-red-400',
      label: `Vencido hace ${dias}d`,
    },
    por_vencer: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-400',
      label: `Vence en ${dias}d`,
    },
    vigente: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-400',
      label: `${dias}d restantes`,
    },
  };

  const c = config[status];

  return (
    <div className={`inline-flex flex-col items-center gap-0.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className="flex items-center gap-1">
        {status !== 'vigente' && <AlertTriangle className="w-3 h-3" />}
        {formatDate(fecha)}
      </span>
      <span className="text-[10px] opacity-70">{c.label}</span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE
// ════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ estado }) => {
  const config = {
    activo: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      text: 'text-emerald-700 dark:text-emerald-300',
      label: 'Activo',
      icon: CheckCircle2,
    },
    mantenimiento: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      text: 'text-amber-700 dark:text-amber-300',
      label: 'Mantenimiento',
      icon: Wrench,
    },
    inactivo: {
      bg: 'bg-slate-100 dark:bg-slate-700/50',
      text: 'text-slate-600 dark:text-slate-400',
      label: 'Inactivo',
      icon: null,
    },
  };

  const c = config[estado] || config.inactivo;
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {c.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// KPI MINI
// ════════════════════════════════════════════════════════════════════════════

const KpiMini = ({ icon: Icon, label, value, color }) => (
  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color} transition-all hover:scale-[1.02]`}>
    <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTIONS
// ════════════════════════════════════════════════════════════════════════════

const RowActions = ({ vehiculo, onView, onEdit, onDelete }) => {
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
            backgroundColor: isDark ? '#1e293b' : '#ffffff',
            minWidth: '160px',
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
        <MenuItem onClick={() => { onView(vehiculo); setAnchorEl(null); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        <ProtectedAction module="vehiculos" action="editar">
          <MenuItem onClick={() => { onEdit(vehiculo); setAnchorEl(null); }}>
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        </ProtectedAction>

        <ProtectedAction module="vehiculos" action="eliminar">
          <MenuItem
            onClick={() => { onDelete(vehiculo); setAnchorEl(null); }}
            sx={{
              color: isDark ? '#f87171 !important' : '#dc2626 !important',
              '&:hover': { backgroundColor: isDark ? '#450a0a !important' : '#fef2f2 !important' },
            }}
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

const PAGE_SIZE = 20;

const VehiculosList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { success, apiError, saved, deleted } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────
  const [vehiculos, setVehiculos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');

  // Modales
  const [formModal, setFormModal] = useState({ isOpen: false, vehiculo: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, vehiculo: null });
  const [formLoading, setFormLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH
  // ──────────────────────────────────────────────────────────────────────────

  const fetchVehiculos = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: PAGE_SIZE,
        ...(searchTerm && { search: searchTerm }),
        ...(estadoFilter !== 'todos' && { estado: estadoFilter }),
      };
      const response = await vehiculosService.getAll(params);
      setVehiculos(response.data || []);
      if (response.pagination) {
        setPagination({
          page: response.pagination.page || page,
          totalPages: response.pagination.totalPages || 1,
          total: response.pagination.total || 0,
        });
      }
    } catch (err) {
      setVehiculos([]);
      setError('No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, estadoFilter]);

  useEffect(() => {
    fetchVehiculos(1);
  }, [fetchVehiculos]);

  const handlePageChange = (page) => {
    fetchVehiculos(page);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // KPIs
  // ──────────────────────────────────────────────────────────────────────────

  const totalActivos = vehiculos.filter((v) => v.estado === 'activo').length;
  const totalMantenimiento = vehiculos.filter((v) => v.estado === 'mantenimiento').length;
  const totalVencidos = vehiculos.filter((v) => {
    const soat = getVencimientoStatus(v.vencimiento_soat);
    const tecno = getVencimientoStatus(v.vencimiento_tecnicomecanica);
    return (soat && soat.status === 'vencido') || (tecno && tecno.status === 'vencido');
  }).length;

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setFormModal({ isOpen: true, vehiculo: null });
  };

  const handleEdit = (vehiculo) => {
    setFormModal({ isOpen: true, vehiculo });
  };

  const handleView = (vehiculo) => {
    setFormModal({ isOpen: true, vehiculo });
  };

  const handleDelete = (vehiculo) => {
    setDeleteModal({ isOpen: true, vehiculo });
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);
    try {
      await vehiculosService.delete(deleteModal.vehiculo.id);
      deleted('Vehículo');
      setDeleteModal({ isOpen: false, vehiculo: null });
      fetchVehiculos(pagination.page);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ──────────────────────────────────────────────────────────────────────────

  const handleExportCsv = () => {
    exportToCsv(vehiculos, [
      { key: 'placa', label: 'Placa' },
      { key: 'tipo_vehiculo', label: 'Tipo Vehículo' },
      { key: 'capacidad_ton', label: 'Capacidad (Ton)' },
      { key: 'estado', label: 'Estado' },
      { key: 'vencimiento_soat', label: 'Venc. SOAT' },
      { key: 'vencimiento_tecnicomecanica', label: 'Venc. Tecnicomecánica' },
    ], 'vehiculos');
  };

  const handleExportExcel = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (estadoFilter !== 'todos') params.set('estado', estadoFilter);
    if (searchTerm) params.set('search', searchTerm);
    window.open(`${baseUrl}/viajes/vehiculos/excel?${params.toString()}`, '_blank');
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">

        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
              <Truck className="w-7 h-7 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Vehículos</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">Gestiona la flota de vehículos para despachos y viajes</p>
            </div>
          </div>
          {vehiculos.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
            </div>
          )}
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiMini
            icon={CheckCircle2}
            label="Activos"
            value={totalActivos}
            color="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
          />
          <KpiMini
            icon={Wrench}
            label="En Mantenimiento"
            value={totalMantenimiento}
            color="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
          />
          <KpiMini
            icon={ShieldAlert}
            label="SOAT/Tecnicomecánica Vencidos"
            value={totalVencidos}
            color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
          />
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            <button onClick={() => fetchVehiculos(1)} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">Reintentar</button>
          </div>
        )}

        {/* FILTERS BAR */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por placa..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
            </div>

            {/* Estado Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'activo', label: 'Activos' },
                { key: 'mantenimiento', label: 'Mantenimiento' },
                { key: 'inactivo', label: 'Inactivos' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setEstadoFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    estadoFilter === tab.key
                      ? 'bg-white dark:bg-slate-700 text-orange-600 dark:text-orange-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Nuevo Vehículo */}
            <ProtectedAction module="vehiculos" action="crear">
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Nuevo Vehículo
              </button>
            </ProtectedAction>
          </div>
        </div>

        {/* RESULTS COUNT */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {pagination.total} vehículo{pagination.total !== 1 && 's'} encontrado{pagination.total !== 1 && 's'}
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Cargando vehículos...</p>
            </div>
          ) : vehiculos.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Truck className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
                No se encontraron vehículos
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm || estadoFilter !== 'todos'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza agregando tu primer vehículo'}
              </p>
              {!searchTerm && estadoFilter === 'todos' && (
                <ProtectedAction module="vehiculos" action="crear">
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Vehículo
                  </button>
                </ProtectedAction>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Placa
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Conductor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Capacidad
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      SOAT
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tecnicomecánica
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Acciones */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {vehiculos.map((vehiculo) => (
                    <tr
                      key={vehiculo.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                      onClick={() => handleView(vehiculo)}
                    >
                      {/* Placa */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Truck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors font-mono">
                              {vehiculo.placa}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {formatTipoVehiculo(vehiculo.tipo_vehiculo)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Conductor */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                            {vehiculo.conductor?.nombre_completo || vehiculo.conductor?.username || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Capacidad */}
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-slate-600 dark:text-slate-300">
                          {vehiculo.capacidad_ton != null ? `${vehiculo.capacidad_ton} Ton` : '-'}
                        </span>
                      </td>

                      {/* SOAT */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <VencimientoBadge fecha={vehiculo.vencimiento_soat} />
                      </td>

                      {/* Tecnicomecánica */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <VencimientoBadge fecha={vehiculo.vencimiento_tecnicomecanica} />
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4 text-center">
                        <StatusBadge estado={vehiculo.estado} />
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActions
                          vehiculo={vehiculo}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
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
              itemsPerPage={PAGE_SIZE}
              onPageChange={handlePageChange}
            />
          )}
        </div>

        {/* FOOTER */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          &copy; 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>

      {/* MODALS */}
      <VehiculoForm
        open={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, vehiculo: null })}
        onSuccess={() => {
          setFormModal({ isOpen: false, vehiculo: null });
          fetchVehiculos(pagination.page);
        }}
        vehiculoId={formModal.vehiculo?.id}
        readOnly={user?.rol === 'conductor'}
      />

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, vehiculo: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Vehículo"
        message={`¿Estás seguro de eliminar el vehículo "${deleteModal.vehiculo?.placa}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default VehiculosList;
