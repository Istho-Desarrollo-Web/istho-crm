/**
 * ISTHO CRM - DataTable Component
 * Tabla de datos con tabs reutilizable
 *
 * Dark Mode:
 * - Compatible con Tailwind dark:class
 * - Skeleton, hover y tabs adaptados
 *
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import StatusChip from '../StatusChip/StatusChip';

// ======================================================
// TABLA SIMPLE (SIN TABS)
// ======================================================
const SimpleTable = ({ columns, data, onRowClick, loading, emptyMessage }) => {
  // Skeleton loading
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, rowIdx) => (
              <tr
                key={rowIdx}
                className="border-b border-gray-50 dark:border-slate-700"
              >
                {columns.map((_, colIdx) => (
                  <td key={colIdx} className="py-4 px-4">
                    <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="py-12 text-center text-slate-500 dark:text-slate-400">
        <p>{emptyMessage || 'No hay datos para mostrar'}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-700">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`
                  py-3 px-4 text-xs font-semibold uppercase tracking-wider
                  text-slate-500 dark:text-slate-400
                  ${col.align === 'center' ? 'text-center' : ''}
                  ${col.align === 'right' ? 'text-right' : 'text-left'}
                `}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {data.map((row, rowIdx) => (
            <tr
              key={row.id || rowIdx}
              onClick={() => onRowClick?.(row)}
              className={`
                border-b border-gray-50 dark:border-slate-700
                hover:bg-slate-50 dark:hover:bg-slate-700
                transition-colors
                ${onRowClick ? 'cursor-pointer' : ''}
              `}
            >
              {columns.map((col, colIdx) => (
                <td
                  key={colIdx}
                  className={`
                    py-4 px-4 text-sm
                    text-slate-600 dark:text-slate-300
                    ${col.align === 'center' ? 'text-center' : ''}
                    ${col.align === 'right' ? 'text-right' : ''}
                  `}
                >
                  {renderCell(row, col)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ======================================================
// RENDER DE CELDAS
// ======================================================
const renderCell = (row, col) => {
  const value = row[col.key];

  if (col.render) return col.render(value, row);

  if (col.type === 'status') {
    return <StatusChip status={value} />;
  }

  if (col.type === 'id') {
    return (
      <span className="font-medium text-orange-600 dark:text-orange-400">
        {value}
      </span>
    );
  }

  if (col.type === 'currency') {
    return (
      <span className="font-medium text-slate-600 dark:text-slate-300">
        {value}
      </span>
    );
  }

  return (
    <span className="text-slate-600 dark:text-slate-300">
      {value}
    </span>
  );
};

// ======================================================
// DATATABLE CON TABS
// ======================================================
const DataTable = ({
  tabs,
  columns,
  data,
  defaultTab,
  onTabChange,
  onRowClick,
  loading = false,
  emptyMessage,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs?.[0]?.id);

  // Sin tabs → tabla simple
  if (!tabs || tabs.length === 0) {
    return (
      <div className="
        bg-white dark:bg-slate-800
        rounded-2xl shadow-sm
        border border-gray-100 dark:border-slate-700
        overflow-hidden
      ">
        <SimpleTable
          columns={columns}
          data={data}
          onRowClick={onRowClick}
          loading={loading}
          emptyMessage={emptyMessage}
        />
      </div>
    );
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  const currentColumns = columns[activeTab] || columns;
  const currentData = data[activeTab] || data;

  return (
    <div className="
      bg-white dark:bg-slate-800
      rounded-2xl shadow-sm
      border border-gray-100 dark:border-slate-700
      overflow-hidden
    ">
      {/* Tabs */}
      <div className="border-b border-gray-100 dark:border-slate-700">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                px-6 py-4 text-sm font-medium transition-colors relative
                ${activeTab === tab.id
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }
              `}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-2 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tabla */}
      <SimpleTable
        columns={currentColumns}
        data={currentData}
        onRowClick={onRowClick}
        loading={loading}
        emptyMessage={emptyMessage}
      />
    </div>
  );
};

// ======================================================
// PROPTYPES
// ======================================================
DataTable.propTypes = {
  tabs: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      count: PropTypes.number,
    })
  ),
  columns: PropTypes.oneOfType([
    PropTypes.array,
    PropTypes.object,
  ]).isRequired,
  data: PropTypes.oneOfType([PropTypes.array, PropTypes.object]).isRequired,
  defaultTab: PropTypes.string,
  onTabChange: PropTypes.func,
  onRowClick: PropTypes.func,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
};

export default DataTable;
