/**
 * ============================================================================
 * ISTHO CRM - Dashboard Financiera
 * ============================================================================
 * Panel principal para el rol financiero. Muestra KPIs de cajas menores,
 * gastos pendientes de aprobacion, cajas abiertas y alertas de vehiculos.
 *
 * @author Coordinacion TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
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
  TrendingUp,
} from 'lucide-react';

import { Button } from '../../components/common';
import { cajasMenoresService, movimientosService, vehiculosService } from '../../api/viajes.service';
import { useAuth } from '../../context/AuthContext';
import useNotification from '../../hooks/useNotification';

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
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

const formatCOP = (valor) => {
  const num = Number(valor) || 0;
  return `$ ${num.toLocaleString('es-CO')}`;
};

const formatFecha = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const DashboardFinanciera = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showSuccess, showError } = useNotification();

  // Estado
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [pendientes, setPendientes] = useState([]);
  const [cajasAbiertas, setCajasAbiertas] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [selected, setSelected] = useState([]);
  const [aprobando, setAprobando] = useState({});

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH INICIAL
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
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
          const data = alertasRes.value?.data || [];
          setAlertas(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch (err) {
        console.error('Error cargando dashboard financiera:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selected.length === pendientes.length) {
      setSelected([]);
    } else {
      setSelected(pendientes.map((m) => m.id));
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // FECHA HOY
  // ──────────────────────────────────────────────────────────────────────────

  const hoy = new Date().toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // ──────────────────────────────────────────────────────────────────────────
  // LOADING
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
          <p className="text-gray-500 dark:text-gray-400">Cargando panel financiero...</p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Panel Financiero
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{hoy}</p>
        </div>
      </div>

      {/* ═══ KPI CARDS ═══ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cajas Abiertas */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Cajas Abiertas</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.abiertas ?? 0}
              </p>
            </div>
          </div>
        </div>

        {/* Gastos Pendientes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Gastos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {pendientes.length}
              </p>
            </div>
          </div>
        </div>

        {/* Total Egresos Activos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-red-100 dark:bg-red-900/30">
              <Receipt className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Egresos Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCOP(stats.total_egresos)}
              </p>
            </div>
          </div>
        </div>

        {/* Total Ingresos Activos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Ingresos Activos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCOP(stats.total_ingresos)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ CONTENIDO PRINCIPAL ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ─── GASTOS PENDIENTES DE APROBACION (2/3) ─── */}
        <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Gastos Pendientes de Aprobacion
              </h2>
              {pendientes.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                  {pendientes.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {selected.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAprobarSeleccionados}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Aprobar seleccionados ({selected.length})
                </Button>
              )}
              <button
                onClick={() => navigate('/viajes/movimientos')}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
              >
                Ver todos <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {pendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 dark:text-gray-500">
              <CheckCircle className="h-10 w-10 mb-2" />
              <p>No hay gastos pendientes de aprobacion</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selected.length === pendientes.length && pendientes.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Consecutivo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Conductor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Caja Menor
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {pendientes.map((mov) => (
                    <tr
                      key={mov.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.includes(mov.id)}
                          onChange={() => toggleSelect(mov.id)}
                          className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">
                        {mov.consecutivo || mov.id}
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-400" />
                          {mov.CajaMenor?.conductor_nombre || mov.conductor_nombre || '-'}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                          {CONCEPTO_LABELS[mov.concepto] || mov.concepto || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                        {mov.CajaMenor?.numero || mov.caja_menor_numero || '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                        {formatCOP(mov.valor)}
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
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
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-amber-500" />
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Cajas Menores Abiertas
                </h2>
              </div>
              <button
                onClick={() => navigate('/viajes/cajas-menores')}
                className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 flex items-center gap-1"
              >
                Ver todas <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {cajasAbiertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                <Wallet className="h-8 w-8 mb-2" />
                <p className="text-sm">No hay cajas abiertas</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {cajasAbiertas.map((caja) => (
                  <button
                    key={caja.id}
                    onClick={() => navigate(`/viajes/cajas-menores/${caja.id}`)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        #{caja.numero}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3" />
                        {caja.conductor_nombre || caja.Conductor?.nombre || '-'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {formatFecha(caja.fecha_apertura || caja.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCOP(caja.saldo_actual)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ALERTAS VEHICULOS */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 p-5 border-b border-gray-200 dark:border-gray-700">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Alertas Vehiculos
              </h2>
            </div>

            {alertas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400 dark:text-gray-500">
                <CheckCircle className="h-8 w-8 mb-2" />
                <p className="text-sm">Sin alertas de vehiculos</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {alertas.map((alerta, idx) => (
                  <div
                    key={alerta.id || idx}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {alerta.placa || alerta.vehiculo}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {alerta.tipo === 'soat' ? 'SOAT' : 'Tecnomecanica'}
                        {alerta.fecha_vencimiento && ` - ${formatFecha(alerta.fecha_vencimiento)}`}
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
    </div>
  );
};

export default DashboardFinanciera;
