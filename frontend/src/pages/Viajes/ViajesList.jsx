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
import { useNavigate } from 'react-router-dom';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import { viajesService } from '../../api/viajes.service';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
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
  Calendar,
  Building2,
  CheckCircle2,
  XCircle,
  Check,
  X,
} from 'lucide-react';
import { Pagination, ConfirmDialog } from '../../components/common';

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

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ estado }) => {
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.activo;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTIONS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const RowActions = ({ viaje, onView, onEdit, onDelete }) => {
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
        <MenuItem onClick={() => { onView(viaje); setAnchorEl(null); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        <ProtectedAction module="viajes" action="editar">
          <MenuItem onClick={() => { onEdit(viaje); setAnchorEl(null); }}>
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        </ProtectedAction>

        <ProtectedAction module="viajes" action="eliminar">
          <MenuItem
            onClick={() => { onDelete(viaje); setAnchorEl(null); }}
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

const ViajesList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, apiError, deleted } = useNotification();

  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [loading, setLoading] = useState(true);
  const [viajes, setViajes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState(null);

  // Modales
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, viaje: null });
  const [formLoading, setFormLoading] = useState(false);

  // Cargar datos desde API
  const fetchViajes = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
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
      setViajes([]);
      setError('No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, searchTerm, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchViajes(1);
  }, [fetchViajes]);

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
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Viajes</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">Registro y seguimiento de viajes</p>
            </div>
          </div>
          <ProtectedAction module="viajes" action="crear">
            <button
              onClick={() => navigate('/viajes/viajes/nuevo')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Nuevo Viaje
            </button>
          </ProtectedAction>
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
            <button onClick={() => fetchViajes(1)} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">Reintentar</button>
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
                placeholder="Buscar por número, destino, cliente o documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Estado Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
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
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  title="Fecha desde"
                />
              </div>
              <span className="text-slate-400 dark:text-slate-500 text-sm">—</span>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="pl-10 pr-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  title="Fecha hasta"
                />
              </div>
            </div>
          </div>
        </div>

        {/* RESULTS COUNT */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {viajes.length} viaje{viajes.length !== 1 && 's'} encontrado{viajes.length !== 1 && 's'}
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Cargando viajes...</p>
            </div>
          ) : viajes.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
                No se encontraron viajes
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {searchTerm ? 'Intenta ajustar el término de búsqueda' : 'No hay viajes registrados'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Número
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Ruta
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Cliente
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
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Estado
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
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
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
                              {formatDate(viaje.fecha)}
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
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700">
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
          © 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
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
    </div>
  );
};

export default ViajesList;
