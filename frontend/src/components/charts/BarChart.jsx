/**
 * ISTHO CRM - LineChart Component (reemplaza BarChart)
 * Gráfico de líneas con puntos interactivos
 * Mantiene la misma API de props para compatibilidad
 *
 * @author Coordinación TI ISTHO
 * @version 3.0.0
 * @date Marzo 2026
 */

import { useState } from 'react';
import PropTypes from 'prop-types';

const BarChart = ({
  data = [],
  title,
  subtitle,
  legend = [],
  height = 280,
  loading = false,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Loading skeleton
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1A1B3A] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-40 mb-2" />
          <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-56 mb-6" />
          <div className={`bg-gray-200 dark:bg-slate-700 rounded-xl`} style={{ height }} />
        </div>
      </div>
    );
  }

  // Sin datos
  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1A1B3A] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center justify-center text-slate-400 dark:text-slate-500" style={{ height: height - 60 }}>
          No hay datos disponibles
        </div>
      </div>
    );
  }

  // Calcular valores
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = 600;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = data.flatMap(d => [
    d.value1 ?? d.value ?? 0,
    d.value2 ?? 0
  ]).filter(v => !isNaN(v) && v > 0);

  const maxValue = Math.max(...allValues, 1);
  const minValue = 0;

  // Funciones de escala
  const xScale = (idx) => padding.left + (idx * (chartWidth - padding.left - padding.right)) / Math.max(data.length - 1, 1);
  const yScale = (val) => padding.top + chartHeight - ((val - minValue) / (maxValue - minValue)) * chartHeight;

  // Generar path de línea suave (curva)
  const generatePath = (values) => {
    if (values.length === 0) return '';
    if (values.length === 1) return '';

    const points = values.map((val, i) => ({ x: xScale(i), y: yScale(val) }));

    // Curva cardinal spline
    let path = `M ${points[0].x},${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(points.length - 1, i + 2)];

      const tension = 0.3;
      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return path;
  };

  // Generar path del área (gradiente debajo de la línea)
  const generateAreaPath = (values) => {
    const linePath = generatePath(values);
    if (!linePath) return '';
    const lastX = xScale(values.length - 1);
    const firstX = xScale(0);
    const bottomY = yScale(0);
    return `${linePath} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;
  };

  const values1 = data.map(d => d.value1 ?? d.value ?? 0);
  const values2 = data.map(d => d.value2 ?? 0);
  const hasSecondLine = values2.some(v => v > 0);

  const color1 = legend[0]?.color || '#E74C3C';
  const color2 = legend[1]?.color || '#2ECC71';

  // Grid lines (5 niveles)
  const gridLevels = 5;
  const gridLines = Array.from({ length: gridLevels + 1 }, (_, i) => {
    const val = minValue + (maxValue - minValue) * (i / gridLevels);
    return { y: yScale(val), label: Math.round(val) };
  });

  return (
    <div className="bg-white dark:bg-[#1A1B3A] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>}
        </div>

        {/* Legend */}
        {legend.length > 0 && (
          <div className="flex items-center gap-4">
            {legend.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600 dark:text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative">
        <svg
          width="100%"
          height={height}
          viewBox={`0 0 ${chartWidth} ${height}`}
          className="overflow-visible"
        >
          <defs>
            {/* Gradiente para el área debajo de la línea 1 */}
            <linearGradient id={`area-grad-1-${title?.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color1} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color1} stopOpacity="0.02" />
            </linearGradient>
            {hasSecondLine && (
              <linearGradient id={`area-grad-2-${title?.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color2} stopOpacity="0.15" />
                <stop offset="100%" stopColor={color2} stopOpacity="0.02" />
              </linearGradient>
            )}
          </defs>

          {/* Grid lines */}
          {gridLines.map((line, i) => (
            <g key={i}>
              <line
                x1={padding.left}
                y1={line.y}
                x2={chartWidth - padding.right}
                y2={line.y}
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-slate-200 dark:text-slate-700"
              />
              <text
                x={padding.left - 8}
                y={line.y + 4}
                textAnchor="end"
                className="text-[10px] fill-slate-400 dark:fill-slate-500"
              >
                {line.label.toLocaleString('es-CO')}
              </text>
            </g>
          ))}

          {/* Área 1 */}
          <path
            d={generateAreaPath(values1)}
            fill={`url(#area-grad-1-${title?.replace(/\s/g, '')})`}
          />

          {/* Línea 1 */}
          <path
            d={generatePath(values1)}
            fill="none"
            stroke={color1}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Área 2 */}
          {hasSecondLine && (
            <>
              <path
                d={generateAreaPath(values2)}
                fill={`url(#area-grad-2-${title?.replace(/\s/g, '')})`}
              />
              <path
                d={generatePath(values2)}
                fill="none"
                stroke={color2}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {/* Puntos + Labels + Tooltips */}
          {data.map((item, idx) => {
            const val1 = item.value1 ?? item.value ?? 0;
            const val2 = item.value2 ?? 0;
            const x = xScale(idx);
            const y1 = yScale(val1);
            const y2 = yScale(val2);
            const isHovered = hoveredPoint === idx;

            return (
              <g
                key={idx}
                onMouseEnter={() => setHoveredPoint(idx)}
                onMouseLeave={() => setHoveredPoint(null)}
                className="cursor-pointer"
              >
                {/* Hover vertical line */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    className="text-slate-300 dark:text-slate-600"
                  />
                )}

                {/* Hit area (invisible wider area for hover) */}
                <rect
                  x={x - 20}
                  y={padding.top}
                  width={40}
                  height={chartHeight}
                  fill="transparent"
                />

                {/* Punto 1 */}
                <circle
                  cx={x}
                  cy={y1}
                  r={isHovered ? 6 : 4}
                  fill={color1}
                  stroke="white"
                  strokeWidth="2"
                  className="transition-all duration-150"
                  style={{ filter: isHovered ? `drop-shadow(0 0 6px ${color1}60)` : 'none' }}
                />

                {/* Punto 2 */}
                {val2 > 0 && (
                  <circle
                    cx={x}
                    cy={y2}
                    r={isHovered ? 6 : 4}
                    fill={color2}
                    stroke="white"
                    strokeWidth="2"
                    className="transition-all duration-150"
                    style={{ filter: isHovered ? `drop-shadow(0 0 6px ${color2}60)` : 'none' }}
                  />
                )}

                {/* Label del eje X */}
                <text
                  x={x}
                  y={padding.top + chartHeight + 18}
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 dark:fill-slate-400"
                >
                  {item.label || item.name || ''}
                </text>

              </g>
            );
          })}
        </svg>

        {/* Tooltip HTML (fuera del SVG para que no se recorte) */}
        {hoveredPoint !== null && (() => {
          const item = data[hoveredPoint];
          const val1 = item?.value1 ?? item?.value ?? 0;
          const val2 = item?.value2 ?? 0;
          const x = xScale(hoveredPoint);
          const y1 = yScale(val1);
          // Posicionar tooltip como porcentaje del contenedor
          const leftPct = (x / chartWidth) * 100;
          const topPct = ((Math.min(y1, hasSecondLine ? yScale(val2) : y1) - 10) / height) * 100;

          return (
            <div
              className="absolute pointer-events-none z-50"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: 'translate(-50%, -100%)',
              }}
            >
              <div className="bg-[#0F1023] text-white text-[11px] font-medium rounded-lg px-3 py-2 shadow-xl whitespace-nowrap">
                <div>{legend[0]?.label || 'Valor'}: {val1.toLocaleString('es-CO')}</div>
                {hasSecondLine && val2 > 0 && (
                  <div className="mt-0.5">{legend[1]?.label || 'Valor 2'}: {val2.toLocaleString('es-CO')}</div>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

BarChart.propTypes = {
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      name: PropTypes.string,
      value: PropTypes.number,
      value1: PropTypes.number,
      value2: PropTypes.number,
    })
  ),
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  legend: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
    })
  ),
  height: PropTypes.number,
  loading: PropTypes.bool,
};

export default BarChart;
