/**
 * ISTHO CRM - MetricCard Component
 * Tarjeta de métricas/KPIs reutilizable
 * 
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import PropTypes from 'prop-types';

const MetricCard = ({
  title,
  value,
  change,
  positive = true,
  icon: Icon,
  iconBg = 'bg-blue-100',
  iconColor = 'text-blue-600',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-5 shadow-sm border border-gray-100 
        hover:shadow-md transition-shadow duration-300
        ${onClick ? 'cursor-pointer' : ''}
      `}
    >
      <div className="flex items-start justify-between">
        {/* Content */}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-1">
            {title}
          </p>
          <p className="text-3xl font-bold text-slate-800">
            {value}
          </p>
          {change && (
            <p
              className={`text-sm mt-2 font-medium ${
                positive ? 'text-emerald-600' : 'text-red-500'
              }`}
            >
              {change}
            </p>
          )}
        </div>

        {/* Icon */}
        {Icon && (
          <div className={`p-3 rounded-xl ${iconBg}`}>
            <Icon className={`w-6 h-6 ${iconColor}`} />
          </div>
        )}
      </div>
    </div>
  );
};

MetricCard.propTypes = {
  /** Título de la métrica */
  title: PropTypes.string.isRequired,
  /** Valor principal a mostrar */
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  /** Texto de cambio/tendencia */
  change: PropTypes.string,
  /** Si el cambio es positivo o negativo */
  positive: PropTypes.bool,
  /** Componente de icono (Lucide) */
  icon: PropTypes.elementType,
  /** Clase CSS para el fondo del icono */
  iconBg: PropTypes.string,
  /** Clase CSS para el color del icono */
  iconColor: PropTypes.string,
  /** Función onClick opcional */
  onClick: PropTypes.func,
};

export default MetricCard;