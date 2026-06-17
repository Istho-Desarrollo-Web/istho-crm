/**
 * ISTHO CRM - Dashboard WMS CenthriX
 *
 * Panel de monitoreo de sincronizaciones WMS.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  TrendingUp,
  TrendingDown,
  RotateCcw,
  Wifi,
  WifiOff,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  X,
  Zap,
  History,
  Search,
  CalendarRange,
  Box,
} from 'lucide-react';
import { useSnackbar } from 'notistack';
import wmsDashboardService from '@api/wmsDashboard.service';
import { DatePicker, FilterDropdown } from '../../components/common';

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

const TIPO_LABEL = {
  entrada: 'Entrada',
  salida: 'Salida',
  kardex: 'Kardex',
  productos: 'Productos',
  batch: 'Batch',
  polling_entrada: 'Entrada (polling)',
  polling_salida: 'Salida (polling)',
  polling_kardex: 'Kardex (polling)',
};

const TIPO_COLOR = {
  entrada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  salida: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  kardex: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  productos: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  batch: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  polling_entrada: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  polling_salida: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  polling_kardex: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const formatFecha = (iso) => {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(new Date(iso));
};

const tiempoRelativo = (iso) => {
  if (!iso) return 'Nunca';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'hace menos de 1 min';
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  return `hace ${Math.floor(diff / 86400)} días`;
};

// ════════════════════════════════════════════════════════════════
// KPI CARD
// ════════════════════════════════════════════════════════════════

const KpiCard = ({ icon: Icon, label, valor, sub, colorBg, colorIcon, loading }) => (
  <div className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:scale-[1.02] bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 shadow-sm">
    <div className={`p-2.5 rounded-xl ${colorBg}`}>
      <Icon className={`w-5 h-5 ${colorIcon}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">
        {label}
      </p>
      {loading ? (
        <div className="h-6 w-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mt-1" />
      ) : (
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 font-display leading-tight">
          {valor ?? '—'}
        </p>
      )}
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════
// BADGES
// ════════════════════════════════════════════════════════════════

const TipoBadge = ({ tipo }) => (
  <span
    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${TIPO_COLOR[tipo] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}
  >
    {TIPO_LABEL[tipo] || tipo}
  </span>
);

const EstadoBadge = ({ estado }) =>
  estado === 'exitoso' ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
      <CheckCircle2 className="w-3 h-3" /> Exitoso
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300">
      <XCircle className="w-3 h-3" /> Fallido
    </span>
  );

// ════════════════════════════════════════════════════════════════
// MODAL RE-EJECUTAR
// ════════════════════════════════════════════════════════════════

const ModalReejecutar = ({ isOpen, onClose, onConfirm, loading, tipo, setTipo }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
            <RotateCcw className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Re-ejecutar último sync
          </h3>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Se tomará el payload del último sync exitoso y se procesará nuevamente. Esto puede crear
          registros duplicados si el documento ya fue procesado.
        </p>

        <div className="mb-5">
          <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">
            Filtrar por tipo (opcional)
          </label>
          <FilterDropdown
            options={[
              { value: '', label: 'Cualquier tipo (el más reciente)' },
              { value: 'entrada', label: 'Entrada' },
              { value: 'salida', label: 'Salida' },
              { value: 'kardex', label: 'Kardex' },
              { value: 'productos', label: 'Productos' },
              { value: 'batch', label: 'Batch' },
            ]}
            value={tipo}
            onChange={(v) => setTipo(v)}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCcw className="w-4 h-4" />
            )}
            {loading ? 'Ejecutando...' : 'Re-ejecutar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MODAL SYNC HISTÓRICO
// ════════════════════════════════════════════════════════════════

const RESULTADO_ESTADO = {
  sincronizada: { color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  ya_existe: { color: 'text-slate-500 dark:text-slate-400', icon: Clock },
  error: { color: 'text-red-600 dark:text-red-400', icon: XCircle },
};

const ModalSyncHistorico = ({ isOpen, onClose, onSync, loading, resultado }) => {
  const [modo, setModo] = useState('numero'); // 'numero' | 'rango'
  const [numeroOrden, setNumeroOrden] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const handleClose = () => {
    setNumeroOrden('');
    setFechaDesde('');
    setFechaHasta('');
    setModo('numero');
    onClose();
  };

  const handleSync = () => {
    if (modo === 'numero') {
      onSync({ numero_orden: numeroOrden.trim() });
    } else {
      onSync({ fecha_desde: fechaDesde || undefined, fecha_hasta: fechaHasta || undefined });
    }
  };

  const puedeSync = loading
    ? false
    : modo === 'numero'
      ? numeroOrden.trim().length > 0
      : fechaDesde || fechaHasta;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-2xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl">
              <History className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Sincronizar orden histórica
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Sincroniza órdenes del WMS que no llegaron por el ciclo automático — ya sea porque
          eran anteriores a la fecha de corte o porque fallaron sin reintento.
        </p>

        {/* Selector de modo */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setModo('numero')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-colors ${
              modo === 'numero'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            <Search className="w-4 h-4" /> Por número de orden
          </button>
          <button
            onClick={() => setModo('rango')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-medium border transition-colors ${
              modo === 'rango'
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
            }`}
          >
            <CalendarRange className="w-4 h-4" /> Por rango de fechas
          </button>
        </div>

        {/* Formulario */}
        {modo === 'numero' ? (
          <div className="mb-5">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
              Número de orden WMS
            </label>
            <input
              type="text"
              value={numeroOrden}
              onChange={(e) => setNumeroOrden(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && puedeSync && handleSync()}
              placeholder="Ej: SYS-000130 o OP-2026-0103"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-colors"
            />
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
              Ingresa el systemNumberOrder o customerNumberOrder que aparece en el historial del WMS.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Desde
              </label>
              <DatePicker value={fechaDesde} onChange={setFechaDesde} placeholder="dd/mm/aaaa" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                Hasta
              </label>
              <DatePicker value={fechaHasta} onChange={setFechaHasta} placeholder="dd/mm/aaaa" />
            </div>
          </div>
        )}

        {/* Resultado */}
        {resultado && (
          <div className="mb-5 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Candidatas: <strong className="text-slate-700 dark:text-slate-200">{resultado.candidatas}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400">Sincronizadas: <strong>{resultado.procesadas}</strong></span>
              {resultado.ya_existentes > 0 && <span>Ya existían: <strong>{resultado.ya_existentes}</strong></span>}
              {resultado.errores > 0 && <span className="text-red-500">Errores: <strong>{resultado.errores}</strong></span>}
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
              {resultado.resultados.map((r, i) => {
                const cfg = RESULTADO_ESTADO[r.estado] || RESULTADO_ESTADO.error;
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-center gap-2 px-4 py-2 text-xs">
                    <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />
                    <span className="font-mono text-slate-700 dark:text-slate-200">{r.orden}</span>
                    {r.operacion && (
                      <span className="text-slate-400 dark:text-slate-500">→ {r.operacion}</span>
                    )}
                    {r.estado === 'ya_existe' && (
                      <span className="text-slate-400 dark:text-slate-500">ya existía</span>
                    )}
                    {r.error && (
                      <span className="text-red-500 truncate" title={r.error}>{r.error}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm transition-colors"
          >
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            onClick={handleSync}
            disabled={!puedeSync}
            className="flex-1 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <History className="w-4 h-4" />
            )}
            {loading ? 'Sincronizando...' : resultado ? 'Sincronizar de nuevo' : 'Sincronizar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// MODAL SYNC KARDEX CAJA
// ════════════════════════════════════════════════════════════════

const RESULTADO_KARDEX = {
  sincronizado: { color: 'text-emerald-600 dark:text-emerald-400', icon: CheckCircle2 },
  ya_existe: { color: 'text-slate-500 dark:text-slate-400', icon: Clock },
  error: { color: 'text-red-600 dark:text-red-400', icon: XCircle },
};

const ModalSyncKardex = ({ isOpen, onClose, onSync, loading, resultado }) => {
  const [numeroCaja, setNumeroCaja] = useState('');

  const handleClose = () => {
    setNumeroCaja('');
    onClose();
  };

  const puedeSync = !loading && numeroCaja.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-2xl w-full max-w-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
              <Box className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              Sincronizar kardex de caja
            </h3>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">
          Ingresa el número de caja para recuperar todos sus movimientos de kardex del WMS
          y sincronizar los que no existan en el CRM. Solo se procesan ajustes de tipo{' '}
          <strong className="text-slate-600 dark:text-slate-300">Carga</strong> (las Descargas
          llegan por el polling de órdenes).
        </p>

        {/* Input número de caja */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
            Número de caja
          </label>
          <input
            type="text"
            value={numeroCaja}
            onChange={(e) => setNumeroCaja(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && puedeSync && onSync({ numero_caja: numeroCaja.trim() })}
            placeholder="Ej: CJ-000045 o 12345"
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-colors"
          />
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
            La caja debe estar registrada en el CRM con producto y cliente asignados.
          </p>
        </div>

        {/* Resultado */}
        {resultado && (
          <div className="mb-5 rounded-xl border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>Total WMS: <strong className="text-slate-700 dark:text-slate-200">{resultado.total}</strong></span>
              <span className="text-emerald-600 dark:text-emerald-400">Sincronizados: <strong>{resultado.procesadas}</strong></span>
              {resultado.ya_existentes > 0 && <span>Ya existían: <strong>{resultado.ya_existentes}</strong></span>}
              {resultado.omitidas > 0 && <span className="text-slate-400">Omitidos: <strong>{resultado.omitidas}</strong></span>}
              {resultado.errores > 0 && <span className="text-red-500">Errores: <strong>{resultado.errores}</strong></span>}
            </div>
            <div className="max-h-48 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-700/50">
              {resultado.resultados.map((r, i) => {
                const cfg = RESULTADO_KARDEX[r.estado] || RESULTADO_KARDEX.error;
                const Icon = cfg.icon;
                return (
                  <div key={i} className="flex items-start gap-2 px-4 py-2 text-xs">
                    <Icon className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-slate-700 dark:text-slate-200 truncate">
                          {r.motivo || '—'}
                        </span>
                        {r.cantidad !== undefined && (
                          <span className="text-slate-500 dark:text-slate-400 shrink-0">
                            ×{Number(r.cantidad).toLocaleString('es-CO', { maximumFractionDigits: 2 })}
                          </span>
                        )}
                        {r.operacion && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                            → {r.operacion}
                          </span>
                        )}
                      </div>
                      {r.fecha && (
                        <span className="text-slate-400 dark:text-slate-500">
                          {formatFecha(r.fecha)}
                        </span>
                      )}
                      {r.error && (
                        <span className="text-red-500 block truncate" title={r.error}>{r.error}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm transition-colors"
          >
            {resultado ? 'Cerrar' : 'Cancelar'}
          </button>
          <button
            onClick={() => onSync({ numero_caja: numeroCaja.trim() })}
            disabled={!puedeSync}
            className="flex-1 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Box className="w-4 h-4" />
            )}
            {loading ? 'Sincronizando...' : resultado ? 'Sincronizar de nuevo' : 'Sincronizar'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════

export default function WmsDashboard() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [status, setStatus] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [historial, setHistorial] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [loadingReej, setLoadingReej] = useState(false);
  const [loadingPolling, setLoadingPolling] = useState(false);
  const [loadingHistorico, setLoadingHistorico] = useState(false);
  const [loadingKardex, setLoadingKardex] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showModalHistorico, setShowModalHistorico] = useState(false);
  const [showModalKardex, setShowModalKardex] = useState(false);
  const [resultadoHistorico, setResultadoHistorico] = useState(null);
  const [resultadoKardex, setResultadoKardex] = useState(null);
  const [tipoReej, setTipoReej] = useState('');
  const [filtros, setFiltros] = useState({
    tipo: '',
    estado: '',
    fecha_desde: '',
    fecha_hasta: '',
  });
  const [page, setPage] = useState(1);

  const cargarStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await wmsDashboardService.getStatus();
      setStatus(res.data);
    } catch {
      setStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const cargarEstadisticas = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await wmsDashboardService.getEstadisticas();
      setEstadisticas(res.data);
    } catch {
      setEstadisticas(null);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    setLoadingHistorial(true);
    try {
      const params = { page, limit: 15, ...filtros };
      Object.keys(params).forEach((k) => {
        if (!params[k]) delete params[k];
      });
      const res = await wmsDashboardService.getHistorial(params);
      setHistorial(res.data || []);
      setPagination(res.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      setHistorial([]);
    } finally {
      setLoadingHistorial(false);
    }
  }, [page, filtros]);

  useEffect(() => {
    cargarStatus();
    cargarEstadisticas();
  }, [cargarStatus, cargarEstadisticas]);
  useEffect(() => {
    cargarHistorial();
  }, [cargarHistorial]);

  const handleRefresh = () => {
    cargarStatus();
    cargarEstadisticas();
    cargarHistorial();
  };
  const handleFiltro = (key, val) => {
    setFiltros((prev) => ({ ...prev, [key]: val }));
    setPage(1);
  };
  const limpiarFiltros = () => {
    setFiltros({ tipo: '', estado: '', fecha_desde: '', fecha_hasta: '' });
    setPage(1);
  };

  const handleEjecutarPolling = async () => {
    setLoadingPolling(true);
    try {
      const res = await wmsDashboardService.ejecutarPolling();
      enqueueSnackbar(res.data?.message || 'Polling iniciado correctamente', { variant: 'success' });
      setTimeout(handleRefresh, 3000);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Error al iniciar polling';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setLoadingPolling(false);
    }
  };

  const handleReejecutar = async () => {
    setLoadingReej(true);
    try {
      const res = await wmsDashboardService.reejecutar(tipoReej || null);
      enqueueSnackbar(
        res.data?.resultado?.numero_operacion
          ? `Re-ejecución completada — operación ${res.data.resultado.numero_operacion}`
          : 'Re-ejecución completada exitosamente',
        { variant: 'success' }
      );
      setShowModal(false);
      setTipoReej('');
      handleRefresh();
    } catch (err) {
      enqueueSnackbar(err?.message || err?.response?.data?.message || 'Error al re-ejecutar', {
        variant: 'error',
      });
    } finally {
      setLoadingReej(false);
    }
  };

  const handleSyncHistorico = async (payload) => {
    setLoadingHistorico(true);
    try {
      const res = await wmsDashboardService.syncHistorico(payload);
      setResultadoHistorico(res.data);
      const msg = res.message || `${res.data?.procesadas ?? 0} orden(es) sincronizada(s)`;
      enqueueSnackbar(msg, {
        variant: res.data?.procesadas > 0 ? 'success' : 'info',
      });
      if (res.data?.procesadas > 0) handleRefresh();
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.message || err?.message || 'Error al sincronizar histórico',
        { variant: 'error' }
      );
    } finally {
      setLoadingHistorico(false);
    }
  };

  const handleSyncKardex = async (payload) => {
    setLoadingKardex(true);
    try {
      const res = await wmsDashboardService.syncKardexCaja(payload);
      setResultadoKardex(res.data);
      const msg = res.message || `${res.data?.procesadas ?? 0} movimiento(s) sincronizado(s)`;
      enqueueSnackbar(msg, {
        variant: res.data?.procesadas > 0 ? 'success' : 'info',
      });
      if (res.data?.procesadas > 0) handleRefresh();
    } catch (err) {
      enqueueSnackbar(
        err?.response?.data?.message || err?.message || 'Error al sincronizar kardex',
        { variant: 'error' }
      );
    } finally {
      setLoadingKardex(false);
    }
  };

  const apiOnline = status?.api_activa && !loadingStatus;
  const hayFiltros = Object.values(filtros).some(Boolean);


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-[1700px] mx-auto space-y-6">
        {/* ── ENCABEZADO ── */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-xl">
              <Activity className="w-7 h-7 text-[#E74C3C] dark:text-red-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">
                Dashboard WMS CenthriX
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-0.5 text-sm">
                Monitoreo de sincronizaciones en tiempo real
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Indicador de conexión */}
            {loadingStatus ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" /> Verificando...
              </div>
            ) : apiOnline ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm font-medium">
                <Wifi className="w-4 h-4" /> API Activa
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm font-medium">
                <WifiOff className="w-4 h-4" /> Sin datos
              </div>
            )}

            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>

            <button
              onClick={handleEjecutarPolling}
              disabled={loadingPolling || status?.polling?.ejecutando}
              title={status?.polling?.ejecutando ? 'El polling ya está en ejecución' : 'Ejecutar ciclo de polling ahora'}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-medium shadow-sm transition-colors"
            >
              {loadingPolling || status?.polling?.ejecutando ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {status?.polling?.ejecutando ? 'Polling en curso...' : 'Ejecutar polling'}
            </button>

            <button
              onClick={() => { setResultadoHistorico(null); setShowModalHistorico(true); }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium shadow-sm transition-colors"
            >
              <History className="w-4 h-4" /> Sincronizar histórico
            </button>

            <button
              onClick={() => { setResultadoKardex(null); setShowModalKardex(true); }}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium shadow-sm transition-colors"
            >
              <Box className="w-4 h-4" /> Kardex por caja
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-[#E74C3C] hover:bg-[#C0392B] text-white text-sm font-medium shadow-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Re-ejecutar último sync
            </button>
          </div>
        </div>

        {/* ── BARRA DE ESTADO ── */}
        {status && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm px-5 py-3 flex flex-wrap items-center gap-6 text-sm">
            <span className="text-slate-500 dark:text-slate-400">
              Último sync exitoso:{' '}
              <strong className="text-slate-800 dark:text-slate-100">
                {status.ultimo_sync_exitoso
                  ? formatFecha(status.ultimo_sync_exitoso)
                  : 'Nunca'}
              </strong>
              {status.ultimo_sync_exitoso && (
                <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
                  ({tiempoRelativo(status.ultimo_sync_exitoso)})
                </span>
              )}
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Tipo:{' '}
              <strong className="text-slate-800 dark:text-slate-100 capitalize">
                {status.ultimo_tipo || '—'}
              </strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Fallos últimas 24h:{' '}
              <strong
                className={
                  status.fallidos_24h > 0
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }
              >
                {status.fallidos_24h}
              </strong>
            </span>
            {status.polling?.activo && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                <span className={`inline-block w-2 h-2 rounded-full ${status.polling.ejecutando ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                Polling {status.polling.ejecutando ? 'ejecutando' : 'activo'}
              </span>
            )}
            <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
              v{status.version}
            </span>
          </div>
        )}

        {/* ── KPIs PRINCIPALES ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Activity}
            label="Syncs hoy"
            valor={estadisticas?.resumen?.hoy}
            sub="en las últimas 24h"
            colorBg="bg-red-100 dark:bg-red-900/30"
            colorIcon="text-[#E74C3C] dark:text-red-400"
            loading={loadingStats}
          />
          <KpiCard
            icon={TrendingUp}
            label="Esta semana"
            valor={estadisticas?.resumen?.semana}
            sub="últimos 7 días"
            colorBg="bg-blue-100 dark:bg-blue-900/30"
            colorIcon="text-blue-600 dark:text-blue-400"
            loading={loadingStats}
          />
          <KpiCard
            icon={Package}
            label="Este mes"
            valor={estadisticas?.resumen?.mes}
            sub="últimos 30 días"
            colorBg="bg-purple-100 dark:bg-purple-900/30"
            colorIcon="text-purple-600 dark:text-purple-400"
            loading={loadingStats}
          />
          <KpiCard
            icon={CheckCircle2}
            label="Tasa de éxito"
            valor={estadisticas ? `${estadisticas.tasa_exito}%` : null}
            sub={`${estadisticas?.por_estado?.fallido ?? 0} fallos totales`}
            colorBg="bg-emerald-100 dark:bg-emerald-900/30"
            colorIcon="text-emerald-600 dark:text-emerald-400"
            loading={loadingStats}
          />
        </div>

        {/* ── DESGLOSE POR TIPO ── */}
        {estadisticas && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                tipo: 'entrada',
                icon: TrendingUp,
                colorBg: 'bg-emerald-100 dark:bg-emerald-900/30',
                colorIcon: 'text-emerald-600 dark:text-emerald-400',
              },
              {
                tipo: 'salida',
                icon: TrendingDown,
                colorBg: 'bg-blue-100 dark:bg-blue-900/30',
                colorIcon: 'text-blue-600 dark:text-blue-400',
              },
              {
                tipo: 'kardex',
                icon: RefreshCw,
                colorBg: 'bg-amber-100 dark:bg-amber-900/30',
                colorIcon: 'text-amber-600 dark:text-amber-400',
              },
              {
                tipo: 'productos',
                icon: Package,
                colorBg: 'bg-purple-100 dark:bg-purple-900/30',
                colorIcon: 'text-purple-600 dark:text-purple-400',
              },
            ].map(({ tipo, icon: Icon, colorBg, colorIcon }) => (
              <div
                key={tipo}
                className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm px-4 py-3 flex items-center gap-3"
              >
                <div className={`p-2 rounded-xl ${colorBg}`}>
                  <Icon className={`w-4 h-4 ${colorIcon}`} />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">
                    {TIPO_LABEL[tipo]}
                  </p>
                  <p className="text-xl font-bold text-slate-800 dark:text-slate-100 font-display">
                    {estadisticas.por_tipo[tipo] ?? 0}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── HISTORIAL ── */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm">
          {/* Cabecera tabla */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Historial de sincronizaciones
              </h2>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                ({pagination.total} registros)
              </span>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-2">
              <FilterDropdown
                compact
                options={[
                  { value: '', label: 'Todos los tipos' },
                  { value: 'entrada', label: 'Entrada (PUSH)' },
                  { value: 'salida', label: 'Salida (PUSH)' },
                  { value: 'kardex', label: 'Kardex (PUSH)' },
                  { value: 'productos', label: 'Productos' },
                  { value: 'batch', label: 'Batch' },
                  { value: 'polling_entrada', label: 'Entrada (polling)' },
                  { value: 'polling_salida', label: 'Salida (polling)' },
                  { value: 'polling_kardex', label: 'Kardex (polling)' },
                ]}
                value={filtros.tipo}
                onChange={(v) => handleFiltro('tipo', v)}
              />
              <FilterDropdown
                compact
                options={[
                  { value: '', label: 'Todos los estados' },
                  { value: 'exitoso', label: 'Exitoso' },
                  { value: 'fallido', label: 'Fallido' },
                ]}
                value={filtros.estado}
                onChange={(v) => handleFiltro('estado', v)}
              />
              <DatePicker
                value={filtros.fecha_desde}
                onChange={(v) => handleFiltro('fecha_desde', v)}
              />
              <DatePicker
                value={filtros.fecha_hasta}
                onChange={(v) => handleFiltro('fecha_hasta', v)}
              />
              {hayFiltros && (
                <button
                  onClick={limpiarFiltros}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <X className="w-3 h-3" /> Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="text-left px-5 py-3 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                    Documento
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                    Error
                  </th>
                  <th className="text-left px-4 py-3 text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wide">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {loadingHistorial ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div
                            className="h-4 bg-slate-100 dark:bg-slate-700 rounded animate-pulse"
                            style={{ width: `${60 + Math.random() * 40}%` }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : historial.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-14 text-center">
                      <Activity className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-slate-500 dark:text-slate-400">
                        Sin registros de sincronización
                      </p>
                      {hayFiltros && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          Intenta limpiar los filtros
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  historial.map((log) => (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-5 py-3">
                        <TipoBadge tipo={log.tipo} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                          {log.detalles?.pallet_code || log.documento_origen || '—'}
                        </div>
                        {log.detalles?.numero_operacion && (
                          <div className="font-mono text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            {log.detalles.numero_operacion}
                            {log.detalles.re_ejecucion && (
                              <span className="ml-1 text-amber-500 dark:text-amber-400">(re-ej.)</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <EstadoBadge estado={log.estado} />
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        {log.error_mensaje ? (
                          <span
                            className="text-red-600 dark:text-red-400 text-xs flex items-start gap-1"
                            title={log.error_mensaje}
                          >
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span className="truncate block max-w-[240px]">
                              {log.error_mensaje}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {formatFecha(log.created_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Página {pagination.page} de {pagination.totalPages} ({pagination.total} registros)
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL RE-EJECUTAR ── */}
      <ModalReejecutar
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setTipoReej('');
        }}
        onConfirm={handleReejecutar}
        loading={loadingReej}
        tipo={tipoReej}
        setTipo={setTipoReej}
      />

      {/* ── MODAL SYNC HISTÓRICO ── */}
      <ModalSyncHistorico
        isOpen={showModalHistorico}
        onClose={() => { setShowModalHistorico(false); setResultadoHistorico(null); }}
        onSync={handleSyncHistorico}
        loading={loadingHistorico}
        resultado={resultadoHistorico}
      />

      {/* ── MODAL SYNC KARDEX CAJA ── */}
      <ModalSyncKardex
        isOpen={showModalKardex}
        onClose={() => { setShowModalKardex(false); setResultadoKardex(null); }}
        onSync={handleSyncKardex}
        loading={loadingKardex}
        resultado={resultadoKardex}
      />
    </div>
  );
}
