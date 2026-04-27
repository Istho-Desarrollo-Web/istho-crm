/**
 * ============================================================================
 * ISTHO CRM - Dashboard Financiera
 * ============================================================================
 * Panel principal para el rol financiero. Muestra KPIs de cajas menores,
 * gastos pendientes de aprobacion, cajas abiertas y alertas de vehiculos.
 *
 * @author Coordinacion TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Receipt,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ChevronRight,
  AlertTriangle,
  Users,
  RefreshCw,
  Truck,
  FileText,
} from 'lucide-react';

import { KpiCard, Button } from '../../components/common';
import { formatDate } from '../../utils/formatDate';
import { getGreeting } from '../../utils/greeting';
import {
  cajasMenoresService,
  movimientosService,
  vehiculosService,
} from '../../api/viajes.service';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import useNotification from '../../hooks/useNotification';
import PageFooter from '@components/common/PageFooter';

// ════════════════════════════════════════════════════════════════════════════
// MAPA DE CONCEPTOS
// ════════════════════════════════════════════════════════════════════════════

const CONCEPTO_LABELS = {
  cuadre_de_caja: 'Cuadre de Caja',
  descargues: 'Descargues',
  acpm: 'ACPM',
  administracion: 'Administracion',
  alimentacion: 'Alimentacion',
  comisiones: 'Comisiones',
  desencarpe: 'Desencarpe',
  encarpe: 'Encarpe',
  hospedaje: 'Hospedaje',
  otros: 'Otros',
  seguros: 'Seguros',
  repuestos: 'Repuestos',
  tecnicomecanica: 'Tecnomecanica',
  peajes: 'Peajes',
  ligas: 'Ligas',
  parqueadero: 'Parqueadero',
  urea: 'UREA',
  ingreso_adicional: 'Ingreso Adicional',
};

// ════════════════════════════════════════════════════════════════════════════
// KPI CONFIG
// ════════════════════════════════════════════════════════════════════════════

const KPI_CONFIG = [
  {
    id: 'cajas_abiertas',
    title: 'Cajas Abiertas',
    icon: Wallet,
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    key: 'abiertas',
    fallback: 0,
  },
  {
    id: 'gastos_pendientes',
    title: 'Gastos Pendientes',
    icon: Clock,
    iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    key: 'pendientesCount',
    fallback: 0,
  },
  {
    id: 'total_egresos',
    title: 'Total Egresos Activos',
    icon: Receipt,
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    key: 'total_egresos_activos',
    fallback: 0,
    isCurrency: true,
  },
  {
    id: 'total_ingresos',
    title: 'Total Ingresos Activos',
    icon: DollarSign,
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    key: 'total_ingresos_activos',
    fallback: 0,
    isCurrency: true,
  },
];

// ════════════════════════════════════════════════════════════════════════════
// QUICK ACTION
// ════════════════════════════════════════════════════════════════════════════

const QuickAction = ({ icon: Icon, label, description, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-white dark:bg-centhrix-card rounded-xl border border-gray-100 dark:border-slate-700 hover:border-transparent hover:shadow-md dark:hover:shadow-lg transition-all group text-left w-full"
  >
    <div
      className={`p-3 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 group-hover:scale-110 transition-transform`}
    >
      <Icon className={`w-6 h-6 text-${color}-600 dark:text-${color}-400`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{description}</p>
    </div>
    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
  </button>
);

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const formatCOP = (valor) => {
  const num = Number(valor) || 0;
  return `$ ${num.toLocaleString('es-CO')}`;
};

const formatFecha = (fecha) => formatDate(fecha);

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const DashboardFinanciera = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: showSuccess, error: showError } = useNotification();
  const socket = useSocket();

  // Estado
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [stats, setStats] = useState({});
  const [pendientes, setPendientes] = useState([]);
  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [selected, setSelected] = useState([]);
  const [aprobando, setAprobando] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const [statsRes, pendientesRes, cajasRes, alertasRes] = await Promise.allSettled([
        cajasMenoresService.getStats(),
        movimientosService.getAll({ aprobado: 'pendiente', limit: 20 }),
        cajasMenoresService.getAll({ estado: 'abierta', limit: 10 }),
        vehiculosService.getAlertas(),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value?.data || statsRes.value || {});
      }
      if (pendientesRes.status === 'fulfilled') {
        const data = pendientesRes.value?.data?.rows || pendientesRes.value?.data || [];
        setPendientes(Array.isArray(data) ? data : []);
      }
      if (cajasRes.status === 'fulfilled') {
        const data = cajasRes.value?.data?.rows || cajasRes.value?.data || [];
        setCajasAbiertas(Array.isArray(data) ? data : []);
      }
      if (alertasRes.status === 'fulfilled') {
        const vehiculos = alertasRes.value?.data || [];
        // Backend devuelve vehiculos con alerta_soat/alerta_tecnicomecanica
        // Transformar a alertas individuales para el render
        const alertasList = [];
        (Array.isArray(vehiculos) ? vehiculos : []).forEach((v) => {
          if (v.alerta_soat === 'por_vencer' || v.alerta_soat === 'vencido') {
            alertasList.push({
              id: `${v.id}-soat`,
              placa: v.placa,
              tipo: 'soat',
              estado: v.alerta_soat,
              fecha_vencimiento: v.vencimiento_soat,
            });
          }
          if (v.alerta_tecnicomecanica === 'por_vencer' || v.alerta_tecnicomecanica === 'vencido') {
            alertasList.push({
              id: `${v.id}-tecno`,
              placa: v.placa,
              tipo: 'tecnicomecanica',
              estado: v.alerta_tecnicomecanica,
              fecha_vencimiento: v.vencimiento_tecnicomecanica,
            });
          }
        });
        setAlertas(alertasList.slice(0, 5));
      }
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error cargando dashboard financiera:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ──────────────────────────────────────────────────────────────────────────
  // SOCKET — ACTUALIZACIONES EN TIEMPO REAL
  // ──────────────────────────────────────────────────────────────────────────

  const refetchStats = useCallback(async () => {
    try {
      const res = await cajasMenoresService.getStats();
      setStats(res?.data || res || {});
      setLastUpdated(new Date());
    } catch {
      /* ignorado intencionalmente */
    }
  }, []);

  useEffect(() => {
    if (!socket?.on) return;

    // Movimientos
    const handleMovimientoCreado = async () => {
      // Un nuevo gasto puede ser pendiente: recargar lista
      try {
        const res = await movimientosService.getAll({ aprobado: 'pendiente', limit: 20 });
        const data = res?.data?.rows || res?.data || [];
        setPendientes(Array.isArray(data) ? data : []);
      } catch {
        /* ignorado intencionalmente */
      }
    };
    const handleMovimientoActualizado = (data) => {
      // Si fue aprobado o rechazado, sacar de pendientes y actualizar saldo en caja
      if (data.aprobado || data.rechazado) {
        setPendientes((prev) => prev.filter((m) => m.id !== data.id));
        setSelected((prev) => prev.filter((id) => id !== data.id));
        // Actualizar saldo de la caja asociada en la lista
        if (data.caja_menor_id && data.saldo_actual_caja !== undefined) {
          setCajasAbiertas((prev) =>
            prev.map((c) =>
              c.id === data.caja_menor_id ? { ...c, saldo_actual: data.saldo_actual_caja } : c
            )
          );
        }
        refetchStats();
      }
    };
    const handleMovimientoEliminado = (data) => {
      setPendientes((prev) => prev.filter((m) => m.id !== data.id));
      setSelected((prev) => prev.filter((id) => id !== data.id));
      if (data.caja_menor_id) refetchStats();
    };
    const handleAprobacionMasiva = (data) => {
      setPendientes((prev) => prev.filter((m) => !data.ids.includes(m.id)));
      setSelected([]);
      refetchStats();
    };

    // Cajas
    const handleCajaCreada = async () => {
      try {
        const res = await cajasMenoresService.getAll({ estado: 'abierta', limit: 10 });
        const data = res?.data?.rows || res?.data || [];
        setCajasAbiertas(Array.isArray(data) ? data : []);
      } catch {
        /* ignorado intencionalmente */
      }
      refetchStats();
    };
    const handleCajaActualizada = (data) => {
      if (data.estado === 'cerrada') {
        setCajasAbiertas((prev) => prev.filter((c) => c.id !== data.id));
      } else {
        setCajasAbiertas((prev) => prev.map((c) => (c.id === data.id ? { ...c, ...data } : c)));
      }
      refetchStats();
    };
    const handleCajaEliminada = (data) => {
      setCajasAbiertas((prev) => prev.filter((c) => c.id !== data.id));
      refetchStats();
    };

    socket.on('movimiento:creado', handleMovimientoCreado);
    socket.on('movimiento:actualizado', handleMovimientoActualizado);
    socket.on('movimiento:eliminado', handleMovimientoEliminado);
    socket.on('movimiento:aprobacion_masiva', handleAprobacionMasiva);
    socket.on('caja:creada', handleCajaCreada);
    socket.on('caja:actualizada', handleCajaActualizada);
    socket.on('caja:eliminada', handleCajaEliminada);

    return () => {
      socket.off('movimiento:creado', handleMovimientoCreado);
      socket.off('movimiento:actualizado', handleMovimientoActualizado);
      socket.off('movimiento:eliminado', handleMovimientoEliminado);
      socket.off('movimiento:aprobacion_masiva', handleAprobacionMasiva);
      socket.off('caja:creada', handleCajaCreada);
      socket.off('caja:actualizada', handleCajaActualizada);
      socket.off('caja:eliminada', handleCajaEliminada);
    };
  }, [socket, refetchStats]);

  // ──────────────────────────────────────────────────────────────────────────
  // ACCIONES
  // ──────────────────────────────────────────────────────────────────────────

  const handleAprobar = async (mov) => {
    setAprobando((prev) => ({ ...prev, [mov.id]: 'aprobando' }));
    try {
      await movimientosService.aprobar(mov.id, {
        aprobado: 'aprobado',
        valor_aprobado: mov.valor,
      });
      setPendientes((prev) => prev.filter((m) => m.id !== mov.id));
      setSelected((prev) => prev.filter((id) => id !== mov.id));
      showSuccess('Gasto aprobado exitosamente');
    } catch (err) {
      showError(err?.response?.data?.error || 'Error al aprobar gasto');
    } finally {
      setAprobando((prev) => {
        const copy = { ...prev };
        delete copy[mov.id];
        return copy;
      });
    }
  };

  const handleRechazar = async (mov) => {
    setAprobando((prev) => ({ ...prev, [mov.id]: 'rechazando' }));
    try {
      await movimientosService.aprobar(mov.id, {
        aprobado: 'rechazado',
      });
      setPendientes((prev) => prev.filter((m) => m.id !== mov.id));
      setSelected((prev) => prev.filter((id) => id !== mov.id));
      showSuccess('Gasto rechazado');
    } catch (err) {
      showError(err?.response?.data?.error || 'Error al rechazar gasto');
    } finally {
      setAprobando((prev) => {
        const copy = { ...prev };
        delete copy[mov.id];
        return copy;
      });
    }
  };

  const handleAprobarSeleccionados = async () => {
    if (selected.length === 0) return;
    try {
      await movimientosService.aprobarMasivo({
        ids: selected,
        aprobado: 'aprobado',
      });
      setPendientes((prev) => prev.filter((m) => !selected.includes(m.id)));
      setSelected([]);
      showSuccess(`${selected.length} gastos aprobados exitosamente`);
    } catch (err) {
      showError(err?.response?.data?.error || 'Error al aprobar gastos');
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === pendientes.length) {
      setSelected([]);
    } else {
      setSelected(pendientes.map((m) => m.id));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // KPI VALUES
  // ──────────────────────────────────────────────────────────────────────────

  const kpiValues = {
    ...stats,
    pendientesCount: pendientes.length,
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* PAGE HEADER */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">
              {getGreeting()}, {user?.nombre_completo?.split(' ')[0] || 'Usuario'}
            </h1>
            <p className="text-slate-500 mt-1 dark:text-slate-400">
              Panel Financiero
              {lastUpdated && (
                <span className="text-xs ml-2 text-slate-400 dark:text-slate-600">
                  &bull; Actualizado: {new Date(lastUpdated).toLocaleTimeString('es-CO')}
                </span>
              )}
            </p>
          </div>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className={`
              flex items-center gap-2 px-4 py-2
              bg-white dark:bg-centhrix-card
              border border-gray-200 dark:border-slate-700
              rounded-xl
              hover:bg-gray-50 dark:hover:bg-centhrix-surface
              transition-colors shadow-sm
              ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-500 dark:text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline text-sm text-slate-600 dark:text-slate-300">
              Actualizar
            </span>
          </button>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* KPI CARDS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {KPI_CONFIG.map((kpi) => {
            const rawValue = kpiValues[kpi.key] ?? kpi.fallback;
            const value = kpi.isCurrency ? formatCOP(rawValue) : rawValue;

            return (
              <KpiCard
                key={kpi.id}
                title={kpi.title}
                value={value}
                icon={kpi.icon}
                iconBg={kpi.iconBg}
                iconColor={kpi.iconColor}
                loading={loading}
              />
            );
          })}
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* QUICK ACTIONS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <QuickAction
            icon={Wallet}
            label="Cajas Menores"
            description="Gestionar cajas abiertas"
            color="amber"
            onClick={() => navigate('/viajes/cajas-menores')}
          />
          <QuickAction
            icon={Receipt}
            label="Movimientos"
            description="Aprobar gastos pendientes"
            color="orange"
            onClick={() => navigate('/viajes/movimientos')}
          />
          <QuickAction
            icon={Truck}
            label="Viajes"
            description="Seguimiento de viajes"
            color="blue"
            onClick={() => navigate('/viajes/viajes')}
          />
          <QuickAction
            icon={FileText}
            label="Reportes"
            description="Informes financieros"
            color="violet"
            onClick={() => navigate('/reportes')}
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CONTENIDO PRINCIPAL */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* ─── GASTOS PENDIENTES DE APROBACION (2/3) ─── */}
          <div className="xl:col-span-2 bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                  <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Gastos Pendientes de Aprobacion
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {pendientes.length} pendientes de revision
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selected.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAprobarSeleccionados}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Aprobar ({selected.length})
                  </Button>
                )}
                <button
                  onClick={() => navigate('/viajes/movimientos')}
                  className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1"
                >
                  Ver todos <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {pendientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
                <CheckCircle className="h-10 w-10 mb-2" />
                <p className="text-sm">No hay gastos pendientes de aprobacion</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-centhrix-bg/30">
                      <th className="px-4 py-2.5 text-left">
                        <input
                          type="checkbox"
                          checked={selected.length === pendientes.length && pendientes.length > 0}
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                        />
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Concepto
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Caja
                      </th>
                      <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Valor
                      </th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider hidden md:table-cell">
                        Fecha
                      </th>
                      <th className="px-4 py-2.5 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendientes.map((mov) => (
                      <tr
                        key={mov.id}
                        className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/20 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selected.includes(mov.id)}
                            onChange={() => toggleSelect(mov.id)}
                            className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-4 py-3 font-mono text-sm text-slate-700 dark:text-slate-300">
                          {mov.consecutivo || mov.id}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-700 dark:text-slate-200 font-medium truncate max-w-[140px]">
                              {mov.usuario?.nombre_completo ||
                                mov.CajaMenor?.asignado_nombre ||
                                mov.usuario_nombre ||
                                '-'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700 dark:bg-centhrix-surface dark:text-slate-300">
                            {CONCEPTO_LABELS[mov.concepto] || mov.concepto || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                          {mov.cajaMenor?.numero ||
                            mov.CajaMenor?.numero ||
                            mov.caja_menor_numero ||
                            '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800 dark:text-white">
                          {formatCOP(mov.valor)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 hidden md:table-cell">
                          {formatFecha(mov.fecha || mov.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleAprobar(mov)}
                              disabled={!!aprobando[mov.id]}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50 disabled:opacity-50 transition-colors"
                              title="Aprobar"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Aprobar
                            </button>
                            <button
                              onClick={() => handleRechazar(mov)}
                              disabled={!!aprobando[mov.id]}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50 transition-colors"
                              title="Rechazar"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Rechazar
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ─── PANEL LATERAL (1/3) ─── */}
          <div className="space-y-6">
            {/* CAJAS MENORES ABIERTAS */}
            <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                    <Wallet className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                    Cajas Abiertas
                  </h3>
                </div>
                <button
                  onClick={() => navigate('/viajes/cajas-menores')}
                  className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline flex items-center gap-1"
                >
                  Ver todas <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {cajasAbiertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                  <Wallet className="h-8 w-8 mb-2" />
                  <p className="text-sm">No hay cajas abiertas</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {cajasAbiertas.map((caja) => (
                    <button
                      key={caja.id}
                      onClick={() => navigate(`/viajes/cajas-menores/${caja.id}`)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-centhrix-surface/20 transition-colors text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          #{caja.numero}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                          <Users className="h-3 w-3" />
                          {caja.asignado_nombre ||
                            caja.asignado?.nombre_completo ||
                            caja.Asignado?.nombre_completo ||
                            '-'}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                          {formatFecha(caja.fecha_apertura || caja.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-sm font-bold ${Number(caja.saldo_actual) < 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-white'}`}
                        >
                          {formatCOP(caja.saldo_actual)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ALERTAS VEHICULOS */}
            <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Alertas Vehiculos
                </h3>
              </div>

              {alertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
                  <CheckCircle className="h-8 w-8 mb-2" />
                  <p className="text-sm">Sin alertas de vehiculos</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {alertas.map((alerta, idx) => (
                    <div key={alerta.id || idx} className="flex items-center justify-between p-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                          {alerta.placa || alerta.vehiculo}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {alerta.tipo === 'soat' ? 'SOAT' : 'Tecnomecanica'}
                          {alerta.fecha_vencimiento &&
                            ` - ${formatFecha(alerta.fecha_vencimiento)}`}
                        </p>
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          alerta.estado === 'vencido'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                        }`}
                      >
                        {alerta.estado === 'vencido' ? 'Vencido' : 'Por vencer'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <PageFooter />
      </main>
    </div>
  );
};

export default DashboardFinanciera;
