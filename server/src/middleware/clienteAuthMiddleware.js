/**
 * ============================================================================
 * ISTHO CRM - Middleware de Autorización por Cliente
 * ============================================================================
 * Filtra automáticamente las consultas para usuarios de tipo cliente,
 * asegurando que solo vean su propia información.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

const logger = require('../utils/logger');
const { forbidden, unauthorized } = require('../utils/responses');

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE DE FILTRO POR CLIENTE
// ════════════════════════════════════════════════════════════════════════════

/**
 * Middleware que inyecta cliente_id en las consultas para usuarios de tipo cliente
 * 
 * Uso: router.get('/inventario', filtrarPorCliente, inventarioController.listar)
 * 
 * El usuario tipo cliente solo verá datos de SU cliente.
 * Los usuarios internos ven todo.
 */
const filtrarPorCliente = (req, res, next) => {
  try {
    // Si no hay usuario autenticado, continuar (otro middleware lo validará)
    if (!req.user) {
      return next();
    }
    
    // Si es usuario de tipo cliente, forzar filtro
    if (req.user.rol === 'cliente' && req.user.cliente_id) {
      // Inyectar en query params
      req.query.cliente_id = req.user.cliente_id;
      
      // Inyectar en body (para POST/PUT)
      if (req.body) {
        req.body.cliente_id = req.user.cliente_id;
      }
      
      // Inyectar en params si no existe
      if (!req.params.clienteId) {
        req.params.clienteId = req.user.cliente_id;
      }
      
      // Marcar que está filtrado
      req.filtradoPorCliente = true;
      
      logger.debug('Filtro por cliente aplicado:', {
        usuario_id: req.user.id,
        cliente_id: req.user.cliente_id
      });
    }
    
    next();
  } catch (error) {
    logger.error('Error en filtro por cliente:', { message: error.message });
    next(error);
  }
};

/**
 * Middleware que verifica que el cliente_id de la URL coincida con el del usuario
 * 
 * Uso: router.get('/clientes/:clienteId/...', verificarAccesoCliente, ...)
 * 
 * Para usuarios cliente: solo permite acceder a su propio cliente
 * Para usuarios internos: permite acceder a cualquier cliente
 */
const verificarAccesoCliente = (req, res, next) => {
  try {
    if (!req.user) {
      return unauthorized(res, 'No autenticado');
    }
    
    const clienteIdUrl = parseInt(req.params.clienteId);
    
    // Si es usuario cliente, verificar que solo acceda a su cliente
    if (req.user.rol === 'cliente' && req.user.cliente_id) {
      if (clienteIdUrl !== req.user.cliente_id) {
        logger.warn('Intento de acceso a cliente no autorizado:', {
          usuario_id: req.user.id,
          cliente_usuario: req.user.cliente_id,
          cliente_url: clienteIdUrl
        });
        return forbidden(res, 'No tiene acceso a este cliente');
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error en verificación de acceso:', { message: error.message });
    next(error);
  }
};

/**
 * Middleware que verifica si el usuario tiene un permiso específico de cliente
 * 
 * Uso: router.get('/inventario/exportar', verificarPermisoCliente('inventario', 'exportar'), ...)
 * 
 * @param {string} modulo - Módulo (inventario, despachos, reportes, etc.)
 * @param {string} accion - Acción (ver, crear, editar, exportar, etc.)
 */
const verificarPermisoCliente = (modulo, accion) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return unauthorized(res, 'No autenticado');
      }
      
      // Usuarios internos admin/supervisor tienen acceso completo
      if (['admin', 'supervisor'].includes(req.user.rol)) {
        return next();
      }
      
      // Para usuarios cliente, verificar permisos específicos
      if (req.user.rol === 'cliente') {
        const permisos = req.user.permisos_cliente || {};
        
        if (!permisos[modulo] || !permisos[modulo][accion]) {
          logger.warn('Permiso de cliente denegado:', {
            usuario_id: req.user.id,
            modulo,
            accion
          });
          return forbidden(res, `No tiene permiso para ${accion} en ${modulo}`);
        }
      }
      
      // Otros roles internos: verificar por rol
      if (!req.user.tienePermiso || !req.user.tienePermiso(modulo, accion)) {
        return forbidden(res, 'Permiso denegado');
      }
      
      next();
    } catch (error) {
      logger.error('Error verificando permiso:', { message: error.message });
      next(error);
    }
  };
};

/**
 * Middleware que bloquea acceso a usuarios de tipo cliente
 * 
 * Uso: router.delete('/clientes/:id', soloUsuariosInternos, clientesController.eliminar)
 */
const soloUsuariosInternos = (req, res, next) => {
  try {
    if (!req.user) {
      return unauthorized(res, 'No autenticado');
    }
    
    if (req.user.rol === 'cliente') {
      return forbidden(res, 'Esta acción no está disponible para usuarios de cliente');
    }
    
    next();
  } catch (error) {
    logger.error('Error en validación de usuario interno:', { message: error.message });
    next(error);
  }
};

/**
 * Middleware que verifica si el usuario requiere cambio de contraseña
 * 
 * Uso: router.use(verificarCambioPassword)
 * 
 * Si requiere cambio, solo permite acceso a endpoints de cambio de contraseña
 */
const verificarCambioPassword = (req, res, next) => {
  try {
    if (!req.user) {
      return next();
    }
    
    // Si requiere cambio de contraseña
    if (req.user.requiere_cambio_password) {
      // Permitir solo ciertos endpoints
      const endpointsPermitidos = [
        '/api/auth/cambiar-password',
        '/api/auth/logout',
        '/api/perfil/cambiar-password'
      ];
      
      const urlActual = req.originalUrl.split('?')[0];
      
      if (!endpointsPermitidos.some(ep => urlActual.startsWith(ep))) {
        return res.status(403).json({
          success: false,
          message: 'Debe cambiar su contraseña antes de continuar',
          code: 'PASSWORD_CHANGE_REQUIRED',
          data: {
            requiere_cambio_password: true,
            redirect_to: '/cambiar-password'
          }
        });
      }
    }
    
    next();
  } catch (error) {
    logger.error('Error verificando cambio de contraseña:', { message: error.message });
    next(error);
  }
};

// ════════════════════════════════════════════════════════════════════════════
// HELPER: Obtener cliente_id del contexto
// ════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene el cliente_id del contexto actual (usuario, query o params)
 * @param {Object} req - Request de Express
 * @returns {number|null}
 */
const obtenerClienteIdContexto = (req) => {
  // Prioridad: usuario cliente > query > params
  if (req.user?.rol === 'cliente' && req.user.cliente_id) {
    return req.user.cliente_id;
  }
  
  if (req.query?.cliente_id) {
    return parseInt(req.query.cliente_id);
  }
  
  if (req.params?.clienteId) {
    return parseInt(req.params.clienteId);
  }
  
  if (req.body?.cliente_id) {
    return parseInt(req.body.cliente_id);
  }
  
  return null;
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

module.exports = {
  filtrarPorCliente,
  verificarAccesoCliente,
  verificarPermisoCliente,
  soloUsuariosInternos,
  verificarCambioPassword,
  obtenerClienteIdContexto
};