/**
 * ============================================================================
 * ISTHO CRM - Hook useNotification (Versión Mejorada)
 * ============================================================================
 * Hook para mostrar notificaciones toast usando notistack.
 * Provee métodos convenientes para diferentes tipos de notificaciones.
 * 
 * MEJORAS v1.1.0:
 * - Nueva función inventoryAlert con mensajes inteligentes
 * - Estilos modernos acordes al diseño del CRM
 * - Mejor manejo de tipos de alerta
 * 
 * @author Coordinación TI ISTHO
 * @version 1.1.0
 * @date Enero 2026
 */

import { useSnackbar } from 'notistack';
import { useCallback } from 'react';

// ════════════════════════════════════════════════════════════════════════════
// ESTILOS PERSONALIZADOS ISTHO
// ════════════════════════════════════════════════════════════════════════════

const TOAST_STYLES = {
  base: {
    fontFamily: '"Inter", "Segoe UI", system-ui, sans-serif',
    borderRadius: '12px',
    boxShadow: '0 10px 40px -10px rgba(0, 0, 0, 0.2)',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: '500',
    minWidth: '300px',
    maxWidth: '450px',
  },
  success: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  error: {
    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  warning: {
    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  info: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  // Estilo especial para alertas de inventario (naranja ISTHO)
  inventory: {
    background: 'linear-gradient(135deg, #E65100 0%, #D84315 100%)',
    color: '#ffffff',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════

const useNotification = () => {
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();
  
  // ══════════════════════════════════════════════════════════════════════════
  // MÉTODOS BASE
  // ══════════════════════════════════════════════════════════════════════════
  
  /**
   * Mostrar notificación genérica con estilos ISTHO
   * @param {string} message - Mensaje a mostrar
   * @param {Object} options - Opciones de notistack
   */
  const notify = useCallback((message, options = {}) => {
    const variant = options.variant || 'default';
    const variantStyle = TOAST_STYLES[variant] || {};
    
    return enqueueSnackbar(message, {
      ...options,
      style: {
        ...TOAST_STYLES.base,
        ...variantStyle,
        ...options.style,
      },
    });
  }, [enqueueSnackbar]);
  
  // ══════════════════════════════════════════════════════════════════════════
  // MÉTODOS POR TIPO
  // ══════════════════════════════════════════════════════════════════════════
  
  /**
   * Notificación de éxito (verde)
   */
  const success = useCallback((message, options = {}) => {
    return notify(message, {
      variant: 'success',
      autoHideDuration: 3000,
      ...options,
    });
  }, [notify]);
  
  /**
   * Notificación de error (rojo)
   */
  const error = useCallback((message, options = {}) => {
    return notify(message, {
      variant: 'error',
      autoHideDuration: 5000,
      ...options,
    });
  }, [notify]);
  
  /**
   * Notificación de advertencia (amarillo/naranja)
   */
  const warning = useCallback((message, options = {}) => {
    return notify(message, {
      variant: 'warning',
      autoHideDuration: 4000,
      ...options,
    });
  }, [notify]);
  
  /**
   * Notificación informativa (azul)
   */
  const info = useCallback((message, options = {}) => {
    return notify(message, {
      variant: 'info',
      autoHideDuration: 3000,
      ...options,
    });
  }, [notify]);
  
  // ══════════════════════════════════════════════════════════════════════════
  // MÉTODOS ESPECIALIZADOS ISTHO
  // ══════════════════════════════════════════════════════════════════════════
  
  /**
   * Notificación de operación guardada
   * @param {string} entity - Nombre de la entidad (Cliente, Despacho, etc.)
   */
  const saved = useCallback((entity = 'Registro') => {
    return success(`✓ ${entity} guardado correctamente`);
  }, [success]);
  
  /**
   * Notificación de operación eliminada
   * @param {string} entity - Nombre de la entidad
   */
  const deleted = useCallback((entity = 'Registro') => {
    return success(`✓ ${entity} eliminado correctamente`);
  }, [success]);
  
  /**
   * Notificación de error de API
   * Extrae el mensaje del error de forma inteligente
   * @param {Error} err - Error de la API
   */
  const apiError = useCallback((err) => {
    // Extraer mensaje y status del error
    let message = 'Error de conexión con el servidor';
    let status = err?.response?.status || err?.status;

    if (err?.response?.data) {
      message = err.response.data.message || err.response.data.error || message;
    } else if (err?.message) {
      message = err.message;
    }

    // 403 - Permiso denegado: mostrar como warning con estilo especial
    if (status === 403) {
      return warning(`🔒 ${message}`, {
        autoHideDuration: 4000,
      });
    }

    // Persistir errores 500
    const shouldPersist = status === 500;

    return error(`✕ ${message}`, {
      persist: shouldPersist,
    });
  }, [error, warning]);
  
  /**
   * Notificación de sincronización WMS
   * @param {string} status - Estado: success, error, o loading
   */
  const wmsSync = useCallback((status) => {
    const st = status || 'success';
    if (st === 'success') {
      return success('✓ Sincronización con WMS completada');
    } else if (st === 'error') {
      return error('✕ Error al sincronizar con WMS');
    } else {
      return info('⟳ Sincronizando con WMS...');
    }
  }, [success, error, info]);
  
  /**
   * Notificación de despacho cerrado
   * @param {string} numero - Número del despacho
   */
  const despachoCerrado = useCallback((numero) => {
    return success(`✓ Despacho ${numero} cerrado correctamente`);
  }, [success]);
  
  /**
   * Notificación de alerta de stock (LEGACY - usar inventoryAlert)
   * @param {number} count - Cantidad de productos con alerta
   * @deprecated Usar inventoryAlert para mensajes más precisos
   */
  const stockAlert = useCallback((count) => {
    return warning(`⚠ ${count} producto(s) con alertas de inventario`);
  }, [warning]);
  
  /**
   * ═══════════════════════════════════════════════════════════════════════════
   * NUEVO: Notificación inteligente de alertas de inventario
   * ═══════════════════════════════════════════════════════════════════════════
   * Genera un mensaje descriptivo según los tipos de alerta presentes
   * 
   * @param {number} total - Total de alertas
   * @param {Object} porTipo - Alertas agrupadas por tipo
   * @param {Array} [porTipo.agotado] - Productos agotados
   * @param {Array} [porTipo.stock_bajo] - Productos con stock bajo
   * @param {Array} [porTipo.vencimiento] - Productos por vencer
   */
  const inventoryAlert = useCallback((total, porTipo = {}) => {
    if (total === 0) return;
    
    const partes = [];
    const agotados = porTipo.agotado?.length || 0;
    const stockBajo = porTipo.stock_bajo?.length || 0;
    const porVencer = porTipo.vencimiento?.length || 0;
    
    // Construir mensaje descriptivo
    if (agotados > 0) {
      partes.push(`${agotados} Producto${agotados > 1 ? 's' : ''} agotado${agotados > 1 ? 's' : ''}`);
    }
    if (stockBajo > 0) {
      partes.push(`${stockBajo} Producto${stockBajo > 1 ? 's' : ''} con stock bajo`);
    }
    if (porVencer > 0) {
      partes.push(`${porVencer} Producto${porVencer > 1 ? 's' : ''} por vencer`);
    }
    
    // Si no hay detalles, mensaje genérico
    if (partes.length === 0) {
      return notify(`📦 ${total} alerta${total > 1 ? 's' : ''} de inventario`, {
        variant: 'warning',
        autoHideDuration: 5000,
        style: {
          ...TOAST_STYLES.base,
          ...TOAST_STYLES.inventory,
        },
      });
    }
    
    // Mensaje con detalles
    const mensaje = partes.length === 1 
      ? `${partes[0]}`
      : `Alertas: ${partes.join(', ')}`;
    
    return notify(mensaje, {
      variant: 'warning',
      autoHideDuration: 5000,
      style: {
        ...TOAST_STYLES.base,
        ...TOAST_STYLES.inventory,
      },
    });
  }, [notify]);
  
  /**
   * Notificación de documento subido
   * @param {string} name - Nombre del documento
   */
  const documentUploaded = useCallback((name) => {
    return success(`✓ Documento "${name}" subido correctamente`);
  }, [success]);
  
  /**
   * Notificación de correo enviado
   * @param {string} to - Destinatario del correo
   */
  const emailSent = useCallback((to) => {
    return success(`✓ Correo enviado a ${to}`);
  }, [success]);

  /**
   * Notificación de operación creada
   * @param {string} tipo - Tipo de operación (ingreso/salida)
   * @param {string} numero - Número de la operación
   */
  const operacionCreada = useCallback((tipo, numero) => {
    return success(`✓ Operación de ${tipo} ${numero} creada correctamente`);
  }, [success]);

  /**
   * Notificación de avería registrada
   */
  const averiaRegistrada = useCallback(() => {
    return success('✓ Avería registrada correctamente');
  }, [success]);

  /**
   * Notificación de cliente actualizado
   */
  const clienteActualizado = useCallback(() => {
    return success('✓ Cliente actualizado correctamente');
  }, [success]);

  /**
   * Notificación de contacto agregado
   */
  const contactoAgregado = useCallback(() => {
    return success('✓ Contacto agregado correctamente');
  }, [success]);

  /**
   * Notificación de sesión expirada
   */
  const sessionExpired = useCallback(() => {
    return warning('⚠ Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
  }, [warning]);

  /**
   * Notificación de permiso denegado
   */
  const permissionDenied = useCallback(() => {
    return error('✕ No tienes permiso para realizar esta acción');
  }, [error]);
  
  /**
   * Notificación de carga en progreso
   * @param {string} message - Mensaje personalizado
   * @returns {string} - ID del snackbar para cerrarlo después
   */
  const loading = useCallback((message = 'Cargando...') => {
    return notify(`⟳ ${message}`, {
      variant: 'info',
      persist: true,
      style: {
        ...TOAST_STYLES.base,
        ...TOAST_STYLES.info,
      },
    });
  }, [notify]);
  
  /**
   * Cerrar notificación de carga y mostrar resultado
   * @param {string} loadingKey - ID del snackbar de carga
   * @param {boolean} isSuccess - Si fue exitoso o no
   * @param {string} message - Mensaje a mostrar
   */
  const loadingComplete = useCallback((loadingKey, isSuccess, message) => {
    closeSnackbar(loadingKey);
    if (isSuccess) {
      success(message);
    } else {
      error(message);
    }
  }, [closeSnackbar, success, error]);
  
  // ══════════════════════════════════════════════════════════════════════════
  // RETURN
  // ══════════════════════════════════════════════════════════════════════════
  
  return {
    // Base
    notify,
    close: closeSnackbar,
    closeAll: () => closeSnackbar(),
    
    // Por tipo
    success,
    error,
    warning,
    info,
    loading,
    loadingComplete,
    
    // Especializados ISTHO
    saved,
    deleted,
    apiError,
    wmsSync,
    despachoCerrado,
    stockAlert,        // Legacy
    inventoryAlert,    // Nuevo - recomendado
    documentUploaded,
    emailSent,
    operacionCreada,
    averiaRegistrada,
    clienteActualizado,
    contactoAgregado,
    sessionExpired,
    permissionDenied,
  };
};

export default useNotification;