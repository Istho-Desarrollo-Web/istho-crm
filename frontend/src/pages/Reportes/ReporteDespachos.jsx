/**
 * ISTHO CRM - ReporteDespachos Page
 * Reporte de operaciones (entradas/salidas) con exportación real y filtros
 *
 * @author Coordinación TI ISTHO
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Download,
  CheckCircle,
  Clock,
  XCircle,
  FileSpreadsheet,
  RefreshCw,
  ArrowDownCircle,
  ArrowUpCircle,
  Activity,
  Mail,
} from 'lucide-react';

// Components
import { Button, KpiCard, ReportFilters } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';

// API
import reportesService from '../../api/reportes.service';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// ============================================
// MAIN COMPONENT
// ============================================
const ReporteDespachos = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const canDownload = hasPermission('reportes', 'exportar') || hasPermission('reportes', 'descargar');
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [comparativo, setComparativo] = useState(null);
  const [error, setError] = useState(null);
  const [emailModal, setEmailModal] = useState(false);

  const [filters, setFilters] = useState({
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    cliente_id: searchParams.get('cliente_id') || '',
  });

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params, { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, compRes] = await Promise.all([
        reportesService.getDashboard(),
        reportesService.getComparativo({ meses: 6 }),
      ]);
      if (dashRes?.success && dashRes.data) setStats(dashRes.data);
      if (compRes?.success && compRes.data) setComparativo(compRes.data);
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Construir query string con filtros
  const buildFilterParams = () => {
    const params = new URLSearchParams();
    const token = localStorage.getItem('istho_token');
    if (token) params.set('token', token);
    if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);
    if (filters.cliente_id) params.set('cliente_id', filters.cliente_id);
    return params.toString();
  };

  const handleExport = (format) => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const endpoint = format === 'excel'
      ? '/reportes/operaciones/excel'
      : '/reportes/operaciones/pdf';
    window.open(`${baseUrl}${endpoint}?${buildFilterParams()}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              <div className="h-80 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  const operaciones = stats?.operaciones || {};
  const porEstado = operaciones.porEstado || {};
  const porTipo = operaciones.porTipo || {};

  // Chart data
  const barData = Object.entries(porEstado).map(([estado, cantidad]) => ({
    label: estado.replace('_', ' ').charAt(0).toUpperCase() + estado.replace('_', ' ').slice(1),
    value1: cantidad || 0,
  }));

  const pieData = [
    { name: 'Ingresos', value: porTipo.ingreso || 0 },
    { name: 'Salidas', value: porTipo.salida || 0 },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reporte de Operaciones</h1>
                <p className="text-slate-500 dark:text-slate-400">Entradas y salidas del WMS</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" icon={RefreshCw} onClick={fetchData}>
              Actualizar
            </Button>
            {canDownload && (
              <>
                <Button variant="outline" icon={Mail} onClick={() => setEmailModal(true)}>
                  Enviar
                </Button>
                <Button variant="outline" icon={FileSpreadsheet} onClick={() => handleExport('excel')}>
                  Excel
                </Button>
                <Button variant="primary" icon={Download} onClick={() => handleExport('pdf')}>
                  PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Filtros */}
        <ReportFilters filters={filters} onChange={handleFiltersChange} />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Operaciones"
            value={operaciones.total || 0}
            subtitle={`${operaciones.mes || 0} este mes`}
            icon={Activity}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            title="Entradas Pendientes"
            value={operaciones.entradasPendientes || 0}
            subtitle="Ingresos por auditar"
            icon={ArrowDownCircle}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            title="Salidas Pendientes"
            value={operaciones.salidasPendientes || 0}
            subtitle="Despachos por auditar"
            icon={ArrowUpCircle}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <KpiCard
            title="Cerradas este Mes"
            value={operaciones.cerradasMes || 0}
            subtitle={`${porEstado.anulado || 0} anuladas`}
            icon={CheckCircle}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <BarChart
            title="Operaciones por Estado"
            subtitle="Distribución actual"
            data={barData}
            legend={[{ label: 'Cantidad', color: '#3b82f6' }]}
            height={300}
          />
          <PieChart
            title="Ingresos vs Salidas"
            subtitle="Distribución por tipo"
            data={pieData}
            size={180}
          />
        </div>

        {/* Tendencia mensual */}
        {comparativo?.meses?.length > 0 && (
          <div className="mb-6">
            <BarChart
              title="Tendencia de Operaciones (últimos 6 meses)"
              subtitle="Entradas vs Salidas por mes"
              data={comparativo.meses.map(m => ({
                label: m.mes,
                value1: m.entradas,
                value2: m.salidas,
              }))}
              legend={[
                { label: 'Entradas', color: '#10b981' },
                { label: 'Salidas', color: '#3b82f6' },
              ]}
              height={280}
            />
          </div>
        )}

        {/* Variaciones mes vs anterior */}
        {comparativo?.comparacion && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Operaciones', ...comparativo.comparacion.operaciones },
              { label: 'Entradas', ...comparativo.comparacion.entradas },
              { label: 'Salidas', ...comparativo.comparacion.salidas },
            ].map(({ label, actual, anterior, variacion }) => (
              <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{label} vs mes anterior</p>
                <div className="flex items-end justify-between">
                  <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{actual}</p>
                  <div className={`flex items-center gap-1 text-sm font-medium ${
                    variacion > 0 ? 'text-emerald-600' : variacion < 0 ? 'text-red-600' : 'text-slate-400'
                  }`}>
                    {variacion > 0 ? '↑' : variacion < 0 ? '↓' : '='} {Math.abs(variacion)}%
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Anterior: {anterior}</p>
              </div>
            ))}
          </div>
        )}

        {/* Resumen */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Resumen por Estado</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(porEstado).map(([estado, cantidad]) => {
              const config = {
                pendiente: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                en_proceso: { icon: RefreshCw, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                cerrado: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                anulado: { icon: XCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
              };
              const { icon: Icon, color, bg } = config[estado] || config.pendiente;
              return (
                <div key={estado} className={`p-4 rounded-xl ${bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className={`text-sm font-medium ${color} capitalize`}>{estado.replace('_', ' ')}</span>
                  </div>
                  <p className={`text-2xl font-bold ${color}`}>{cantidad || 0}</p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="operaciones"
        onSend={async (data) => {
          const res = await reportesService.enviarPorEmail({ ...data, cliente_id: filters.cliente_id });
          if (res.success) enqueueSnackbar(res.message, { variant: 'success' });
          else throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteDespachos;
