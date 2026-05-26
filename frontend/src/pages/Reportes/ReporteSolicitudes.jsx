// frontend/src/pages/Reportes/ReporteSolicitudes.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ClipboardCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import apiClient from '../../api/client';
import { FilterDropdown, DatePicker } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import useNotification from '../../hooks/useNotification';

const ESTADO_LABEL = { recibida: 'Recibida', en_proceso: 'En Proceso', completada: 'Completada', rechazada: 'Rechazada' };

const ReporteSolicitudes = () => {
  const navigate = useNavigate();
  const { isCliente } = useAuth();
  const { error } = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', tipo: '', estado: '' });

  const fetchReporte = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const res = await apiClient.get('/reportes/solicitudes', { params });
      setData(res.data);
    } catch {
      error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReporte(); }, []);

  const kpis = data?.kpis;
  const tabla = data?.tabla || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/reportes')} className="p-2 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100">Reporte de Solicitudes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tiempos de respuesta, cumplimiento y volumen</p>
        </div>
        <button onClick={() => fetchReporte()}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
            <DatePicker value={filtros.desde} onChange={(v) => setFiltros((p) => ({ ...p, desde: v }))} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
            <DatePicker value={filtros.hasta} onChange={(v) => setFiltros((p) => ({ ...p, hasta: v }))} />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
            <FilterDropdown compact
              options={[{ value: '', label: 'Todos' }, { value: 'ingreso', label: 'Ingresos' }, { value: 'despacho', label: 'Despachos' }]}
              value={filtros.tipo} onChange={(v) => setFiltros((p) => ({ ...p, tipo: v }))} />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <FilterDropdown compact
              options={[{ value: '', label: 'Todos' }, ...Object.entries(ESTADO_LABEL).map(([v, l]) => ({ value: v, label: l }))]}
              value={filtros.estado} onChange={(v) => setFiltros((p) => ({ ...p, estado: v }))} />
          </div>
          <button onClick={() => fetchReporte()}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors">
            Aplicar
          </button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Solicitudes', value: kpis.total, icon: ClipboardCheck, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
            { label: 'Tasa Cumplimiento', value: `${kpis.tasa_cumplimiento}%`, icon: CheckCircle2, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
            { label: 'Tiempo Promedio', value: `${kpis.tiempo_promedio_dias}d`, icon: Clock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
            { label: 'Rechazadas', value: kpis.rechazadas, icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${k.color}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de detalle */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detalle de Solicitudes</h3>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando...</div>
        ) : tabla.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Sin datos para el período seleccionado</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['N° Solicitud', 'Cliente', 'Tipo', 'Fecha envío', 'Estado', 'T. Respuesta (días)', 'Operación'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {tabla.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/solicitudes/${row.id}`)}
                  className="hover:bg-slate-50 dark:hover:bg-centhrix-surface cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-200">{row.numero_solicitud}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.cliente}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 capitalize">{row.tipo === 'ingreso' ? 'Ingreso' : 'Despacho'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(row.fecha_envio).toLocaleDateString('es-CO')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      row.estado === 'completada' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      row.estado === 'rechazada' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      row.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>{ESTADO_LABEL[row.estado] || row.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{row.tiempo_respuesta_dias != null ? `${row.tiempo_respuesta_dias}d` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{row.operacion_id ? `#${row.operacion_id}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReporteSolicitudes;
