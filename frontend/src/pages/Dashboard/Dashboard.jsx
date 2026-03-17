/**
 * ============================================================================
 * ISTHO CRM - Dashboard (Refactored v3.0 - Auditoría WMS)
 * ============================================================================
 * Dashboard actualizado para reflejar el flujo de auditoría de Entradas y
 * Salidas del WMS. Muestra KPIs de auditoría, tablas de operaciones
 * recientes, gráficos y alertas de inventario.
 * 
 * @author Coordinación TI ISTHO
 * @version 3.0.0
 * @date Marzo 2026
 */

import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Package,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  Clock,
  ArrowDownCircle,
  ArrowUpCircle,
  Loader2,
  FileCheck,
  Activity,
  ChevronRight,
  Eye,
} from 'lucide-react';

// Common Components
import { KpiCard, DataTable, AlertWidget } from '../../components/common';

// Charts
import { BarChart, PieChart } from '../../components/charts';

// ════════════════════════════════════════════════════════════════════════════
// HOOKS INTEGRADOS
// ════════════════════════════════════════════════════════════════════════════
import { useAuth } from '../../context/AuthContext';
import useDashboard from '../../hooks/useDashboard';
import useNotification from '../../hooks/useNotification';
import inventarioService from '../../api/inventario.service';
import logoNegro from '../../assets/logo-negro.png';
import logoBlanco from '../../assets/logo-blanco.png';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE KPIs
// ════════════════════════════════════════════════════════════════════════════

const KPI_CONFIG = [
  {
    id: 'entradas_pendientes',
    title: 'Entradas Pendientes',
    icon: ArrowDownCircle,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    kpiKey: 'entradasPendientes',
    fallback: 0,
  },
  {
    id: 'salidas_pendientes',
    title: 'Salidas Pendientes',
    icon: ArrowUpCircle,
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    kpiKey: 'salidasPendientes',
    fallback: 0,
  },
  {
    id: 'auditorias_cerradas',
    title: 'Cerradas este Mes',
    icon: FileCheck,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    kpiKey: 'auditoriasCerradasMes',
    fallback: 0,
    changeKey: 'tasaCumplimiento',
    changeSuffix: '% cumplimiento',
  },
  {
    id: 'productos_stock',
    title: 'Productos en Stock',
    icon: Package,
    iconBg: 'bg-violet-100 dark:bg-violet-900/30',
    iconColor: 'text-violet-600 dark:text-violet-400',
    kpiKey: 'totalProductos',
    fallback: 0,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// STATUS BADGE MINI
// ════════════════════════════════════════════════════════════════════════════

const STATUS_STYLES = {
  pendiente: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-500',
    label: 'Pendiente',
  },
  en_proceso: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-700 dark:text-blue-300',
    dot: 'bg-blue-500',
    label: 'En Proceso',
  },
  cerrado: {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    label: 'Cerrado',
  },
};

