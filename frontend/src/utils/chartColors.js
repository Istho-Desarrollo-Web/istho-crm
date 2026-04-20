/**
 * ISTHO CRM - Colores centralizados para gráficos
 * Fuente única de verdad para paleta de charts en toda la app
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Abril 2026
 */

export const CHART_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ef4444',
  '#06b6d4',
  '#f97316',
  '#ec4899',
];

export const CHART_COLORS_OPACITY = (opacity = 0.7) =>
  CHART_COLORS.map((c) => `${c}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`);
