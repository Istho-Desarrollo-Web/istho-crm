/**
 * ============================================================================
 * ISTHO CRM - ViajeDetail
 * ============================================================================
 * Vista de detalle de un viaje con informacion, facturacion y gastos asociados.
 *
 * URL: /viajes/viajes/:id
 *
 * @author Coordinacion TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft,
  Pencil,
  MapPin,
  Truck,
  Receipt,
  Plus,
  CheckCircle,
  XCircle,
  DollarSign,
  FileText,
  Calendar,
  Users,
  Package,
} from 'lucide-react';

import { Button, Modal, StatusChip } from '../../components/common';
import { viajesService } from '../../api/viajes.service';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';
import MovimientoForm from './components/MovimientoForm';

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formato pesos colombianos
 */
const formatCOP = (value) => {
  const num = parseFloat(value) || 0;
  return num.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
};

/**
 * Formato fecha corta DD/MM/YYYY
 */
const formatFecha = (fecha) => {
  if (!fecha) return '-';
  const d = new Date(fecha);
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/**
 * Mapa de etiquetas de conceptos (mismos que MovimientosList)
 */
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
  peajes_ingreso: 'Peajes Ingreso',
  ligas_ingresos: 'Ligas Ingresos',
  parqueadero_ingresos: 'Parqueadero Ingresos',
  urea_ingresos: 'UREA Ingresos',
};

/**
 * Color del chip de estado
 */
const getEstadoChipProps = (estado) => {
  switch (estado) {
    case 'activo':
      return { label: 'Activo', sx: { backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 600 } };
    case 'completado':
      return { label: 'Completado', sx: { backgroundColor: '#dbeafe', color: '#2563eb', fontWeight: 600 } };
    case 'anulado':
      return { label: 'Anulado', sx: { backgroundColor: '#fee2e2', color: '#dc2626', fontWeight: 600 } };
    default:
      return { label: estado || '-', sx: { fontWeight: 600 } };
  }
};

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY CARD
// ════════════════════════════════════════════════════════════════════════════

