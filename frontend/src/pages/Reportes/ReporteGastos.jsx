import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Receipt,
  DollarSign,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  ArrowLeft,
  RefreshCw,
  Mail,
  Filter,
  X,
  Search,
  Loader2,
} from 'lucide-react';
import { descargarArchivo, fechaDescarga } from '../../utils/descargas';
import { KpiCard, AccionesDropdown, DatePicker } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import reportesService from '../../api/reportes.service';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';
import PageFooter from '@components/common/PageFooter';

const CONCEPTO_LABELS = {
  cuadre_de_caja: 'Cuadre',
  descargues: 'Descargues',
  acpm: 'ACPM',
  administracion: 'Admin',
  alimentacion: 'Alimentación',
  comisiones: 'Comisiones',
  desencarpe: 'Desencarpe',
  encarpe: 'Encarpe',
  hospedaje: 'Hospedaje',
  otros: 'Otros',
  seguros: 'Seguros',
  repuestos: 'Repuestos',
  tecnicomecanica: 'Tecnomec.',
  peajes: 'Peajes',
  ligas: 'Ligas',
  parqueadero: 'Parqueadero',
  urea: 'UREA',
  liquidacion: 'Liquidación',
  recarga: 'Recarga',
  ingreso_adicional: 'Ing. Adicional',
};

const ReporteGastos = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [_firstLoad, setFirstLoad] = useState(true);
  const [data, setData] = useState(null);
  // Estado local para los inputs (no dispara fetch al escribir)
  const [inputDesde, setInputDesde] = useState('');
  const [inputHasta, setInputHasta] = useState('');
  // Estado aplicado (solo cambia al presionar "Aplicar")
  const [filtrosAplicados, setFiltrosAplicados] = useState({ desde: '', hasta: '' });
  const [emailModal, setEmailModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filtrosAplicados.desde) params.fecha_desde = filtrosAplicados.desde;
      if (filtrosAplicados.hasta) params.fecha_hasta = filtrosAplicados.hasta;
      const response = await reportesService.getGastos(params);
      setData(response.data || response);
    } catch (err) {
      console.error('Error cargando reporte gastos:', err);
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [filtrosAplicados]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAplicar = () => {
    setFiltrosAplicados({ desde: inputDesde, hasta: inputHasta });
  };

  const handleLimpiar = () => {
    setInputDesde('');
    setInputHasta('');
    setFiltrosAplicados({ desde: '', hasta: '' });
  };

  const handleExport = async (format) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const params = new URLSearchParams();
      if (filtrosAplicados.desde) params.set('fecha_desde', filtrosAplicados.desde);
      if (filtrosAplicados.hasta) params.set('fecha_hasta', filtrosAplicados.hasta);
      const url = `${baseUrl}/reportes/movimientos/${format}?${params.toString()}`;
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      await descargarArchivo(url, `reporte-gastos-${fechaDescarga()}.${ext}`);
    } catch {
      console.error('Error al exportar reporte gastos');
    }
  };

  const hasPendingChanges =
    inputDesde !== filtrosAplicados.desde || inputHasta !== filtrosAplicados.hasta;
  const hasActiveFilters = filtrosAplicados.desde || filtrosAplicados.hasta;

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
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Reporte de Gastos
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Detalle de egresos e ingresos por usuario y concepto
                </p>
              </div>
            </div>
          </div>
          <div id="tour-reportes-gastos-exportar">
            <AccionesDropdown
              acciones={[
                { label: 'Actualizar', icon: RefreshCw, onClick: fetchData },
                { label: 'Excel', icon: FileSpreadsheet, onClick: () => handleExport('excel') },
                { label: 'PDF', icon: FileText, onClick: () => handleExport('pdf') },
                { label: 'Enviar', icon: Mail, onClick: () => setEmailModal(true) },
              ]}
            />
          </div>
        </div>

        {/* Filters */}
        <div id="tour-reportes-gastos-filtros" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Filtros
            </span>
            {hasActiveFilters && (
              <button
                onClick={handleLimpiar}
                className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Desde
                </label>
                <DatePicker
                  value={inputDesde}
                  onChange={(v) => setInputDesde(v)}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Hasta
                </label>
                <DatePicker
                  value={inputHasta}
                  onChange={(v) => setInputHasta(v)}
                />
              </div>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAplicar}
                disabled={loading}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  hasPendingChanges && !loading
                    ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-centhrix-card'
                }`}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                {loading ? 'Cargando...' : 'Aplicar'}
              </button>
            </div>
          </div>
        </div>

        <div id="tour-reportes-gastos-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="Total Movimientos"
            value={kpis.total ?? '-'}
            icon={Receipt}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            iconColor="text-purple-600 dark:text-purple-400"
            loading={loading}
          />
          <KpiCard
            title="Pendientes"
            value={kpis.pendientes ?? '-'}
            icon={Clock}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
            loading={loading}
          />
          <KpiCard
            title="Valor Total"
            value={formatCOP(kpis.valorTotal)}
            icon={DollarSign}
            iconBg="bg-red-100 dark:bg-red-900/30"
            iconColor="text-red-600 dark:text-red-400"
            loading={loading}
          />
          <KpiCard
            title="Total Aprobado"
            value={formatCOP(kpis.valorAprobado)}
            icon={CheckCircle}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
            loading={loading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PieChart
            title="Estado de Aprobación"
            subtitle="Distribución de gastos"
            data={data?.porAprobacion || []}
            size={180}
            loading={loading}
          />
          <BarChart
            title="Gastos por Concepto"
            subtitle="Top 8 conceptos de egreso"
            data={data?.porConcepto || []}
            legend={[{ label: 'Valor ($)', color: '#E74C3C' }]}
            height={300}
            loading={loading}
          />
        </div>

        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Últimos Movimientos
            </h3>
            <p className="text-xs text-slate-400">10 movimientos más recientes</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-centhrix-bg/30">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    #
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Concepto
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Tipo
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Valor
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Estado
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Usuario
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Caja
                  </th>
                </tr>
              </thead>
              <tbody>
                {(data?.ultimos || []).map((m) => (
                  <tr
                    key={m.id}
                    className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/20 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-purple-600 dark:text-purple-400">
                      #{m.consecutivo}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                      {CONCEPTO_LABELS[m.concepto] || m.concepto}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                          m.tipo_movimiento === 'ingreso'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {m.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-white">
                      {formatCOP(m.valor)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                          m.aprobado
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : m.rechazado
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }`}
                      >
                        {m.aprobado ? 'Aprobado' : m.rechazado ? 'Rechazado' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.usuario}</td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">{m.caja_menor}</td>
                  </tr>
                ))}
                {(!data?.ultimos || data.ultimos.length === 0) && !loading && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      No hay movimientos registrados
                    </td>
                  </tr>
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
