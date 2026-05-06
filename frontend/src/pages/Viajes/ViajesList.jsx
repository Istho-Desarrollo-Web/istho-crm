/**
 * ============================================================================
 * ISTHO CRM - ViajesList
 * ============================================================================
 * Lista de viajes con registro y seguimiento.
 * Estados: Activo → Completado | Anulado
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import { viajesService } from '../../api/viajes.service';
import { formatDateShort } from '../../utils/formatDate';
import { descargarArchivo, fechaDescarga } from '../../utils/descargas';
import useNotification from '../../hooks/useNotification';
import useSort from '@hooks/useSort';
import SortIcon from '@components/common/SortIcon';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';
import {
  MapPin,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Truck,
  Building2,
  CheckCircle2,
  XCircle,
  Check,
  X,
  FileSpreadsheet,
  LayoutGrid,
  LayoutList,
  RefreshCw,
} from 'lucide-react';
import { Pagination, ConfirmDialog, DatePicker } from '../../components/common';
import PageFooter from '@components/common/PageFooter';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ESTADOS
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_CONFIG = {
  activo: {
    label: 'Activo',
    icon: MapPin,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    darkBg: 'dark:bg-blue-900/20',
    darkText: 'dark:text-blue-300',
    darkBorder: 'dark:border-blue-800',
  },
  completado: {
    label: 'Completado',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    darkBg: 'dark:bg-emerald-900/20',
    darkText: 'dark:text-emerald-300',
    darkBorder: 'dark:border-emerald-800',
  },
  anulado: {
    label: 'Anulado',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    dot: 'bg-red-500',
    darkBg: 'dark:bg-red-900/20',
    darkText: 'dark:text-red-300',
    darkBorder: 'dark:border-red-800',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Formatear fecha DD/MM/YYYY
// ════════════════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ estado }) => {
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.activo;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTIONS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const RowActions = ({ viaje, onView, onEdit, onDelete, onCompletar, onAnular }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { isDark } = useThemeContext();
  const open = Boolean(anchorEl);
  const esActivo = viaje.estado === 'activo';

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
            filter: isDark
              ? 'drop-shadow(0px 2px 8px rgba(0,0,0,0.4))'
              : 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
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
        <MenuItem
          onClick={() => {
            onView(viaje);
            setAnchorEl(null);
          }}
        >
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        <ProtectedAction module="viajes" action="editar">
          <MenuItem
            onClick={() => {
              onEdit(viaje);
              setAnchorEl(null);
            }}
          >
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        </ProtectedAction>

        {esActivo && (
          <ProtectedAction module="viajes" action="editar">
            <MenuItem
              onClick={() => {
                onCompletar(viaje);
                setAnchorEl(null);
              }}
              sx={{
                color: '#059669 !important',
                '&:hover': {
                  backgroundColor: isDark ? '#052e16 !important' : '#f0fdf4 !important',
                },
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Completar
            </MenuItem>
          </ProtectedAction>
        )}

        {esActivo && (
          <ProtectedAction module="viajes" action="editar">
            <MenuItem
              onClick={() => {
                onAnular(viaje);
                setAnchorEl(null);
              }}
              sx={{
                color: '#d97706 !important',
                '&:hover': {
                  backgroundColor: isDark ? '#451a03 !important' : '#fffbeb !important',
                },
              }}
            >
              <XCircle className="w-4 h-4" />
              Anular
            </MenuItem>
          </ProtectedAction>
        )}

        <ProtectedAction module="viajes" action="eliminar">
          <MenuItem
            onClick={() => {
              onDelete(viaje);
              setAnchorEl(null);
            }}
            sx={{
              color: '#dc2626 !important',
              '&:hover': { backgroundColor: isDark ? '#451a1a !important' : '#fef2f2 !important' },
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
// KPI CARDS
// ════════════════════════════════════════════════════════════════════════════

const KpiMini = ({ icon: Icon, label, value, color }) => (
  <div
    className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${color} transition-all hover:scale-[1.02]`}
  >
    <div className="p-2 rounded-lg bg-white/80 dark:bg-centhrix-card/80">
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-70">{label}</p>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

const ViajesList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user: _user } = useAuth();
  const { success, error: notifyError, apiError, deleted } = useNotification();
  const socket = useSocket();

  const { sortField, sortDir, handleSort } = useSort('created_at', 'DESC');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const [viajes, setViajes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'cards' : 'table');
  const [error, setError] = useState(null);

  // Modales
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, viaje: null });
  const [completarModal, setCompletarModal] = useState({ isOpen: false, viaje: null });
  const [anularModal, setAnularModal] = useState({ isOpen: false, viaje: null });
  const [formLoading, setFormLoading] = useState(false);

  // Cargar datos desde API
  const fetchViajes = useCallback(
    async (page = 1, silencioso = false) => {
      if (!silencioso) setLoading(true);
      setError(null);
      try {
        const params = { page, limit: PAGE_SIZE, sort: sortField, order: sortDir };
        if (estadoFilter !== 'todos') params.estado = estadoFilter;
        if (searchTerm) params.search = searchTerm;
        if (fechaDesde) params.fecha_desde = fechaDesde;
        if (fechaHasta) params.fecha_hasta = fechaHasta;

        const response = await viajesService.getAll(params);
        setViajes(Array.isArray(response.data) ? response.data : []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } catch {
        if (!silencioso) {
          setViajes([]);
          setError(
            'No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.'
          );
        }
      } finally {
        if (!silencioso) setLoading(false);
      }
    },
    [estadoFilter, searchTerm, fechaDesde, fechaHasta, sortField, sortDir]
  );

  useEffect(() => {
    fetchViajes(1);
  }, [fetchViajes]);

  // Tiempo real: escuchar eventos de socket
  useEffect(() => {
    if (!socket?.on) return;

    const handleCreado = () => {
      fetchViajes(1, true);
    };

    const handleActualizado = (data) => {
      setViajes((prev) => prev.map((v) => (v.id === data.id ? { ...v, ...data } : v)));
    };

    const handleEliminado = (data) => {
      setViajes((prev) => prev.filter((v) => v.id !== data.id));
    };

    socket.on('viaje:creado', handleCreado);
    socket.on('viaje:actualizado', handleActualizado);
    socket.on('viaje:eliminado', handleEliminado);

    return () => {
      socket.off('viaje:creado', handleCreado);
      socket.off('viaje:actualizado', handleActualizado);
      socket.off('viaje:eliminado', handleEliminado);
    };
  }, [socket, fetchViajes]);

  const handlePageChange = (page) => {
    fetchViajes(page);
  };

  // KPIs
  const totalActivos = viajes.filter((v) => v.estado === 'activo').length;
  const totalCompletados = viajes.filter((v) => v.estado === 'completado').length;
  const totalAnulados = viajes.filter((v) => v.estado === 'anulado').length;

  // Handlers CRUD
  const handleView = (viaje) => {
    navigate(`/viajes/viajes/${viaje.id}`);
  };

  const handleEdit = (viaje) => {
    navigate(`/viajes/viajes/${viaje.id}/editar`);
  };

  const handleDelete = (viaje) => {
    setDeleteModal({ isOpen: true, viaje });
  };

  const handleCompletar = (viaje) => {
    setCompletarModal({ isOpen: true, viaje });
  };

  const handleConfirmCompletar = async () => {
    setFormLoading(true);
    try {
      await viajesService.completar(completarModal.viaje.id);
      success(`Viaje ${completarModal.viaje.numero} completado`);
      setCompletarModal({ isOpen: false, viaje: null });
      setViajes((prev) =>
        prev.map((v) => (v.id === completarModal.viaje.id ? { ...v, estado: 'completado' } : v))
      );
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAnular = (viaje) => {
    setAnularModal({ isOpen: true, viaje });
  };

  const handleConfirmAnular = async () => {
    setFormLoading(true);
    try {
      await viajesService.anular(anularModal.viaje.id);
      success(`Viaje ${anularModal.viaje.numero} anulado`);
      setAnularModal({ isOpen: false, viaje: null });
      setViajes((prev) =>
        prev.map((v) => (v.id === anularModal.viaje.id ? { ...v, estado: 'anulado' } : v))
      );
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);
    try {
      await viajesService.delete(deleteModal.viaje.id);
      deleted('Viaje');
      setDeleteModal({ isOpen: false, viaje: null });
      fetchViajes(pagination.page);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // EXPORT
  // ──────────────────────────────────────────────────────────────────────────

  const handleExportExcel = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const params = new URLSearchParams();
      if (estadoFilter !== 'todos') params.set('estado', estadoFilter);
      const query = params.toString() ? `?${params.toString()}` : '';
      await descargarArchivo(
        `${baseUrl}/reportes/viajes/excel${query}`,
        `viajes-${fechaDescarga()}.xlsx`
      );
    } catch {
      notifyError('Error al exportar el reporte de viajes');
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
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <MapPin className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
                Viajes
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Registro y seguimiento de viajes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón Refrescar */}
            <button
              onClick={() => {
                fetchViajes(pagination.page);
                success('Datos actualizados');
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-centhrix-surface transition-colors"
              title="Refrescar datos"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Actualizar</span>
            </button>
            {viajes.length > 0 && (
              <>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-centhrix-surface transition-colors"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiMini
            icon={MapPin}
            label="Activos"
            value={totalActivos}
            color="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
          />
          <KpiMini
            icon={CheckCircle2}
            label="Completados"
            value={totalCompletados}
            color="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
          />
          <KpiMini
            icon={XCircle}
            label="Anulados"
            value={totalAnulados}
            color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
          />
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            <button
              onClick={() => fetchViajes(1)}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* FILTERS BAR */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por número, destino, cliente o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-centhrix-bg border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Estado Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-centhrix-bg p-1 rounded-xl overflow-x-auto flex-nowrap whitespace-nowrap">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'activo', label: 'Activos' },
                { key: 'completado', label: 'Completados' },
                { key: 'anulado', label: 'Anulados' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setEstadoFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    estadoFilter === tab.key
                      ? 'bg-white dark:bg-centhrix-surface text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex-1 min-w-0">
                <DatePicker
                  value={fechaDesde}
                  onChange={(v) => setFechaDesde(v)}
                  placeholder="Fecha desde"
                />
              </div>
              <span className="text-slate-400 dark:text-slate-500 text-sm shrink-0">—</span>
              <div className="flex-1 min-w-0">
                <DatePicker
                  value={fechaHasta}
                  onChange={(v) => setFechaHasta(v)}
                  placeholder="Fecha hasta"
                />
              </div>
            </div>

            {/* Botón crear */}
            <ProtectedAction module="viajes" action="crear">
              <button
                onClick={() => navigate('/viajes/viajes/nuevo')}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#E74C3C] hover:bg-[#C0392B] rounded-xl shadow-sm transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Nuevo Viaje
              </button>
            </ProtectedAction>
          </div>
        </div>

        {/* RESULTS COUNT + VIEW TOGGLE */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {viajes.length} viaje{viajes.length !== 1 && 's'} encontrado{viajes.length !== 1 && 's'}
          </p>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-centhrix-card p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-centhrix-surface text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista tabla"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-centhrix-surface text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Cargando viajes...</p>
            </div>
          ) : viajes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-centhrix-surface rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
                No se encontraron viajes
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {searchTerm
                  ? 'Intenta ajustar el término de búsqueda'
                  : 'No hay viajes registrados'}
              </p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th
                      onClick={() => handleSort('numero')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Número <SortIcon field="numero" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('destino')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Ruta <SortIcon field="destino" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('cliente_nombre')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Cliente{' '}
                        <SortIcon field="cliente_nombre" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                      Vehículo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                      Conductor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Facturado
                    </th>
                    <th
                      onClick={() => handleSort('estado')}
                      className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                    >
                      <span className="inline-flex items-center justify-center gap-1">
                        Estado <SortIcon field="estado" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Acciones */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {viajes.map((viaje) => (
                    <tr
                      key={viaje.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors cursor-pointer group"
                      onClick={() => handleView(viaje)}
                    >
                      {/* Número */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {viaje.numero}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {formatDateShort(viaje.fecha)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Ruta */}
                      <td className="py-4 px-4">
                        <p className="text-sm text-slate-700 dark:text-slate-200">
                          {viaje.origen || '-'} → {viaje.destino || '-'}
                        </p>
                      </td>

                      {/* Cliente */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div>
                            <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px] block">
                              {viaje.cliente_nombre || viaje.Cliente?.razon_social || '-'}
                            </span>
                            <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              {viaje.documento_cliente || viaje.Cliente?.nit || ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Vehículo */}
                      <td className="py-4 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200">
                            {viaje.vehiculo?.placa || viaje.Vehiculo?.placa || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Conductor */}
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {viaje.conductor?.nombre_completo || viaje.conductor?.username || '-'}
                        </span>
                      </td>

                      {/* Facturado */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        {viaje.facturado ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                            <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-centhrix-surface">
                            <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          </span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4 text-center">
                        <StatusBadge estado={viaje.estado} />
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActions
                          viaje={viaje}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onCompletar={handleCompletar}
                          onAnular={handleAnular}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {viajes.map((viaje) => (
                <div
                  key={viaje.id}
                  onClick={() => handleView(viaje)}
                  className="bg-white dark:bg-centhrix-card rounded-xl border border-gray-100 dark:border-slate-700 p-4 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-800 transition-all cursor-pointer"
                >
                  {/* Header: número + estado + acciones */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                          {viaje.numero}
                        </p>
                        <p className="text-xs text-slate-400">{formatDateShort(viaje.fecha)}</p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActions
                        viaje={viaje}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                      />
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Ruta</span>
                      <span className="text-slate-700 dark:text-slate-200 truncate max-w-[180px] text-right">
                        {viaje.origen || '-'} → {viaje.destino || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Cliente</span>
                      <span className="text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                        {viaje.cliente_nombre || viaje.Cliente?.razon_social || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Vehículo</span>
                      <span className="text-slate-700 dark:text-slate-200">
                        {viaje.vehiculo?.placa || viaje.Vehiculo?.placa || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Conductor</span>
                      <span className="text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                        {viaje.conductor?.nombre_completo || viaje.conductor?.username || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Facturado</span>
                      {viaje.facturado ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 dark:bg-centhrix-surface">
                          <X className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Footer: estado */}
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <StatusBadge estado={viaje.estado} />
                  </div>
                </div>
              ))}
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
        <PageFooter />
      </main>

      {/* MODALS */}
      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, viaje: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Viaje"
        message={`¿Estás seguro de eliminar el viaje "${deleteModal.viaje?.numero}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={completarModal.isOpen}
        onClose={() => setCompletarModal({ isOpen: false, viaje: null })}
        onConfirm={handleConfirmCompletar}
        title="Completar Viaje"
        message={`¿Confirmas que el viaje "${completarModal.viaje?.numero}" (${completarModal.viaje?.origen} → ${completarModal.viaje?.destino}) ha sido completado?`}
        confirmText="Completar"
        type="success"
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={anularModal.isOpen}
        onClose={() => setAnularModal({ isOpen: false, viaje: null })}
        onConfirm={handleConfirmAnular}
        title="Anular Viaje"
        message={`¿Estás seguro de anular el viaje "${anularModal.viaje?.numero}"? Esta acción cambiará su estado a anulado.`}
        confirmText="Anular"
        type="warning"
        loading={formLoading}
      />
    </div>
  );
};

export default ViajesList;
