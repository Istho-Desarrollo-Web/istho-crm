// frontend/src/pages/Reportes/ReporteSolicitudes.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Mail,
} from 'lucide-react';

import { KpiCard, FilterDropdown, DatePicker, AccionesDropdown } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';
import reportesService from '../../api/reportes.service';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import { descargarArchivo, fechaDescarga } from '../../utils/descargas';

const ESTADO_LABEL = {
  recibida: 'Recibida',
  en_proceso: 'En Proceso',
  completada: 'Completada',
  rechazada: 'Rechazada',
};

const ReporteSolicitudes = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canDownload = hasPermission('reportes', 'exportar') || hasPermission('reportes', 'descargar');

  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [emailModal, setEmailModal] = useState(false);

  const [filtros, setFiltros] = useState({
    desde: searchParams.get('desde') || '',
    hasta: searchParams.get('hasta') || '',
    tipo: searchParams.get('tipo') || '',
    estado: searchParams.get('estado') || '',
  });

  const handleFiltroChange = (campo, valor) => {
    const next = { ...filtros, [campo]: valor };
    setFiltros(next);
    const params = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params, { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const res = await reportesService.getReporteSolicitudes(params);
      setData(res?.data || null);
    } catch (err) {
      setError(err.message || 'Error al cargar el reporte');
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [filtros]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
    return params.toString();
  };

  const handleExport = async (format) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const endpoint = format === 'excel' ? '/reportes/solicitudes/excel' : '/reportes/solicitudes/pdf';
      await descargarArchivo(
        `${baseUrl}${endpoint}?${buildFilterParams()}`,
        `reporte-solicitudes-${fechaDescarga()}.${ext}`
      );
    } catch {
      enqueueSnackbar('Error al exportar reporte', { variant: 'error' });
    }
  };

  const kpis = data?.kpis;
  const tabla = data?.tabla || [];
  const porMes = data?.por_mes || [];
  const porTipo = data?.por_tipo || [];

  const barData = porMes.map((m) => ({
    label: m.mes,
    value1: m.ingreso || 0,
    value2: m.despacho || 0,
  }));
  const pieData = porTipo
    .filter((t) => t.cantidad > 0)
    .map((t) => ({ name: t.tipo === 'Ingresos' ? 'Ingresos' : 'Despachos', value: t.cantidad }));

  if (loading && firstLoad) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-centhrix-bg dark:to-centhrix-bg">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-centhrix-surface rounded w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-centhrix-surface rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-centhrix-bg dark:to-centhrix-bg">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-centhrix-card rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <ClipboardCheck className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Reporte de Solicitudes
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  Tiempos de respuesta, cumplimiento y volumen
                </p>
              </div>
            </div>
          </div>

          <div id="tour-reportes-solicitudes-exportar">
            <AccionesDropdown
              acciones={[
                { label: 'Actualizar', icon: RefreshCw, onClick: fetchData },
                {
                  label: 'Enviar',
                  icon: Mail,
                  onClick: () => setEmailModal(true),
                  hidden: !canDownload,
                },
                {
                  label: 'Excel',
                  icon: FileSpreadsheet,
                  onClick: () => handleExport('excel'),
                  hidden: !canDownload,
                },
                {
                  label: 'PDF',
                  icon: Download,
                  onClick: () => handleExport('pdf'),
                  hidden: !canDownload,
                  variant: 'primary',
                },
              ]}
            />
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Filtros */}
        <div
          id="tour-reportes-solicitudes-filtros"
          className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6"
        >
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-40">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
              <DatePicker value={filtros.desde} onChange={(v) => handleFiltroChange('desde', v)} />
            </div>
            <div className="w-40">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
              <DatePicker value={filtros.hasta} onChange={(v) => handleFiltroChange('hasta', v)} />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
              <FilterDropdown
                compact
                options={[
                  { value: '', label: 'Todos' },
                  { value: 'ingreso', label: 'Ingresos' },
                  { value: 'despacho', label: 'Despachos' },
                ]}
                value={filtros.tipo}
                onChange={(v) => handleFiltroChange('tipo', v)}
              />
            </div>
            <div className="w-36">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
              <FilterDropdown
                compact
                options={[
                  { value: '', label: 'Todos' },
                  ...Object.entries(ESTADO_LABEL).map(([v, l]) => ({ value: v, label: l })),
                ]}
                value={filtros.estado}
                onChange={(v) => handleFiltroChange('estado', v)}
              />
            </div>
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
            >
              Aplicar
            </button>
          </div>
        </div>

        {/* KPIs */}
        {kpis && (
          <div
            id="tour-reportes-solicitudes-kpis"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
          >
            <KpiCard
              title="Total Solicitudes"
              value={kpis.total}
              subtitle="Registros encontrados"
              icon={ClipboardCheck}
              iconBg="bg-purple-100 dark:bg-purple-900/30"
              iconColor="text-purple-600 dark:text-purple-400"
            />
            <KpiCard
              title="Tasa Cumplimiento"
              value={`${kpis.tasa_cumplimiento}%`}
              subtitle="Solicitudes completadas"
              icon={CheckCircle2}
              iconBg="bg-green-100 dark:bg-green-900/30"
              iconColor="text-green-600 dark:text-green-400"
            />
            <KpiCard
              title="Tiempo Promedio"
              value={`${kpis.tiempo_promedio_dias}d`}
              subtitle="Días por solicitud"
              icon={Clock}
              iconBg="bg-yellow-100 dark:bg-yellow-900/30"
              iconColor="text-yellow-600 dark:text-yellow-400"
            />
            <KpiCard
              title="Rechazadas"
              value={kpis.rechazadas}
              subtitle="Solicitudes no procesadas"
              icon={XCircle}
              iconBg="bg-red-100 dark:bg-red-900/30"
              iconColor="text-red-600 dark:text-red-400"
            />
          </div>
        )}

        {/* Gráficos */}
        {(barData.length > 0 || pieData.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {barData.length > 0 && (
              <BarChart
                title="Solicitudes por Mes"
                subtitle="Últimos 6 meses"
                data={barData}
                legend={[
                  { label: 'Ingresos', color: '#3B82F6' },
                  { label: 'Despachos', color: '#F97316' },
                ]}
                height={300}
              />
            )}
            {pieData.length > 0 && (
              <PieChart
                title="Distribución por Tipo"
                subtitle="Ingresos vs Despachos"
                data={pieData}
                size={180}
              />
            )}
          </div>
        )}

        {/* Tabla de detalle */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Detalle de Solicitudes</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {tabla.length} registro{tabla.length !== 1 ? 's' : ''} encontrado{tabla.length !== 1 ? 's' : ''}
              </p>
            </div>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-centhrix-surface px-2.5 py-1 rounded-full">
              {tabla.length} solicitudes
            </span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400">Cargando...</div>
          ) : tabla.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 dark:text-slate-400">Sin datos para el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-centhrix-surface/50">
                    {['#', 'N° Solicitud', 'Cliente', 'Tipo', 'Fecha envío', 'Estado', 'T. Respuesta (días)', 'Operación'].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                  {tabla.map((row, idx) => (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/solicitudes/${row.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">
                        {row.numero_solicitud}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                        {row.cliente}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.tipo === 'ingreso'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}
                        >
                          {row.tipo === 'ingreso' ? 'Ingreso' : 'Despacho'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {new Date(row.fecha_envio).toLocaleDateString('es-CO')}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            row.estado === 'completada'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : row.estado === 'rechazada'
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                : row.estado === 'en_proceso'
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}
                        >
                          {ESTADO_LABEL[row.estado] || row.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                        {row.tiempo_respuesta_dias != null ? `${row.tiempo_respuesta_dias}d` : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                        {row.operacion_id ? `#${row.operacion_id}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="solicitudes"
        onSend={async (emailData) => {
          const res = await reportesService.enviarPorEmail({
            ...emailData,
            tipo: filtros.tipo,
            estado: filtros.estado,
          });
          if (res.success) enqueueSnackbar(res.message, { variant: 'success' });
          else throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteSolicitudes;
