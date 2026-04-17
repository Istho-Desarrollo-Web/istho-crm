/**
 * ISTHO CRM - PieChart Component
 * Gráfico circular para distribución
 *
 * @author Coordinación TI ISTHO
 * @version 2.2.0
 * @date Abril 2026
 */

import { useState, useRef } from 'react';
import PropTypes from 'prop-types';

const COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ef4444', // red
  '#06b6d4', // cyan
  '#f97316', // orange
];

const PieChart = ({
  data = [],
  title,
  subtitle,
  size = 200,
  showLegend = true,
  headerActions = null,
}) => {
  const [hoveredSlice, setHoveredSlice] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef(null);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDACIÓN DE DATOS
  // ══════════════════════════════════════════════════════════════════════════

  const validData = (data || []).filter(item => {
    const value = Number(item?.value);
    return !isNaN(value) && value > 0;
  });

  if (validData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
          {headerActions && <div className="flex-shrink-0">{headerActions}</div>}
        </div>
        <div className="flex items-center justify-center" style={{ height: size }}>
          <div className="text-center">
            <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="mx-auto text-slate-300 mb-3"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
            <p className="text-slate-400 text-sm">Sin datos disponibles</p>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CÁLCULOS
  // ══════════════════════════════════════════════════════════════════════════

  const total = validData.reduce((sum, item) => sum + Number(item.value), 0);

  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;
  const hoverOffset = 8; // px que se desplaza el slice al hacer hover

  const slices = validData.reduce((acc, item, idx) => {
    const angleStart = acc.currentAngle;
    const value = Number(item.value);
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;
    const endAngle = angleStart + angle;
    const midAngle = angleStart + angle / 2; // ángulo del centroide del slice

    const startRad = (angleStart * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      return { ...acc, currentAngle: endAngle };
    }

    const largeArcFlag = angle > 180 ? 1 : 0;

    let path;
    if (validData.length === 1) {
      path = `
        M ${centerX} ${centerY - radius}
        A ${radius} ${radius} 0 1 1 ${centerX} ${centerY + radius}
        A ${radius} ${radius} 0 1 1 ${centerX} ${centerY - radius}
        Z
      `;
    } else {
      path = `
        M ${centerX} ${centerY}
        L ${x1.toFixed(2)} ${y1.toFixed(2)}
        A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}
        Z
      `;
    }

    const slice = {
      ...item,
      value,
      path,
      percentage,
      midAngle,
      color: item.color || COLORS[idx % COLORS.length],
    };

    return { currentAngle: endAngle, items: [...acc.items, slice] };
  }, { currentAngle: -90, items: [] }).items;

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {headerActions && <div className="flex-shrink-0">{headerActions}</div>}
      </div>

      <div className="flex items-center gap-6">
        {/* Pie Chart */}
        <div
          ref={containerRef}
          className="relative flex-shrink-0"
          onMouseMove={handleMouseMove}
        >
          <svg width={size} height={size}>
            {slices.map((slice, idx) => {
              const isHovered = hoveredSlice === idx;
              const midRad = (slice.midAngle * Math.PI) / 180;
              const tx = isHovered ? (hoverOffset * Math.cos(midRad)).toFixed(2) : 0;
              const ty = isHovered ? (hoverOffset * Math.sin(midRad)).toFixed(2) : 0;

              return (
                <path
                  key={idx}
                  d={slice.path}
                  fill={slice.color}
                  opacity={hoveredSlice !== null && !isHovered ? 0.45 : 1}
                  transform={isHovered ? `translate(${tx}, ${ty})` : undefined}
                  onMouseEnter={() => setHoveredSlice(idx)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  className="cursor-pointer"
                  style={{ transition: 'opacity 0.2s, transform 0.2s' }}
                  stroke="white"
                  strokeWidth="2"
                />
              );
            })}

            {/* Center circle (donut effect) */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.5}
              className="fill-white dark:fill-slate-800"
            />

            {/* Center text */}
            <text
              x={centerX}
              y={centerY - 8}
              textAnchor="middle"
              className="text-lg font-bold fill-slate-800 dark:fill-slate-100"
            >
              {total.toLocaleString()}
            </text>
            <text
              x={centerX}
              y={centerY + 12}
              textAnchor="middle"
              className="text-xs fill-slate-500"
            >
              Total
            </text>
          </svg>

          {/* Tooltip flotante junto al cursor */}
          {hoveredSlice !== null && slices[hoveredSlice] && (
            <div
              className="absolute pointer-events-none z-20 whitespace-nowrap"
              style={{
                left: mousePos.x + 14,
                top: mousePos.y - 48,
              }}
            >
              <div className="bg-slate-800 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg shadow-xl text-xs border border-slate-600">
                <p className="font-semibold leading-snug">
                  {slices[hoveredSlice].label || slices[hoveredSlice].name}
                </p>
                <p className="text-slate-300 leading-snug">
                  {slices[hoveredSlice].value.toLocaleString()} &middot;{' '}
                  <span className="font-bold text-white">
                    {slices[hoveredSlice].percentage.toFixed(1)}%
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Legend — sin porcentajes */}
        {showLegend && (
          <div className="flex-1 space-y-1.5">
            {slices.map((slice, idx) => (
              <div
                key={idx}
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`
                  flex items-center gap-2.5 px-2 py-1.5 rounded-lg cursor-pointer
                  transition-colors duration-150
                  ${hoveredSlice === idx
                    ? 'bg-slate-100 dark:bg-slate-700/60'
                    : hoveredSlice !== null
                      ? 'opacity-50'
                      : ''
                  }
                `}
              >
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {slice.label || slice.name || `Segmento ${idx + 1}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

PieChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      name: PropTypes.string,
      value: PropTypes.number.isRequired,
      color: PropTypes.string,
    })
  ),
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  size: PropTypes.number,
  showLegend: PropTypes.bool,
  headerActions: PropTypes.node,
};

export default PieChart;