const StatusBadgeMini = ({ status }) => {
  const s = STATUS_STYLES[status] || STATUS_STYLES.pendiente;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// OPERATIONS TABLE ROW
// ════════════════════════════════════════════════════════════════════════════

const OperationRow = ({ op, type, onClick }) => {
  const progress = op.lineas > 0 ? Math.round((op.verificadas / op.lineas) * 100) : 0;
  const accentColor = type === 'entrada' ? 'emerald' : 'blue';

  return (
    <tr
      onClick={() => onClick(op)}
      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer transition-colors group"
    >
      <td className="px-4 py-3">
        <p className={`text-sm font-semibold text-${accentColor}-600 dark:text-${accentColor}-400`}>{op.documento}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate max-w-[180px]">{op.cliente}</p>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <p className="text-xs text-slate-500 dark:text-slate-400">{op.tipo}</p>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 max-w-[60px] h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all bg-${accentColor}-500`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 font-mono">{op.verificadas}/{op.lineas}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadgeMini status={op.estado} />
      </td>
      <td className="px-4 py-3 text-right">
        <Eye className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors inline-block" />
      </td>
    </tr>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// OPERATIONS TABLE CARD
// ════════════════════════════════════════════════════════════════════════════

const OperationsCard = ({ title, subtitle, icon: Icon, accentColor, operations, type, onRowClick, onViewAll }) => (
  <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${accentColor}-100 dark:bg-${accentColor}-900/30`}>
          <Icon className={`w-5 h-5 text-${accentColor}-600 dark:text-${accentColor}-400`} />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
        </div>
      </div>
      <button
        onClick={onViewAll}
        className={`text-xs font-semibold text-${accentColor}-600 dark:text-${accentColor}-400 hover:underline flex items-center gap-1`}
      >
        Ver todas <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50/50 dark:bg-slate-900/30">
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Doc</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cliente</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">Tipo</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Líneas</th>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Estado</th>
            <th className="px-4 py-2.5 w-8" />
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => (
            <OperationRow key={op.id} op={op} type={type} onClick={onRowClick} />
          ))}
          {operations.length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-400">No hay operaciones recientes</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// QUICK ACTION CARD
// ════════════════════════════════════════════════════════════════════════════

const QuickAction = ({ icon: Icon, label, description, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 hover:border-transparent hover:shadow-md dark:hover:shadow-lg transition-all group text-left w-full"
  >
    <div className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 group-hover:scale-110 transition-transform`}>
      <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{description}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
  </button>
);

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const Dashboard = () => {
  const navigate = useNavigate();

  // ── HOOKS ──
  const { user } = useAuth();
  const { inventoryAlert, info } = useNotification();

  const {
    loading,
    error,
    isRefreshing,
    kpis,
    chartData,
    refresh,
    lastUpdated,
    ultimasEntradas,
    ultimasSalidas,
  } = useDashboard({
    autoFetch: true,
    clienteId: user?.rol === 'cliente' ? user?.cliente_id : null,
    refreshInterval: 60000,
  });

  // ── ALERTAS REALES DEL BACKEND ──
  const [realAlertas, setRealAlertas] = useState([]);
  const [loadingAlertas, setLoadingAlertas] = useState(true);
  const [alertasCounts, setAlertasCounts] = useState({ agotado: 0, stock_bajo: 0, vencimiento: 0 });

  const fetchAlertas = useCallback(async () => {
    try {
      setLoadingAlertas(true);
      const response = await inventarioService.getAlertas();
      const data = response?.data || response || [];
      const items = Array.isArray(data) ? data : [];
      setRealAlertas(items);
      setAlertasCounts({
        agotado: items.filter(a => a.tipo === 'agotado').length,
        stock_bajo: items.filter(a => a.tipo === 'bajo_stock').length,
        vencimiento: items.filter(a => a.tipo === 'vencimiento').length,
      });
    } catch {
      setRealAlertas([]);
    } finally {
      setLoadingAlertas(false);
    }
  }, []);

  // ── EFFECTS ──
  useEffect(() => {
    fetchAlertas();
  }, [fetchAlertas]);

  useEffect(() => {
    if (!loadingAlertas && realAlertas.length > 0) {
      const porTipo = {
        agotado: realAlertas.filter(a => a.tipo === 'agotado'),
        stock_bajo: realAlertas.filter(a => a.tipo === 'bajo_stock'),
        vencimiento: realAlertas.filter(a => a.tipo === 'vencimiento'),
      };
      inventoryAlert(realAlertas.length, porTipo);
    }
  }, [loadingAlertas]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── HANDLERS ──
  const handleEntradaClick = (row) => navigate(`/inventario/entradas/${row.id}`);
  const handleSalidaClick = (row) => navigate(`/inventario/salidas/${row.id}`);

  const handleAlertClick = (alert) => {
    if (alert.originalData?.producto_id) {
      navigate(`/inventario/${alert.originalData.producto_id}`);
    } else {
      navigate('/inventario/alertas');
    }
  };

  const handleRefresh = () => {
    refresh();
    fetchAlertas();
    info('Actualizando datos...');
  };

  // ── CHART DATA ──
  const barData = chartData.despachosPorEstado?.map(item => ({
    label: item.name,
    value1: item.value,
  })) || [];

  const pieData = chartData.ingresosVsSalidas || [];

  // ── ALERTS FORMAT (desde alertas reales del backend) ──
  const formattedAlertas = realAlertas.slice(0, 5).map(alerta => ({
    id: alerta.id,
    type: alerta.tipo === 'vencimiento' ? 'vencimiento' : 'inventario',
    title: alerta.tipo === 'bajo_stock'
      ? `Stock bajo - ${alerta.producto_nombre || alerta.nombre}`
      : alerta.tipo === 'agotado'
        ? `Agotado - ${alerta.producto_nombre || alerta.nombre}`
        : `Por vencer - ${alerta.producto_nombre || alerta.nombre}`,
    description: alerta.tipo === 'vencimiento'
      ? `Vence en ${alerta.dias_restantes || '?'} días`
      : `${alerta.stock_actual ?? alerta.stockActual ?? 0} ${alerta.unidad_medida || 'UND'} disponibles`,
    date: alerta.fecha_vencimiento
      ? `Vence: ${new Date(alerta.fecha_vencimiento).toLocaleDateString('es-CO')}`
      : alerta.cliente_nombre || alerta.cliente || '',
    originalData: alerta,
  }));

  // ── RENDER ──
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PAGE HEADER */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              Bienvenido, {user?.nombre_completo?.split(' ')[0] || 'Usuario'}
            </h1>
            <p className="text-slate-500 mt-1 dark:text-slate-400">
              Panel de Auditoría WMS
              {lastUpdated && (
                <span className="text-xs ml-2 text-slate-400 dark:text-slate-600">
                  • Actualizado: {new Date(lastUpdated).toLocaleTimeString('es-CO')}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`
              flex items-center gap-2 px-4 py-2 
              bg-white dark:bg-slate-800
              border border-gray-200 dark:border-slate-700
              rounded-xl 
              hover:bg-gray-50 dark:hover:bg-slate-700
              transition-colors shadow-sm
              ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <RefreshCw className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300">Actualizar</span>
          </button>
        </div>

        {/* ERROR STATE */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300">
            <p className="font-medium">Error al cargar datos</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* KPI CARDS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {KPI_CONFIG.map((kpiConfig) => {
            let value = kpis[kpiConfig.kpiKey] ?? kpiConfig.fallback ?? '-';
            if (kpiConfig.suffix && value !== '-') {
              value = `${value}${kpiConfig.suffix}`;
            }

            let change = null;
            if (kpiConfig.changeKey && (kpis[kpiConfig.changeKey] || kpiConfig.changeSuffix)) {
              const changeVal = kpis[kpiConfig.changeKey] || '0';
              change = `${kpiConfig.changePrefix || ''}${changeVal}${kpiConfig.changeSuffix || ''}`;
            }

            return (
              <KpiCard
                key={kpiConfig.id}
                title={kpiConfig.title}
                value={value}
                change={change}
                positive={true}
                icon={kpiConfig.icon}
                iconBg={kpiConfig.iconBg}
                iconColor={kpiConfig.iconColor}
                loading={loading}
              />
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* QUICK ACTIONS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <QuickAction
            icon={ArrowDownCircle}
            label="Entradas"
            description="Auditar recepciones WMS"
            color="emerald"
            onClick={() => navigate('/inventario/entradas')}
          />
          <QuickAction
            icon={ArrowUpCircle}
            label="Salidas"
            description="Auditar despachos WMS"
            color="blue"
            onClick={() => navigate('/inventario/salidas')}
          />
          <QuickAction
            icon={Package}
            label="Inventario"
            description="Maestro de productos"
            color="violet"
            onClick={() => navigate('/inventario')}
          />
          <QuickAction
            icon={Users}
            label="Clientes"
            description="Gestión de clientes"
            color="orange"
            onClick={() => navigate('/clientes')}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CHARTS ROW */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <BarChart
            title="Auditorías por Estado"
            subtitle="Distribución actual de operaciones"
            data={barData}
            legend={[
              { label: 'Cantidad', color: '#E65100' },
            ]}
            height={300}
            loading={loading}
          />

          <PieChart
            title="Entradas vs Salidas"
            subtitle="Operaciones del mes"
            data={pieData}
            size={180}
            loading={loading}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* OPERATIONS TABLES */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <OperationsCard
            title="Entradas Recientes"
            subtitle="Últimas recepciones del WMS"
            icon={ArrowDownCircle}
            accentColor="emerald"
            operations={ultimasEntradas}
            type="entrada"
            onRowClick={handleEntradaClick}
            onViewAll={() => navigate('/inventario/entradas')}
          />

          <OperationsCard
            title="Salidas Recientes"
            subtitle="Últimos despachos del WMS"
            icon={ArrowUpCircle}
            accentColor="blue"
            operations={ultimasSalidas}
            type="salida"
            onRowClick={handleSalidaClick}
            onViewAll={() => navigate('/inventario/salidas')}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ALERTS + SUMMARY */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Resumen Rápido de Auditoría */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Activity className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Resumen de Auditoría</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Estado actual del proceso de verificación</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Pendientes */}
              <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-amber-500" />
                  <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">Pendientes</span>
                </div>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-1">
                  {(kpis.entradasPendientes ?? 0) + (kpis.salidasPendientes ?? 0)}
                </p>
                <p className="text-xs text-amber-500/80 dark:text-amber-400/60">Requieren atención</p>
              </div>

              {/* En Proceso */}
              <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="w-5 h-5 text-blue-500" />
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">En Proceso</span>
                </div>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {kpis.auditoriasEnProceso ?? 0}
                </p>
                <p className="text-xs text-blue-500/80 dark:text-blue-400/60">Verificándose ahora</p>
              </div>

              {/* Cerradas */}
              <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                  <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Cerradas</span>
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                  {kpis.auditoriasCerradasMes ?? 0}
                </p>
                <p className="text-xs text-emerald-500/80 dark:text-emerald-400/60">Completadas este mes</p>
              </div>
            </div>
          </div>

          {/* Alertas Widget */}
          <div className="lg:col-span-1">
            <AlertWidget
              title="Alertas de Inventario"
              alerts={formattedAlertas}
              onAlertClick={handleAlertClick}
              onViewAll={() => navigate('/inventario/alertas')}
              maxItems={4}
              loading={loadingAlertas}
              emptyIcon={CheckCircle}
              emptyMessage="Sin alertas pendientes"
            />

            {!loadingAlertas && realAlertas.length > 0 && (
              <div className="mt-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
                <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Resumen de Alertas</h4>
                <div className="space-y-2">
                  {alertasCounts.agotado > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Agotados
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{alertasCounts.agotado}</span>
                    </div>
                  )}
                  {alertasCounts.stock_bajo > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Stock Bajo
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{alertasCounts.stock_bajo}</span>
                    </div>
                  )}
                  {alertasCounts.vencimiento > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-orange-600 dark:text-orange-400 flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Por Vencer
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">{alertasCounts.vencimiento}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <footer className="flex flex-col items-center gap-3 py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <img src={logoNegro} alt="ISTHO" className="w-6 h-6 rounded dark:hidden" />
            <img src={logoBlanco} alt="ISTHO" className="w-6 h-6 rounded hidden dark:block" />
            <span>© 2026 ISTHO S.A.S. - Sistema CRM Interno</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">Centro Logístico Industrial del Norte, Girardota, Antioquia</span>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;