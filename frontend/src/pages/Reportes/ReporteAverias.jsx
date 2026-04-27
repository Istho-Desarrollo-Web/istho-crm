/**
 * ISTHO CRM - ReporteAverias Page
 * Reporte de averías con KPIs, gráficos y tabla detallada
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Abril 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  FileText,
  Tag,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Mail,
  Image,
} from 'lucide-react';

// Components
import { Button, KpiCard, ReportFilters, AccionesDropdown } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';

// API
import reportesService from '../../api/reportes.service';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';
import { descargarArchivo, fechaDescarga } from '../../utils/descargas';

// ============================================
// MAIN COMPONENT
// ============================================
const ReporteAverias = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canDownload =
    hasPermission('reportes', 'exportar') || hasPermission('reportes', 'descargar');

  const [loading, setLoading] = useState(true);
  const [firstLoad, setFirstLoad] = useState(true);
  const [averias, setAverias] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [porTipo, setPorTipo] = useState([]);
  const [error, setError] = useState(null);
  const [emailModal, setEmailModal] = useState(false);

  // Filtros desde URL
  const [filters, setFilters] = useState({
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    cliente_id: searchParams.get('cliente_id') || '',
  });

  // Persistir filtros en URL
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    setSearchParams(params, { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filters.fecha_desde) params.fecha_desde = filters.fecha_desde;
      if (filters.fecha_hasta) params.fecha_hasta = filters.fecha_hasta;
      if (filters.cliente_id) params.cliente_id = filters.cliente_id;

      const res = await reportesService.getReporteAverias(params);
      if (res?.success && res.data) {
        setAverias(res.data.averias || []);
        setKpis(res.data.kpis || null);
        setPorTipo(res.data.porTipo || []);
      }
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);
    if (filters.cliente_id) params.set('cliente_id', filters.cliente_id);
    return params.toString();
  };

  const handleExport = async (format) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const endpoint = format === 'excel' ? '/reportes/averias/excel' : '/reportes/averias/pdf';
      await descargarArchivo(
        `${baseUrl}${endpoint}?${buildFilterParams()}`,
        `reporte-averias-${fechaDescarga()}.${ext}`
      );
    } catch {
      enqueueSnackbar('Error al exportar reporte', { variant: 'error' });
    }
  };

  // Datos para gráficos
  const pieData = porTipo.map((t) => ({ name: t.tipo, value: t.count }));
  const barData = [...porTipo]
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 8)
    .map((t) => ({ label: t.tipo.substring(0, 18), value1: t.unidades, value2: t.count }));

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
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Reporte de Averías
                </h1>
                <p className="text-slate-500 dark:text-slate-400">
                  Registro detallado de averías por operación
                </p>
              </div>
            </div>
          </div>

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

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Filtros */}
        <ReportFilters filters={filters} onChange={handleFiltersChange} loading={loading} />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Averías"
            value={kpis?.totalAverias || 0}
            subtitle="Registros encontrados"
            icon={AlertTriangle}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />
          <KpiCard
            title="Unidades Averiadas"
            value={(kpis?.totalUnidades || 0).toLocaleString('es-CO')}
            subtitle="Total unidades afectadas"
            icon={Package}
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
          />
          <KpiCard
            title="Operaciones Afectadas"
            value={kpis?.operacionesAfectadas || 0}
            subtitle="Con al menos una avería"
            icon={FileText}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            title="Tipo más Frecuente"
            value={kpis?.tipoFrecuente || '—'}
            subtitle="Avería predominante"
            icon={Tag}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
          />
        </div>

        {/* Gráficos */}
        {porTipo.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <PieChart
              title="Distribución por Tipo de Avería"
              subtitle="Conteo de registros por tipo"
              data={pieData}
              size={180}
            />
            <BarChart
              title="Unidades Averiadas por Tipo"
              subtitle="Top 8 tipos con más unidades"
              data={barData}
              legend={[
                { label: 'Unidades', color: '#E74C3C' },
                { label: 'Registros', color: '#3B82F6' },
              ]}
              height={300}
            />
          </div>
        )}

        {/* Tabla de detalle */}
        {averias.length > 0 && (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                  Detalle de Averías
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {averias.length} registro{averias.length !== 1 ? 's' : ''} encontrado
                  {averias.length !== 1 ? 's' : ''}
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-centhrix-surface px-2.5 py-1 rounded-full">
                {averias.length} averías
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-centhrix-surface/50">
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-8">
                      #
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Fecha
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      N° Registro
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Cliente
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Origen
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Referencia
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Producto
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Tipo Avería
                    </th>
                    <th className="text-right px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Cant.
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Descripción
                    </th>
                    <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Registrado por
                    </th>
                    <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400">
                      Foto
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {averias.map((a, idx) => {
                    const tipo = (a.operacion?.tipo || '').toLowerCase();
                    const tipoBadgeClass =
                      tipo === 'ingreso'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
                    const fecha = a.operacion?.fecha_operacion
                      ? new Date(a.operacion.fecha_operacion + 'T00:00:00').toLocaleDateString(
                          'es-CO'
                        )
                      : '—';
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-400 dark:text-slate-500">{idx + 1}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {fecha}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {a.operacion?.numero_operacion || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipoBadgeClass}`}
                          >
                            {tipo === 'ingreso' ? 'Entrada' : 'Salida'}
                          </span>
                        </td>
                        <td
                          className="px-4 py-3 text-slate-700 dark:text-slate-200 max-w-[160px] truncate"
                          title={a.operacion?.cliente?.razon_social}
                        >
                          {a.operacion?.cliente?.razon_social || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {a.operacion?.origen || '—'}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                          {a.sku || '—'}
                        </td>
                        <td
                          className="px-4 py-3 text-slate-800 dark:text-slate-200 max-w-[180px] truncate"
                          title={a.detalle?.producto}
                        >
                          {a.detalle?.producto || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                          {a.tipo_averia || '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-red-600 dark:text-red-400">
                          {(parseFloat(a.cantidad) || 0).toLocaleString('es-CO')}
                        </td>
                        <td
                          className="px-4 py-3 text-slate-500 dark:text-slate-400 max-w-[200px] truncate"
                          title={a.descripcion}
                        >
                          {a.descripcion || '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {a.registrador?.nombre_completo || '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.foto_url ? (
                            <a
                              href={a.foto_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center text-blue-500 hover:text-blue-700"
                            >
                              <Image className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estado vacío */}
        {!loading && averias.length === 0 && (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-12 text-center mb-6">
            <AlertTriangle className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              No se encontraron averías en el período seleccionado.
            </p>
          </div>
        )}

        {/* Exportar */}
        {canDownload && (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
              Exportar Reporte Completo
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Descarga el listado completo de averías con todos los detalles. Los filtros
              seleccionados se aplicarán a la exportación.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                icon={FileSpreadsheet}
                onClick={() => handleExport('excel')}
              >
                Exportar Excel
              </Button>
              <Button variant="outline" icon={Download} onClick={() => handleExport('pdf')}>
                Exportar PDF
              </Button>
            </div>
          </div>
        )}
      </main>

      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="averias"
        onSend={async (data) => {
          const res = await reportesService.enviarPorEmail({
            ...data,
            cliente_id: filters.cliente_id,
          });
          if (res.success) enqueueSnackbar(res.message, { variant: 'success' });
          else throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteAverias;
