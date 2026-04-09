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
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Menu, MenuItem, IconButton } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import { cajasMenoresService } from '../../api/viajes.service';
import useNotification from '../../hooks/useNotification';
import useSort from '@hooks/useSort';
import SortIcon from '@components/common/SortIcon';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';
import { formatDateShort } from '../../utils/formatDate';
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
  LayoutGrid,
  LayoutList,
  FileSpreadsheet,
} from 'lucide-react';
import { Pagination, ConfirmDialog, Modal, Button } from '../../components/common';
import PageFooter from '@components/common/PageFooter';
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
        <MenuItem onClick={() => { onView(caja); setAnchorEl(null); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        {caja.estado !== 'cerrada' && (
          <ProtectedAction module="caja_menor" action="editar">
            <MenuItem onClick={() => { onEdit(caja); setAnchorEl(null); }}>
              <Pencil className="w-4 h-4" />
              Editar
            </MenuItem>
          </ProtectedAction>
        )}

        {caja.estado === 'abierta' && (
          <ProtectedAction module="caja_menor" action="cerrar">
            <MenuItem
              onClick={() => { onClose(caja); setAnchorEl(null); }}
              sx={{ color: isDark ? '#fbbf24 !important' : '#d97706 !important', '&:hover': { backgroundColor: isDark ? '#422006 !important' : '#fffbeb !important' } }}
            >
              <Lock className="w-4 h-4" />
              Cerrar Caja
            </MenuItem>
          </ProtectedAction>
        )}

        {caja.estado !== 'cerrada' && (
          <ProtectedAction module="caja_menor" action="eliminar">
            <MenuItem
              onClick={() => { onDelete(caja); setAnchorEl(null); }}
              sx={{ color: isDark ? '#f87171 !important' : '#dc2626 !important', '&:hover': { backgroundColor: isDark ? '#450a0a !important' : '#fef2f2 !important' } }}
            >
              <Trash2 className="w-4 h-4" />
              Eliminar
            </MenuItem>
          </ProtectedAction>
        )}
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
  const [searchParams] = useSearchParams();
  const { user: _user } = useAuth();
  const { success, apiError, deleted } = useNotification();
  const socket = useSocket();
  const { sortField, sortDir, handleSort } = useSort('created_at', 'DESC');
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
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
  const [accionSobrante, setAccionSobrante] = useState('guardar');
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [viewMode, setViewMode] = useState(window.innerWidth < 768 ? 'cards' : 'table');

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────────────────────────

  const fetchCajas = useCallback(async (page = 1, silencioso = false) => {
    if (!silencioso) setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE, sort: sortField, order: sortDir };
      if (estadoFilter !== 'todos') params.estado = estadoFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await cajasMenoresService.getAll(params);
      setCajas(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch {
      if (!silencioso) {
        setCajas([]);
        setError('No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.');
      }
    } finally {
      if (!silencioso) setLoading(false);
    }
  }, [estadoFilter, searchTerm, sortField, sortDir]);

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

  // Tiempo real: escuchar eventos de socket
  useEffect(() => {
    if (!socket?.on) return;

    const handleCreada = () => {
      fetchCajas(1, true);
      fetchStats();
    };

    const handleActualizada = (data) => {
      setCajas(prev => prev.map(c => c.id === data.id ? { ...c, ...data } : c));
      fetchStats();
    };

    const handleEliminada = (data) => {
      setCajas(prev => prev.filter(c => c.id !== data.id));
      fetchStats();
    };

    socket.on('caja:creada', handleCreada);
    socket.on('caja:actualizada', handleActualizada);
    socket.on('caja:eliminada', handleEliminada);

    return () => {
      socket.off('caja:creada', handleCreada);
      socket.off('caja:actualizada', handleActualizada);
      socket.off('caja:eliminada', handleEliminada);
    };
  }, [socket, fetchCajas, fetchStats]);

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
    const saldo = parseFloat(closeModal.caja?.saldo_actual) || 0;
    try {
      await cajasMenoresService.cerrar(closeModal.caja.id, {
        observaciones_cierre: observacionesCierre,
        accion_sobrante: saldo > 0 ? accionSobrante : 'sin_saldo',
      });
      setCloseModal({ isOpen: false, caja: null });
      setObservacionesCierre('');
      setAccionSobrante('guardar');
      fetchCajas(pagination.page);
      fetchStats();
      success(
        accionSobrante === 'entregar'
          ? 'Caja cerrada. Saldo entregado al usuario asignado.'
          : saldo > 0
            ? 'Caja cerrada. Saldo guardado para la siguiente caja.'
            : 'Caja menor cerrada exitosamente'
      );
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
  // EXPORT
  // ──────────────────────────────────────────────────────────────────────────

  const handleExportExcel = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (estadoFilter !== 'todos') params.set('estado', estadoFilter);
    window.open(`${baseUrl}/reportes/cajas-menores/excel?${params.toString()}`, '_blank');
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
            {/* Botón exportar Excel */}
            {cajas.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            )}
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
                placeholder="Buscar por número o usuario asignado..."
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

          

            {/* Botón crear */}
            <ProtectedAction module="caja_menor" action="crear">
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#E74C3C] hover:bg-[#C0392B] rounded-xl shadow-sm transition-colors whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Nueva Caja
              </button>
            </ProtectedAction>
          </div>
        </div>

        {/* RESULTS COUNT + VIEW TOGGLE */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {cajas.length} caja{cajas.length !== 1 && 's'} menor{cajas.length !== 1 && 'es'} encontrada{cajas.length !== 1 && 's'}
          </p>
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'table' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista tabla"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'cards' ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
              title="Vista tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
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
          ) : viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th
                      onClick={() => handleSort('numero')}
                      className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    >
                      <span className="inline-flex items-center gap-1">
                        Número <SortIcon field="numero" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Asignado a
                    </th>
                    <th
                      onClick={() => handleSort('saldo_inicial')}
                      className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Saldo Inicial <SortIcon field="saldo_inicial" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('saldo_actual')}
                      className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    >
                      <span className="inline-flex items-center justify-end gap-1">
                        Saldo Actual <SortIcon field="saldo_actual" sortField={sortField} sortDir={sortDir} />
                      </span>
                    </th>
                    <th
                      onClick={() => handleSort('estado')}
                      className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-700/50"
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
                              Apertura: {formatDateShort(caja.fecha_apertura)}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Asignado a */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="text-sm text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                            {caja.asignado?.nombre_completo || caja.asignado?.username || '-'}
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
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {cajas.map((caja) => (
                <div
                  key={caja.id}
                  onClick={() => handleView(caja)}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 p-4 hover:shadow-md hover:border-amber-200 dark:hover:border-amber-800 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{caja.numero || `CM-${caja.id}`}</p>
                        <p className="text-xs text-slate-400">
                          {formatDateShort(caja.fecha_apertura)}
                        </p>
                      </div>
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <RowActions caja={caja} onView={handleView} onEdit={handleEdit} onClose={handleCloseCaja} onDelete={handleDelete} />
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Asignado a</span>
                      <span className="text-slate-700 dark:text-slate-200 truncate max-w-[150px]">
                        {caja.asignado?.nombre_completo || caja.asignado?.username || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Saldo Inicial</span>
                      <span className="text-slate-700 dark:text-slate-200 font-mono">{formatMoney(caja.saldo_inicial)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Saldo Actual</span>
                      <span className={`font-mono font-bold ${Number(caja.saldo_actual) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatMoney(caja.saldo_actual)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center">
                    <StatusBadge estado={caja.estado} />
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

      <Modal
        isOpen={closeModal.isOpen}
        onClose={() => { setCloseModal({ isOpen: false, caja: null }); setObservacionesCierre(''); setAccionSobrante('guardar'); }}
        title="Cerrar Caja Menor"
        subtitle={`Caja ${closeModal.caja?.numero || ''}`}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setCloseModal({ isOpen: false, caja: null }); setObservacionesCierre(''); setAccionSobrante('guardar'); }}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Lock} onClick={handleConfirmClose} loading={formLoading}>
              Cerrar Caja
            </Button>
          </>
        }
      >
        {(() => {
          const saldo = parseFloat(closeModal.caja?.saldo_actual) || 0;
          const formatMoney = (v) => `$ ${Number(v || 0).toLocaleString('es-CO')}`;
          return (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  <strong>Importante:</strong> Al cerrar la caja menor no se podrán registrar más movimientos ni viajes asociados.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    Saldo Inicial
                    {parseFloat(closeModal.caja?.saldo_trasladado) > 0 && (
                      <span className="text-xs text-amber-500 ml-1">(incluye heredado)</span>
                    )}
                  </span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{formatMoney(closeModal.caja?.saldo_inicial)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Total Ingresos</span>
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">+{formatMoney(closeModal.caja?.total_ingresos)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500 dark:text-slate-400">Total Egresos</span>
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">-{formatMoney(closeModal.caja?.total_egresos)}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-600 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Saldo Final</span>
                  <span className={`text-xl font-bold ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatMoney(saldo)}
                  </span>
                </div>
              </div>

              {saldo > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    ¿Qué hacer con el saldo restante?
                  </label>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      accionSobrante === 'guardar'
                        ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="accion_sobrante_list" value="guardar" checked={accionSobrante === 'guardar'} onChange={() => setAccionSobrante('guardar')} className="mt-0.5 text-emerald-600 focus:ring-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Guardar saldo para siguiente caja</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">El saldo de {formatMoney(saldo)} quedará disponible para trasladar</p>
                      </div>
                    </label>
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      accionSobrante === 'entregar'
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/20 dark:border-red-700'
                        : 'border-slate-200 dark:border-slate-600 hover:border-slate-300'
                    }`}>
                      <input type="radio" name="accion_sobrante_list" value="entregar" checked={accionSobrante === 'entregar'} onChange={() => setAccionSobrante('entregar')} className="mt-0.5 text-red-600 focus:ring-red-500" />
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Entregar saldo al usuario asignado</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Se registrará un egreso de liquidación por {formatMoney(saldo)} y cerrará en $0</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Observaciones de cierre</label>
                <textarea
                  placeholder="Agregar notas sobre el cierre..."
                  rows={3}
                  value={observacionesCierre}
                  onChange={(e) => setObservacionesCierre(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                />
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
};

export default CajaMenorList;
