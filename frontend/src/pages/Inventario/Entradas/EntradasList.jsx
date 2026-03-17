/**
 * ============================================================================
 * ISTHO CRM - EntradasList (Auditoría de Ingresos)
 * ============================================================================
 * Lista de entradas/ingresos de inventario provenientes del WMS.
 * Flujo: Pendiente → En Proceso → Cerrado
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useThemeContext } from '../../../context/ThemeContext';
import auditoriasService from '../../../api/auditorias.service';
import {
  ClipboardList,
  Eye,
  Search,
  Filter,
  RefreshCw,
  Download,
  FileSpreadsheet,
  MoreVertical,
  Clock,
  Loader2,
  CheckCircle2,
  Package,
  Calendar,
  Building2,
  FileText,
  ArrowDownCircle,
} from 'lucide-react';
import { Pagination } from '../../../components/common';
import { exportToCsv } from '../../../utils/exportCsv';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ESTADOS
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    darkBg: 'dark:bg-amber-900/20',
    darkText: 'dark:text-amber-300',
    darkBorder: 'dark:border-amber-800',
  },
  en_proceso: {
    label: 'En Proceso',
    icon: Loader2,
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    dot: 'bg-blue-500',
    darkBg: 'dark:bg-blue-900/20',
    darkText: 'dark:text-blue-300',
    darkBorder: 'dark:border-blue-800',
  },
  cerrado: {
    label: 'Cerrado',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    darkBg: 'dark:bg-emerald-900/20',
    darkText: 'dark:text-emerald-300',
    darkBorder: 'dark:border-emerald-800',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ estado }) => {
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.pendiente;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}>
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
  const color = pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
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

const RowActions = ({ entrada, onView }) => {
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
        <MenuItem onClick={() => { onView(entrada); setAnchorEl(null); }}>
          <Eye className="w-4 h-4" />
          {entrada.estado === 'pendiente' ? 'Iniciar Auditoría' : 'Ver Auditoría'}
        </MenuItem>
      </Menu>
    </>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// KPI CARDS
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
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 20;

const EntradasList = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [entradas, setEntradas] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState(null);

  // Cargar datos desde API
  const fetchEntradas = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (estadoFilter !== 'todos') params.estado = estadoFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await auditoriasService.getEntradas(params);
      if (response.success && response.data) {
        setEntradas(Array.isArray(response.data) ? response.data : response.data.entradas || []);
        if (response.pagination) {
          setPagination(response.pagination);
        }
      } else {
        setEntradas([]);
      }
    } catch {
      setEntradas([]);
      setError('No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, searchTerm]);

  useEffect(() => {
    fetchEntradas(1);
  }, [fetchEntradas]);

  const handlePageChange = (page) => {
    fetchEntradas(page);
  };

  const filtered = entradas;

  // KPIs
  const totalPendientes = entradas.filter((e) => e.estado === 'pendiente').length;
  const totalEnProceso = entradas.filter((e) => e.estado === 'en_proceso').length;
  const totalCerradas = entradas.filter((e) => e.estado === 'cerrado').length;

  const handleView = (entrada) => {
    navigate(`/inventario/entradas/${entrada.id}`);
  };

  const handleExportCsv = () => {
    exportToCsv(filtered, [
      { key: 'documento_wms', label: 'Documento WMS' },
      { key: 'documento', label: 'Operación' },
      { key: 'cliente', label: 'Cliente' },
      { key: 'tipo_documento_wms', label: 'Tipo Doc.' },
      { key: 'fecha_ingreso', label: 'Fecha Ingreso' },
      { key: 'lineas', label: 'Total Líneas' },
      { key: 'lineas_verificadas', label: 'Líneas Verificadas' },
      { key: 'estado', label: 'Estado' },
    ], 'entradas_inventario');
  };

  const handleExportExcel = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (estadoFilter !== 'todos') params.set('estado', estadoFilter);
    if (searchTerm) params.set('search', searchTerm);
    window.open(`${baseUrl}/auditorias/entradas/excel?${params.toString()}`, '_blank');
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
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <ArrowDownCircle className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Entradas de Inventario</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">Auditoría y verificación de ingresos desde el WMS</p>
            </div>
          </div>
          {filtered.length > 0 && (
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
            <button onClick={fetchEntradas} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">Reintentar</button>
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
                placeholder="Buscar por documento o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Estado Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
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
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* RESULTS COUNT */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} entrada{filtered.length !== 1 && 's'} encontrada{filtered.length !== 1 && 's'}
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500">Cargando entradas del WMS...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
                No se encontraron entradas
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {searchTerm ? 'Intenta ajustar el término de búsqueda' : 'No hay entradas pendientes de auditoría'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Documento
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                      Tipo Doc.
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                      Fecha Ingreso
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Líneas
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
                  {filtered.map((entrada) => (
                    <tr
                      key={entrada.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                      onClick={() => handleView(entrada)}
                    >
                      {/* Documento */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {entrada.documento_wms || entrada.documento}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                              {entrada.documento}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                            {entrada.cliente}
                          </span>
                        </div>
                      </td>

                      {/* Tipo Documento WMS */}
                      <td className="py-4 px-4 hidden md:table-cell">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                          {entrada.tipo_documento_wms || 'CO'}
                        </span>
                      </td>

                      {/* Fecha */}
                      <td className="py-4 px-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {new Date(entrada.fecha_ingreso).toLocaleDateString('es-CO', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Líneas / Progreso */}
                      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                        <div className="w-32 mx-auto">
                          <ProgressBar verified={entrada.lineas_verificadas} total={entrada.lineas} />
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4 text-center">
                        <StatusBadge estado={entrada.estado} />
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActions entrada={entrada} onView={handleView} />
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
          © 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>
    </div>
  );
};

export default EntradasList;
