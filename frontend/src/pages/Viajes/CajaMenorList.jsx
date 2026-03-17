/**
 * ============================================================================
 * ISTHO CRM - CajaMenorList
 * ============================================================================
 * Lista de cajas menores con gestión de saldos y estados.
 * Flujo: Abierta → En Revisión → Cerrada
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import { cajasMenoresService } from '../../api/viajes.service';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';
import {
  Wallet,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Lock,
  Clock,
  DollarSign,
  User,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { Pagination, ConfirmDialog } from '../../components/common';
import CajaMenorForm from './components/CajaMenorForm';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE ESTADOS
// ════════════════════════════════════════════════════════════════════════════

const ESTADO_CONFIG = {
  abierta: {
    label: 'Abierta',
    icon: CheckCircle2,
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    darkBg: 'dark:bg-emerald-900/20',
    darkText: 'dark:text-emerald-300',
    darkBorder: 'dark:border-emerald-800',
  },
  en_revision: {
    label: 'En Revisión',
    icon: Clock,
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    darkBg: 'dark:bg-amber-900/20',
    darkText: 'dark:text-amber-300',
    darkBorder: 'dark:border-amber-800',
  },
  cerrada: {
    label: 'Cerrada',
    icon: Lock,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dot: 'bg-slate-500',
    darkBg: 'dark:bg-slate-700/30',
    darkText: 'dark:text-slate-300',
    darkBorder: 'dark:border-slate-600',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ estado }) => {
  const config = ESTADO_CONFIG[estado] || ESTADO_CONFIG.abierta;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text} ${config.darkBg} ${config.darkText}`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Formato de moneda colombiana
// ════════════════════════════════════════════════════════════════════════════

const formatMoney = (value) => {
  if (value == null) return '$0';
  return `$${Number(value).toLocaleString('es-CO')}`;
};

// ════════════════════════════════════════════════════════════════════════════
// ROW ACTIONS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const RowActions = ({ caja, onView, onEdit, onClose, onDelete }) => {
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
        <MenuItem onClick={() => { onView(caja); setAnchorEl(null); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        <ProtectedAction module="viajes" action="editar">
          <MenuItem onClick={() => { onEdit(caja); setAnchorEl(null); }}>
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        </ProtectedAction>

        {caja.estado === 'abierta' && (
          <ProtectedAction module="viajes" action="cerrar_caja">
            <MenuItem
              onClick={() => { onClose(caja); setAnchorEl(null); }}
              sx={{ color: isDark ? '#fbbf24 !important' : '#d97706 !important', '&:hover': { backgroundColor: isDark ? '#422006 !important' : '#fffbeb !important' } }}
            >
              <Lock className="w-4 h-4" />
              Cerrar Caja
            </MenuItem>
          </ProtectedAction>
        )}

        <ProtectedAction module="viajes" action="eliminar">
          <MenuItem
            onClick={() => { onDelete(caja); setAnchorEl(null); }}
            sx={{ color: isDark ? '#f87171 !important' : '#dc2626 !important', '&:hover': { backgroundColor: isDark ? '#450a0a !important' : '#fef2f2 !important' } }}
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

const CajaMenorList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success, apiError, deleted } = useNotification();
  const [searchTerm, setSearchTerm] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [cajas, setCajas] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ abiertas: 0, en_revision: 0, cerradas: 0, total_egresos: 0 });

  // Modales
  const [formModal, setFormModal] = useState({ isOpen: false, caja: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, caja: null });
  const [closeModal, setCloseModal] = useState({ isOpen: false, caja: null });
  const [formLoading, setFormLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────────────────────────

  const fetchCajas = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (estadoFilter !== 'todos') params.estado = estadoFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await cajasMenoresService.getAll(params);
      setCajas(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch {
      setCajas([]);
      setError('No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [estadoFilter, searchTerm]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await cajasMenoresService.getStats();
      setStats(response.data || response);
    } catch (err) {
      console.error('Error al cargar estadísticas:', err);
    }
  }, []);

  useEffect(() => {
    fetchCajas(1);
    fetchStats();
  }, [fetchCajas, fetchStats]);

  const handlePageChange = (page) => {
    fetchCajas(page);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setFormModal({ isOpen: true, caja: null });
  };

  const handleEdit = (caja) => {
    setFormModal({ isOpen: true, caja });
  };

  const handleView = (caja) => {
    navigate(`/viajes/cajas-menores/${caja.id}`);
  };

  const handleDelete = (caja) => {
    setDeleteModal({ isOpen: true, caja });
  };

  const handleCloseCaja = (caja) => {
    setCloseModal({ isOpen: true, caja });
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);
    try {
      await cajasMenoresService.delete(deleteModal.caja.id);
      deleted('Caja menor');
      setDeleteModal({ isOpen: false, caja: null });
      fetchCajas(pagination.page);
      fetchStats();
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmClose = async () => {
    setFormLoading(true);
    try {
      await cajasMenoresService.close(closeModal.caja.id);
      success('Caja menor cerrada exitosamente');
      setCloseModal({ isOpen: false, caja: null });
      fetchCajas(pagination.page);
      fetchStats();
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleFormSuccess = () => {
    setFormModal({ isOpen: false, caja: null });
    fetchCajas(pagination.page);
    fetchStats();
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
              <Wallet className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Cajas Menores</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">Gestión de cajas menores y saldos</p>
            </div>
          </div>
          <ProtectedAction module="viajes" action="crear">
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nueva Caja
            </button>
          </ProtectedAction>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <KpiMini
            icon={Wallet}
            label="Abiertas"
            value={stats.abiertas ?? 0}
            color="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
          />
          <KpiMini
            icon={Clock}
            label="En Revisión"
            value={stats.en_revision ?? 0}
            color="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
          />
          <KpiMini
            icon={Lock}
            label="Cerradas"
            value={stats.cerradas ?? 0}
            color="bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-700/20 dark:border-slate-600 dark:text-slate-300"
          />
          <KpiMini
            icon={DollarSign}
            label="Total Egresos Activos"
            value={formatMoney(stats.total_egresos ?? 0)}
            color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
          />
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            <button onClick={() => fetchCajas(1)} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">Reintentar</button>
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
                placeholder="Buscar por número o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>

            {/* Estado Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              {[
                { key: 'todos', label: 'Todas' },
                { key: 'abierta', label: 'Abiertas' },
                { key: 'en_revision', label: 'En Revisión' },
                { key: 'cerrada', label: 'Cerradas' },
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
            {cajas.length} caja{cajas.length !== 1 && 's'} menor{cajas.length !== 1 && 'es'} encontrada{cajas.length !== 1 && 's'}
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Cargando cajas menores...</p>
            </div>
          ) : cajas.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
                No se encontraron cajas menores
              </h3>
              <p className="text-slate-500 dark:text-slate-400">
                {searchTerm ? 'Intenta ajustar el término de búsqueda' : 'Comienza creando tu primera caja menor'}
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
                      Conductor
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Saldo Inicial
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Saldo Actual
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
                  {cajas.map((caja) => (
                    <tr
                      key={caja.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer group"
                      onClick={() => handleView(caja)}
                    >
                      {/* Número */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {caja.numero || `CM-${caja.id}`}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Apertura: {caja.fecha_apertura ? new Date(caja.fecha_apertura).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Conductor */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                            {caja.conductor?.nombre_completo || caja.conductor?.username || '-'}
                          </span>
                        </div>
                      </td>

                      {/* Saldo Inicial */}
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-mono">
                          {formatMoney(caja.saldo_inicial)}
                        </span>
                      </td>

                      {/* Saldo Actual */}
                      <td className="py-4 px-4 text-right">
                        <span className={`text-sm font-mono font-bold ${Number(caja.saldo_actual) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {formatMoney(caja.saldo_actual)}
                        </span>
                      </td>

                      {/* Estado */}
                      <td className="py-4 px-4 text-center">
                        <StatusBadge estado={caja.estado} />
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActions
                          caja={caja}
                          onView={handleView}
                          onEdit={handleEdit}
                          onClose={handleCloseCaja}
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
      <CajaMenorForm
        open={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, caja: null })}
        onSuccess={handleFormSuccess}
        cajaId={formModal.caja?.id}
      />

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, caja: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Caja Menor"
        message={`¿Estás seguro de eliminar la caja menor "${deleteModal.caja?.numero || ''}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={closeModal.isOpen}
        onClose={() => setCloseModal({ isOpen: false, caja: null })}
        onConfirm={handleConfirmClose}
        title="Cerrar Caja Menor"
        message={`¿Estás seguro de cerrar la caja menor "${closeModal.caja?.numero || ''}"? Una vez cerrada no se podrán registrar más gastos.`}
        confirmText="Cerrar Caja"
        type="warning"
        loading={formLoading}
      />
    </div>
  );
};

export default CajaMenorList;
