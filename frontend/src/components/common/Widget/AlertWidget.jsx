/**
 * ISTHO CRM - AlertWidget Component
 * Widget de alertas del sistema con modo oscuro
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import PropTypes from 'prop-types';
import {
  AlertTriangle,
  FileWarning,
  Package,
  Clock,
  ChevronRight,
  Bell,
} from 'lucide-react';

// Configuración de tipos de alerta
const ALERT_CONFIG = {
  documento: {
    icon: FileWarning,
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    iconBg: 'bg-amber-100 dark:bg-amber-800/40',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-200 dark:border-amber-800/50',
  },
  inventario: {
    icon: Package,
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    iconBg: 'bg-red-100 dark:bg-red-800/40',
    iconColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-red-200 dark:border-red-800/50',
  },
  vencimiento: {
    icon: Clock,
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    iconBg: 'bg-orange-100 dark:bg-orange-800/40',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-orange-200 dark:border-orange-800/50',
  },
  general: {
    icon: AlertTriangle,
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    iconBg: 'bg-blue-100 dark:bg-blue-800/40',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-blue-200 dark:border-blue-800/50',
  },
};

const AlertItem = ({ alert, onClick }) => {
  const config = ALERT_CONFIG[alert.type] || ALERT_CONFIG.general;
  const Icon = config.icon;

  return (
    <div
      onClick={() => onClick?.(alert)}
      className={`
        flex items-start gap-3 p-3 rounded-xl border cursor-pointer
        transition-all duration-200 hover:shadow-sm
        ${config.bgColor} ${config.borderColor}
      `}
    >
      <div className={`p-2 rounded-lg ${config.iconBg}`}>
        <Icon className={`w-4 h-4 ${config.iconColor}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
          {alert.title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {alert.description}
        </p>
        {alert.date && (
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
            {alert.date}
          </p>
        )}
      </div>

      <ChevronRight className="w-4 h-4 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
    </div>
  );
};

const AlertWidget = ({
  title = 'Alertas',
  alerts = [],
  onAlertClick,
  onViewAll,
  maxItems = 5,
  loading = false,
  emptyMessage = 'No hay alertas pendientes',
}) => {
  const displayedAlerts = alerts.slice(0, maxItems);
  const hasMore = alerts.length > maxItems;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-slate-700">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
          {alerts.length > 0 && (
            <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>

        {onViewAll && alerts.length > 0 && (
          <button
            onClick={onViewAll}
            className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors"
          >
            Ver todas
          </button>
        )}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-start gap-3 p-3 rounded-xl animate-pulse">
              <div className="w-8 h-8 bg-gray-200 dark:bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-gray-200 dark:bg-slate-700 rounded w-3/4" />
                <div className="h-3 bg-gray-100 dark:bg-slate-600 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-8 text-center">
          <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-slate-400 dark:text-slate-500" />
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedAlerts.map((alert, idx) => (
            <AlertItem
              key={alert.id || idx}
              alert={alert}
              onClick={onAlertClick}
            />
          ))}

          {hasMore && (
            <button
              onClick={onViewAll}
              className="w-full py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300
                         hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              +{alerts.length - maxItems} alertas más
            </button>
          )}
        </div>
      )}
    </div>
  );
};

AlertWidget.propTypes = {
  title: PropTypes.string,
  alerts: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
      type: PropTypes.oneOf(['documento', 'inventario', 'vencimiento', 'general']),
      title: PropTypes.string.isRequired,
      description: PropTypes.string,
      date: PropTypes.string,
    })
  ),
  onAlertClick: PropTypes.func,
  onViewAll: PropTypes.func,
  maxItems: PropTypes.number,
  loading: PropTypes.bool,
  emptyMessage: PropTypes.string,
};

export default AlertWidget;
