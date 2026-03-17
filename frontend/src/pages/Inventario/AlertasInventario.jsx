/**
 * ============================================================================
 * ISTHO CRM - AlertasInventario (Versión Corregida v2.2)
 * ============================================================================
 * Gestión de alertas de inventario conectada al backend real.
 * 
 * CORRECCIONES v2.2:
 * - Corregidos TODOS los template literals (className, navigate, message)
 * 
 * @author Coordinación TI ISTHO
 * @version 2.2.0
 * @date Enero 2026
 */

import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  Eye,
  Calendar,
  Building2,
  MapPin,
  ArrowLeft,
} from 'lucide-react';

// Layout


// Components
import { Button, StatusChip, FilterDropdown, KpiCard, ConfirmDialog } from '../../components/common';

// Hooks
import useInventario from '../../hooks/useInventario';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const TIPO_ALERTA_CONFIG = {
  agotado: {
    label: 'Agotado',
    icon: Package,
    bg: 'bg-red-100 dark:bg-red-900/30',
    color: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800/50',
  },
  bajo_stock: {
    label: 'Stock Bajo',
    icon: AlertTriangle,
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    color: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800/50',
  },
  vencimiento: {
    label: 'Por Vencer',
    icon: Clock,
    bg: 'bg-orange-100 dark:bg-orange-900/30',
    color: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800/50',
  },
};

const PRIORIDAD_CONFIG = {
  alta: { label: 'Alta', color: 'bg-red-500' },
  media: { label: 'Media', color: 'bg-amber-500' },
  baja: { label: 'Baja', color: 'bg-blue-500' },
};

const FILTER_OPTIONS = {
  tipo: [
    { value: 'agotado', label: 'Agotados' },
    { value: 'bajo_stock', label: 'Stock Bajo' },
    { value: 'vencimiento', label: 'Por Vencer' },
  ],
  prioridad: [
    { value: 'alta', label: 'Alta' },
    { value: 'media', label: 'Media' },
    { value: 'baja', label: 'Baja' },
  ],
};

