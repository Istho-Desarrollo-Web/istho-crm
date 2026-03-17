import React from 'react';
import PropTypes from 'prop-types';

/**
 * Componente para mostrar estados vacíos
 * Muestra un icono, título, descripción y acción opcional
 */
const EmptyState = ({
    icon: Icon,
    title,
    description,
    action
}) => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 border border-gray-100 rounded-xl border-dashed">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-4">
                {Icon && <Icon className="w-6 h-6 text-slate-400" />}
            </div>

            <h3 className="text-lg font-medium text-slate-800 mb-1">
                {title}
            </h3>

            {description && (
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                    {description}
                </p>
            )}

            {action && (
                <div>
                    {action}
                </div>
            )}
        </div>
    );
};

EmptyState.propTypes = {
    icon: PropTypes.elementType,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    action: PropTypes.node
};

export default EmptyState;
