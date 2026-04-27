/**
 * ISTHO CRM - ReportFilters Component
 * Filtros compartidos para reportes: rango de fechas y selector de cliente.
 * Oculta el filtro de cliente para usuarios portal (rol=cliente).
 *
 * @author Coordinación TI ISTHO
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
import { Calendar, Users, Filter, X, Search, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clientesService from '../../api/clientes.service';

// ============================================
// REPORT FILTERS
// ============================================
const ReportFilters = ({
  filters,
  onChange,
  loading = false,
  showDateRange = true,
  showCliente = true,
  extraFilters,
}) => {
  const { isCliente } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);
  const esPortal = isCliente();

  // Sincronizar estado local si el padre resetea los filtros externamente
  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  // Cargar lista de clientes (solo para usuarios internos)
  useEffect(() => {
    if (showCliente && !esPortal) {
      setLoadingClientes(true);
      clientesService
        .getAll({ limit: 100, estado: 'activo' })
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : res?.data?.rows || [];
          setClientes(list);
        })
        .catch(() => setClientes([]))
        .finally(() => setLoadingClientes(false));
    }
  }, [showCliente, esPortal]);

  const handleLocalChange = (field, value) => {
    setLocalFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    onChange(localFilters);
  };

  const handleClear = () => {
    const empty = { fecha_desde: '', fecha_hasta: '', cliente_id: '' };
    setLocalFilters(empty);
    onChange(empty);
  };

  const hasActiveFilters = filters.fecha_desde || filters.fecha_hasta || filters.cliente_id;
  const hasPendingChanges = JSON.stringify(localFilters) !== JSON.stringify(filters);

  return (
    <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Filtros</span>
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
          >
            <X className="w-3 h-3" />
            Limpiar
          </button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Fecha Desde */}
          {showDateRange && (
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Desde
              </label>
              <input
                type="date"
                value={localFilters.fecha_desde || ''}
                onChange={(e) => handleLocalChange('fecha_desde', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
              />
            </div>
          )}

          {/* Fecha Hasta */}
          {showDateRange && (
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Calendar className="w-3 h-3 inline mr-1" />
                Hasta
              </label>
              <input
                type="date"
                value={localFilters.fecha_hasta || ''}
                onChange={(e) => handleLocalChange('fecha_hasta', e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
              />
            </div>
          )}

          {/* Selector de Cliente (oculto para usuarios portal) */}
          {showCliente && !esPortal && (
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                <Users className="w-3 h-3 inline mr-1" />
                Cliente
              </label>
              <select
                value={localFilters.cliente_id || ''}
                onChange={(e) => handleLocalChange('cliente_id', e.target.value)}
                disabled={loadingClientes}
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 disabled:opacity-50"
              >
                <option value="">Todos los clientes</option>
                {clientes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.razon_social || c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Filtros extra específicos de cada reporte */}
          {extraFilters}
        </div>

        {/* Botón Aplicar */}
        <div className="flex items-end">
          <button
            onClick={handleApply}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              hasPendingChanges && !loading
                ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-centhrix-card'
            }`}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {loading ? 'Cargando...' : 'Aplicar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportFilters;
