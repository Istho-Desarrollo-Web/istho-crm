import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle, DollarSign, FileSpreadsheet, Download, Calendar } from 'lucide-react';
import { KpiCard } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import reportesService from '../../api/reportes.service';
import logoNegro from '../../assets/logo-negro.png';
import logoBlanco from '../../assets/logo-blanco.png';

const ReporteViajes = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const response = await reportesService.getViajes(params);
      setData(response.data || response);
    } catch (err) {
      console.error('Error cargando reporte viajes:', err);
    } finally {
      setLoading(false);
    }
  }, [fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = (format) => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const token = localStorage.getItem('istho_token');
    const params = new URLSearchParams({ token, ...filtros });
    window.open(`${baseUrl}/reportes/viajes/${format}?${params}`, '_blank');
  };

  const kpis = data?.kpis || {};
  const formatCOP = (v) => `$ ${(Number(v) || 0).toLocaleString('es-CO')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Reporte de Viajes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Análisis de viajes, rutas y conductores</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
              <FileSpreadsheet className="w-4 h-4" /> Excel
            </button>
            <button onClick={() => handleExport('csv')} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-300">
              <Download className="w-4 h-4" /> CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 min-w-0" placeholder="Desde" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 min-w-0" placeholder="Hasta" />
            </div>
          </div>
        </div>

        {/* KPIs - 4 cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Total Viajes" value={kpis.total ?? '-'} icon={Truck} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" loading={loading} />
          <KpiCard title="Completados" value={kpis.completados ?? '-'} icon={CheckCircle} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" loading={loading} />
          <KpiCard title="Facturados" value={kpis.facturados ?? '-'} icon={DollarSign} iconBg="bg-violet-100 dark:bg-violet-900/30" iconColor="text-violet-600 dark:text-violet-400" loading={loading} />
          <KpiCard title="Valor Total" value={formatCOP(kpis.valorTotal)} icon={DollarSign} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" loading={loading} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PieChart title="Viajes por Estado" subtitle="Distribución actual" data={data?.porEstado || []} size={180} loading={loading} />
          <BarChart title="Viajes por Mes" subtitle="Últimos 6 meses" data={data?.porMes || []} legend={[{ label: 'Viajes', color: '#3B82F6' }]} height={300} loading={loading} />
        </div>

        {/* Top conductores */}
        <div className="mb-8">
          <BarChart title="Top Conductores" subtitle="Conductores con más viajes" data={data?.topConductores || []} legend={[{ label: 'Viajes', color: '#F59E0B' }]} height={260} loading={loading} />
        </div>

        {/* Últimos viajes table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Últimos Viajes</h3>
            <p className="text-xs text-slate-400">10 viajes más recientes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Número</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Ruta</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Conductor</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Vehículo</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Valor</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data?.ultimos || []).map((v) => (
                  <tr key={v.id} onClick={() => navigate(`/viajes/viajes/${v.id}`)} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer transition-colors">
                    <td className="py-3 px-4 font-medium text-blue-600 dark:text-blue-400">{v.numero}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{v.origen} → {v.destino}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{v.conductor}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{v.vehiculo}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-white">{formatCOP(v.valor_viaje)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        v.estado === 'completado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : v.estado === 'anulado' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>{v.estado}</span>
                    </td>
                  </tr>
                ))}
                {(!data?.ultimos || data.ultimos.length === 0) && !loading && (
                  <tr><td colSpan={6} className="py-8 text-center text-slate-400">No hay viajes registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <footer className="flex flex-col items-center gap-3 py-6 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <img src={logoNegro} alt="ISTHO" className="w-6 h-6 rounded dark:hidden" />
            <img src={logoBlanco} alt="ISTHO" className="w-6 h-6 rounded hidden dark:block" />
            <span>&copy; 2026 ISTHO S.A.S. - Sistema CRM Interno</span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default ReporteViajes;
