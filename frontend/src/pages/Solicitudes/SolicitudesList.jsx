// frontend/src/pages/Solicitudes/SolicitudesList.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Plus, RefreshCw, Search } from 'lucide-react';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown, DatePicker } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import SolicitudForm from './SolicitudForm';

const ESTADO_CONFIG = {
  recibida:    { label: 'Recibida',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  en_proceso:  { label: 'En Proceso',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completada:  { label: 'Completada',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rechazada:   { label: 'Rechazada',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const SolicitudesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isCliente } = useAuth();
  const { error } = useNotification();

  const tabActivo = searchParams.get('tab') || 'ingreso';
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchSolicitudes = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await solicitudesService.getAll({
        tipo: tabActivo,
        estado: filtroEstado || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        search: busqueda || undefined,
        page,
        limit: 20,
      });
      setSolicitudes(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [tabActivo, filtroEstado, filtroDesde, filtroHasta, busqueda, error]);

  useEffect(() => { fetchSolicitudes(1); }, [fetchSolicitudes]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
            <ClipboardCheck className="w-7 h-7 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 font-display">Solicitudes</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Avisos de ingreso y solicitudes de despacho</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchSolicitudes(1)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
        </div>
      </div>

      {/* Tabs + acción */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div id="tour-solicitudes-tabs" className="flex gap-1 bg-slate-100 dark:bg-centhrix-surface rounded-xl p-1">
          {[{ key: 'ingreso', label: 'Ingresos' }, { key: 'despacho', label: 'Despachos' }].map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                tabActivo === tab.key
                  ? 'bg-white dark:bg-centhrix-card text-orange-600 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {isCliente() && (
          <button
            id="tour-solicitudes-nueva"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Nueva Solicitud
          </button>
        )}
      </div>

      {/* Filtros */}
      <div id="tour-solicitudes-filtros" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="N° solicitud, documento..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <FilterDropdown
              compact
              options={[{ value: '', label: 'Todos' }, ...Object.entries(ESTADO_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))]}
              value={filtroEstado}
              onChange={setFiltroEstado}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
            <DatePicker value={filtroDesde} onChange={setFiltroDesde} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
            <DatePicker value={filtroHasta} onChange={setFiltroHasta} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div id="tour-solicitudes-tabla" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Cargando...</div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardCheck className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No hay solicitudes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">N° Solicitud</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {solicitudes.map((s) => {
                  const estadoConf = ESTADO_CONFIG[s.estado] || ESTADO_CONFIG.recibida;
                  return (
                    <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)}
                      className="hover:bg-slate-50 dark:hover:bg-centhrix-surface cursor-pointer transition-colors">
                      <td className="px-4 py-3 text-sm font-mono font-medium text-slate-700 dark:text-slate-200">
                        {s.numero_solicitud}
                        <div className="sm:hidden text-xs text-slate-400 font-sans font-normal mt-0.5">{s.cliente?.razon_social || '—'}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 hidden sm:table-cell">{s.cliente?.razon_social || '—'}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">{s.fecha_estimada ? new Date(s.fecha_estimada + 'T00:00:00').toLocaleDateString('es-CO') : new Date(s.created_at).toLocaleDateString('es-CO')}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {s.prioridad === 'urgente' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgente</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap ${estadoConf.color}`}>{estadoConf.label}</span>
                        {s.prioridad === 'urgente' && <span className="md:hidden ml-1 px-1.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">!</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={pagination.page <= 1} onClick={() => fetchSolicitudes(pagination.page - 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40">Anterior</button>
          <span className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400">{pagination.page} / {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchSolicitudes(pagination.page + 1)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {showForm && (
        <SolicitudForm
          tipo={tabActivo}
          onClose={() => setShowForm(false)}
          onSave={() => { setShowForm(false); fetchSolicitudes(1); }}
        />
      )}
    </main>
  );
};

export default SolicitudesList;
