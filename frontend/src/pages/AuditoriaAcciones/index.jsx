/**
 * ISTHO CRM - Módulo Auditoría de Acciones
 *
 * Visualización del log de actividad del sistema.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, ChevronLeft, ChevronRight, Filter,
  Activity, LogIn, Plus, Pencil, Trash2, Eye, Clock,
  Users, Database, BarChart3, X, ChevronDown
} from 'lucide-react';
import auditoriaAccionesService from '../../api/auditoriaAcciones.service';

// ════════════════════════════════════════════════════════════════════════════

const ACCION_CONFIG = {
  crear: { label: 'Crear', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: Plus },
  actualizar: { label: 'Actualizar', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Pencil },
  eliminar: { label: 'Eliminar', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: Trash2 },
  login: { label: 'Login', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: LogIn },
  logout: { label: 'Logout', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300', icon: LogIn },
};

const TABLA_LABELS = {
  usuarios: 'Usuarios',
  clientes: 'Clientes',
  inventario: 'Inventario',
  operaciones: 'Operaciones',
  cajas_inventario: 'Cajas Inventario',
  roles: 'Roles',
  auditoria_entradas: 'Auditoría Entradas',
  auditoria_salidas: 'Auditoría Salidas',
  plantillas_email: 'Plantillas Email',
};

const AuditoriaAcciones = () => {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 30, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroTabla, setFiltroTabla] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [tablas, setTablas] = useState([]);
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: pagination.page, limit: pagination.limit };
      if (search) params.search = search;
      if (filtroAccion) params.accion = filtroAccion;
      if (filtroTabla) params.tabla = filtroTabla;
      if (fechaDesde) params.fecha_desde = fechaDesde;
      if (fechaHasta) params.fecha_hasta = fechaHasta;

      const res = await auditoriaAccionesService.listar(params);
      setRegistros(res.data?.registros || []);
      setPagination(prev => ({ ...prev, ...res.data?.pagination }));
    } catch (error) {
      console.error('Error cargando auditoría:', error);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, search, filtroAccion, filtroTabla, fechaDesde, fechaHasta]);

  const fetchMeta = useCallback(async () => {
    try {
      const [tablasRes, statsRes] = await Promise.all([
        auditoriaAccionesService.getTablas(),
        auditoriaAccionesService.getStats({ dias: 7 })
      ]);
      setTablas(tablasRes.data || []);
      setStats(statsRes.data || null);
    } catch (error) {
      console.error('Error cargando meta auditoría:', error);
    }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);
  useEffect(() => { fetchRegistros(); }, [fetchRegistros]);

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const clearFilters = () => {
    setSearch('');
    setFiltroAccion('');
    setFiltroTabla('');
    setFechaDesde('');
    setFechaHasta('');
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = search || filtroAccion || filtroTabla || fechaDesde || fechaHasta;

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'medium'
    });
  };

  const renderJsonDiff = (anterior, nuevo) => {
    if (!anterior && !nuevo) return null;
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
        {anterior && (
          <div>
            <span className="text-[11px] font-medium text-red-500 uppercase">Antes</span>
            <pre className="mt-1 p-2 text-[11px] bg-red-50 dark:bg-red-900/10 rounded-lg overflow-x-auto text-slate-600 dark:text-slate-400 max-h-48">
              {JSON.stringify(anterior, null, 2)}
            </pre>
          </div>
        )}
        {nuevo && (
          <div>
            <span className="text-[11px] font-medium text-green-500 uppercase">Después</span>
            <pre className="mt-1 p-2 text-[11px] bg-green-50 dark:bg-green-900/10 rounded-lg overflow-x-auto text-slate-600 dark:text-slate-400 max-h-48">
              {JSON.stringify(nuevo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Activity className="w-8 h-8 text-orange-500" />
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
                Auditoría de Acciones
              </h1>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Registro de actividad y cambios en el sistema
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="w-4 h-4 text-orange-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">Últimos {stats.dias} días</span>
              </div>
              <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{stats.total}</span>
              <span className="text-xs text-slate-400 ml-1">acciones</span>
            </div>
            {stats.por_accion?.map((a) => {
              const config = ACCION_CONFIG[a.accion] || {};
              return (
                <div key={a.accion} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    {config.icon && <config.icon className="w-4 h-4 text-slate-400" />}
                    <span className="text-xs text-slate-500 dark:text-slate-400">{config.label || a.accion}</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-800 dark:text-slate-100">{a.total}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 mb-4">
          <div className="flex flex-wrap items-center gap-3 p-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por descripción, usuario o tabla..."
                value={search}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-xl transition-colors ${
                hasActiveFilters
                  ? 'border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
                  : 'border-gray-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {hasActiveFilters && (
                <span className="w-2 h-2 bg-orange-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => { fetchRegistros(); fetchMeta(); }}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* Filtros expandibles */}
          {showFilters && (
            <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3">
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Acción</label>
                  <select
                    value={filtroAccion}
                    onChange={(e) => { setFiltroAccion(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Todas</option>
                    <option value="crear">Crear</option>
                    <option value="actualizar">Actualizar</option>
                    <option value="eliminar">Eliminar</option>
                    <option value="login">Login</option>
                    <option value="logout">Logout</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Módulo/Tabla</label>
                  <select
                    value={filtroTabla}
                    onChange={(e) => { setFiltroTabla(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Todas</option>
                    {tablas.map(t => (
                      <option key={t} value={t}>{TABLA_LABELS[t] || t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Desde</label>
                  <input
                    type="date"
                    value={fechaDesde}
                    onChange={(e) => { setFechaDesde(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={fechaHasta}
                    onChange={(e) => { setFechaHasta(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    className="px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  />
                </div>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl"
                  >
                    <X className="w-3.5 h-3.5" /> Limpiar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700">
          <div className="overflow-x-auto rounded-t-2xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-gray-200 dark:border-slate-700">
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-[170px]">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Usuario</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-[100px]">Acción</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-[120px]">Módulo</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400">Descripción</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500 dark:text-slate-400 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12">
                      <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm">Cargando registros...</p>
                    </td>
                  </tr>
                ) : registros.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-slate-400">
                      No se encontraron registros de auditoría
                    </td>
                  </tr>
                ) : (
                  registros.map((reg) => {
                    const accionConf = ACCION_CONFIG[reg.accion] || { label: reg.accion, color: 'bg-slate-100 text-slate-600' };
                    const AccionIcon = accionConf.icon || Activity;
                    const isExpanded = expandedRow === reg.id;
                    const hasDetails = reg.datos_anteriores || reg.datos_nuevos;

                    return (
                      <tr key={reg.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors group">
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-slate-300" />
                            {formatDate(reg.created_at || reg.createdAt)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                              {(reg.usuario?.nombre_completo || reg.usuario_nombre || '?').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">
                                {reg.usuario?.nombre_completo || reg.usuario_nombre || 'Sistema'}
                              </div>
                              {reg.usuario?.username && (
                                <div className="text-[11px] text-slate-400">@{reg.usuario.username}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-full ${accionConf.color}`}>
                            <AccionIcon className="w-3 h-3" />
                            {accionConf.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 rounded-md">
                            {TABLA_LABELS[reg.tabla] || reg.tabla}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-slate-600 dark:text-slate-300 line-clamp-2">
                            {reg.descripcion || '-'}
                          </div>
                          {reg.ip_address && (
                            <div className="text-[10px] text-slate-400 mt-0.5">IP: {reg.ip_address}</div>
                          )}
                          {isExpanded && hasDetails && renderJsonDiff(reg.datos_anteriores, reg.datos_nuevos)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {hasDetails && (
                            <button
                              onClick={() => setExpandedRow(isExpanded ? null : reg.id)}
                              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                              title="Ver detalles"
                            >
                              <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-slate-700">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {pagination.total} registro(s) en total
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 text-sm text-slate-600 dark:text-slate-300">
                  {pagination.page} / {pagination.totalPages}
                </span>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          &copy; 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logístico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>
    </div>
  );
};

export default AuditoriaAcciones;
