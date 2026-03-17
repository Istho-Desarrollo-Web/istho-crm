/**
 * ============================================================================
 * ISTHO CRM - Centro de Notificaciones
 * ============================================================================
 * Página completa de notificaciones con filtros, acciones y modo oscuro.
 * Integrada con NotificacionesContext para estado global sincronizado.
 *
 * @author Coordinación TI ISTHO
 * @version 3.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Truck,
  Package,
  Users,
  FileText,
  AlertTriangle,
  Info,
  Clock,
  MoreVertical,
  Eye,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { Button, SearchBar } from '../../components/common';
import { useNotificaciones } from '../../context/NotificacionesContext';
import useNotification from '../../hooks/useNotification';
import notificacionesService from '../../api/notificacionesService';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

const TIPO_CONFIG = {
  despacho: { icon: Truck, bg: 'bg-blue-100 dark:bg-blue-900/30', color: 'text-blue-600 dark:text-blue-400', label: 'Despacho' },
  alerta: { icon: AlertTriangle, bg: 'bg-amber-100 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400', label: 'Alerta' },
  cliente: { icon: Users, bg: 'bg-violet-100 dark:bg-violet-900/30', color: 'text-violet-600 dark:text-violet-400', label: 'Cliente' },
  reporte: { icon: FileText, bg: 'bg-emerald-100 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400', label: 'Reporte' },
  sistema: { icon: Info, bg: 'bg-slate-100 dark:bg-slate-700', color: 'text-slate-600 dark:text-slate-400', label: 'Sistema' },
  inventario: { icon: Package, bg: 'bg-orange-100 dark:bg-orange-900/30', color: 'text-orange-600 dark:text-orange-400', label: 'Inventario' },
};

const PRIORIDAD_CONFIG = {
  urgente: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: 'Urgente' },
  alta: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: 'Alta' },
  normal: { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', label: 'Normal' },
  baja: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-500', label: 'Baja' },
};

const FILTER_OPTIONS = [
  { value: 'todas', label: 'Todas', icon: Bell },
  { value: 'no_leidas', label: 'No leídas', icon: Clock },
  { value: 'despacho', label: 'Despachos', icon: Truck },
  { value: 'alerta', label: 'Alertas', icon: AlertTriangle },
  { value: 'cliente', label: 'Clientes', icon: Users },
  { value: 'reporte', label: 'Reportes', icon: FileText },
  { value: 'sistema', label: 'Sistema', icon: Info },
  { value: 'inventario', label: 'Inventario', icon: Package },
];

const PAGE_SIZE = 20;

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Tiempo relativo
// ════════════════════════════════════════════════════════════════════════════

const getTimeAgo = (fecha) => {
  if (!fecha) return '';
  const now = new Date();
  const date = new Date(fecha);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffHr < 24) return `Hace ${diffHr}h`;
  if (diffDay < 7) return `Hace ${diffDay}d`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIÓN CARD
// ════════════════════════════════════════════════════════════════════════════

const NotificacionCard = ({ notificacion, onMarcarLeida, onEliminar }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const config = TIPO_CONFIG[notificacion.tipo] || TIPO_CONFIG.sistema;
  const prioridad = PRIORIDAD_CONFIG[notificacion.prioridad] || PRIORIDAD_CONFIG.normal;
  const Icon = config.icon;

  const handleAccion = () => {
    const url = notificacion.accion_url || notificacion.url;
    if (url) {
      if (!notificacion.leida) onMarcarLeida(notificacion.id);
      navigate(url);
    }
  };

  return (
    <div className={`relative p-4 rounded-2xl border transition-all ${
      notificacion.leida
        ? 'bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700'
        : 'bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800/50'
    }`}>
      {/* Indicador no leída */}
      {!notificacion.leida && (
        <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse" />
      )}

      <div className="flex gap-4">
        {/* Icon */}
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.bg}`}>
          <Icon className={`w-6 h-6 ${config.color}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className={`font-medium ${notificacion.leida ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-slate-100'}`}>
                {notificacion.titulo}
              </h4>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
                {config.label}
              </span>
              {notificacion.prioridad && notificacion.prioridad !== 'normal' && (
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${prioridad.bg} ${prioridad.text}`}>
                  {prioridad.label}
                </span>
              )}
            </div>

            {/* Menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 py-1 z-20">
                    {!notificacion.leida && (
                      <button
                        onClick={() => { onMarcarLeida(notificacion.id); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Check className="w-4 h-4" />
                        Marcar leída
                      </button>
                    )}
                    {(notificacion.accion_url || notificacion.url) && (
                      <button
                        onClick={() => { handleAccion(); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <Eye className="w-4 h-4" />
                        Ver detalle
                      </button>
                    )}
                    <button
                      onClick={() => { onEliminar(notificacion.id); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className={`text-sm mb-2 ${notificacion.leida ? 'text-slate-500 dark:text-slate-400' : 'text-slate-600 dark:text-slate-300'}`}>
            {notificacion.mensaje || notificacion.descripcion}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {getTimeAgo(notificacion.created_at || notificacion.fecha)}
            </span>

            {(notificacion.accion_url || notificacion.url || notificacion.accion_label) && (
              <button
                onClick={handleAccion}
                className="text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
              >
                {notificacion.accion_label || 'Ver detalle'} &rarr;
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const Notificaciones = () => {
  const navigate = useNavigate();
  const { success, apiError } = useNotification();
  const { fetchCount } = useNotificaciones();

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });

  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR NOTIFICACIONES
  // ──────────────────────────────────────────────────────────────────────────
  const fetchNotificaciones = useCallback(async (page = 1) => {
    try {
      const params = { page, limit: PAGE_SIZE };
      if (filter !== 'todas' && filter !== 'no_leidas') params.tipo = filter;
      if (filter === 'no_leidas') params.no_leidas = true;

      const result = await notificacionesService.getAll(params);
      const items = Array.isArray(result?.data) ? result.data : (Array.isArray(result) ? result : []);
      setNotificaciones(items);
      if (result?.pagination) {
        setPagination({
          page: result.pagination.page || page,
          total: result.pagination.total || 0,
          totalPages: result.pagination.totalPages || 1,
        });
      }
    } catch (err) {
      console.error('Error cargando notificaciones:', err);
      setNotificaciones([]);
    }
  }, [filter]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await fetchNotificaciones(1);
      setLoading(false);
    };
    load();
  }, [fetchNotificaciones]);

  // ──────────────────────────────────────────────────────────────────────────
  // STATS
  // ──────────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const noLeidas = notificaciones.filter(n => !n.leida).length;
    const urgentes = notificaciones.filter(n => n.prioridad === 'urgente' && !n.leida).length;
    return { noLeidas, urgentes };
  }, [notificaciones]);

  // ──────────────────────────────────────────────────────────────────────────
  // FILTRAR (búsqueda local sobre la página actual)
  // ──────────────────────────────────────────────────────────────────────────
  const filteredNotificaciones = useMemo(() => {
    if (!searchTerm) return notificaciones;
    const search = searchTerm.toLowerCase();
    return notificaciones.filter(n => {
      const titulo = (n.titulo || '').toLowerCase();
      const mensaje = (n.mensaje || n.descripcion || '').toLowerCase();
      return titulo.includes(search) || mensaje.includes(search);
    });
  }, [notificaciones, searchTerm]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotificaciones(pagination.page);
    await fetchCount();
    setIsRefreshing(false);
  };

  const handleMarcarLeida = async (id) => {
    try {
      await notificacionesService.marcarLeida(id);
      setNotificaciones(prev => prev.map(n => n.id === id ? { ...n, leida: true, fecha_lectura: new Date() } : n));
      fetchCount();
    } catch (err) {
      apiError(err);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    try {
      await notificacionesService.marcarTodasLeidas();
      setNotificaciones(prev => prev.map(n => ({ ...n, leida: true, fecha_lectura: new Date() })));
      fetchCount();
      success('Todas las notificaciones marcadas como leídas');
    } catch (err) {
      apiError(err);
    }
  };

  const handleEliminar = async (id) => {
    try {
      await notificacionesService.eliminar(id);
      setNotificaciones(prev => prev.filter(n => n.id !== id));
      fetchCount();
      success('Notificación eliminada');
    } catch (err) {
      apiError(err);
    }
  };

  const handleEliminarLeidas = async () => {
    try {
      await notificacionesService.eliminarLeidas();
      setNotificaciones(prev => prev.filter(n => !n.leida));
      fetchCount();
      success('Notificaciones leídas eliminadas');
    } catch (err) {
      apiError(err);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setLoading(true);
    fetchNotificaciones(newPage).then(() => setLoading(false));
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="pt-28 px-4 pb-8 max-w-4xl mx-auto">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Notificaciones</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              {pagination.total > 0
                ? `${pagination.total} notificación${pagination.total > 1 ? 'es' : ''} en total`
                : 'No tienes notificaciones'
              }
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={handleRefresh}
              loading={isRefreshing}
              title="Actualizar"
            />
            {stats.noLeidas > 0 && (
              <Button variant="outline" icon={CheckCheck} onClick={handleMarcarTodasLeidas}>
                Marcar todas leídas
              </Button>
            )}
          </div>
        </div>

        {/* ALERTA URGENTES */}
        {stats.urgentes > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-red-800 dark:text-red-300">
                Tienes {stats.urgentes} alerta{stats.urgentes > 1 ? 's' : ''} urgente{stats.urgentes > 1 ? 's' : ''}
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">Requieren atención inmediata</p>
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                placeholder="Buscar notificaciones..."
                value={searchTerm}
                onChange={setSearchTerm}
                onClear={() => setSearchTerm('')}
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {FILTER_OPTIONS.map((opt) => {
                const FilterIcon = opt.icon;
                const isActive = filter === opt.value;

                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                    }`}
                  >
                    <FilterIcon className="w-4 h-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* LISTA DE NOTIFICACIONES */}
        {loading ? (
          <div className="space-y-4">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl p-4 animate-pulse border border-gray-100 dark:border-slate-700">
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-slate-700 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotificaciones.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center shadow-sm border border-gray-100 dark:border-slate-700">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">Sin notificaciones</h3>
            <p className="text-slate-500 dark:text-slate-400">
              {filter !== 'todas'
                ? 'No hay notificaciones con el filtro seleccionado'
                : 'No tienes notificaciones pendientes'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filteredNotificaciones.map((notificacion) => (
                <NotificacionCard
                  key={notificacion.id}
                  notificacion={notificacion}
                  onMarcarLeida={handleMarcarLeida}
                  onEliminar={handleEliminar}
                />
              ))}
            </div>

            {/* Paginación */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-400 px-3">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 rounded-lg border border-gray-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Acciones masivas */}
            {notificaciones.some(n => n.leida) && (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="ghost"
                  icon={Trash2}
                  onClick={handleEliminarLeidas}
                  className="text-slate-500 dark:text-slate-400"
                >
                  Eliminar notificaciones leídas
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default Notificaciones;
