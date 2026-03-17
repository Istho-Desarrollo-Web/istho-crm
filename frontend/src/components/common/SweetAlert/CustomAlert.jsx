/**
 * ISTHO CRM - Custom Alert Component
 * Alertas y confirmaciones con estilo premium y animaciones.
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import React from 'react';
import PropTypes from 'prop-types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Loader2
} from 'lucide-react';

const alertTypes = {
  success: {
    icon: <CheckCircle2 className="w-12 h-12 text-emerald-500" />,
    bgIcon: 'bg-emerald-100 dark:bg-emerald-900/30',
    btnClass: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-200/50',
    title: 'text-emerald-700 dark:text-emerald-400',
  },
  error: {
    icon: <XCircle className="w-12 h-12 text-rose-500" />,
    bgIcon: 'bg-rose-100 dark:bg-rose-900/30',
    btnClass: 'bg-rose-500 hover:bg-rose-600 shadow-rose-200/50',
    title: 'text-rose-700 dark:text-rose-400',
  },
  warning: {
    icon: <AlertTriangle className="w-12 h-12 text-amber-500" />,
    bgIcon: 'bg-amber-100 dark:bg-amber-900/30',
    btnClass: 'bg-amber-500 hover:bg-amber-600 shadow-amber-200/50',
    title: 'text-amber-700 dark:text-amber-400',
  },
  info: {
    icon: <Info className="w-12 h-12 text-blue-500" />,
    bgIcon: 'bg-blue-100 dark:bg-blue-900/30',
    btnClass: 'bg-blue-500 hover:bg-blue-600 shadow-blue-200/50',
    title: 'text-blue-700 dark:text-blue-400',
  }
};

const CustomAlert = ({
  isOpen,
  type = 'info',
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  showCancel = false,
  loading = false,
}) => {
  if (!isOpen) return null;

  const style = alertTypes[type] || alertTypes.info;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md bg-black/40 animate-fadeIn">
      <div 
        className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-white/20 dark:border-slate-800 animate-zoomIn"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decoración superior */}
        <div className={`h-2 w-full ${style.btnClass.split(' ')[0]}`} />
        
        <div className="p-8 text-center">
          {/* Icono con efecto de pulso */}
          <div className={`mx-auto w-20 h-20 rounded-full ${style.bgIcon} flex items-center justify-center mb-6 relative`}>
            {style.icon}
            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${style.bgIcon}`} />
          </div>

          <h3 className={`text-2xl font-bold mb-3 ${style.title}`}>
            {title}
          </h3>
          
          <p className="text-slate-500 dark:text-slate-400 text-base leading-relaxed mb-8">
            {message}
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={onConfirm}
              disabled={loading}
              className={`
                w-full py-4 px-6 rounded-2xl text-white font-bold text-lg
                transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]
                flex items-center justify-center gap-2 shadow-lg
                ${style.btnClass}
              `}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : confirmText}
            </button>

            {showCancel && (
              <button
                onClick={onCancel}
                disabled={loading}
                className="w-full py-3 px-6 rounded-2xl text-slate-500 dark:text-slate-400 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {cancelText}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

CustomAlert.propTypes = {
  isOpen: PropTypes.bool,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  onConfirm: PropTypes.func,
  onCancel: PropTypes.func,
  showCancel: PropTypes.bool,
  loading: PropTypes.bool,
};

export default CustomAlert;
