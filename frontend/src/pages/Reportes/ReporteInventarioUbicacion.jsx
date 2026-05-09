/**
 * ISTHO CRM - Reporte de Inventario por Ubicación
 * Detalle de cajas disponibles por ubicación en bodega, filtrado por cliente
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  MapPin,
  Package,
  Box,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Mail,
  Filter,
  Loader2,
  Search,
  X,
} from 'lucide-react';
import { KpiCard, AccionesDropdown, FilterDropdown } from '../../components/common';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';
import PageFooter from '@components/common/PageFooter';
import reportesService from '../../api/reportes.service';
import clientesService from '../../api/clientes.service';
import { useAuth } from '../../context/AuthContext';
import { formatDateShort } from '../../utils/formatDate';
import { descargarArchivo, fechaDescarga } from '../../utils/descargas';

const ReporteInventarioUbicacion = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [emailModal, setEmailModal] = useState(false);

  // Clientes para selector
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(searchParams.get('cliente_id') || '');

  // Auto-asignar cliente para portal
  const esPortal = user?.rol === 'cliente';

  useEffect(() => {
    if (esPortal && user?.cliente_id) {
      setClienteId(String(user.cliente_id));
    }
  }, [esPortal, user?.cliente_id]);

  // Cargar lista de clientes
  useEffect(() => {
    if (esPortal) return;
    clientesService
      .getAll({ limit: 100 })
      .then((res) => {
        const lista = Array.isArray(res?.data) ? res.data : res?.data?.rows || [];
        setClientes(lista);
      })
      .catch((err) => {
        console.error('Error cargando clientes:', err);
        setClientes([]);
      });
  }, [esPortal]);

  const fetchData = useCallback(async () => {
    if (!clienteId) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const response = await reportesService.getInventarioUbicacion({ cliente_id: clienteId });
      setData(response?.data || response);
    } catch (err) {
      console.error('Error cargando reporte inventario ubicacion:', err);
    } finally {
      setLoading(false);
    }
  }, [clienteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleClienteChange = (id) => {
    setClienteId(id);
    const params = new URLSearchParams();
    if (id) params.set('cliente_id', id);
    setSearchParams(params, { replace: true });
  };

  const handleExport = async (format) => {
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
      const params = new URLSearchParams();
      if (clienteId) params.set('cliente_id', clienteId);
      const url = `${baseUrl}/reportes/inventario-ubicacion/${format}?${params.toString()}`;
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      await descargarArchivo(url, `reporte-inventario-ubicacion-${fechaDescarga()}.${ext}`);
    } catch {
      console.error('Error al exportar reporte inventario ubicacion');
    }
  };

  const kpis = data?.kpis || {};
  const rows = data?.rows || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-centhrix-card rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  Inventario por Ubicación
                </h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Detalle de cajas disponibles por ubicación en bodega
                </p>
              </div>
            </div>
          </div>
          <div id="tour-reportes-inventario-ubicacion-exportar">
            <AccionesDropdown
              acciones={[
                { label: 'Actualizar', icon: RefreshCw, onClick: fetchData, disabled: !clienteId },
                {
                  label: 'Excel',
                  icon: FileSpreadsheet,
                  onClick: () => handleExport('excel'),
                  disabled: !clienteId,
                },
                {
                  label: 'PDF',
                  icon: FileText,
                  onClick: () => handleExport('pdf'),
                  disabled: !clienteId,
                },
                {
                  label: 'Enviar',
                  icon: Mail,
                  onClick: () => setEmailModal(true),
                  disabled: !clienteId,
                },
              ]}
            />
          </div>
        </div>

        {/* Filtro de cliente */}
        {!esPortal && (
          <div id="tour-reportes-inventario-ubicacion-filtros" className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Filtros
              </span>
              {clienteId && (
                <button
                  onClick={() => handleClienteChange('')}
                  className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpiar
                </button>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                  <Package className="w-3 h-3 inline mr-1" />
                  Cliente
                </label>
                <FilterDropdown
                  options={[
                    { value: '', label: 'Seleccionar cliente...' },
                    ...clientes.map((c) => ({ value: String(c.id), label: c.razon_social })),
                  ]}
                  value={String(clienteId)}
                  onChange={(v) => handleClienteChange(v)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mensaje sin cliente */}
        {!clienteId && !esPortal && (
          <div className="bg-white dark:bg-centhrix-card rounded-2xl p-12 shadow-sm border border-gray-100 dark:border-slate-700 text-center mb-6">
            <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400">
              Selecciona un cliente para ver el inventario por ubicación
            </p>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
          </div>
        )}

        {/* KPIs */}
        {!loading && clienteId && data && (
          <>
            <div id="tour-reportes-inventario-ubicacion-kpis" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <KpiCard
                title="Total Cajas"
                value={kpis.totalCajas ?? '-'}
                icon={Box}
                iconBg="bg-blue-100 dark:bg-blue-900/30"
                iconColor="text-blue-600 dark:text-blue-400"
                loading={loading}
              />
              <KpiCard
                title="Total Unidades"
                value={(kpis.totalUnidades ?? 0).toLocaleString('es-CO', {
                  maximumFractionDigits: 0,
                })}
                icon={Package}
                iconBg="bg-emerald-100 dark:bg-emerald-900/30"
                iconColor="text-emerald-600 dark:text-emerald-400"
                loading={loading}
              />
              <KpiCard
                title="Ubicaciones"
                value={kpis.ubicacionesUnicas ?? '-'}
                icon={MapPin}
                iconBg="bg-violet-100 dark:bg-violet-900/30"
                iconColor="text-violet-600 dark:text-violet-400"
                loading={loading}
              />
              <KpiCard
                title="Productos"
                value={kpis.productosUnicos ?? '-'}
                icon={Search}
                iconBg="bg-amber-100 dark:bg-amber-900/30"
                iconColor="text-amber-600 dark:text-amber-400"
                loading={loading}
              />
            </div>

            {/* Tabla */}
            <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden mb-8">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-slate-700">
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Detalle por Ubicación
                </h3>
                <p className="text-xs text-slate-400">
                  {rows.length} registros · {data?.cliente?.razon_social || ''}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-centhrix-bg/30">
                      <th className="text-center py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        #
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Ref.
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Caja
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Saldo
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Descripción
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Unidad
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Lote
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-400 uppercase hidden lg:table-cell">
                        Lote Ext.
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Venc.
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-slate-400 uppercase hidden md:table-cell">
                        F. Ingreso
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-slate-400 uppercase hidden lg:table-cell">
                        F. Vencimiento
                      </th>
                      <th className="text-center py-3 px-3 text-xs font-semibold text-slate-400 uppercase">
                        Ubicación
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, idx) => {
                      const diasColor =
                        r.dias_vencimiento !== null
                          ? r.dias_vencimiento < 0
                            ? 'text-red-600 dark:text-red-400 font-bold'
                            : r.dias_vencimiento <= 30
                              ? 'text-amber-600 dark:text-amber-400 font-medium'
                              : r.dias_vencimiento <= 90
                                ? 'text-amber-500 dark:text-amber-300'
                                : 'text-slate-600 dark:text-slate-300'
                          : 'text-slate-400';
                      return (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-centhrix-surface/20 transition-colors"
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 text-right font-medium text-teal-600 dark:text-teal-400">
                            {r.referencia}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                            {r.numero_caja}
                          </td>
                          <td className="py-2.5 px-3 text-right font-medium text-slate-800 dark:text-white">
                            {(r.saldo ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 3 })}
                          </td>
                          <td className="py-2.5 px-3 text-left text-slate-600 dark:text-slate-300 max-w-[250px] truncate">
                            {r.descripcion}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400">
                            {r.unidad_medida}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300">
                            {r.lote || '-'}
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-300 hidden lg:table-cell">
                            {r.lote_externo || '-'}
                          </td>
                          <td className={`py-2.5 px-3 text-right ${diasColor}`}>
                            {r.dias_vencimiento !== null ? r.dias_vencimiento : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 hidden md:table-cell">
                            {r.fecha_ingreso ? formatDateShort(r.fecha_ingreso) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-500 dark:text-slate-400 hidden lg:table-cell">
                            {r.fecha_vencimiento ? formatDateShort(r.fecha_vencimiento) : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                              {r.ubicacion || '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {rows.length === 0 && !loading && (
                      <tr>
                        <td colSpan={12} className="py-8 text-center text-slate-400">
                          No hay cajas disponibles para este cliente
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        <PageFooter />
      </main>

      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="inventario_ubicacion"
        onSend={async (sendData) => {
          const res = await reportesService.enviarPorEmail({ ...sendData, cliente_id: clienteId });
          if (!res.success) throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteInventarioUbicacion;
