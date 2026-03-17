/**
 * ISTHO CRM - ConfirmDialog Component
 * Diálogo de confirmación para acciones destructivas
 * 
 * CORRECCIONES v1.1:
 * - Agregado tipo 'success'
 * - Corregidos template literals
 * - Agregado fallback para tipos no definidos
 * 
 * @author Coordinación TI ISTHO
 * @version 1.1.0
 * @date Enero 2026
 */

import PropTypes from 'prop-types';
import { AlertTriangle, Trash2, Info, CheckCircle } from 'lucide-react';
import Modal from '../Modal/Modal';
import Button from '../Button/Button';

const DIALOG_TYPES = {
  danger: {
    icon: Trash2,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    confirmVariant: 'danger',
  },
  warning: {
    icon: AlertTriangle,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    confirmVariant: 'primary',
  },
  info: {
    icon: Info,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    confirmVariant: 'secondary',
  },
  success: {
    icon: CheckCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    confirmVariant: 'success',
  },
};

// Configuración por defecto (fallback)
const DEFAULT_CONFIG = {
  icon: Info,
  iconBg: 'bg-slate-100',
  iconColor: 'text-slate-600',
  confirmVariant: 'primary',
};

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  loading = false,
}) => {
  // Usar config del tipo o fallback si no existe
  const config = DIALOG_TYPES[type] || DEFAULT_CONFIG;
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm?.();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="sm"
      showCloseButton={false}
      closeOnOverlay={!loading}
    >
      <div className="text-center">
        {/* Icon */}
        <div className={`mx-auto w-14 h-14 ${config.iconBg} rounded-full flex items-center justify-center mb-4`}>
          <Icon className={`w-7 h-7 ${config.iconColor}`} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-slate-800 mb-2">
          {title}
        </h3>

        {/* Message */}
        {message && (
          <p className="text-slate-500 text-sm mb-6">
            {message}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant={config.confirmVariant}
            onClick={handleConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

ConfirmDialog.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  title: PropTypes.string,
  message: PropTypes.string,
  confirmText: PropTypes.string,
  cancelText: PropTypes.string,
  type: PropTypes.oneOf(['danger', 'warning', 'info', 'success']),
  loading: PropTypes.bool,
};

export default ConfirmDialog;