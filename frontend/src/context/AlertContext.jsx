/**
 * ISTHO CRM - Alert Context & Hook
 * Sistema global para disparar alertas y confirmaciones premium.
 * 
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import CustomAlert from '../components/common/SweetAlert/CustomAlert';

const AlertContext = createContext();

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert debe usarse dentro de un AlertProvider');
  }
  return context;
};

export const AlertProvider = ({ children }) => {
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Aceptar',
    cancelText: 'Cancelar',
    showCancel: false,
    onConfirm: null,
    onCancel: null,
    loading: false,
  });

  /**
   * Disparar una alerta (éxito, error, info)
   */
  const showAlert = useCallback(({ 
    type = 'info', 
    title = '', 
    message = '', 
    confirmText = 'Aceptar',
    onConfirm = null 
  }) => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      showCancel: false,
      onConfirm: () => {
        setAlertState(prev => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
      loading: false,
    });
  }, []);

  /**
   * Disparar una confirmación (sí/no)
   */
  const showConfirm = useCallback(({ 
    type = 'warning', 
    title = '¿Estás seguro?', 
    message = '', 
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    onConfirm = null,
    onCancel = null
  }) => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        type,
        title,
        message,
        confirmText,
        cancelText,
        showCancel: true,
        onConfirm: async () => {
          setAlertState(prev => ({ ...prev, loading: true }));
          if (onConfirm) await onConfirm();
          setAlertState(prev => ({ ...prev, isOpen: false, loading: false }));
          resolve(true);
        },
        onCancel: () => {
          setAlertState(prev => ({ ...prev, isOpen: false }));
          if (onCancel) onCancel();
          resolve(false);
        },
        loading: false,
      });
    });
  }, []);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm }}>
      {children}
      <CustomAlert 
        {...alertState}
        onCancel={alertState.onCancel || (() => setAlertState(prev => ({ ...prev, isOpen: false })))}
      />
    </AlertContext.Provider>
  );
};
