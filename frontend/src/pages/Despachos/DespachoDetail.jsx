/**
 * ============================================================================
 * ISTHO CRM - DespachoDetail (Fase 5 - Integración Completa)
 * ============================================================================
 * Vista de detalle del despacho conectada al backend real.
 * 
 * CORRECCIÓN v2.1.0:
 * - Usando useDespachoDetail en lugar de useDespachos
 * - Nombres de funciones corregidos según el hook
 * - Productos vienen del detalle del despacho (despacho.detalles)
 * - Timeline usa auditoría del despacho si está disponible
 * 
 * @author Coordinación TI ISTHO
 * @version 2.1.0
 * @date Enero 2026
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Truck,
  Building2,
  MapPin,
  Calendar,
  Clock,
  User,
  Phone,
  Package,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Pencil,
  Printer,
  RefreshCw,
} from 'lucide-react';

// Layout


// Components
import { Button, StatusChip, ConfirmDialog, Modal } from '../../components/common';

// Local Components
import DespachoForm from './components/DespachoForm';

// ════════════════════════════════════════════════════════════════════════════
// HOOKS INTEGRADOS - Usar useDespachoDetail para páginas de detalle
// ════════════════════════════════════════════════════════════════════════════

import { useDespachoDetail } from '../../hooks/useDespachos';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Item del timeline
 */
