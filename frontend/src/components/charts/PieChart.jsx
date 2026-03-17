/**
 * ISTHO CRM - PieChart Component
 * Gráfico circular para distribución
 * 
 * CORRECCIÓN v2.1.0:
 * - Manejo de datos vacíos
 * - Protección contra división por 0 (NaN)
 * - Validación de valores numéricos
 * 
 * @author Coordinación TI ISTHO
 * @version 2.1.0
 * @date Enero 2026
 */

import { useState } from 'react';
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
}) => {
  const [hoveredSlice, setHoveredSlice] = useState(null);

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDACIÓN DE DATOS
  // ══════════════════════════════════════════════════════════════════════════

  // Filtrar datos válidos (con valores numéricos > 0)
  const validData = (data || []).filter(item => {
    const value = Number(item?.value);
    return !isNaN(value) && value > 0;
  });

  // Si no hay datos válidos, mostrar estado vacío
  if (validData.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
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

  // Calcular total (ya sabemos que es > 0 por la validación)
  const total = validData.reduce((sum, item) => sum + Number(item.value), 0);
  
  // Calcular paths del pie
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;
  
  let currentAngle = -90; // Empezar desde arriba

  const slices = validData.map((item, idx) => {
    const value = Number(item.value);
    const percentage = (value / total) * 100;
    const angle = (value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    
    // Calcular puntos del arco
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    
    // Validar que los puntos son números válidos
    if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
      currentAngle = endAngle;
      return null;
    }
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    // Caso especial: si solo hay un elemento (100%), dibujar círculo completo
    let path;
    if (validData.length === 1) {
      // Dibujar círculo completo
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
    
    currentAngle = endAngle;
    
    return {
      ...item,
      value,
      path,
      percentage,
      color: item.color || COLORS[idx % COLORS.length],
    };
  }).filter(Boolean); // Filtrar nulls

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-6">
        {/* Pie Chart */}
        <div className="relative flex-shrink-0">
          <svg width={size} height={size} className="transform -rotate-0">
            {slices.map((slice, idx) => (
              <path
                key={idx}
                d={slice.path}
                fill={slice.color}
                opacity={hoveredSlice === idx ? 1 : 0.85}
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
                className="cursor-pointer transition-opacity duration-200"
                stroke="white"
                strokeWidth="2"
              />
            ))}
            
            {/* Center circle (donut effect) */}
            <circle
              cx={centerX}
              cy={centerY}
              r={radius * 0.5}
              fill="white"
            />
            
            {/* Center text */}
            <text
              x={centerX}
              y={centerY - 8}
              textAnchor="middle"
              className="text-xl font-bold fill-slate-800"
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

          {/* Tooltip */}
          {hoveredSlice !== null && slices[hoveredSlice] && (
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
                         bg-slate-800 text-white px-3 py-2 rounded-lg text-sm pointer-events-none
                         shadow-lg z-10"
            >
              <p className="font-medium">{slices[hoveredSlice].label || slices[hoveredSlice].name}</p>
              <p className="text-slate-300">
                {slices[hoveredSlice].value.toLocaleString()} ({slices[hoveredSlice].percentage.toFixed(1)}%)
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex-1 space-y-2">
            {slices.map((slice, idx) => (
              <div 
                key={idx}
                onMouseEnter={() => setHoveredSlice(idx)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`
                  flex items-center justify-between p-2 rounded-lg cursor-pointer
                  transition-colors duration-200
                  ${hoveredSlice === idx ? 'bg-slate-50' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <span 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-sm text-slate-700">
                    {slice.label || slice.name || `Segmento ${idx + 1}`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-800">
                    {slice.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

PieChart.propTypes = {
  /** Datos del gráfico [{label, value, color?}] */
  data: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string,
      name: PropTypes.string,
      value: PropTypes.number.isRequired,
      color: PropTypes.string,
    })
  ),
  /** Título del gráfico */
  title: PropTypes.string.isRequired,
  /** Subtítulo opcional */
  subtitle: PropTypes.string,
  /** Tamaño del gráfico en px */
  size: PropTypes.number,
  /** Mostrar leyenda */
  showLegend: PropTypes.bool,
};

export default PieChart;