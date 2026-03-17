/**
 * ISTHO CRM - ReporteInventario Page
 * Reporte de inventario con datos reales, gráficos y filtros persistentes en URL
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Download,
  AlertTriangle,
  DollarSign,
  FileSpreadsheet,
  RefreshCw,
  Mail,
} from 'lucide-react';

// Components
import { Button, KpiCard, ReportFilters } from '../../components/common';
import { BarChart, PieChart } from '../../components/charts';
import EnviarReporteModal from '../../components/common/EnviarReporteModal';

// API
import reportesService from '../../api/reportes.service';
import inventarioService from '../../api/inventario.service';
import { useAuth } from '../../context/AuthContext';
import { useSnackbar } from 'notistack';

// ============================================
// ALERTA ITEM
// ============================================
const AlertaItem = ({ alerta }) => {
  const isVencimiento = alerta.tipo === 'vencimiento';

  const titulo = alerta.titulo || alerta.producto_nombre || alerta.nombre || 'Producto';
  let mensaje = alerta.mensaje;
  if (!mensaje) {
    if (alerta.tipo === 'agotado') {
      mensaje = `SKU: ${alerta.codigo || alerta.producto_codigo || '-'} — Stock agotado`;
    } else if (alerta.tipo === 'bajo_stock') {
      mensaje = `Stock: ${alerta.stock_actual ?? alerta.stockActual ?? 0} / Mín: ${alerta.stock_minimo ?? alerta.stockMinimo ?? 0}`;
    } else if (isVencimiento) {
      mensaje = `Vence en ${alerta.dias_restantes ?? '?'} días — Lote: ${alerta.lote || '-'}`;
    }
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${
      isVencimiento
        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50'
        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
    }`}>
      <AlertTriangle className={`w-5 h-5 ${isVencimiento ? 'text-orange-600 dark:text-orange-400' : 'text-amber-600 dark:text-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium truncate ${isVencimiento ? 'text-orange-700 dark:text-orange-300' : 'text-amber-700 dark:text-amber-300'}`}>
          {titulo}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{mensaje}</p>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
const ReporteInventario = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { hasPermission } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const canDownload = hasPermission('reportes', 'exportar') || hasPermission('reportes', 'descargar');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [productos, setProductos] = useState([]);
  const [error, setError] = useState(null);
  const [emailModal, setEmailModal] = useState(false);

  // Filtros desde URL
  const [filters, setFilters] = useState({
    fecha_desde: searchParams.get('fecha_desde') || '',
    fecha_hasta: searchParams.get('fecha_hasta') || '',
    cliente_id: searchParams.get('cliente_id') || '',
  });

  // Persistir filtros en URL
  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    setSearchParams(params, { replace: true });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashResponse, alertasResponse, inventarioResponse] = await Promise.all([
        reportesService.getDashboard(),
        inventarioService.getAlertas().catch(() => ({ data: [] })),
        inventarioService.getAll({ limit: 100 }).catch(() => ({ data: [] })),
      ]);

      if (dashResponse?.success && dashResponse.data) {
        setStats(dashResponse.data.inventario);
      }

      if (alertasResponse?.data) {
        setAlertas(Array.isArray(alertasResponse.data) ? alertasResponse.data.slice(0, 8) : []);
      }

      // Productos para gráficos
      const prods = inventarioResponse?.data || [];
      setProductos(Array.isArray(prods) ? prods : []);
    } catch (err) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buildFilterParams = () => {
    const params = new URLSearchParams();
    const token = localStorage.getItem('istho_token');
    if (token) params.set('token', token);
    if (filters.fecha_desde) params.set('fecha_desde', filters.fecha_desde);
    if (filters.fecha_hasta) params.set('fecha_hasta', filters.fecha_hasta);
    if (filters.cliente_id) params.set('cliente_id', filters.cliente_id);
    return params.toString();
  };

  const handleExport = (format) => {
    const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    const endpoint = format === 'excel' ? '/reportes/inventario/excel' : '/reportes/inventario/pdf';
    window.open(`${baseUrl}${endpoint}?${buildFilterParams()}`, '_blank');
  };

  const formatCurrency = (value) => {
    if (!value) return '$0';
    if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
    return `$${value.toLocaleString()}`;
  };

  // Datos para gráficos
  const estadoData = (() => {
    const counts = {};
    productos.forEach(p => {
      const estado = p.cantidad === 0 ? 'Agotado'
        : (p.stock_minimo > 0 && p.cantidad <= p.stock_minimo) ? 'Stock Bajo'
        : 'Disponible';
      counts[estado] = (counts[estado] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  })();

  const topProductos = (() => {
    return [...productos]
      .sort((a, b) => ((b.cantidad || 0) * (b.costo_unitario || 0)) - ((a.cantidad || 0) * (a.costo_unitario || 0)))
      .slice(0, 8)
      .map(p => ({
        label: (p.producto || p.nombre || p.sku || '').substring(0, 20),
        value1: (p.cantidad || 0) * (p.costo_unitario || 0),
      }));
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded w-64" />
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const inv = stats || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">
      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reportes')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Reporte de Inventario</h1>
                <p className="text-slate-500 dark:text-slate-400">Estado y valorización del inventario</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" icon={RefreshCw} onClick={fetchData}>
              Actualizar
            </Button>
            {canDownload && (
              <>
                <Button variant="outline" icon={Mail} onClick={() => setEmailModal(true)}>
                  Enviar
                </Button>
                <Button variant="outline" icon={FileSpreadsheet} onClick={() => handleExport('excel')}>
                  Excel
                </Button>
                <Button variant="primary" icon={Download} onClick={() => handleExport('pdf')}>
                  PDF
                </Button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Filtros */}
        <ReportFilters filters={filters} onChange={handleFiltersChange} />

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Productos"
            value={inv.totalItems || 0}
            subtitle="SKUs registrados"
            icon={Package}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            iconColor="text-blue-600 dark:text-blue-400"
          />
          <KpiCard
            title="Total Unidades"
            value={(inv.totalUnidades || 0).toLocaleString()}
            subtitle="Unidades en stock"
            icon={Package}
            iconBg="bg-emerald-100 dark:bg-emerald-900/30"
            iconColor="text-emerald-600 dark:text-emerald-400"
          />
          <KpiCard
            title="Valor del Inventario"
            value={formatCurrency(inv.valorTotal)}
            subtitle="Costo total"
            icon={DollarSign}
            iconBg="bg-violet-100 dark:bg-violet-900/30"
            iconColor="text-violet-600 dark:text-violet-400"
          />
          <KpiCard
            title="Alertas Activas"
            value={(inv.alertas?.stockBajo || 0) + (inv.alertas?.porVencer || 0)}
            subtitle={`${inv.alertas?.stockBajo || 0} stock bajo, ${inv.alertas?.porVencer || 0} por vencer`}
            icon={AlertTriangle}
            iconBg="bg-amber-100 dark:bg-amber-900/30"
            iconColor="text-amber-600 dark:text-amber-400"
          />
        </div>

        {/* Gráficos */}
        {productos.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <PieChart
              title="Distribución por Estado"
              subtitle="Estado del inventario actual"
              data={estadoData}
              size={180}
            />
            <BarChart
              title="Top Productos por Valor"
              subtitle="Mayor valorización en inventario"
              data={topProductos}
              legend={[{ label: 'Valor ($)', color: '#10b981' }]}
              height={300}
            />
          </div>
        )}

        {/* Alertas */}
        {alertas.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Alertas de Inventario</h3>
              <Button variant="ghost" size="sm" onClick={() => navigate('/inventario/alertas')}>
                Ver todas
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alertas.map((alerta, idx) => (
                <AlertaItem key={alerta.id || idx} alerta={alerta} />
              ))}
            </div>
          </div>
        )}

        {/* Export Info */}
        {canDownload && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Exportar Inventario Completo</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
            Descarga el listado completo de inventario con cantidades, costos, lotes y fechas de vencimiento.
            Los filtros seleccionados arriba se aplicarán a la exportación.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" icon={FileSpreadsheet} onClick={() => handleExport('excel')}>
              Exportar Excel
            </Button>
            <Button variant="outline" icon={Download} onClick={() => handleExport('pdf')}>
              Exportar PDF
            </Button>
          </div>
        </div>
        )}
      </main>

      <EnviarReporteModal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        tipoReporte="inventario"
        onSend={async (data) => {
          const res = await reportesService.enviarPorEmail({ ...data, cliente_id: filters.cliente_id });
          if (res.success) enqueueSnackbar(res.message, { variant: 'success' });
          else throw new Error(res.message);
        }}
      />
    </div>
  );
};

export default ReporteInventario;
