/**
 * ISTHO CRM - Manejador Global de Errores
 * 
 * Centraliza el manejo de errores de la aplicación.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const logger = require('../utils/logger');
const { error: errorResponse, serverError } = require('../utils/responses');

/**
 * Middleware para manejar errores de Sequelize
 */
const handleSequelizeError = (err, req, res, next) => {
  // Error de validación de Sequelize
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    return errorResponse(res, 'Error de validación', 400, errors, 'VALIDATION_ERROR');
  }
  
  // Error de constraint único (duplicado)
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'campo';
    return errorResponse(
      res, 
      `El valor de ${field} ya existe en el sistema`,
      409,
      null,
      'DUPLICATE_ERROR'
    );
  }
  
  // Error de foreign key
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return errorResponse(
      res,
      'No se puede completar la operación: registro relacionado no existe o no se puede eliminar',
      400,
      null,
      'FOREIGN_KEY_ERROR'
    );
  }
  
  // Error de conexión a BD
  if (err.name === 'SequelizeConnectionError') {
    logger.error('Error de conexión a BD:', { message: err.message });
    return serverError(res, 'Error de conexión a la base de datos');
  }
  
  next(err);
};

/**
 * Middleware para manejar errores de validación (express-validator)
 */
const handleValidationError = (err, req, res, next) => {
  if (err.array && typeof err.array === 'function') {
    const errors = err.array().map(e => ({
      field: e.path || e.param,
      message: e.msg
    }));
    return errorResponse(res, 'Error de validación', 400, errors, 'VALIDATION_ERROR');
  }
  next(err);
};

/**
 * Middleware final para errores no manejados
 */
const handleGenericError = (err, req, res, next) => {
  logger.error('Error no manejado:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
    user: req.user?.id
  });
  
  // En producción, no exponer detalles del error
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;
  
  return serverError(res, message, err);
};

module.exports = {
  handleSequelizeError,
  handleValidationError,
  handleGenericError
};