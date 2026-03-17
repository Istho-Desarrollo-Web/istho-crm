/**
 * ISTHO CRM - BarChart Component
 * Gráfico de barras comparativo
 * 
 * CORRECCIÓN: Template literal en viewBox corregido
 * 
 * @author Coordinación TI ISTHO
 * @version 2.1.0
 * @date Enero 2026
 */

import { useState } from 'react';
import PropTypes from 'prop-types';

const BarChart = ({ 
  data = [], 
  title, 
  subtitle,
  legend = [],
  height = 280,
}) => {
  const [hoveredBar, setHoveredBar] = useState(null);

  // Validar que hay datos
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center justify-center h-48 text-slate-400">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  // Calcular el valor máximo para escalar (con fallback a 1 para evitar división por 0)
  const allValues = data.flatMap(d => [
    d.value1 ?? d.value ?? 0, 
    d.value2 ?? 0
  ]).filter(v => !isNaN(v));
  
  const maxValue = Math.max(...allValues, 1);
  const chartHeight = height - 60; // Espacio para labels

  // Calcular ancho de barras
  const barWidth = 24;
  const groupWidth = 70;
  const chartWidth = data.length * groupWidth;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
        
        {/* Legend */}
        {legend.length > 0 && (
          <div className="flex items-center gap-4">
            {legend.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span 
                  className="w-3 h-3 rounded-sm" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600">{item.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chart */}
      <div className="relative overflow-x-auto">
        <svg 
          width="100%" 
          height={height} 
          viewBox={`0 0 ${Math.max(chartWidth, 500)} ${height}`}
          className="overflow-visible"
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((percent) => {
            const y = chartHeight - (chartHeight * percent / 100);
            return (
              <g key={percent}>
                <line
                  x1="40"
                  y1={y}
                  x2={Math.max(chartWidth, 500)}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x="35"
                  y={y + 4}
                  textAnchor="end"
                  className="text-xs fill-slate-400"
                >
                  {Math.round(maxValue * percent / 100)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((item, idx) => {
            const x = 50 + idx * groupWidth;
            
            // Obtener valores con fallback
            const val1 = item.value1 ?? item.value ?? 0;
            const val2 = item.value2 ?? 0;
            
            // Calcular alturas (evitar NaN)
            const height1 = isNaN(val1) ? 0 : (val1 / maxValue) * chartHeight;
            const height2 = isNaN(val2) ? 0 : (val2 / maxValue) * chartHeight;
            
            const isHovered = hoveredBar === idx;

            return (
              <g 
                key={idx}
                onMouseEnter={() => setHoveredBar(idx)}
                onMouseLeave={() => setHoveredBar(null)}
                className="cursor-pointer"
              >
                {/* Bar 1 - Despachos */}
                <rect
                  x={x}
                  y={chartHeight - height1}
                  width={barWidth}
                  height={Math.max(height1, 0)}
                  rx="4"
                  fill={legend[0]?.color || '#3b82f6'}
                  opacity={isHovered ? 1 : 0.9}
                  className="transition-opacity duration-200"
                />
                
                {/* Bar 2 - Entregas (solo si hay valor) */}
                {val2 > 0 && (
                  <rect
                    x={x + barWidth + 4}
                    y={chartHeight - height2}
                    width={barWidth}
                    height={Math.max(height2, 0)}
                    rx="4"
                    fill={legend[1]?.color || '#10b981'}
                    opacity={isHovered ? 1 : 0.9}
                    className="transition-opacity duration-200"
                  />
                )}

                {/* Month label */}
                <text
                  x={x + barWidth + 2}
                  y={chartHeight + 20}
                  textAnchor="middle"
                  className="text-xs fill-slate-500"
                >
                  {item.label || item.name || ''}
                </text>

                {/* Tooltip */}
                {isHovered && (
                  <g>
                    <rect
                      x={x - 18}
                      y={chartHeight - Math.max(height1, height2) - 50}
                      width="98"
                      height="48"
                      rx="8"
                      fill="#1e293b"
                      opacity="0.95"
                    />
                    <text
                      x={x + 30}
                      y={chartHeight - Math.max(height1, height2) - 32}
                      textAnchor="middle"
                      className="text-xs fill-white font-medium"
                    >
                      {legend[0]?.label || 'Valor 1'}: {val1}
                    </text>
                    {val2 > 0 && (
                      <text
                        x={x + 30}
                        y={chartHeight - Math.max(height1, height2) - 16}
                        textAnchor="middle"
                        className="text-xs fill-white font-medium"
                      >
                        {legend[1]?.label || 'Valor 2'}: {val2}
                      </text>
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
};

BarChart.propTypes = {
  /** Datos del gráfico [{label, value1, value2}] o [{name, value}] */
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      name: PropTypes.string,
      value: PropTypes.number,
      value1: PropTypes.number,
      value2: PropTypes.number,
    })
  ),
  /** Título del gráfico */
  title: PropTypes.string.isRequired,
  /** Subtítulo opcional */
  subtitle: PropTypes.string,
  /** Leyenda [{label, color}] */
  legend: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      color: PropTypes.string.isRequired,
    })
  ),
  /** Altura del gráfico */
  height: PropTypes.number,
};

export default BarChart;