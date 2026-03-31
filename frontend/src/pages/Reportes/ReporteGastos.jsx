import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Receipt, DollarSign, CheckCircle, Clock, FileSpreadsheet, Download, Calendar, ArrowLeft, RefreshCw, Mail, MoreVertical } from 'lucide-react';
import { KpiCard, AccionesDropdown } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import reportesService from '../../api/reportes.service';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';
import logoNegro from '../../assets/logo-negro.png';
import logoBlanco from '../../assets/logo-blanco.png';

const CONCEPTO_LABELS = {
  cuadre_de_caja: 'Cuadre', descargues: 'Descargues', acpm: 'ACPM',
  administracion: 'Admin', alimentacion: 'Alimentación', comisiones: 'Comisiones',
  desencarpe: 'Desencarpe', encarpe: 'Encarpe', hospedaje: 'Hospedaje',
  otros: 'Otros', seguros: 'Seguros', repuestos: 'Repuestos',
  tecnicomecanica: 'Tecnomec.', peajes: 'Peajes', ligas: 'Ligas',
  parqueadero: 'Parqueadero', urea: 'UREA', liquidacion: 'Liquidación',
  recarga: 'Recarga', ingreso_adicional: 'Ing. Adicional',
};

const ReporteGastos = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [emailModal, setEmailModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;
      const response = await reportesService.getGastos(params);
      setData(response.data || response);
    } catch (err) {
      console.error('Error cargando reporte gastos:', err);
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
    const params = new URLSearchParams({ token });
    if (fechaDesde) params.set('fecha_desde', fechaDesde);
    if (fechaHasta) params.set('fecha_hasta', fechaHasta);
    window.open(`${baseUrl}/reportes/movimientos/${format}?${params}`, '_blank');
  };

  const kpis = data?.kpis || {};
  const formatCOP = (v) => `$ ${(Number(v) || 0).toLocaleString('es-CO')}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reporte de Gastos</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Detalle de egresos e ingresos por usuario y concepto</p>
              </div>
            </div>
          </div>
          <AccionesDropdown acciones={[
            { label: 'Actualizar', icon: RefreshCw, onClick: fetchData },
            { label: 'Excel', icon: FileSpreadsheet, onClick: () => handleExport('excel') },
            { label: 'CSV', icon: Download, onClick: () => handleExport('csv') },
            { label: 'Enviar', icon: Mail, onClick: () => setEmailModal(true) },
          ]} />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 min-w-0" />
            </div>
            <div className="flex-1 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 min-w-0" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Total Movimientos" value={kpis.total ?? '-'} icon={Receipt} iconBg="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" loading={loading} />
          <KpiCard title="Pendientes" value={kpis.pendientes ?? '-'} icon={Clock} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" loading={loading} />
          <KpiCard title="Valor Total" value={formatCOP(kpis.valorTotal)} icon={DollarSign} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" loading={loading} />
          <KpiCard title="Total Aprobado" value={formatCOP(kpis.valorAprobado)} icon={CheckCircle} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PieChart title="Estado de Aprobación" subtitle="Distribución de gastos" data={data?.porAprobacion || []} size={180} loading={loading} />
          <BarChart title="Gastos por Concepto" subtitle="Top 8 conceptos de egreso" data={data?.porConcepto || []} legend={[{ label: 'Valor ($)', color: '#E74C3C' }]} height={300} loading={loading} />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Últimos Movimientos</h3>
            <p className="text-xs text-slate-400">10 movimientos más recientes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-900/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Concepto</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Tipo</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Valor</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Estado</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Usuario</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Caja</th>
                </tr>
              </thead>
              <tbody>
                {(data?.ultimos || []).map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-3 px-4 font-medium text-purple-600 dark:text-purple-400">#{m.consecutivo}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{CONCEPTO_LABELS[m.concepto] || m.concepto}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        m.tipo_movimiento === 'ingreso' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>{m.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-white">{formatCOP(m.valor)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        m.aprobado ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : m.rechazado ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>{m.aprobado ? 'Aprobado' : m.rechazado ? 'Rechazado' : 'Pendiente'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.usuario}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.caja_menor}</td>
                  </tr>
                ))}
                {(!data?.ultimos || data.ultimos.length === 0) && !loading && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No hay movimientos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <footer className="flex flex-col items-center gap-3 py-6 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <img src={logoNegro} alt="ISTHO" className="w-6 h-6 rounded dark:hidden" />
            <img src={logoBlanco} alt="ISTHO" className="w-6 h-6 rounded hidden dark:block" />
            <span>&copy; 2026 ISTHO S.A.S. - Sistema CRM Interno</span>
          </div>
        </footer>
      </main>
      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="gastos"
        onSend={async (data) => {
          const res = await reportesService.enviarPorEmail(data);
          if (!res.success) throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteGastos;