const TimelineItem = ({ item, isLast }) => {
  const iconConfig = {
    crear: { icon: FileText, bg: 'bg-slate-100', color: 'text-slate-600' },
    actualizar: { icon: Pencil, bg: 'bg-blue-100', color: 'text-blue-600' },
    cerrar: { icon: CheckCircle, bg: 'bg-emerald-100', color: 'text-emerald-600' },
    anular: { icon: XCircle, bg: 'bg-red-100', color: 'text-red-600' },
    averia: { icon: AlertCircle, bg: 'bg-amber-100', color: 'text-amber-600' },
    documento: { icon: FileText, bg: 'bg-violet-100', color: 'text-violet-600' },
    transporte: { icon: Truck, bg: 'bg-blue-100', color: 'text-blue-600' },
  };

  const tipo = item.accion || item.tipo || 'crear';
  const config = iconConfig[tipo] || iconConfig.crear;
  const Icon = config.icon;

  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center z-10 ${config.bg}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
      </div>
      <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-medium text-slate-800">{item.descripcion || item.accion}</p>
            <p className="text-sm text-slate-500 mt-0.5">{item.detalle || ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(item.created_at || item.fecha).toLocaleString('es-CO')}
          </span>
          <span>•</span>
          <span>{item.usuario_nombre || item.usuario || 'Sistema'}</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Fila de producto (detalle de operación)
 */
const ProductoRow = ({ producto }) => {
  const tieneAveria = parseFloat(producto.cantidad_averia) > 0;

  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${tieneAveria ? 'bg-red-100' : 'bg-slate-100'
        }`}>
        <Package className={`w-5 h-5 ${tieneAveria ? 'text-red-500' : 'text-slate-500'}`} />
      </div>
      <div className="flex-1">
        <p className="font-medium text-slate-800">{producto.producto}</p>
        <p className="text-xs text-slate-500">
          {producto.sku} {producto.lote ? `• Lote: ${producto.lote}` : ''}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-slate-800">{parseFloat(producto.cantidad || 0).toLocaleString()}</p>
        <p className="text-xs text-slate-500">{producto.unidad_medida || 'UND'}</p>
        {tieneAveria && (
          <p className="text-xs text-red-500">
            Avería: {parseFloat(producto.cantidad_averia).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Tarjeta de información
 */
const InfoCard = ({ title, icon: Icon, children, action }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5 text-slate-500" />}
          <h3 className="font-semibold text-slate-800">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
};

/**
 * Modal de cierre de operación
 */
const CierreModal = ({ isOpen, onClose, onSubmit, loading }) => {
  const [observaciones, setObservaciones] = useState('');
  const [enviarCorreo, setEnviarCorreo] = useState(true);

  const handleSubmit = () => {
    onSubmit({
      observaciones_cierre: observaciones,
      enviar_correo: enviarCorreo
    });
  };

  useEffect(() => {
    if (isOpen) {
      setObservaciones('');
      setEnviarCorreo(true);
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cerrar Operación"
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={handleSubmit} loading={loading}>
            Cerrar Operación
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-700">
            <strong>⚠️ Importante:</strong> Al cerrar la operación se actualizará el inventario
            y se enviará notificación al cliente.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Observaciones de cierre (opcional)
          </label>
          <textarea
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            placeholder="Agregar notas sobre el cierre..."
            rows={3}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={enviarCorreo}
            onChange={(e) => setEnviarCorreo(e.target.checked)}
            className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
          />
          <span className="text-sm text-slate-700">Enviar correo de notificación al cliente</span>
        </label>
      </div>
    </Modal>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const DespachoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const { success, apiError } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // HOOK DE DESPACHO INDIVIDUAL - Optimizado para páginas de detalle
  // ──────────────────────────────────────────────────────────────────────────

  const {
    despacho,
    loading,
    error,
    puedeCerrar,
    operationLoading,
    refresh,
    actualizarTransporte,
    registrarAveria,
    subirDocumento,
    cerrar,
    anular,
  } = useDespachoDetail(id, true);  // true = autoFetch

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS LOCALES
  // ──────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState('info');

  // Modals
  const [editModal, setEditModal] = useState(false);
  const [cierreModal, setCierreModal] = useState(false);
  const [anularModal, setAnularModal] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  // Permisos
  const canEdit = hasPermission('despachos', 'editar');

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleEditTransporte = async (data) => {
    setFormLoading(true);
    try {
      // Solo actualizar datos de transporte
      await actualizarTransporte({
        origen: data.origen,
        destino: data.destino,
        vehiculo_placa: data.vehiculo_placa,
        vehiculo_tipo: data.vehiculo_tipo,
        conductor_nombre: data.conductor_nombre,
        conductor_cedula: data.conductor_cedula,
        conductor_telefono: data.conductor_telefono,
      });
      success('Información de transporte actualizada');
      setEditModal(false);
      refresh();
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCerrar = async (cierreData) => {
    setFormLoading(true);
    try {
      await cerrar(cierreData);
      success('Operación cerrada exitosamente');
      setCierreModal(false);
      refresh();
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
  };

  const handleAnular = async () => {
    setFormLoading(true);
    try {
      await anular('Anulado por usuario');
      success('Operación anulada correctamente');
      setAnularModal(false);
      refresh();
    } catch (err) {
      apiError(err);
    } finally {
      setFormLoading(false);
    }
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
            <div className="grid grid-cols-3 gap-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-48 bg-gray-200 rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // ERROR STATE
  // ──────────────────────────────────────────────────────────────────────────

  if (error || !despacho) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">

        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Truck className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Operación no encontrada</h2>
            <p className="text-slate-500 mb-4">{error || 'La operación solicitada no existe'}</p>
            <Button variant="primary" onClick={() => navigate('/despachos')}>
              Volver a Despachos
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VARIABLES CALCULADAS
  // ──────────────────────────────────────────────────────────────────────────

  // Productos vienen del detalle de la operación
  const productos = despacho.detalles || [];
  const totalProductos = productos.length;
  const totalUnidades = productos.reduce((sum, p) => sum + (parseFloat(p.cantidad) || 0), 0);
  const totalAverias = productos.reduce((sum, p) => sum + (parseFloat(p.cantidad_averia) || 0), 0);

  // Documentos adjuntos
  const documentos = despacho.documentos || [];

  // Averías registradas
  const averias = despacho.averias || [];

  // Estado editable
  const isEditable = ['pendiente', 'en_proceso'].includes(despacho.estado);

  // Tabs disponibles
  const tabs = [
    { id: 'info', label: 'Información' },
    { id: 'productos', label: `Productos (${totalProductos})` },
    { id: 'documentos', label: `Documentos (${documentos.length})` },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">


      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/despachos')}
              className="p-2 text-slate-500 hover:text-slate-700 hover:bg-white rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${despacho.tipo === 'ingreso' ? 'bg-green-100' : 'bg-blue-100'
                }`}>
                <Truck className={`w-7 h-7 ${despacho.tipo === 'ingreso' ? 'text-green-600' : 'text-blue-600'
                  }`} />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-800">
                    {despacho.numero_operacion}
                  </h1>
                  <StatusChip status={despacho.estado} />
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${despacho.tipo === 'ingreso'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-blue-100 text-blue-700'
                    }`}>
                    {despacho.tipo === 'ingreso' ? 'INGRESO' : 'SALIDA'}
                  </span>
                  {despacho.prioridad === 'urgente' && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                      URGENTE
                    </span>
                  )}
                </div>
                <p className="text-slate-500">
                  {despacho.cliente?.razon_social || 'Sin cliente'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={refresh}
              title="Actualizar"
            />

            {isEditable && canEdit && (
              <>
                <Button
                  variant="outline"
                  icon={Pencil}
                  onClick={() => setEditModal(true)}
                >
                  Editar Transporte
                </Button>

                <Button
                  variant="primary"
                  icon={CheckCircle}
                  onClick={() => setCierreModal(true)}
                  disabled={!puedeCerrar && documentos.length === 0}
                >
                  Cerrar Operación
                </Button>

                <Button
                  variant="danger"
                  icon={XCircle}
                  onClick={() => setAnularModal(true)}
                >
                  Anular
                </Button>
              </>
            )}

            <Button variant="outline" icon={Printer}>
              Imprimir
            </Button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* MAIN GRID */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <Package className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{totalProductos}</p>
                <p className="text-sm text-slate-500">Referencias</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <Package className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{totalUnidades.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Unidades</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <AlertCircle className={`w-8 h-8 mx-auto mb-2 ${totalAverias > 0 ? 'text-red-500' : 'text-slate-300'
                  }`} />
                <p className={`text-2xl font-bold ${totalAverias > 0 ? 'text-red-600' : 'text-slate-800'
                  }`}>{totalAverias.toLocaleString()}</p>
                <p className="text-sm text-slate-500">Averías</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
                <FileText className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-slate-800">{documentos.length}</p>
                <p className="text-sm text-slate-500">Documentos</p>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <div className="border-b border-gray-100">
                <nav className="flex px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-4 text-sm font-medium transition-colors relative ${activeTab === tab.id
                          ? 'text-orange-600'
                          : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                      {tab.label}
                      {activeTab === tab.id && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
                      )}
                    </button>
                  ))}
                </nav>
              </div>

              <div className="p-6">
                {/* Tab: Info */}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800">
                        {despacho.tipo === 'salida' ? 'Destino' : 'Origen'}
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                          <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-slate-800 font-medium">
                              {despacho.cliente?.razon_social || '-'}
                            </p>
                            <p className="text-slate-500">
                              NIT: {despacho.cliente?.nit || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                          <div>
                            <p className="text-slate-800">
                              {despacho.tipo === 'salida'
                                ? (despacho.destino || '-')
                                : (despacho.origen || '-')
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800">Transporte</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Truck className="w-5 h-5 text-slate-400" />
                          <div>
                            <p className="text-slate-800 font-medium">
                              {despacho.vehiculo_placa || 'Sin asignar'}
                            </p>
                            <p className="text-slate-500">
                              {despacho.vehiculo_tipo || '-'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <User className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-800">
                            {despacho.conductor_nombre || 'Sin asignar'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Phone className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-800">
                            {despacho.conductor_telefono || '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {despacho.observaciones && (
                      <div className="md:col-span-2 space-y-2">
                        <h4 className="font-semibold text-slate-800">Observaciones</h4>
                        <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                          {despacho.observaciones}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Productos */}
                {activeTab === 'productos' && (
                  <div>
                    {productos.length === 0 ? (
                      <div className="py-12 text-center">
                        <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No hay productos en esta operación</p>
                      </div>
                    ) : (
                      <>
                        {productos.map((producto) => (
                          <ProductoRow key={producto.id} producto={producto} />
                        ))}
                        <div className="flex justify-between items-center pt-4 mt-4 border-t border-gray-100">
                          <span className="text-sm text-slate-500">Total</span>
                          <div className="text-right">
                            <span className="font-bold text-slate-800">
                              {totalUnidades.toLocaleString()} unidades
                            </span>
                            {totalAverias > 0 && (
                              <span className="text-sm text-red-500 ml-2">
                                ({totalAverias.toLocaleString()} averías)
                              </span>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Tab: Documentos */}
                {activeTab === 'documentos' && (
                  <div>
                    {documentos.length === 0 ? (
                      <div className="py-12 text-center">
                        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No hay documentos adjuntos</p>
                        {isEditable && (
                          <Button variant="outline" className="mt-4">
                            Subir Documento
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {documentos.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-8 h-8 text-violet-500" />
                              <div>
                                <p className="font-medium text-slate-800">{doc.nombre}</p>
                                <p className="text-xs text-slate-500">
                                  {doc.tipo_documento} • {new Date(doc.created_at).toLocaleDateString('es-CO')}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              Descargar
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Side Info */}
          <div className="space-y-6">
            {/* Fechas */}
            <InfoCard title="Información" icon={Calendar}>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Fecha Operación</p>
                  <p className="font-medium text-slate-800">
                    {despacho.fecha_operacion || '-'}
                  </p>
                </div>
                {despacho.documento_wms && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Documento WMS</p>
                    <p className="font-medium text-slate-800">{despacho.documento_wms}</p>
                  </div>
                )}
                {despacho.fecha_cierre && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Fecha de Cierre</p>
                    <p className="font-medium text-emerald-600">
                      {new Date(despacho.fecha_cierre).toLocaleString('es-CO')}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Prioridad</p>
                  <p className={`font-medium capitalize ${despacho.prioridad === 'urgente' ? 'text-red-600' :
                      despacho.prioridad === 'alta' ? 'text-orange-600' :
                        'text-slate-800'
                    }`}>
                    {despacho.prioridad || 'normal'}
                  </p>
                </div>
              </div>
            </InfoCard>

            {/* Creación */}
            <InfoCard title="Registro" icon={FileText}>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Creado por</span>
                  <span className="text-slate-800">
                    {despacho.creador?.nombre_completo || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fecha creación</span>
                  <span className="text-slate-800">
                    {despacho.created_at
                      ? new Date(despacho.created_at).toLocaleDateString('es-CO')
                      : '-'
                    }
                  </span>
                </div>
                {despacho.cerrador && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cerrado por</span>
                    <span className="text-slate-800">
                      {despacho.cerrador?.nombre_completo || '-'}
                    </span>
                  </div>
                )}
              </div>
            </InfoCard>

            {/* Averías */}
            {averias.length > 0 && (
              <InfoCard title="Averías Registradas" icon={AlertCircle}>
                <div className="space-y-3">
                  {averias.map((averia) => (
                    <div
                      key={averia.id}
                      className="p-3 bg-red-50 rounded-xl border border-red-100"
                    >
                      <p className="text-sm font-medium text-red-700">
                        {averia.sku} - {averia.cantidad} unidades
                      </p>
                      <p className="text-xs text-red-600 mt-1">
                        {averia.tipo_averia}: {averia.descripcion}
                      </p>
                    </div>
                  ))}
                </div>
              </InfoCard>
            )}
          </div>
        </div>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <DespachoForm
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        onSubmit={handleEditTransporte}
        despacho={despacho}
        loading={formLoading}
        modeEdit={true}
      />

      <CierreModal
        isOpen={cierreModal}
        onClose={() => setCierreModal(false)}
        onSubmit={handleCerrar}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={anularModal}
        onClose={() => setAnularModal(false)}
        onConfirm={handleAnular}
        title="Anular Operación"
        message={`¿Estás seguro de anular la operación "${despacho.numero_operacion}"? ${despacho.tipo === 'salida'
            ? 'Se liberará el stock reservado.'
            : 'Esta acción no se puede deshacer.'
          }`}
        confirmText="Anular Operación"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default DespachoDetail;