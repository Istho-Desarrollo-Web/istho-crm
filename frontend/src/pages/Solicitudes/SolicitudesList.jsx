// frontend/src/pages/Solicitudes/SolicitudesList.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Plus, RefreshCw, Search } from 'lucide-react';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown, DatePicker } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

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
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100">Solicitudes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Avisos de ingreso y solicitudes de despacho</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchSolicitudes(1)} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          {isCliente() && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Nueva Solicitud
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-centhrix-surface rounded-xl p-1 mb-6 w-fit">
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

      {/* Filtros */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
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
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <FilterDropdown
              compact
              options={[{ value: '', label: 'Todos' }, ...Object.entries(ESTADO_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))]}
              value={filtroEstado}
              onChange={setFiltroEstado}
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
            <DatePicker value={filtroDesde} onChange={setFiltroDesde} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
            <DatePicker value={filtroHasta} onChange={setFiltroHasta} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Cargando...</div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardCheck className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No hay solicitudes</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['N° Solicitud', 'Cliente', 'Fecha', 'Prioridad', 'Estado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {solicitudes.map((s) => {
                const estadoConf = ESTADO_CONFIG[s.estado] || ESTADO_CONFIG.recibida;
                return (
                  <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-centhrix-surface cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-slate-700 dark:text-slate-200">{s.numero_solicitud}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{s.cliente?.razon_social || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{s.fecha_estimada ? new Date(s.fecha_estimada + 'T00:00:00').toLocaleDateString('es-CO') : new Date(s.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3">
                      {s.prioridad === 'urgente' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgente</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estadoConf.color}`}>{estadoConf.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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

      {/* Modal de creación — se agrega en Task 7 */}
      {showForm && (
        <SolicitudFormPlaceholder tipo={tabActivo} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); fetchSolicitudes(1); }} />
      )}
    </div>
  );
};

// Placeholder temporal hasta crear SolicitudForm en Task 7
const SolicitudFormPlaceholder = ({ onClose, onSave: _onSave }) => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white dark:bg-centhrix-card rounded-2xl p-6">
      <p className="text-slate-700 dark:text-slate-200">Formulario pendiente (Task 7)</p>
      <button onClick={onClose} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl">Cerrar</button>
    </div>
  </div>
);

export default SolicitudesList;
