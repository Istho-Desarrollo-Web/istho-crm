import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, DollarSign, Clock, FileSpreadsheet, FileText, TrendingDown, ArrowLeft, RefreshCw, Mail } from 'lucide-react';
import { KpiCard, AccionesDropdown } from '../../components/common';
import { PieChart } from '../../components/charts';
import reportesService from '../../api/reportes.service';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';
import useNotification from '../../hooks/useNotification';
import PageFooter from '@components/common/PageFooter';

const ReporteCajasMenores = () => {
  const navigate = useNavigate();
  const { error: showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [emailModal, setEmailModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reportesService.getCajasMenores();
      setData(response.data || response);
    } catch (_err) {
      showError('Error al cargar reporte');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleExport = async (format) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const token = localStorage.getItem('istho_token');
      const url = `${baseUrl}/reportes/cajas-menores/${format}`;
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al descargar archivo');
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `cajas-menores-${Date.now()}.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      showError('Error al exportar el reporte');
    }
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
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-centhrix-card rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reporte de Cajas Menores</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Resumen de cajas menores, saldos y movimientos</p>
              </div>
            </div>
          </div>
          <AccionesDropdown acciones={[
            { label: 'Actualizar', icon: RefreshCw, onClick: fetchData },
            { label: 'Excel', icon: FileSpreadsheet, onClick: () => handleExport('excel') },
            { label: 'PDF', icon: FileText, onClick: () => handleExport('pdf') },
            { label: 'Enviar', icon: Mail, onClick: () => setEmailModal(true) },
          ]} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard title="Total Cajas" value={kpis.total ?? '-'} icon={Wallet} iconBg="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" loading={loading} />
          <KpiCard title="Abiertas" value={kpis.abiertas ?? '-'} icon={Clock} iconBg="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" loading={loading} />
          <KpiCard title="Total Egresos" value={formatCOP(kpis.totalEgresos)} icon={TrendingDown} iconBg="bg-red-100 dark:bg-red-900/30" iconColor="text-red-600 dark:text-red-400" loading={loading} />
          <KpiCard title="Saldo Actual Total" value={formatCOP(kpis.totalSaldoActual)} icon={DollarSign} iconBg="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" loading={loading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PieChart title="Cajas por Estado" subtitle="Distribución actual" data={data?.porEstado || []} size={180} loading={loading} />
          <PieChart title="Egresos vs Ingresos" subtitle="En cajas activas" data={data?.egresosVsIngresos || []} size={180} loading={loading} />
        </div>

        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Últimas Cajas Menores</h3>
            <p className="text-xs text-slate-400">10 cajas más recientes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-centhrix-bg/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Número</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Asignado a</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Saldo Inicial</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Ingresos</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Egresos</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Saldo Actual</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data?.ultimas || []).map((c) => (
                  <tr key={c.id} onClick={() => navigate(`/viajes/cajas-menores/${c.id}`)} className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/20 cursor-pointer transition-colors">
                    <td className="py-3 px-4 font-medium text-amber-600 dark:text-amber-400">{c.numero}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{c.asignado}</td>
                    <td className="py-3 px-4 text-right text-slate-600 dark:text-slate-300">{formatCOP(c.saldo_inicial)}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">+{formatCOP(c.total_ingresos)}</td>
                    <td className="py-3 px-4 text-right text-red-600 dark:text-red-400">-{formatCOP(c.total_egresos)}</td>
                    <td className={`py-3 px-4 text-right font-bold ${(parseFloat(c.saldo_actual) || 0) >= 0 ? 'text-slate-800 dark:text-white' : 'text-red-600 dark:text-red-400'}`}>{formatCOP(c.saldo_actual)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                        c.estado === 'abierta' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : c.estado === 'en_revision' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-centhrix-surface dark:text-slate-300'
                      }`}>{c.estado}</span>
                    </td>
                  </tr>
                ))}
                {(!data?.ultimas || data.ultimas.length === 0) && !loading && (
                  <tr><td colSpan={7} className="py-8 text-center text-slate-400">No hay cajas menores registradas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <PageFooter />
      </main>
      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="cajas_menores"
        onSend={async (data) => {
          const res = await reportesService.enviarPorEmail(data);
          if (!res.success) throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteCajasMenores;
