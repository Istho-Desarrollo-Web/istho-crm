/**
 * ============================================================================
 * ISTHO CRM - CajaMenorDetail
 * ============================================================================
 * Vista de detalle de caja menor con viajes, movimientos e informacion.
 *
 * URL: /viajes/cajas-menores/:id
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
  Tabs,
  Tab,
  Tooltip,
} from '@mui/material';
import {
  ArrowLeft,
  Pencil,
  Lock,
  Plus,
  Truck,
  Receipt,
  CheckCircle,
  XCircle,
  DollarSign,
} from 'lucide-react';

import { Button, Modal, StatusChip, ConfirmDialog } from '../../components/common';
import { cajasMenoresService } from '../../api/viajes.service';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';
import { ProtectedAction } from '../../components/auth/PrivateRoute';

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
 * Formato fecha corta
 */
const formatFecha = (fecha) => {
  if (!fecha) return '-';
  return new Date(fecha).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// ════════════════════════════════════════════════════════════════════════════
// SUMMARY CARD
// ════════════════════════════════════════════════════════════════════════════

const SummaryCard = ({ title, value, icon: Icon, bg, iconColor, large = false }) => (
  <div className={`rounded-2xl p-5 shadow-sm border border-gray-100 ${bg}`}>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">{title}</p>
        <p className={`font-bold text-slate-800 dark:text-slate-100 ${large ? 'text-3xl' : 'text-2xl'}`}>
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
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const CajaMenorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { success, apiError } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS
  // ──────────────────────────────────────────────────────────────────────────

  const [caja, setCaja] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  // Dialogs
  const [cerrarDialogOpen, setCerrarDialogOpen] = useState(false);
  const [observacionesCierre, setObservacionesCierre] = useState('');
  const [cerrarLoading, setCerrarLoading] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // FETCH DATA
  // ──────────────────────────────────────────────────────────────────────────

  const fetchCaja = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await cajasMenoresService.getById(id);
      setCaja(response.data || response);
    } catch (err) {
      setError(err?.response?.data?.mensaje || 'Error al cargar la caja menor');
      apiError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaja();
  }, [id]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleCerrarCaja = async () => {
    setCerrarLoading(true);
    try {
      await cajasMenoresService.cerrar(id, {
        observaciones_cierre: observacionesCierre,
      });
      success('Caja menor cerrada exitosamente');
      setCerrarDialogOpen(false);
      setObservacionesCierre('');
      fetchCaja();
    } catch (err) {
      apiError(err);
    } finally {
      setCerrarLoading(false);
    }
  };

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // LOADING STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
              ))}
            </div>
            <div className="h-64 bg-gray-200 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (error || !caja) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Caja menor no encontrada</h2>
            <p className="text-slate-500 mb-4">{error || 'La caja menor solicitada no existe'}</p>
            <Button variant="primary" onClick={() => navigate('/viajes/cajas-menores')}>
              Volver a Cajas Menores
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIABLES CALCULADAS
  // ──────────────────────────────────────────────────────────────────────────

  const viajes = caja.viajes || [];
  const movimientos = caja.movimientos || [];
  const isAbierta = caja.estado === 'abierta';

  const saldoInicial = parseFloat(caja.saldo_inicial) || 0;
  const totalIngresos = parseFloat(caja.total_ingresos) || 0;
  const totalEgresos = parseFloat(caja.total_egresos) || 0;
  const saldoActual = parseFloat(caja.saldo_actual) || 0;

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* HEADER                                                        */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-4">
            <Tooltip title="Volver">
              <IconButton onClick={() => navigate('/viajes/cajas-menores')}>
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </IconButton>
            </Tooltip>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center">
                <DollarSign className="w-7 h-7 text-amber-600" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-800">
                    {caja.numero}
                  </h1>
                  <StatusChip status={caja.estado} />
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm mt-0.5">
                  <span>{caja.conductor?.nombre_completo || caja.conductor?.username || 'Sin conductor'}</span>
                  <span>-</span>
                  <span>{formatFecha(caja.fecha_apertura)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ProtectedAction module="caja_menor" action="editar">
              {isAbierta && (
                <>
                  <Button
                    variant="outline"
                    icon={Pencil}
                    onClick={() => navigate(`/viajes/cajas-menores/${id}/editar`)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    icon={Lock}
                    onClick={() => setCerrarDialogOpen(true)}
                  >
                    Cerrar Caja
                  </Button>
                </>
              )}
            </ProtectedAction>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* SUMMARY CARDS                                                 */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <SummaryCard
            title="Saldo Inicial"
            value={formatCOP(saldoInicial)}
            icon={DollarSign}
            bg="bg-white"
            iconColor="bg-blue-100 text-blue-600"
          />
          <SummaryCard
            title="Total Ingresos"
            value={formatCOP(totalIngresos)}
            icon={CheckCircle}
            bg="bg-white"
            iconColor="bg-emerald-100 text-emerald-600"
          />
          <SummaryCard
            title="Total Egresos"
            value={formatCOP(totalEgresos)}
            icon={XCircle}
            bg="bg-white"
            iconColor="bg-red-100 text-red-600"
          />
          <SummaryCard
            title="Saldo Actual"
            value={formatCOP(saldoActual)}
            icon={DollarSign}
            bg="bg-slate-800"
            iconColor="bg-slate-700 text-white"
            large
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* TABS                                                          */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            sx={{
              px: 2,
              borderBottom: '1px solid #f1f5f9',
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 600 },
              '& .Mui-selected': { color: '#ea580c' },
              '& .MuiTabs-indicator': { backgroundColor: '#ea580c' },
            }}
          >
            <Tab label={`Viajes (${viajes.length})`} />
            <Tab label={`Movimientos (${movimientos.length})`} />
            <Tab label="Informacion" />
          </Tabs>

          <div className="p-6">
            {/* ── Tab 0: Viajes ─────────────────────────────────────────── */}
            {activeTab === 0 && (
              <div>
                {viajes.length === 0 ? (
                  <div className="py-12 text-center">
                    <Truck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No hay viajes asociados a esta caja menor</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-semibold text-slate-500">Numero</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-500">Fecha</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-500">Destino</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-500">Placa</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-500">Valor Viaje</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-500">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viajes.map((viaje) => (
                          <tr
                            key={viaje.id}
                            onClick={() => navigate(`/viajes/${viaje.id}`)}
                            className="border-b border-gray-50 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-slate-800">{viaje.numero}</td>
                            <td className="py-3 px-4 text-slate-600">{formatFecha(viaje.fecha)}</td>
                            <td className="py-3 px-4 text-slate-600">{viaje.destino || '-'}</td>
                            <td className="py-3 px-4 text-slate-600">{viaje.vehiculo?.placa || viaje.vehiculo_placa || '-'}</td>
                            <td className="py-3 px-4 text-right font-medium text-slate-800">
                              {formatCOP(viaje.valor_viaje)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <StatusChip status={viaje.estado} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab 1: Movimientos ────────────────────────────────────── */}
            {activeTab === 1 && (
              <div>
                {movimientos.length === 0 ? (
                  <div className="py-12 text-center">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No hay movimientos registrados</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 font-semibold text-slate-500">Consecutivo</th>
                          <th className="text-left py-3 px-4 font-semibold text-slate-500">Concepto</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-500">Tipo</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-500">Valor</th>
                          <th className="text-center py-3 px-4 font-semibold text-slate-500">Aprobado</th>
                          <th className="text-right py-3 px-4 font-semibold text-slate-500">Valor Aprobado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {movimientos.map((mov) => (
                          <tr
                            key={mov.id}
                            className="border-b border-gray-50 hover:bg-slate-50 transition-colors"
                          >
                            <td className="py-3 px-4 font-medium text-slate-800">{mov.consecutivo || '-'}</td>
                            <td className="py-3 px-4 text-slate-600">{mov.concepto || '-'}</td>
                            <td className="py-3 px-4 text-center">
                              <Chip
                                label={mov.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso'}
                                size="small"
                                color={mov.tipo_movimiento === 'ingreso' ? 'success' : 'error'}
                                variant="outlined"
                              />
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-slate-800">
                              {formatCOP(mov.valor)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {mov.aprobado ? (
                                <Chip label="Aprobado" size="small" color="success" />
                              ) : (
                                <Chip label="Pendiente" size="small" color="warning" variant="outlined" />
                              )}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-slate-800">
                              {mov.valor_aprobado != null ? formatCOP(mov.valor_aprobado) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── Tab 2: Informacion ────────────────────────────────────── */}
            {activeTab === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Observaciones */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Observaciones</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                    {caja.observaciones || 'Sin observaciones'}
                  </p>
                </div>

                {/* Caja anterior */}
                {caja.caja_anterior && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Caja Anterior</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Número</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">{caja.caja_anterior.numero || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Saldo Final</span>
                        <span className="text-slate-800 dark:text-slate-200 font-medium">
                          {formatCOP(caja.caja_anterior.saldo_actual)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Estado</span>
                        <StatusChip status={caja.caja_anterior.estado} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Registro */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">Registro</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Creado por</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {caja.creador?.nombre_completo || caja.creador?.username || '-'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Fecha de apertura</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {formatFecha(caja.fecha_apertura)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Fecha de registro</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">
                        {caja.created_at ? new Date(caja.created_at).toLocaleString('es-CO') : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Fecha cierre */}
                {caja.fecha_cierre && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">Cierre</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Fecha de cierre</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                          {new Date(caja.fecha_cierre).toLocaleString('es-CO')}
                        </span>
                      </div>
                      {caja.observaciones_cierre && (
                        <div className="flex justify-between">
                          <span className="text-slate-500 dark:text-slate-400">Observaciones cierre</span>
                          <span className="text-slate-800 dark:text-slate-200">{caja.observaciones_cierre}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* CERRAR CAJA DIALOG                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <Modal
        isOpen={cerrarDialogOpen}
        onClose={() => setCerrarDialogOpen(false)}
        title="Cerrar Caja Menor"
        subtitle={`Caja ${caja?.numero || ''}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setCerrarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="danger" icon={Lock} onClick={handleCerrarCaja} loading={cerrarLoading}>
              Cerrar Caja
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              <strong>Importante:</strong> Al cerrar la caja menor no se podrán registrar más
              movimientos ni viajes asociados.
            </p>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl flex justify-between items-center">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Saldo Actual</span>
            <span className="text-xl font-bold text-slate-800 dark:text-white">{formatCOP(saldoActual)}</span>
          </div>

          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Observaciones de cierre
            </label>
            <textarea
              placeholder="Agregar notas sobre el cierre..."
              rows={3}
              value={observacionesCierre}
              onChange={(e) => setObservacionesCierre(e.target.value)}
              className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CajaMenorDetail;
