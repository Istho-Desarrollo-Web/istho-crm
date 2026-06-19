/**
 * ============================================================================
 * ISTHO CRM - SalidasList (Auditoría de Despachos)
 * ============================================================================
 * Lista de salidas/despachos de inventario provenientes del WMS.
 * Flujo: Pendiente → En Proceso → Cerrado
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import useSort from '@hooks/useSort';
import SortIcon from '@components/common/SortIcon';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import { useThemeContext } from '../../../context/ThemeContext';
import { useAuth } from '../../../context/AuthContext';
import useNotification from '../../../hooks/useNotification';
import auditoriasService from '../../../api/auditorias.service';
import { descargarArchivo, fechaDescarga } from '../../../utils/descargas';
import {
  Eye,
  Search,
  FileSpreadsheet,
  MoreVertical,
  Clock,
  Loader2,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
  ArrowUpCircle,
  Truck,
  List,
  LayoutGrid,
  Filter,
  X,
  ChevronDown,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react';
import clientesService from '../../../api/clientes.service';
import { Pagination, FilterDropdown, DatePicker } from '../../../components/common';
import { formatDate } from '../../../utils/formatDate';
import PageFooter from '@components/common/PageFooter';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ESTADOS
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    darkBg: 'dark:bg-amber-900/20',
    darkText: 'dark:text-amber-300',
  },
  en_proceso: {
    label: 'En Proceso',
    icon: Loader2,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    darkBg: 'dark:bg-blue-900/20',
    darkText: 'dark:text-blue-300',
  },
  cerrado: {
    label: 'Cerrado',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    darkBg: 'dark:bg-emerald-900/20',
    darkText: 'dark:text-emerald-300',
  },
  anulado: {
    label: 'Anulado',
    icon: XCircle,
    bg: 'bg-red-50',
    text: 'text-red-700',
    darkBg: 'dark:bg-red-900/20',
    darkText: 'dark:text-red-300',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ estado }) => {
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}
    >
      <Icon className={`w-3.5 h-3.5 ${estado === 'en_proceso' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// PROGRESS BAR COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const ProgressBar = ({ verified, total }) => {
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  const color =
    pct === 100
      ? 'bg-emerald-500'
      : pct > 0
        ? 'bg-blue-500'
        : 'bg-slate-300 dark:bg-centhrix-surface';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-centhrix-surface rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
        {verified}/{total}
      </span>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTIONS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const RowActions = ({ salida, onView, onAnular }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { isDark } = useThemeContext();
  const { user } = useAuth();
  const esPortal = user?.rol === 'cliente';
  const esAdmin = user?.rol === 'admin';
  const puedeAnular = esAdmin && ['pendiente', 'en_proceso'].includes(salida.estado);
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
            filter: isDark
              ? 'drop-shadow(0px 2px 8px rgba(0,0,0,0.4))'
              : 'drop-shadow(0px 2px 8px rgba(0,0,0,0.1))',
            mt: 0.5,
            borderRadius: '0.75rem',
            border: isDark ? '1px solid #334155' : '1px solid #f3f4f6',
            backgroundColor: isDark ? '#0F1023' : '#ffffff',
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
        <MenuItem
          onClick={() => {
            onView(salida);
            setAnchorEl(null);
          }}
        >
          <Eye className="w-4 h-4" />
          {salida.estado === 'pendiente' && !esPortal ? 'Iniciar Operación' : 'Ver Operación'}
        </MenuItem>
        {puedeAnular && <Divider sx={{ my: 0.5 }} />}
        {puedeAnular && (
          <MenuItem
            onClick={() => {
              onAnular(salida);
              setAnchorEl(null);
            }}
            sx={{ color: '#dc2626 !important', '&:hover': { backgroundColor: 'rgba(220,38,38,0.08) !important' } }}
          >
            <Trash2 className="w-4 h-4" />
            Anular operación
          </MenuItem>
        )}
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

const SalidasList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const esPortal = user?.rol === 'cliente';
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const searchTimerRef = useRef(null);
  useEffect(() => () => clearTimeout(searchTimerRef.current), []);
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearchTerm(value), 300);
  };
  const [estadoFilter, setEstadoFilter] = useState(searchParams.get('estado') || 'todos');
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'cards' : 'table');
  const [loading, setLoading] = useState(true);
  const [salidas, setSalidas] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState(null);
  const { sortField, sortDir, handleSort } = useSort('created_at', 'DESC');
  const [showFiltros, setShowFiltros] = useState(
    !!(searchParams.get('fecha_desde') || searchParams.get('fecha_hasta') || searchParams.get('cliente_id'))
  );
  const [filtrosDraft, setFiltrosDraft] = useState({
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    cliente_id: searchParams.get('cliente_id') || '',
  });
  const [filtros, setFiltros] = useState({
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    cliente_id: searchParams.get('cliente_id') || '',
  });
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  useEffect(() => {
    if (!esPortal) {
      setLoadingClientes(true);
      clientesService
        .getAll({ limit: 100, estado: 'activo' })
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : res?.data?.rows || [];
          setClientes(list);
        })
        .catch(() => setClientes([]))
        .finally(() => setLoadingClientes(false));
    }
  }, [esPortal]);

  const fetchSalidas = useCallback(
    async (page = 1) => {
      setLoading(true);
      setError(null);
      try {
        const params = { page, limit: PAGE_SIZE, sort: sortField, order: sortDir };
        if (estadoFilter !== 'todos') params.estado = estadoFilter;
        if (searchTerm) params.search = searchTerm;
        if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
        if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
        if (filtros.cliente_id) params.cliente_id = filtros.cliente_id;

        const response = await auditoriasService.getSalidas(params);
        if (response.success && response.data) {
          setSalidas(Array.isArray(response.data) ? response.data : response.data.salidas || []);
          if (response.pagination) setPagination(response.pagination);
        } else {
          setSalidas([]);
        }
      } catch {
        setSalidas([]);
        setError(
          'No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.'
        );
      } finally {
        setLoading(false);
      }
    },
    [estadoFilter, searchTerm, sortField, sortDir, filtros]
  );

  useEffect(() => {
    fetchSalidas(1);
  }, [fetchSalidas]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm) next.set('search', searchTerm);
    if (estadoFilter !== 'todos') next.set('estado', estadoFilter);
    if (filtros.fecha_desde) next.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) next.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.cliente_id) next.set('cliente_id', filtros.cliente_id);
    setSearchParams(next, { replace: true });
  }, [searchTerm, estadoFilter, filtros, setSearchParams]);

  const handlePageChange = (page) => fetchSalidas(page);

  const activeFiltrosCount = [filtros.fecha_desde, filtros.fecha_hasta, filtros.cliente_id].filter(Boolean).length;

  const aplicarFiltros = () => setFiltros({ ...filtrosDraft });

  const limpiarFiltros = () => {
    const empty = { fecha_desde: '', fecha_hasta: '', cliente_id: '' };
    setFiltrosDraft(empty);
    setFiltros(empty);
  };

  const filtered = salidas;

  // KPIs
  const totalPendientes = salidas.filter((s) => s.estado === 'pendiente').length;
  const totalEnProceso = salidas.filter((s) => s.estado === 'en_proceso').length;
  const totalCerradas = salidas.filter((s) => s.estado === 'cerrado').length;

  const handleView = (salida) => {
    navigate(`/operaciones/salidas/${salida.id}`);
  };

  const notify = useNotification();

  const [anularModal, setAnularModal] = useState({ open: false, operacion: null });
  const [motivoAnular, setMotivoAnular] = useState('');
  const [anulando, setAnulando] = useState(false);

  const handleAnular = (salida) => {
    setAnularModal({ open: true, operacion: salida });
    setMotivoAnular('');
  };

  const confirmarAnular = async () => {
    if (!anularModal.operacion) return;
    setAnulando(true);
    try {
      await auditoriasService.anularOperacion(anularModal.operacion.id, motivoAnular);
      notify.success('Operación anulada exitosamente');
      setAnularModal({ open: false, operacion: null });
      fetchSalidas(pagination.page);
    } catch (err) {
      notify.error(err.message || 'Error al anular la operación');
    } finally {
      setAnulando(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const params = new URLSearchParams();
      if (estadoFilter !== 'todos') params.set('estado', estadoFilter);
      if (searchTerm) params.set('search', searchTerm);
      if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
      if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
      if (filtros.cliente_id) params.set('cliente_id', filtros.cliente_id);
      const url = `${baseUrl}/auditorias/salidas/excel?${params.toString()}`;
      await descargarArchivo(url, `salidas-inventario-${fechaDescarga()}.xlsx`);
      notify.success('Archivo descargado correctamente');
    } catch (error) {
      notify.error('Error al exportar el archivo');
      console.error('Export error:', error);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-[1700px] mx-auto">
        {/* PAGE HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <ArrowUpCircle className="w-7 h-7 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
                Salidas de Inventario
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                Gestión de despachos desde el WMS
              </p>
            </div>
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-centhrix-surface transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            </div>
          )}
        </div>

        {/* KPI CARDS */}
        <div id="tour-salidas-kpis" className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <KpiMini
            icon={Clock}
            label="Pendientes"
            value={totalPendientes}
            color="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
          />
          <KpiMini
            icon={Loader2}
            label="En Proceso"
            value={totalEnProceso}
            color="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
          />
          <KpiMini
            icon={CheckCircle2}
            label="Cerradas"
            value={totalCerradas}
            color="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
          />
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            <button
              onClick={fetchSalidas}
              className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* FILTERS BAR */}
        <div id="tour-salidas-filtros" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por documento, picking o cliente..."
                value={searchInput}
                onChange={handleSearchChange}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-centhrix-bg border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Estado Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-centhrix-bg p-1 rounded-xl">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'pendiente', label: 'Pendientes' },
                { key: 'en_proceso', label: 'En Proceso' },
                { key: 'cerrado', label: 'Cerrados' },
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

            {/* Botón Filtros */}
            <button
              onClick={() => setShowFiltros((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors shrink-0 ${
                activeFiltrosCount > 0 || showFiltros
                  ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300'
                  : 'bg-white dark:bg-centhrix-card border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-centhrix-surface'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltrosCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold">
                  {activeFiltrosCount}
                </span>
              )}
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFiltros ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Panel de filtros avanzados */}
          {showFiltros && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Fecha desde */}
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Fecha desde
                  </label>
                  <DatePicker
                    value={filtrosDraft.fecha_desde}
                    onChange={(v) => setFiltrosDraft((p) => ({ ...p, fecha_desde: v }))}
                  />
                </div>
                {/* Fecha hasta */}
                <div>
                  <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                    Fecha hasta
                  </label>
                  <DatePicker
                    value={filtrosDraft.fecha_hasta}
                    onChange={(v) => setFiltrosDraft((p) => ({ ...p, fecha_hasta: v }))}
                  />
                </div>
                {/* Cliente — solo para usuarios internos */}
                {!esPortal && (
                  <div>
                    <FilterDropdown
                      label="Cliente"
                      options={[
                        { value: '', label: 'Todos los clientes' },
                        ...clientes.map((c) => ({
                          value: String(c.id),
                          label: c.razon_social || c.nombre || '',
                        })),
                      ]}
                      value={filtrosDraft.cliente_id}
                      onChange={(v) => setFiltrosDraft((p) => ({ ...p, cliente_id: v }))}
                      placeholder={loadingClientes ? 'Cargando clientes...' : 'Todos los clientes'}
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <button
                  onClick={limpiarFiltros}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Limpiar filtros
                </button>
                <button
                  onClick={aplicarFiltros}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RESULTS COUNT + VIEW TOGGLE */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} salida{filtered.length !== 1 && 's'} encontrada
            {filtered.length !== 1 && 's'}
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

        {/* TABLE / CARDS */}
        {loading ? (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-8 text-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-3" />
            <p className="text-slate-500">Cargando salidas del WMS...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 py-16 text-center">
            <div className="w-16 h-16 bg-slate-100 dark:bg-centhrix-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
              No se encontraron salidas
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {searchTerm
                ? 'Intenta ajustar el término de búsqueda'
                : 'No hay salidas pendientes de auditoría'}
            </p>
          </div>
        ) : viewMode === 'table' ? (
          <div id="tour-salidas-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                      onClick={() => handleSort('numero_operacion')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Documento{' '}
                        <SortIcon
                          field="numero_operacion"
                          sortField={sortField}
                          sortDir={sortDir}
                        />
                      </span>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                      onClick={() => handleSort('tipo')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Tipo Doc. <SortIcon field="tipo" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                      onClick={() => handleSort('fecha_operacion')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Fecha Salida{' '}
                        <SortIcon field="fecha_operacion" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Líneas
                    </th>
                    <th
                      className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-centhrix-surface/50"
                      onClick={() => handleSort('estado')}
                    >
                      <span className="inline-flex items-center gap-1">
                        Estado <SortIcon field="estado" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Acciones */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((salida) => (
                    <tr
                      key={salida.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors cursor-pointer group"
                      onClick={() => handleView(salida)}
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {salida.numero_picking || salida.documento_wms || salida.documento}
                            </p>
                            {salida.documento_wms && salida.documento_wms !== salida.numero_picking && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                                N° Orden: {salida.documento_wms}
                              </p>
                            )}
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              {salida.documento}
                            </p>
                            {salida.editado_admin && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 rounded text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                <Pencil className="w-3 h-3" /> Editado
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                            {salida.cliente}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                          {salida.tipo_documento_wms || 'PK'}
                        </span>
                      </td>
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(salida.fecha_salida)}
                        </div>
                      </td>
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-32 mx-auto">
                          <ProgressBar verified={salida.lineas_verificadas} total={salida.lineas} />
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <StatusBadge estado={salida.estado} />
                      </td>
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActions salida={salida} onView={handleView} onAnular={handleAnular} />
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
                itemsPerPage={PAGE_SIZE}
                onPageChange={handlePageChange}
              />
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((salida) => (
                <div
                  key={salida.id}
                  className="bg-white dark:bg-centhrix-card/50 rounded-xl border border-gray-100 dark:border-slate-700 hover:shadow-md transition-all cursor-pointer group"
                  onClick={() => handleView(salida)}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between px-4 pt-4 pb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {salida.numero_picking || salida.documento_wms || salida.documento}
                        </p>
                        {salida.documento_wms && salida.documento_wms !== salida.numero_picking && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                            N° Orden: {salida.documento_wms}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                          {salida.documento}
                        </p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActions salida={salida} onView={handleView} onAnular={handleAnular} />
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="px-4 py-3 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-700 dark:text-slate-200 truncate">
                        {salida.cliente}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                        {salida.tipo_documento_wms || 'PK'}
                      </span>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(salida.fecha_salida)}
                      </div>
                    </div>
                    {salida.destino && (
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="text-xs text-slate-600 dark:text-slate-300 truncate">
                          {salida.destino}
                        </span>
                      </div>
                    )}
                    <div onClick={(e) => e.stopPropagation()}>
                      <ProgressBar verified={salida.lineas_verificadas} total={salida.lineas} />
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-4 py-3 border-t border-gray-100 dark:border-slate-700">
                    <StatusBadge estado={salida.estado} />
                  </div>
                </div>
              ))}
            </div>
            {!loading && pagination.totalPages > 1 && (
              <div className="mt-4">
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  totalItems={pagination.total}
                  itemsPerPage={PAGE_SIZE}
                  onPageChange={handlePageChange}
                />
              </div>
            )}
          </>
        )}

        {/* FOOTER */}
        <PageFooter />
      </main>

      {/* MODAL ANULAR OPERACIÓN */}
      {anularModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Anular operación</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              ¿Estás seguro que deseas anular{' '}
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {anularModal.operacion?.numero_operacion || anularModal.operacion?.documento_origen}
              </span>
              ? Esta acción cambiará el estado a <strong>Anulado</strong> y no se puede deshacer.
            </p>
            <div className="mb-5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Motivo (opcional)
              </label>
              <textarea
                value={motivoAnular}
                onChange={(e) => setMotivoAnular(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-red-500/30"
                placeholder="Explica el motivo de la anulación..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setAnularModal({ open: false, operacion: null })}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-centhrix-surface rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAnular}
                disabled={anulando}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {anulando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Anular operación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalidasList;