const checkPermission = (userRole, action) => {
  const permissions = {
    admin: ['ver', 'crear', 'editar', 'eliminar', 'atender'],
    supervisor: ['ver', 'crear', 'editar', 'atender'],
    operador: ['ver', 'atender'],
    cliente: ['ver'],
  };
  return permissions[userRole]?.includes(action) || false;
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTES INTERNOS
// ════════════════════════════════════════════════════════════════════════════

const AlertaCard = ({ alerta, onView, onAtender, onDescartar, canAtender }) => {
  const config = TIPO_ALERTA_CONFIG[alerta.tipo] || TIPO_ALERTA_CONFIG.bajo_stock;
  const prioridadConfig = PRIORIDAD_CONFIG[alerta.prioridad] || PRIORIDAD_CONFIG.media;
  const Icon = config.icon;

  const stockActual = alerta.stock_actual ?? alerta.stockActual ?? 0;
  const stockMinimo = alerta.stock_minimo ?? alerta.stockMinimo ?? 0;
  const clienteNombre = alerta.cliente_nombre || alerta.cliente || '-';
  const productoNombre = alerta.producto_nombre || alerta.nombre || 'Producto';
  const productoCodigo = alerta.producto_codigo || alerta.codigo || '-';
  const fechaVencimiento = alerta.fecha_vencimiento || alerta.fechaVencimiento;
  const diasRestantes = alerta.dias_restantes;

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-2xl border ${config.border} shadow-sm overflow-hidden hover:shadow-md transition-shadow`}>
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${config.bg}`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color}`}>
                  {config.label}
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${prioridadConfig.color}`}
                  title={`Prioridad ${prioridadConfig.label}`}
                />
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {alerta.created_at ? new Date(alerta.created_at).toLocaleDateString('es-CO') : '-'}
              </p>
            </div>
          </div>

          {alerta.estado === 'atendida' && (
            <span className="text-xs px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" />
              Atendida
            </span>
          )}
        </div>

        <div className="mb-4">
          <h3
            className="text-lg font-semibold text-slate-800 dark:text-slate-100 hover:text-orange-600 dark:hover:text-orange-400 cursor-pointer transition-colors"
            onClick={() => onView(alerta)}
          >
            {productoNombre}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">{productoCodigo}</p>
        </div>

        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Building2 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            {clienteNombre}
          </div>

          {alerta.ubicacion && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <MapPin className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              {alerta.ubicacion}
            </div>
          )}

          {alerta.tipo === 'vencimiento' && fechaVencimiento && (
            <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
              <Calendar className="w-4 h-4" />
              Vence: {new Date(fechaVencimiento).toLocaleDateString('es-CO')}
              {diasRestantes !== undefined && (
                <span className="text-xs px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                  {diasRestantes} días
                </span>
              )}
            </div>
          )}
        </div>

        {(alerta.tipo === 'agotado' || alerta.tipo === 'bajo_stock') && (
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Stock Actual</span>
              <span className={`font-bold ${stockActual === 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {stockActual.toLocaleString()} {alerta.unidad_medida || 'UND'}
              </span>
            </div>
            {stockMinimo > 0 && (
              <>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-slate-500 dark:text-slate-400">Stock Mínimo</span>
                  <span className="text-slate-700 dark:text-slate-300">{stockMinimo.toLocaleString()}</span>
                </div>
                <div className="mt-2 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${stockActual === 0 ? 'bg-red-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min((stockActual / stockMinimo) * 100, 100)}%` }}
                  />
                </div>
              </>
            )}
          </div>
        )}

        {canAtender && alerta.estado !== 'atendida' && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={CheckCircle}
              onClick={() => onAtender(alerta)}
              className="flex-1"
            >
              Atender
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={XCircle}
              onClick={() => onDescartar(alerta)}
              className="text-slate-400 hover:text-red-500"
            />
          </div>
        )}
      </div>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const AlertasInventario = () => {
  const navigate = useNavigate();
  const { user, hasPermission: authHasPermission, isCliente } = useAuth();
  const { success, error: notifyError, warning } = useNotification();

  // Portal clients need inventario.alertas permission
  const isPortalUser = isCliente() || user?.rol === 'cliente';
  if (isPortalUser && !authHasPermission('inventario', 'alertas')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-200 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-2">Acceso restringido</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-4">No tienes permiso para ver las alertas de inventario</p>
          <Button variant="primary" onClick={() => navigate('/inventario')}>Volver a Inventario</Button>
        </div>
      </div>
    );
  }

  const {
    alertas,
    loadingAlertas,
    fetchAlertas,
    atenderAlerta,
    descartarAlerta,
  } = useInventario({ autoFetchAlertas: true });

  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [atenderModal, setAtenderModal] = useState({ isOpen: false, alerta: null });
  const [descartarModal, setDescartarModal] = useState({ isOpen: false, alerta: null });
  const [formLoading, setFormLoading] = useState(false);

  const canAtender = checkPermission(user?.rol, 'atender');

  const filteredAlertas = useMemo(() => {
    let result = [...alertas];
    if (filters.tipo) result = result.filter(a => a.tipo === filters.tipo);
    if (filters.prioridad) result = result.filter(a => a.prioridad === filters.prioridad);
    return result;
  }, [alertas, filters]);

  const kpis = useMemo(() => {
    const pendientes = alertas.filter(a => a.estado !== 'atendida');
    return {
      total: alertas.length,
      agotados: alertas.filter(a => a.tipo === 'agotado').length,
      bajoStock: alertas.filter(a => a.tipo === 'bajo_stock').length,
      porVencer: alertas.filter(a => a.tipo === 'vencimiento').length,
      altaPrioridad: pendientes.filter(a => a.prioridad === 'alta').length,
    };
  }, [alertas]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAlertas();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => {
      const newFilters = { ...prev };
      if (value) newFilters[key] = value;
      else delete newFilters[key];
      return newFilters;
    });
  };

  const handleView = (alerta) => {
    navigate(`/inventario/productos/${alerta.producto_id}`);
  };

  const handleAtender = (alerta) => {
    setAtenderModal({ isOpen: true, alerta });
  };

  const handleDescartar = (alerta) => {
    setDescartarModal({ isOpen: true, alerta });
  };

  const handleConfirmAtender = async () => {
    setFormLoading(true);
    try {
      await atenderAlerta(atenderModal.alerta.id);
      success('Alerta marcada como atendida');
      setAtenderModal({ isOpen: false, alerta: null });
    } catch (err) {
      notifyError(err.message || 'Error al atender alerta');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmDescartar = async () => {
    setFormLoading(true);
    try {
      await descartarAlerta(descartarModal.alerta.id);
      warning('Alerta descartada');
      setDescartarModal({ isOpen: false, alerta: null });
    } catch (err) {
      notifyError(err.message || 'Error al descartar alerta');
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950">


      <main className="pt-28 px-4 pb-8 max-w-7xl mx-auto">
        {/* ════════════════════════════════════════════════════════════════ */}
        {/* HEADER */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/inventario')}
              className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Alertas de Inventario</h1>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Gestiona las alertas de stock bajo, agotados y vencimientos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              icon={RefreshCw}
              onClick={handleRefresh}
              loading={isRefreshing}
            />
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              icon={Filter}
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtros
              {Object.keys(filters).length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                  {Object.keys(filters).length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* KPIs */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Agotados"
            value={kpis.agotados}
            icon={Package}
            iconBg="bg-red-100"
            iconColor="text-red-600"
            onClick={() => handleFilterChange('tipo', 'agotado')}
            className="cursor-pointer hover:shadow-md"
          />
          <KpiCard
            title="Stock Bajo"
            value={kpis.bajoStock}
            icon={AlertTriangle}
            iconBg="bg-amber-100"
            iconColor="text-amber-600"
            onClick={() => handleFilterChange('tipo', 'bajo_stock')}
            className="cursor-pointer hover:shadow-md"
          />
          <KpiCard
            title="Por Vencer"
            value={kpis.porVencer}
            icon={Clock}
            iconBg="bg-orange-100"
            iconColor="text-orange-600"
            onClick={() => handleFilterChange('tipo', 'vencimiento')}
            className="cursor-pointer hover:shadow-md"
          />
          <KpiCard
            title="Prioridad Alta"
            value={kpis.altaPrioridad}
            icon={AlertTriangle}
            iconBg="bg-purple-100"
            iconColor="text-purple-600"
            onClick={() => handleFilterChange('prioridad', 'alta')}
            className="cursor-pointer hover:shadow-md"
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* FILTERS */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {showFilters && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FilterDropdown
                label="Tipo de Alerta"
                options={FILTER_OPTIONS.tipo}
                value={filters.tipo}
                onChange={(v) => handleFilterChange('tipo', v)}
                placeholder="Todos los tipos"
              />
              <FilterDropdown
                label="Prioridad"
                options={FILTER_OPTIONS.prioridad}
                value={filters.prioridad}
                onChange={(v) => handleFilterChange('prioridad', v)}
                placeholder="Todas las prioridades"
              />
              <div className="flex items-end">
                {Object.keys(filters).length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                    Limpiar filtros
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* RESULTS COUNT */}
        {/* ════════════════════════════════════════════════════════════════ */}
        <div className="mb-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredAlertas.length} alerta{filteredAlertas.length !== 1 ? 's' : ''} encontrada{filteredAlertas.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ALERTS GRID */}
        {/* ════════════════════════════════════════════════════════════════ */}
        {loadingAlertas ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredAlertas.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 py-16 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-1">
              {Object.keys(filters).length > 0 ? 'No hay alertas con estos filtros' : '¡Todo en orden!'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400">
              {Object.keys(filters).length > 0 ? 'Intenta ajustar los filtros de búsqueda' : 'No hay alertas de inventario pendientes'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAlertas.map((alerta) => (
              <AlertaCard
                key={alerta.id}
                alerta={alerta}
                onView={handleView}
                onAtender={handleAtender}
                onDescartar={handleDescartar}
                canAtender={canAtender}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 mt-8 text-slate-500 dark:text-slate-400 text-sm border-t border-gray-200 dark:border-slate-700">
          © 2026 ISTHO S.A.S. - Sistema CRM Interno
        </footer>
      </main>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODALS */}
      {/* ══════════════════════════════════════════════════════════════════ */}

      <ConfirmDialog
        isOpen={atenderModal.isOpen}
        onClose={() => setAtenderModal({ isOpen: false, alerta: null })}
        onConfirm={handleConfirmAtender}
        title="Marcar como Atendida"
        message={`¿Confirmas que la alerta de ${TIPO_ALERTA_CONFIG[atenderModal.alerta?.tipo]?.label?.toLowerCase() || 'inventario'} para "${atenderModal.alerta?.producto_nombre || atenderModal.alerta?.nombre || ''}" ha sido atendida? Esta acción quedará registrada en la auditoría.`}
        confirmText="Sí, marcar atendida"
        type="success"
        loading={formLoading}
      />

      <ConfirmDialog
        isOpen={descartarModal.isOpen}
        onClose={() => setDescartarModal({ isOpen: false, alerta: null })}
        onConfirm={handleConfirmDescartar}
        title="Descartar Alerta"
        message={`¿Estás seguro de descartar la alerta para "${descartarModal.alerta?.producto_nombre || descartarModal.alerta?.nombre || ''}"?`}
        confirmText="Descartar"
        type="warning"
        loading={formLoading}
      />
    </div>
  );
};

export default AlertasInventario;