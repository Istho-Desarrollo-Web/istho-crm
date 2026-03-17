import React, { forwardRef } from 'react';
import { AlertCircle } from 'lucide-react';
import PropTypes from 'prop-types';

/**
 * Componente Input reutilizable
 * Soporta iconos, estados de error y estilos consistentes
 */
const Input = forwardRef(({
    label,
    error,
    icon: Icon,
    className = '',
    containerClassName = '',
    type = 'text',
    disabled,
    ...props
}, ref) => {
    return (
        <div className={`w-full ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-medium text-slate-700 mb-1">
                    {label}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                )}

                <input
                    ref={ref}
                    type={type}
                    disabled={disabled}
                    className={`
            w-full py-2.5 border rounded-xl text-sm transition-colors
            focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
            ${Icon ? 'pl-10' : 'pl-4'}
            ${error
                            ? 'border-red-300 bg-red-50 text-red-900 placeholder-red-300'
                            : 'border-slate-200 bg-white text-slate-900'
                        }
            ${disabled ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}
            ${className}
          `}
                    {...props}
                />
            </div>

            {error && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

Input.propTypes = {
    label: PropTypes.string,
    error: PropTypes.string,
    icon: PropTypes.elementType,
    className: PropTypes.string,
    containerClassName: PropTypes.string,
    type: PropTypes.string,
    disabled: PropTypes.bool,
};

export default Input;
