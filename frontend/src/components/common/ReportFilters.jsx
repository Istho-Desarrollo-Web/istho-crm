/**
 * ISTHO CRM - ReportFilters Component
 * Filtros compartidos para reportes: rango de fechas y selector de cliente.
 * Oculta el filtro de cliente para usuarios portal (rol=cliente).
 *
 * @author Coordinación TI ISTHO
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
import { Calendar, Users, Filter, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clientesService from '../../api/clientes.service';

// ============================================
// REPORT FILTERS
// ============================================
const ReportFilters = ({ filters, onChange, showDateRange = true, showCliente = true, extraFilters }) => {
  const { isCliente } = useAuth();
  const [clientes, setClientes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const esPortal = isCliente();

  // Cargar lista de clientes (solo para usuarios internos)
  useEffect(() => {
    if (showCliente && !esPortal) {
      setLoadingClientes(true);
      clientesService.getAll({ limit: 100, estado: 'activo' })
        .then((res) => {
          const list = Array.isArray(res?.data) ? res.data : res?.data?.rows || [];
          setClientes(list);
        })
        .catch(() => setClientes([]))
        .finally(() => setLoadingClientes(false));
    }
  }, [showCliente, esPortal]);

  const handleChange = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const handleClear = () => {
    onChange({ fecha_desde: '', fecha_hasta: '', cliente_id: '' });
  };

  const hasActiveFilters = filters.fecha_desde || filters.fecha_hasta || filters.cliente_id;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Fecha Desde */}
        {showDateRange && (
          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              <Calendar className="w-3 h-3 inline mr-1" />
              Desde
            </label>
            <input
              type="date"
              value={filters.fecha_desde || ''}
              onChange={(e) => handleChange('fecha_desde', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
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
              value={filters.fecha_hasta || ''}
              onChange={(e) => handleChange('fecha_hasta', e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400"
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
              value={filters.cliente_id || ''}
              onChange={(e) => handleChange('cliente_id', e.target.value)}
              disabled={loadingClientes}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:border-orange-400 disabled:opacity-50"
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
    </div>
  );
};

export default ReportFilters;