const SummaryCard = ({ title, value, icon: Icon, iconColor }) => (
  <div className="rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <p className="font-bold text-slate-800 dark:text-slate-100 text-lg">
          {value}
        </p>
      </div>
      {Icon && (
        <div className={`p-3 rounded-xl ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>
      )}
    </div>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// INFO ROW ITEM
// ════════════════════════════════════════════════════════════════════════════

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2.5 border-b border-gray-50 dark:border-slate-700 last:border-b-0">
    <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value || '-'}</span>
  </div>
);

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ViajeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { success, apiError } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────

  const [viaje, setViaje] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gastoFormOpen, setGastoFormOpen] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────────────────────────

  const fetchViaje = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await viajesService.getById(id);
      setViaje(response.data || response);
    } catch (err) {
      setError(err?.response?.data?.mensaje || 'Error al cargar el viaje');
      apiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchViaje();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (error || !viaje) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Viaje no encontrado</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{error || 'El viaje solicitado no existe'}</p>
            <Button variant="primary" onClick={() => navigate('/viajes/viajes')}>
              Volver a Viajes
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIABLES CALCULADAS
  // ──────────────────────────────────────────────────────────────────────────

  const gastos = viaje.gastos || viaje.movimientos || [];
  const estadoChip = getEstadoChipProps(viaje.estado);

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* HEADER                                                        */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Tooltip title="Volver">
              <IconButton onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </IconButton>
            </Tooltip>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Truck className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    Viaje #{viaje.numero || viaje.id}
                  </h1>
                  <Chip size="small" {...estadoChip} />
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {formatFecha(viaje.fecha)}
                  {viaje.origen && viaje.destino && ` - ${viaje.origen} a ${viaje.destino}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ProtectedAction module="viajes" action="editar">
              <Button
                variant="outline"
                icon={Pencil}
                onClick={() => navigate(`/viajes/viajes/${id}/editar`)}
              >
                Editar
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* INFO CARDS - ROW 1 (4 cards)                                  */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <SummaryCard
            title="Fecha"
            value={formatFecha(viaje.fecha)}
            icon={Calendar}
            iconColor="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400"
          />
          <SummaryCard
            title="Ruta"
            value={viaje.origen && viaje.destino ? `${viaje.origen} → ${viaje.destino}` : viaje.destino || '-'}
            icon={MapPin}
            iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
          />
          <SummaryCard
            title="Vehiculo"
            value={
              viaje.vehiculo
                ? `${viaje.vehiculo.placa || ''}${viaje.vehiculo.tipo_vehiculo ? ` - ${viaje.vehiculo.tipo_vehiculo}` : ''}`
                : viaje.vehiculo_placa || '-'
            }
            icon={Truck}
            iconColor="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
          />
          <SummaryCard
            title="Conductor"
            value={viaje.conductor?.nombre_completo || viaje.conductor_nombre || '-'}
            icon={Users}
            iconColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* INFO CARDS - ROW 2 (3 cards)                                  */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <SummaryCard
            title="Cliente"
            value={
              viaje.cliente_nombre
                ? `${viaje.cliente_nombre}${viaje.documento_cliente ? ` - ${viaje.documento_cliente}` : ''}`
                : viaje.cliente?.nombre || '-'
            }
            icon={Package}
            iconColor="bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400"
          />
          <SummaryCard
            title="Peso"
            value={viaje.peso ? `${Number(viaje.peso).toLocaleString('es-CO')} ton` : '-'}
            icon={Package}
            iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
          />
          <SummaryCard
            title="Valor del Viaje"
            value={formatCOP(viaje.valor_viaje)}
            icon={DollarSign}
            iconColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCION: Informacion Basica                                   */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            Informacion Basica
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
            <InfoRow label="Descripcion" value={viaje.descripcion || 'Sin descripcion'} />
            <InfoRow label="Numero de Personas" value={viaje.num_personas} />
            <InfoRow label="Valor Descargue" value={viaje.valor_descargue ? formatCOP(viaje.valor_descargue) : '-'} />
            <InfoRow
              label="Caja Menor"
              value={
                viaje.caja_menor ? (
                  <button
                    onClick={() => navigate(`/viajes/cajas-menores/${viaje.caja_menor.id || viaje.caja_menor_id}`)}
                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline font-medium"
                  >
                    {viaje.caja_menor.numero || `#${viaje.caja_menor.id}`}
                  </button>
                ) : viaje.caja_menor_id ? (
                  <button
                    onClick={() => navigate(`/viajes/cajas-menores/${viaje.caja_menor_id}`)}
                    className="text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 underline font-medium"
                  >
                    #{viaje.caja_menor_id}
                  </button>
                ) : (
                  '-'
                )
              }
            />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCION: Datos de Facturacion                                 */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-slate-400" />
            Datos de Facturacion
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8">
            <InfoRow label="No. Factura" value={viaje.no_factura} />
            <InfoRow
              label="Facturado"
              value={
                <Chip
                  label={viaje.facturado ? 'Si' : 'No'}
                  size="small"
                  sx={{
                    backgroundColor: viaje.facturado ? '#dcfce7' : '#fee2e2',
                    color: viaje.facturado ? '#16a34a' : '#dc2626',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              }
            />
            <InfoRow label="Valor Viaje" value={formatCOP(viaje.valor_viaje)} />
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SECCION: Gastos Asociados                                     */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-slate-400" />
              Gastos Asociados
              {gastos.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                  {gastos.length}
                </span>
              )}
            </h3>
            <ProtectedAction module="viajes" action="crear">
              <Button
                variant="primary"
                icon={Plus}
                size="sm"
                onClick={() => setGastoFormOpen(true)}
              >
                Agregar Gasto
              </Button>
            </ProtectedAction>
          </div>

          {gastos.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-slate-400 dark:text-slate-500" />
              </div>
              <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-1">
                No hay gastos registrados
              </h4>
              <p className="text-slate-500 dark:text-slate-400 text-sm">
                Los gastos asociados a este viaje apareceran aqui
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Consecutivo
                    </th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Concepto
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Valor
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Aprobado
                    </th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Valor Aprobado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {gastos.map((gasto) => (
                    <tr
                      key={gasto.id}
                      className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {gasto.consecutivo || gasto.id || '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                        {CONCEPTO_LABELS[gasto.concepto] || gasto.concepto || '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Chip
                          label={gasto.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}
                          size="small"
                          sx={{
                            backgroundColor: gasto.tipo_movimiento === 'ingreso' ? '#dcfce7' : '#fee2e2',
                            color: gasto.tipo_movimiento === 'ingreso' ? '#16a34a' : '#dc2626',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-800 dark:text-slate-200">
                        {formatCOP(gasto.valor)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {gasto.aprobado === true || gasto.aprobado === 'true' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aprobado
                          </span>
                        ) : gasto.aprobado === false || gasto.aprobado === 'rechazado' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                            <XCircle className="w-3.5 h-3.5" />
                            Rechazado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-slate-800 dark:text-slate-200">
                        {gasto.valor_aprobado != null ? formatCOP(gasto.valor_aprobado) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          &copy; 2026 ISTHO S.A.S. - Sistema CRM Interno<br />
          Centro Logistico Industrial del Norte, Girardota, Antioquia
        </footer>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL: Agregar Gasto                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <MovimientoForm
        open={gastoFormOpen}
        onClose={() => setGastoFormOpen(false)}
        onSuccess={() => {
          setGastoFormOpen(false);
          fetchViaje();
        }}
        defaultViajeId={viaje.id}
        defaultCajaId={viaje.caja_menor_id || viaje.caja_menor?.id || ''}
      />
    </div>
  );
};

export default ViajeDetail;
