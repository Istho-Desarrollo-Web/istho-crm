/**
 * ============================================================================
 * ISTHO CRM - ProductoDetail (Versión Corregida v2.4.0)
 * ============================================================================
 * Vista de detalle del producto conectada al backend real.
 * 
 * CORRECCIONES v2.4.0:
 * - Template literals corregidos (faltaba $ en className y valores)
 * - Formato de números corregido para evitar confusión de locale
 * - Todos los hooks ANTES de returns condicionales
 * - snake_case para campos del backend
 * 
 * @author Coordinación TI ISTHO
 * @version 2.4.0
 * @date Enero 2026
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Building2,
  Barcode,
  Pencil,
  Trash2,
  PackagePlus,
  PackageMinus,
  Layers,
  DollarSign,
  Clock,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Warehouse,
  FileText,
  BoxIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
} from 'lucide-react';

// Layout


// Components
import { Button, StatusChip, KpiCard, ConfirmDialog } from '../../components/common';

// Charts
import { BarChart } from '../../components/charts';

// Local Components
import ProductoForm from './components/ProductoForm';
import MovimientoForm from './components/MovimientoForm';

// Hooks
import useInventario from '../../hooks/useInventario';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

// Service
import inventarioService from '../../api/inventario.service';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

// Mapeo de nombres de meses inglés → español
const MESES_ES = {
  'January': 'Enero',
  'February': 'Febrero',
  'March': 'Marzo',
  'April': 'Abril',
  'May': 'Mayo',
  'June': 'Junio',
  'July': 'Julio',
  'August': 'Agosto',
  'September': 'Septiembre',
  'October': 'Octubre',
  'November': 'Noviembre',
  'December': 'Diciembre',
};

// ════════════════════════════════════════════════════════════════════════════
// HELPER DE PERMISOS
// ════════════════════════════════════════════════════════════════════════════


// ════════════════════════════════════════════════════════════════════════════
// HELPER DE FORMATO DE NÚMEROS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Formatea un número para mostrar en la UI
 * Usa formato colombiano (punto para miles, coma para decimales)
 * @param {number} value - Valor a formatear
 * @param {number} decimals - Decimales a mostrar (default 0)
 * @returns {string}
 */
const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Gauge de stock visual
 */
