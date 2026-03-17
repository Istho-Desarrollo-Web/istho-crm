/**
 * ============================================================================
 * ISTHO CRM - MovimientosList (Movimientos de Caja Menor)
 * ============================================================================
 * Lista de movimientos de caja menor con aprobación masiva, filtros por tipo
 * y estado de aprobación, y exportación a Excel.
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Menu, MenuItem, IconButton, Checkbox } from '@mui/material';
import { useThemeContext } from '../../context/ThemeContext';
import { movimientosService } from '../../api/viajes.service';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';
import {
  Receipt,
  Search,
  Plus,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Wallet,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';
import { Button, Modal, Pagination, ConfirmDialog } from '../../components/common';
import MovimientoForm from './components/MovimientoForm';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

const CONCEPTO_LABELS = {
  cuadre_de_caja: 'Cuadre de Caja',
  descargues: 'Descargues',
  acpm: 'ACPM',
  administracion: 'Administración',
  alimentacion: 'Alimentación',
  comisiones: 'Comisiones',
  desencarpe: 'Desencarpe',
  encarpe: 'Encarpe',
  hospedaje: 'Hospedaje',
  otros: 'Otros',
  seguros: 'Seguros',
  repuestos: 'Repuestos',
  tecnicomecanica: 'Tecnomecánica',
  peajes: 'Peajes',
  ligas: 'Ligas',
  parqueadero: 'Parqueadero',
  urea: 'UREA',
  ingreso_adicional: 'Ingreso Adicional',
  peajes_ingreso: 'Peajes Ingreso',
  ligas_ingresos: 'Ligas Ingresos',
  parqueadero_ingresos: 'Parqueadero Ingresos',
  urea_ingresos: 'UREA Ingresos',
};

const formatMoney = (value) => {
  if (value == null) return '-';
  return `$${Number(value).toLocaleString('es-CO')}`;
};

const PAGE_SIZE = 20;

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const StatusBadge = ({ aprobado, rechazado }) => {
  if (aprobado === true) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Aprobado
      </span>
    );
  }
  if (rechazado === true) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
        <XCircle className="w-3.5 h-3.5" />
        Rechazado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
      <Clock className="w-3.5 h-3.5" />
      Pendiente
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// KPI CARD COMPONENT
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
// ROW ACTIONS COMPONENT
// ════════════════════════════════════════════════════════════════════════════

const RowActions = ({ movimiento, onView, onEdit, onDelete, onAprobar }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { isDark } = useThemeContext();
  const open = Boolean(anchorEl);

  const isPendiente = !movimiento.aprobado && !movimiento.rechazado;

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
        <MenuItem onClick={() => { onView(movimiento); setAnchorEl(null); }}>
          <Eye className="w-4 h-4" />
          Ver detalle
        </MenuItem>

        <ProtectedAction module="viajes" action="editar">
          <MenuItem onClick={() => { onEdit(movimiento); setAnchorEl(null); }}>
            <Pencil className="w-4 h-4" />
            Editar
          </MenuItem>
        </ProtectedAction>

        {isPendiente && (
          <ProtectedAction module="viajes" action="aprobar">
            <MenuItem
              onClick={() => { onAprobar(movimiento); setAnchorEl(null); }}
              sx={{ color: isDark ? '#86efac !important' : '#16a34a !important', '&:hover': { backgroundColor: isDark ? '#052e16 !important' : '#f0fdf4 !important' } }}
            >
              <CheckCircle2 className="w-4 h-4" />
              Aprobar
            </MenuItem>
          </ProtectedAction>
        )}

        <ProtectedAction module="viajes" action="eliminar">
          <MenuItem
            onClick={() => { onDelete(movimiento); setAnchorEl(null); }}
            sx={{ color: isDark ? '#fca5a5 !important' : '#dc2626 !important', '&:hover': { backgroundColor: isDark ? '#450a0a !important' : '#fef2f2 !important' } }}
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
// APROBAR MOVIMIENTO DIALOG
// ════════════════════════════════════════════════════════════════════════════

const AprobarMovimientoDialog = ({ isOpen, onClose, movimiento, onAprobar, onRechazar, loading }) => {
  const [valorAprobado, setValorAprobado] = useState('');
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    if (movimiento) {
      setValorAprobado(movimiento.valor || '');
      setObservaciones('');
    }
  }, [movimiento]);

  if (!isOpen || !movimiento) return null;

  return (
    <Modal open={isOpen} onClose={onClose} title="Aprobar Movimiento">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            Valor Original
          </label>
          <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {formatMoney(movimiento.valor)}
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            Valor Aprobado
          </label>
          <input
            type="number"
            value={valorAprobado}
            onChange={(e) => setValorAprobado(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
            placeholder="Valor aprobado"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
            Observaciones
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"
            placeholder="Observaciones de aprobación..."
          />
        </div>
      </div>

      <div className="flex items-center gap-3 mt-6">
        <button
          onClick={() => onAprobar({ valor_aprobado: Number(valorAprobado), observaciones_aprobacion: observaciones })}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          Aprobar
        </button>
        <button
          onClick={() => onRechazar({ observaciones_aprobacion: observaciones })}
          disabled={loading}
          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          Rechazar
        </button>
        <button
          onClick={onClose}
          disabled={loading}
          className="px-4 py-2.5 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const MovimientosList = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { isDark } = useThemeContext();
  const { success, apiError, deleted } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────
  const [movimientos, setMovimientos] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState(searchParams.get('tipo_movimiento') || 'todos');
  const [aprobadoFilter, setAprobadoFilter] = useState(searchParams.get('aprobado') || 'todos');

  // Selección masiva
  const [selected, setSelected] = useState([]);

  // Modales
  const [formModal, setFormModal] = useState({ isOpen: false, movimiento: null });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, movimiento: null });
  const [aprobarModal, setAprobarModal] = useState({ isOpen: false, movimiento: null });
  const [formLoading, setFormLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────────────────────────

  const fetchMovimientos = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (tipoFilter !== 'todos') params.tipo_movimiento = tipoFilter;
      if (aprobadoFilter !== 'todos') params.aprobado = aprobadoFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await movimientosService.getAll(params);
      setMovimientos(response.data || []);
      if (response.pagination) {
        setPagination(response.pagination);
      }
    } catch (err) {
      setMovimientos([]);
      setError('No se pudo conectar con el servidor. Verifique que el servicio esté activo e intente nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [tipoFilter, aprobadoFilter, searchTerm]);

  useEffect(() => {
    fetchMovimientos(1);
  }, [fetchMovimientos]);

  const handlePageChange = (page) => {
    fetchMovimientos(page);
  };

  const refresh = () => {
    setSelected([]);
    fetchMovimientos(pagination.page);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // KPIs (calculados de la data actual)
  // ──────────────────────────────────────────────────────────────────────────

  const totalPendientes = movimientos.filter((m) => !m.aprobado && !m.rechazado).length;
  const totalAprobados = movimientos.filter((m) => m.aprobado === true).length;
  const totalRechazados = movimientos.filter((m) => m.rechazado === true).length;
  const totalValor = movimientos.reduce((sum, m) => sum + (Number(m.valor) || 0), 0);

  // ──────────────────────────────────────────────────────────────────────────
  // SELECCIÓN MASIVA
  // ──────────────────────────────────────────────────────────────────────────

  const pendientes = movimientos.filter(
    (m) => !m.aprobado && !m.rechazado
  );

  const isPendiente = (m) =>
    !m.aprobado && !m.rechazado;

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelected(pendientes.map((m) => m.id));
    } else {
      setSelected([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleMassApproval = async () => {
    setFormLoading(true);
    try {
      await movimientosService.aprobarMasivo(selected);
      success(`${selected.length} movimiento(s) aprobado(s) correctamente`);
      setSelected([]);
      fetchMovimientos(pagination.page);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS CRUD
  // ──────────────────────────────────────────────────────────────────────────

  const handleCreate = () => {
    setFormModal({ isOpen: true, movimiento: null });
  };

  const handleEdit = (movimiento) => {
    setFormModal({ isOpen: true, movimiento });
  };

  const handleView = (movimiento) => {
    setFormModal({ isOpen: true, movimiento: { ...movimiento, _readOnly: true } });
  };

  const handleDelete = (movimiento) => {
    setDeleteModal({ isOpen: true, movimiento });
  };

  const handleAprobar = (movimiento) => {
    setAprobarModal({ isOpen: true, movimiento });
  };

  const handleConfirmDelete = async () => {
    setFormLoading(true);
    try {
      await movimientosService.delete(deleteModal.movimiento.id);
      deleted('Movimiento');
      setDeleteModal({ isOpen: false, movimiento: null });
      fetchMovimientos(pagination.page);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmAprobar = async (data) => {
    setFormLoading(true);
    try {
      await movimientosService.aprobar(aprobarModal.movimiento.id, {
        aprobado: true,
        ...data,
      });
      success('Movimiento aprobado correctamente');
      setAprobarModal({ isOpen: false, movimiento: null });
      fetchMovimientos(pagination.page);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmRechazar = async (data) => {
    setFormLoading(true);
    try {
      await movimientosService.aprobar(aprobarModal.movimiento.id, {
        aprobado: false,
        ...data,
      });
      success('Movimiento rechazado');
      setAprobarModal({ isOpen: false, movimiento: null });
      fetchMovimientos(pagination.page);
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleExportExcel = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    const params = new URLSearchParams();
    if (token) params.set('token', token);
    if (tipoFilter !== 'todos') params.set('tipo_movimiento', tipoFilter);
    if (aprobadoFilter !== 'todos') params.set('aprobado', aprobadoFilter);
    if (searchTerm) params.set('search', searchTerm);
    window.open(`${baseUrl}/viajes/movimientos/excel?${params.toString()}`, '_blank');
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
            <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Receipt className="w-7 h-7 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Movimientos de Caja Menor</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5">Gestiona los ingresos y egresos de caja menor</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {movimientos.length > 0 && (
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel
              </button>
            )}
            <ProtectedAction module="viajes" action="crear">
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nuevo Movimiento
              </button>
            </ProtectedAction>
          </div>
        </div>

        {/* KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiMini
            icon={Clock}
            label="Pendientes"
            value={totalPendientes}
            color="bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300"
          />
          <KpiMini
            icon={CheckCircle2}
            label="Aprobados"
            value={totalAprobados}
            color="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300"
          />
          <KpiMini
            icon={XCircle}
            label="Rechazados"
            value={totalRechazados}
            color="bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300"
          />
          <KpiMini
            icon={DollarSign}
            label="Total Valor"
            value={formatMoney(totalValor)}
            color="bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
          />
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center justify-between">
            <p className="text-sm text-amber-700 dark:text-amber-300">{error}</p>
            <button onClick={() => fetchMovimientos(1)} className="text-xs font-medium text-amber-600 dark:text-amber-400 hover:underline">Reintentar</button>
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
                placeholder="Buscar por consecutivo, concepto o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
              />
            </div>

            {/* Tipo Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'ingreso', label: 'Ingresos' },
                { key: 'egreso', label: 'Egresos' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setTipoFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    tipoFilter === tab.key
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Aprobación Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
              {[
                { key: 'todos', label: 'Todos' },
                { key: 'pendiente', label: 'Pendientes' },
                { key: 'true', label: 'Aprobados' },
                { key: 'rechazado', label: 'Rechazados' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAprobadoFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    aprobadoFilter === tab.key
                      ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-sm'
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
            {pagination.total} movimiento{pagination.total !== 1 && 's'} encontrado{pagination.total !== 1 && 's'}
          </p>
        </div>

        {/* TABLE */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Cargando movimientos...</p>
            </div>
          ) : movimientos.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
                No se encontraron movimientos
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                {searchTerm || tipoFilter !== 'todos' || aprobadoFilter !== 'todos'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Comienza registrando el primer movimiento'}
              </p>
              {!searchTerm && tipoFilter === 'todos' && aprobadoFilter === 'todos' && (
                <ProtectedAction module="viajes" action="crear">
                  <button
                    onClick={handleCreate}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Nuevo Movimiento
                  </button>
                </ProtectedAction>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="py-3 px-4 text-center w-12">
                      <Checkbox
                        size="small"
                        checked={pendientes.length > 0 && selected.length === pendientes.length}
                        indeterminate={selected.length > 0 && selected.length < pendientes.length}
                        onChange={handleSelectAll}
                        sx={{
                          color: isDark ? '#64748b' : '#94a3b8',
                          '&.Mui-checked': { color: '#a855f7' },
                          '&.MuiCheckbox-indeterminate': { color: '#a855f7' },
                        }}
                      />
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Consecutivo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Aprobado
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Valor Aprobado
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Caja Menor
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Conductor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-16">
                      {/* Acciones */}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((mov) => (
                    <tr
                      key={mov.id}
                      className="border-b border-gray-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group"
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 text-center">
                        {isPendiente(mov) ? (
                          <Checkbox
                            size="small"
                            checked={selected.includes(mov.id)}
                            onChange={() => handleSelectOne(mov.id)}
                            sx={{
                              color: isDark ? '#64748b' : '#94a3b8',
                              '&.Mui-checked': { color: '#a855f7' },
                            }}
                          />
                        ) : (
                          <span className="inline-block w-[42px]" />
                        )}
                      </td>

                      {/* Consecutivo */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Receipt className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              #{mov.consecutivo || mov.id}
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              {(mov.created_at || mov.fecha)
                                ? new Date(mov.created_at || mov.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
                                : '-'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Concepto */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-slate-700 dark:text-slate-200">
                          {CONCEPTO_LABELS[mov.concepto] || mov.concepto || '-'}
                        </span>
                        {mov.concepto === 'otros' && mov.concepto_otro && (
                          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{mov.concepto_otro}</p>
                        )}
                      </td>

                      {/* Tipo */}
                      <td className="py-4 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          mov.tipo_movimiento === 'ingreso'
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                          {mov.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-4 px-4 text-sm text-slate-800 dark:text-slate-100 font-semibold text-right">
                        {formatMoney(mov.valor)}
                      </td>

                      {/* Aprobado */}
                      <td className="py-4 px-4 text-center">
                        <StatusBadge aprobado={mov.aprobado} rechazado={mov.rechazado} />
                      </td>

                      {/* Valor Aprobado */}
                      <td className="py-4 px-4 text-sm text-slate-800 dark:text-slate-100 text-right">
                        {formatMoney(mov.valor_aprobado)}
                      </td>

                      {/* Caja Menor */}
                      <td className="py-4 px-4">
                        <span className="text-sm text-purple-600 dark:text-purple-400 font-medium cursor-pointer hover:underline">
                          {mov.cajaMenor?.numero || mov.caja_menor?.numero ? `${mov.cajaMenor?.numero || mov.caja_menor?.numero}` : '-'}
                        </span>
                      </td>

                      {/* Conductor */}
                      <td className="py-4 px-4 text-sm text-slate-600 dark:text-slate-300">
                        {mov.conductor?.nombre_completo || mov.conductor?.username || '-'}
                      </td>

                      {/* Acciones */}
                      <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <RowActions
                          movimiento={mov}
                          onView={handleView}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                          onAprobar={handleAprobar}
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

        {/* MASS APPROVAL FLOATING BAR */}
        {selected.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <div className="bg-slate-800 dark:bg-slate-700 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
              <span className="text-sm font-medium">
                {selected.length} seleccionado{selected.length !== 1 && 's'}
              </span>
              <button
                onClick={handleMassApproval}
                disabled={formLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Aprobar todos
              </button>
              <button
                onClick={() => setSelected([])}
                className="px-3 py-2 bg-slate-600 dark:bg-slate-600 hover:bg-slate-500 dark:hover:bg-slate-500 text-white text-sm rounded-xl transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          &copy; 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>

      {/* MODALS */}
      <MovimientoForm
        open={formModal.isOpen}
        onClose={() => setFormModal({ isOpen: false, movimiento: null })}
        onSuccess={() => {
          setFormModal({ isOpen: false, movimiento: null });
          refresh();
        }}
        movimientoId={formModal.movimiento?.id}
      />

      <ConfirmDialog
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, movimiento: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar Movimiento"
        message={`¿Estás seguro de eliminar el movimiento "${deleteModal.movimiento?.consecutivo || deleteModal.movimiento?.id}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />

      <AprobarMovimientoDialog
        isOpen={aprobarModal.isOpen}
        onClose={() => setAprobarModal({ isOpen: false, movimiento: null })}
        movimiento={aprobarModal.movimiento}
        onAprobar={handleConfirmAprobar}
        onRechazar={handleConfirmRechazar}
        loading={formLoading}
      />
    </div>
  );
};

export default MovimientosList;
