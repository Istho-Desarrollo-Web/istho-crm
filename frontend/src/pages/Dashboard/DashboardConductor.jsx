/**
 * ============================================================================
 * ISTHO CRM - Dashboard Conductor (Mobile-First)
 * ============================================================================
 * Panel principal para conductores. Muestra caja menor activa, acciones
 * rápidas, últimos viajes y gastos pendientes. Diseño mobile-first con
 * tarjetas redondeadas y objetivos táctiles amplios.
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Wallet,
  Receipt,
  Truck,
  Calendar,
  DollarSign,
  Plus,
  ChevronRight,
  Clock,
} from 'lucide-react';

import { Button } from '../../components/common';
import { cajasMenoresService, viajesService, movimientosService } from '../../api/viajes.service';
import { useAuth } from '../../context/AuthContext';
import { getServerFileUrl } from '../../api/client';
import useNotification from '../../hooks/useNotification';

// ════════════════════════════════════════════════════════════════════════════
// MAPA DE CONCEPTOS
// ════════════════════════════════════════════════════════════════════════════
const CONCEPTO_LABELS = {
  cuadre_de_caja: 'Cuadre de Caja',
  descargues: 'Descargues',
  acpm: 'ACPM',
  administracion: 'Administración',
  alimentacion: 'Alimentación',
  comisiones: 'Comisiones',
  desencarpe: 'Desencarpe',
  encarpe: 'Encarpe',
  hospedaje: 'Hospedaje',
  otros: 'Otros',
  seguros: 'Seguros',
  repuestos: 'Repuestos',
  tecnicomecanica: 'Tecnomecánica',
  peajes: 'Peajes',
  ligas: 'Ligas',
  parqueadero: 'Parqueadero',
  urea: 'UREA',
  ingreso_adicional: 'Ingreso Adicional',
};

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════
const formatMoney = (value) => {
  const num = Number(value) || 0;
  return `$${num.toLocaleString('es-CO')}`;
};

const formatDate = (date) => {
  const d = new Date(date);
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]} ${d.getFullYear()}`;
};

const getEstadoBadge = (estado) => {
  const map = {
    pendiente: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    aprobado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rechazado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    en_curso: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    completado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelado: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    programado: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  };
  return map[estado] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
};

const getGastoBorder = (estado) => {
  const map = {
    pendiente: 'border-l-orange-400',
    aprobado: 'border-l-green-400',
    rechazado: 'border-l-red-400',
  };
  return map[estado] || 'border-l-gray-400';
};

// Derivar estado de aprobación desde booleans del movimiento
const getAprobacionEstado = (mov) => {
  if (mov.aprobado) return 'aprobado';
  if (mov.rechazado) return 'rechazado';
  return 'pendiente';
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
const DashboardConductor = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showError } = useNotification();

  const [cajaActiva, setCajaActiva] = useState(null);
  const [viajes, setViajes] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [loading, setLoading] = useState(true);

  // ──────────────────────────────────────────────────────────────────────
  // CARGA INICIAL
  // ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [cajaRes, viajesRes, gastosRes] = await Promise.allSettled([
          cajasMenoresService.getAll({ estado: 'abierta', limit: 1 }),
          viajesService.getAll({ limit: 5, sort: '-fecha' }),
          movimientosService.getAll({ limit: 5, sort: '-created_at' }),
        ]);

        if (cajaRes.status === 'fulfilled') {
          const cajas = cajaRes.value?.data?.data || cajaRes.value?.data || [];
          setCajaActiva(Array.isArray(cajas) ? cajas[0] || null : null);
        }

        if (viajesRes.status === 'fulfilled') {
          const v = viajesRes.value?.data?.data || viajesRes.value?.data || [];
          setViajes(Array.isArray(v) ? v : []);
        }

        if (gastosRes.status === 'fulfilled') {
          const g = gastosRes.value?.data?.data || gastosRes.value?.data || [];
          setGastos(Array.isArray(g) ? g : []);
        }
      } catch (err) {
        showError('Error al cargar datos del dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────
  // DATOS DEL USUARIO
  // ──────────────────────────────────────────────────────────────────────
  const nombre = user?.nombre || user?.username || 'Conductor';
  const iniciales = nombre
    .split(' ')
    .map((p) => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  // ──────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 pt-24 pb-8 px-3 sm:px-4">
    <div className="max-w-lg mx-auto space-y-5">

      {/* ═══════════════════════════════════════════════════════════════════
          1. WELCOME HEADER
          ═══════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-4">
        {user?.avatar_url ? (
          <img src={getServerFileUrl(user.avatar_url)} alt={nombre} className="w-12 h-12 rounded-full object-cover shrink-0 shadow-md" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-bold shrink-0">
            {iniciales}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
            Hola, {nombre}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {formatDate(new Date())}
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          2. CAJA MENOR ACTIVA
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={`rounded-2xl p-5 shadow-sm border transition-colors ${
          cajaActiva
            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer active:bg-gray-50 dark:active:bg-gray-750'
            : 'bg-gray-50 dark:bg-gray-800/50 border-dashed border-gray-300 dark:border-gray-600'
        }`}
        onClick={() => cajaActiva && navigate(`/viajes/cajas-menores/${cajaActiva.id}`)}
        role={cajaActiva ? 'button' : undefined}
        tabIndex={cajaActiva ? 0 : undefined}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
              Caja Menor Activa
            </h2>
          </div>
          {cajaActiva && (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {cajaActiva ? (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {cajaActiva.numero || `Caja #${cajaActiva.id}`}
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">
              {formatMoney(cajaActiva.saldo_actual)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Saldo inicial: {formatMoney(cajaActiva.saldo_inicial)}
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center py-4 text-center">
            <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tienes caja menor activa
            </p>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          3. ACCIONES RÁPIDAS
          ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
          Acciones Rápidas
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {/* Nuevo Viaje */}
          <button
            onClick={() => navigate('/viajes/viajes/nuevo')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-all min-h-[100px]"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Nuevo Viaje</span>
          </button>

          {/* Registrar Gasto */}
          <button
            onClick={() => navigate('/viajes/movimientos/nuevo')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-95 transition-all min-h-[100px]"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800/50 flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Registrar Gasto</span>
          </button>

          {/* Mis Viajes */}
          <button
            onClick={() => navigate('/viajes/viajes')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-900/30 active:scale-95 transition-all min-h-[100px]"
          >
            <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-800/50 flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Mis Viajes</span>
          </button>

          {/* Mis Gastos */}
          <button
            onClick={() => navigate('/viajes/movimientos')}
            className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 active:scale-95 transition-all min-h-[100px]"
          >
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-800/50 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-sm font-medium">Mis Gastos</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          4. ÚLTIMOS VIAJES
          ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Últimos Viajes
          </h2>
          {viajes.length > 0 && (
            <button
              onClick={() => navigate('/viajes/viajes')}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 hover:underline"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {viajes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
            <Truck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aún no tienes viajes registrados
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {viajes.map((viaje) => (
              <button
                key={viaje.id}
                onClick={() => navigate(`/viajes/viajes/${viaje.id}`)}
                className="w-full text-left rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 hover:bg-gray-50 dark:hover:bg-gray-750 active:scale-[0.98] transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {viaje.numero || `Viaje #${viaje.id}`}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(
                          viaje.estado
                        )}`}
                      >
                        {viaje.estado?.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      {viaje.fecha && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(viaje.fecha).toLocaleDateString('es-CO')}
                        </span>
                      )}
                      {viaje.destino && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3" />
                          {viaje.destino}
                        </span>
                      )}
                    </div>
                    {viaje.vehiculo_placa && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 flex items-center gap-1">
                        <Truck className="w-3 h-3" />
                        {viaje.vehiculo_placa}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          5. GASTOS PENDIENTES
          ═══════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
            Últimos Gastos
          </h2>
          {gastos.length > 0 && (
            <button
              onClick={() => navigate('/viajes/movimientos')}
              className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-0.5 hover:underline"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {gastos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 dark:border-gray-600 p-6 text-center">
            <Receipt className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aún no tienes gastos registrados
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {gastos.map((gasto) => (
              <div
                key={gasto.id}
                className={`rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-4 ${getGastoBorder(
                  getAprobacionEstado(gasto)
                )} p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">
                        {gasto.consecutivo || `#${gasto.id}`}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(
                          getAprobacionEstado(gasto)
                        )}`}
                      >
                        {getAprobacionEstado(gasto)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {CONCEPTO_LABELS[gasto.concepto] || gasto.concepto || 'Sin concepto'}
                    </p>
                  </div>
                  <span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">
                    {formatMoney(gasto.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
    </div>
  );
};

export default DashboardConductor;