const StockGauge = ({ actual, minimo, maximo, onUpdateLimits, canEdit }) => {
  const [editingMin, setEditingMin] = useState(false);
  const [editingMax, setEditingMax] = useState(false);
  const [tempMin, setTempMin] = useState(minimo);
  const [tempMax, setTempMax] = useState(maximo);

  const actualNum = parseFloat(actual) || 0;
  const minimoNum = parseFloat(minimo) || 0;
  const maximoNum = parseFloat(maximo) || 1000;

  const porcentaje = maximoNum > 0 ? (actualNum / maximoNum) * 100 : 0;
  const minimoPos = maximoNum > 0 ? (minimoNum / maximoNum) * 100 : 0;

  let statusColor = 'bg-emerald-500';
  let statusText = 'Óptimo';

  if (actualNum === 0) {
    statusColor = 'bg-red-500';
    statusText = 'Agotado';
  } else if (minimoNum > 0 && actualNum <= minimoNum) {
    statusColor = 'bg-amber-500';
    statusText = 'Bajo';
  } else if (maximoNum > 0 && actualNum >= maximoNum) {
    statusColor = 'bg-blue-500';
    statusText = 'Sobre Máximo';
  }

  const handleSaveMin = () => {
    const val = parseFloat(tempMin) || 0;
    setEditingMin(false);
    if (val !== minimoNum && onUpdateLimits) onUpdateLimits({ stock_minimo: val });
  };

  const handleSaveMax = () => {
    const val = parseFloat(tempMax) || 0;
    setEditingMax(false);
    if (val !== maximoNum && onUpdateLimits) onUpdateLimits({ stock_maximo: val });
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Nivel de Stock</h3>

      <div className="relative h-8 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
        {minimoPos > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-red-100 dark:bg-red-900/30 opacity-50"
            style={{ width: `${minimoPos}%` }}
          />
        )}

        <div
          className={`absolute top-0 bottom-0 left-0 transition-all duration-500 rounded-full ${statusColor}`}
          style={{ width: `${Math.min(porcentaje, 100)}%` }}
        />

        {minimoPos > 0 && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500"
            style={{ left: `${minimoPos}%` }}
          />
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusColor}`} />
          <span className="font-medium text-slate-700 dark:text-slate-200">{statusText}</span>
        </div>
        <span className="text-slate-500 dark:text-slate-400">
          {formatNumber(actualNum)} / {formatNumber(maximoNum)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100 dark:border-slate-700">
        <div className="text-center">
          <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatNumber(actualNum)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Stock Actual</p>
        </div>
        <div className="text-center">
          {editingMin ? (
            <input
              type="number"
              value={tempMin}
              onChange={(e) => setTempMin(e.target.value)}
              onBlur={handleSaveMin}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveMin()}
              autoFocus
              className="w-full text-center text-lg font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-amber-500/30"
            />
          ) : (
            <div
              className={`${canEdit ? 'cursor-pointer group' : ''}`}
              onClick={() => { if (canEdit) { setTempMin(minimoNum); setEditingMin(true); } }}
              title={canEdit ? 'Click para editar' : undefined}
            >
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${canEdit ? 'border border-dashed border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors' : ''}`}>
                <span className="text-2xl font-bold text-amber-600">{formatNumber(minimoNum)}</span>
                {canEdit && <Pencil className="w-3.5 h-3.5 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mínimo</p>
        </div>
        <div className="text-center">
          {editingMax ? (
            <input
              type="number"
              value={tempMax}
              onChange={(e) => setTempMax(e.target.value)}
              onBlur={handleSaveMax}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveMax()}
              autoFocus
              className="w-full text-center text-lg font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          ) : (
            <div
              className={`${canEdit ? 'cursor-pointer group' : ''}`}
              onClick={() => { if (canEdit) { setTempMax(maximoNum); setEditingMax(true); } }}
              title={canEdit ? 'Click para editar' : undefined}
            >
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${canEdit ? 'border border-dashed border-blue-300 dark:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors' : ''}`}>
                <span className="text-2xl font-bold text-blue-600">{formatNumber(maximoNum)}</span>
                {canEdit && <Pencil className="w-3.5 h-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
            </div>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Máximo</p>
        </div>
      </div>
      {canEdit && (
        <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-2 flex items-center justify-center gap-1">
          <Pencil className="w-3 h-3" /> Click en Mínimo o Máximo para editar
        </p>
      )}
    </div>
  );
};

/**
 * Item de movimiento
 */
const MovimientoItem = ({ movimiento }) => {
  const isEntrada = movimiento.tipo === 'entrada';
  const isAjuste = movimiento.tipo === 'ajuste';

  let iconConfig = {
    icon: PackageMinus,
    bg: 'bg-red-100',
    color: 'text-red-600',
    label: 'Salida',
  };

  if (isEntrada) {
    iconConfig = {
      icon: PackagePlus,
      bg: 'bg-emerald-100',
      color: 'text-emerald-600',
      label: 'Entrada',
    };
  } else if (isAjuste) {
    iconConfig = {
      icon: Layers,
      bg: 'bg-amber-100',
      color: 'text-amber-600',
      label: 'Ajuste',
    };
  }

  const Icon = iconConfig.icon;

  // Usar snake_case para campos del backend
  const cantidad = movimiento.cantidad || 0;
  const stockResultante = movimiento.stock_resultante || movimiento.stockResultante || 0;
  const documentoRef = movimiento.documento_referencia || movimiento.documento || 'N/A';
  const usuarioNombre = movimiento.usuario_nombre || movimiento.responsable || 'Sistema';
  const fecha = movimiento.fecha || movimiento.created_at;

  return (
    <div className="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-slate-700 last:border-0">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconConfig.bg}`}>
        <Icon className={`w-5 h-5 ${iconConfig.color}`} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-semibold ${isEntrada ? 'text-emerald-600' : isAjuste ? 'text-amber-600' : 'text-red-600'}`}>
                {cantidad > 0 ? '+' : ''}{formatNumber(cantidad)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {iconConfig.label}
              </span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-0.5">{movimiento.motivo || movimiento.descripcion || '-'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              Stock: {formatNumber(stockResultante)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {fecha ? new Date(fecha).toLocaleString('es-CO') : '-'}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {documentoRef}
          </span>
          <span>{usuarioNombre}</span>
        </div>
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const ProductoDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasPermission } = useAuth();
  const { success, error: notifyError, saved, deleted } = useNotification();

  // ──────────────────────────────────────────────────────────────────────────
  // HOOK DE INVENTARIO
  // ──────────────────────────────────────────────────────────────────────────

  const {
    currentProducto,
    loadingDetail,
    errorDetail,
    movimientos,
    loadingMovimientos,
    estadisticas,
    loadingEstadisticas,
    fetchById,
    fetchMovimientos,
    fetchEstadisticas,
    updateProducto,
    deleteProducto,
    registrarMovimiento,
  } = useInventario({ autoFetch: false });

  // ──────────────────────────────────────────────────────────────────────────
  // ESTADOS LOCALES (TODOS los hooks ANTES de cualquier return)
  // ──────────────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState('info');
  const [editModal, setEditModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [movimientoModal, setMovimientoModal] = useState({ isOpen: false, tipo: 'entrada' });
  const [formLoading, setFormLoading] = useState(false);
  const [cajas, setCajas] = useState([]);
  const [loadingCajas, setLoadingCajas] = useState(false);

  // Permisos dinámicos (restringidos si el producto es gestionado por WMS)
  const esWMS = !!(currentProducto?.codigo_wms);
  const canEdit = hasPermission('inventario', 'editar') && !esWMS;
  const canDelete = hasPermission('inventario', 'eliminar') && !esWMS;

  // ──────────────────────────────────────────────────────────────────────────
  // VARIABLES DERIVADAS
  // ──────────────────────────────────────────────────────────────────────────

  const producto = currentProducto || {};

  // ✅ Asegurar que los valores sean números
  const stockActual = parseFloat(producto.stock_actual || producto.cantidad) || 0;
  const stockMinimo = parseFloat(producto.stock_minimo) || 0;
  const stockMaximo = parseFloat(producto.stock_maximo) || (stockMinimo > 0 ? stockMinimo * 10 : 1000);
  const costoUnitario = parseFloat(producto.costo_unitario) || 0;
  const precioVenta = parseFloat(producto.precio_venta) || 0;
  const clienteNombre = producto.cliente_nombre || producto.cliente?.razon_social || '-';
  const bodegaNombre = producto.bodega_nombre || producto.zona || producto.bodega || '-';
  const unidadMedida = producto.unidad_medida || 'UND';
  const fechaVencimiento = producto.fecha_vencimiento || null;

  // ──────────────────────────────────────────────────────────────────────────
  // MEMOS (SIEMPRE se ejecutan)
  // ──────────────────────────────────────────────────────────────────────────

  // KPIs calculados desde movimientos
  const kpis = useMemo(() => {
    const entradas = (movimientos || []).filter(m => m.tipo === 'entrada');
    const salidas = (movimientos || []).filter(m => m.tipo === 'salida');

    const entradasMes = entradas.reduce((sum, m) => sum + Math.abs(parseFloat(m.cantidad) || 0), 0);
    const salidasMes = salidas.reduce((sum, m) => sum + Math.abs(parseFloat(m.cantidad) || 0), 0);

    return {
      valorStock: stockActual * costoUnitario,
      entradasMes,
      salidasMes,
      rotacion: stockActual > 0 ? ((salidasMes / stockActual) * 100).toFixed(1) : '0',
    };
  }, [movimientos, stockActual, costoUnitario]);

  // ═══════════════════════════════════════════════════════════════════════════
  // TRANSFORMACIÓN DE DATOS PARA BARCHART
  // ═══════════════════════════════════════════════════════════════════════════

  const chartData = useMemo(() => {
    if (!estadisticas || estadisticas.length === 0) {
      return [];
    }

    return estadisticas.map(item => {
      // Si ya viene con label y value1/value2 (backend actualizado)
      if (item.label !== undefined && item.value1 !== undefined) {
        return {
          label: item.label,
          value1: parseFloat(item.value1) || 0,
          value2: parseFloat(item.value2) || 0,
        };
      }

      // Transformar formato antiguo del backend
      let mesLabel = item.periodo || '';

      if (item.mes) {
        // Si es nombre en inglés, traducir
        mesLabel = MESES_ES[item.mes]?.substring(0, 3) || item.mes.substring(0, 3);
      } else if (item.periodo) {
        // Extraer mes del periodo "2026-01" → "Ene"
        const mesNum = parseInt(item.periodo.split('-')[1]);
        const mesesCortos = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
          'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        mesLabel = mesesCortos[mesNum] || item.periodo;
      }

      return {
        label: mesLabel,
        value1: parseFloat(item.entradas) || 0,
        value2: parseFloat(item.salidas) || 0,
      };
    });
  }, [estadisticas]);

  // Tabs
  const tabs = useMemo(() => [
    { id: 'info', label: 'Información' },
    { id: 'cajas', label: `Cajas (${cajas.length})` },
    { id: 'movimientos', label: `Movimientos (${(movimientos || []).length})` },
    { id: 'estadisticas', label: 'Estadísticas' },
  ], [movimientos, cajas]);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  const fetchCajas = async (productoId) => {
    setLoadingCajas(true);
    try {
      const res = await inventarioService.getCajas(productoId);
      setCajas(res?.data || []);
    } catch {
      setCajas([]);
    } finally {
      setLoadingCajas(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchById(id);
      fetchMovimientos(id);
      fetchEstadisticas(id);
      fetchCajas(id);
    }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleUpdateLimits = async (data) => {
    try {
      await updateProducto(id, data);
      saved('Límites de stock actualizados');
      fetchById(id);
    } catch (err) {
      notifyError(err.message || 'Error al actualizar límites');
    }
  };

  const handleEditProducto = async (data) => {
    setFormLoading(true);
    try {
      await updateProducto(id, data);
      saved('Producto');
      setEditModal(false);
      fetchById(id);
    } catch (err) {
      notifyError(err.message || 'Error al actualizar producto');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteProducto = async () => {
    setFormLoading(true);
    try {
      await deleteProducto(id);
      deleted('Producto');
      navigate('/inventario');
    } catch (err) {
      notifyError(err.message || 'Error al eliminar producto');
    } finally {
      setFormLoading(false);
    }
  };

  const handleMovimientoSubmit = async (data) => {
    setFormLoading(true);
    try {
      await registrarMovimiento(id, {
        tipo: movimientoModal.tipo,
        cantidad: data.cantidad,
        motivo: data.motivo,
        documento_referencia: data.documento_referencia || data.documento,
        observaciones: data.observaciones,
      });
      success(`Movimiento de ${movimientoModal.tipo} registrado correctamente`);
      setMovimientoModal({ isOpen: false, tipo: 'entrada' });
      fetchById(id);
      fetchMovimientos(id);
    } catch (err) {
      notifyError(err.message || 'Error al registrar movimiento');
    } finally {
      setFormLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // FORMATTERS
  // ──────────────────────────────────────────────────────────────────────────

  const formatCurrency = (value) => {
    if (!value) return '$0';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDERS CONDICIONALES (DESPUÉS de todos los hooks)
  // ══════════════════════════════════════════════════════════════════════════

  if (loadingDetail) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">

        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-48" />
            <div className="grid grid-cols-4 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
          </div>
        </main>
      </div>
    );
  }

  if (errorDetail || !currentProducto) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">

        <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Producto no encontrado</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-4">{errorDetail || 'El producto solicitado no existe'}</p>
            <Button variant="primary" onClick={() => navigate('/inventario')}>
              Volver a Inventario
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER PRINCIPAL
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">


      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventario')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center">
                <Package className="w-7 h-7 text-slate-600 dark:text-slate-300" />
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    {producto.nombre || producto.producto}
                  </h1>
                  <StatusChip status={producto.estado} />
                </div>
                <p className="text-slate-500 dark:text-slate-400">
                  {producto.codigo || producto.sku} • {clienteNombre}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {esWMS && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-lg border border-blue-200 dark:border-blue-800">
                <Lock className="w-3.5 h-3.5" />
                Gestionado por WMS
              </span>
            )}
            {canEdit && (
              <>
                <Button
                  variant="success"
                  icon={PackagePlus}
                  onClick={() => setMovimientoModal({ isOpen: true, tipo: 'entrada' })}
                >
                  Entrada
                </Button>
                <Button
                  variant="outline"
                  icon={PackageMinus}
                  onClick={() => setMovimientoModal({ isOpen: true, tipo: 'salida' })}
                  disabled={stockActual === 0}
                >
                  Salida
                </Button>
                <Button variant="outline" icon={Pencil} onClick={() => setEditModal(true)}>
                  Editar
                </Button>
              </>
            )}
            {canDelete && (
              <Button variant="danger" icon={Trash2} onClick={() => setDeleteModal(true)}>
                Eliminar
              </Button>
            )}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Valor en Stock"
            value={formatCurrency(kpis.valorStock)}
            icon={DollarSign}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-600"
          />
          <KpiCard
            title="Entradas del Mes"
            value={`+${formatNumber(kpis.entradasMes)}`}
            icon={TrendingUp}
            iconBg="bg-blue-100"
            iconColor="text-blue-600"
          />
          <KpiCard
            title="Salidas del Mes"
            value={`-${formatNumber(kpis.salidasMes)}`}
            icon={TrendingDown}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <KpiCard
            title="Rotación"
            value={`${kpis.rotacion}%`}
            icon={Layers}
            iconBg="bg-violet-100"
            iconColor="text-violet-600"
          />
        </div>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stock Gauge */}
          <div className="lg:col-span-1">
            <StockGauge
              actual={stockActual}
              minimo={stockMinimo}
              maximo={stockMaximo}
              onUpdateLimits={handleUpdateLimits}
              canEdit={hasPermission('inventario', 'editar')}
            />

            {producto.estado === 'bajo_stock' && (
              <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-300">Stock Bajo</p>
                    <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                      El stock actual está por debajo del mínimo requerido.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(producto.estado === 'agotado' || stockActual === 0) && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800 dark:text-red-300">Producto Agotado</p>
                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                      No hay unidades disponibles en inventario.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
              <div className="border-b border-gray-100 dark:border-slate-700">
                <nav className="flex px-6">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-4 text-sm font-medium transition-colors relative ${activeTab === tab.id ? 'text-orange-600 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
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
                {/* Tab: Información */}
                {activeTab === 'info' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Información General</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Barcode className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-500 dark:text-slate-400 w-28">Código:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-mono">{producto.codigo || producto.sku}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Layers className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-500 dark:text-slate-400 w-28">Categoría:</span>
                          <span className="text-slate-800 dark:text-slate-200 capitalize">{producto.categoria || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Package className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-500 dark:text-slate-400 w-28">Unidad:</span>
                          <span className="text-slate-800 dark:text-slate-200 capitalize">{unidadMedida}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Cliente</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Building2 className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-500 dark:text-slate-400 w-28">Cliente:</span>
                          <span className="text-slate-800 dark:text-slate-200">{clienteNombre}</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Warehouse className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-500 dark:text-slate-400 w-28">Bodega:</span>
                          <span className="text-slate-800 dark:text-slate-200">{bodegaNombre}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">Costos</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <DollarSign className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-500 dark:text-slate-400 w-28">Costo Unit.:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {formatCurrency(costoUnitario)}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <DollarSign className="w-5 h-5 text-slate-400" />
                          <span className="text-slate-500 dark:text-slate-400 w-28">Precio Venta:</span>
                          <span className="text-slate-800 dark:text-slate-200 font-medium">
                            {formatCurrency(precioVenta)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {producto.descripcion && (
                      <div className="space-y-4 md:col-span-2">
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100">Descripción</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 p-4 rounded-xl">
                          {producto.descripcion}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Cajas */}
                {activeTab === 'cajas' && (
                  <div>
                    {loadingCajas ? (
                      <div className="space-y-3">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : cajas.length === 0 ? (
                      <div className="py-12 text-center">
                        <BoxIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No hay cajas registradas para este producto</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 dark:border-slate-600">
                              <th className="text-left py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Caja</th>
                              <th className="text-left py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Lote</th>
                              <th className="text-left py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Ubicacion</th>
                              <th className="text-right py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Cantidad</th>
                              <th className="text-center py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Tipo</th>
                              <th className="text-center py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Estado</th>
                              <th className="text-left py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Operacion</th>
                              <th className="text-left py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Documento</th>
                              <th className="text-left py-3 px-2 font-medium text-slate-500 dark:text-slate-400">Fecha</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cajas.map((caja) => (
                              <tr key={caja.id} className="border-b border-gray-50 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <td className="py-3 px-2 font-mono text-slate-700 dark:text-slate-300">{caja.numero_caja}</td>
                                <td className="py-3 px-2 font-mono text-slate-600 dark:text-slate-400">{caja.lote}</td>
                                <td className="py-3 px-2 font-mono text-slate-600 dark:text-slate-400">{caja.ubicacion || '-'}</td>
                                <td className="py-3 px-2 text-right font-medium text-slate-800 dark:text-slate-200">{formatNumber(caja.cantidad)}</td>
                                <td className="py-3 px-2 text-center">
                                  {caja.tipo === 'entrada' ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
                                      <ArrowDownToLine className="w-3 h-3" />
                                      Entrada
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                                      <ArrowUpFromLine className="w-3 h-3" />
                                      Salida
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    caja.estado === 'disponible' ? 'bg-emerald-50 text-emerald-700' :
                                    caja.estado === 'despachada' ? 'bg-slate-100 text-slate-600' :
                                    caja.estado === 'en_transito' ? 'bg-blue-50 text-blue-700' :
                                    caja.estado === 'dañada' ? 'bg-red-50 text-red-700' :
                                    'bg-slate-100 text-slate-600'
                                  }`}>
                                    {caja.estado || '-'}
                                  </span>
                                </td>
                                <td className="py-3 px-2 text-slate-600 dark:text-slate-400 text-xs">
                                  {caja.numero_operacion || '-'}
                                  {caja.numero_picking && (
                                    <span className="block text-slate-400 dark:text-slate-500">{caja.numero_picking}</span>
                                  )}
                                </td>
                                <td className="py-3 px-2 font-mono text-xs text-slate-500 dark:text-slate-400">{caja.documento}</td>
                                <td className="py-3 px-2 text-xs text-slate-500 dark:text-slate-400">
                                  {caja.fecha ? new Date(caja.fecha).toLocaleDateString('es-CO') : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Movimientos */}
                {activeTab === 'movimientos' && (
                  <div className="space-y-0">
                    {loadingMovimientos ? (
                      <div className="space-y-3">
                        {[0, 1, 2, 3].map((i) => (
                          <div key={i} className="h-20 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                        ))}
                      </div>
                    ) : (movimientos || []).length === 0 ? (
                      <div className="py-12 text-center">
                        <Package className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No hay movimientos registrados</p>
                      </div>
                    ) : (
                      (movimientos || []).map((movimiento) => (
                        <MovimientoItem key={movimiento.id} movimiento={movimiento} />
                      ))
                    )}
                  </div>
                )}

                {/* Tab: Estadísticas */}
                {activeTab === 'estadisticas' && (
                  <div>
                    {loadingEstadisticas ? (
                      <div className="h-64 bg-gray-100 dark:bg-slate-700 rounded-lg animate-pulse" />
                    ) : chartData.length > 0 ? (
                      <BarChart
                        title="Entradas vs Salidas"
                        subtitle="Últimos 6 meses"
                        data={chartData}
                        legend={[
                          { label: 'Entradas', color: '#10b981' },
                          { label: 'Salidas', color: '#ef4444' },
                        ]}
                        height={300}
                      />
                    ) : (
                      <div className="py-12 text-center">
                        <TrendingUp className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">No hay suficientes datos para mostrar estadísticas</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                          Los movimientos deben estar en el rango de los últimos 6 meses
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODALS */}
      <ProductoForm
        isOpen={editModal}
        onClose={() => setEditModal(false)}
        onSubmit={handleEditProducto}
        producto={producto}
        loading={formLoading}
      />

      <MovimientoForm
        isOpen={movimientoModal.isOpen}
        onClose={() => setMovimientoModal({ isOpen: false, tipo: 'entrada' })}
        onSubmit={handleMovimientoSubmit}
        tipo={movimientoModal.tipo}
        producto={producto}
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDeleteProducto}
        title="Eliminar Producto"
        message={`¿Estás seguro de eliminar "${producto.nombre || producto.producto}"? Se perderá todo el historial de movimientos.`}
        confirmText="Eliminar"
        type="danger"
        loading={formLoading}
      />
    </div>
  );
};

export default ProductoDetail;