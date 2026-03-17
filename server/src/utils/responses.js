/**
 * ISTHO CRM - Respuestas Estandarizadas
 * 
 * Funciones helper para generar respuestas consistentes en toda la API.
 * Formato acordado con el equipo de Frontend.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 */

/**
 * Respuesta exitosa con datos
 * @param {Object} res - Response de Express
 * @param {*} data - Datos a enviar
 * @param {number} statusCode - Código HTTP (default: 200)
 */
const success = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    data
  });
};

/**
 * Respuesta exitosa con mensaje
 * @param {Object} res - Response de Express
 * @param {string} message - Mensaje descriptivo
 * @param {*} data - Datos opcionales
 * @param {number} statusCode - Código HTTP (default: 200)
 */
const successMessage = (res, message, data = null, statusCode = 200) => {
  const response = {
    success: true,
    message
  };
  if (data) response.data = data;
  return res.status(statusCode).json(response);
};

/**
 * Respuesta exitosa para creación (201)
 * @param {Object} res - Response de Express
 * @param {string} message - Mensaje descriptivo
 * @param {*} data - Datos del recurso creado
 */
const created = (res, message, data) => {
  return res.status(201).json({
    success: true,
    message,
    data
  });
};

/**
 * Respuesta con paginación
 * @param {Object} res - Response de Express
 * @param {Array} data - Array de datos
 * @param {Object} pagination - Info de paginación
 */
const paginated = (res, data, pagination) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      total: pagination.total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(pagination.total / pagination.limit),
      hasNext: pagination.page < Math.ceil(pagination.total / pagination.limit),
      hasPrev: pagination.page > 1
    }
  });
};

/**
 * Respuesta de error
 * @param {Object} res - Response de Express
 * @param {string} message - Mensaje de error
 * @param {number} statusCode - Código HTTP (default: 400)
 * @param {Array} errors - Errores de validación opcionales
 * @param {string} code - Código de error interno
 */
const error = (res, message, statusCode = 400, errors = null, code = null) => {
  const response = {
    success: false,
    message
  };
  if (errors) response.errors = errors;
  if (code) response.code = code;
  
  // En desarrollo, agregar stack trace
  if (process.env.NODE_ENV === 'development' && errors?.stack) {
    response.stack = errors.stack;
  }
  
  return res.status(statusCode).json(response);
};

/**
 * Error 401 - No autorizado
 */
const unauthorized = (res, message = 'No autorizado. Token inválido o expirado') => {
  return error(res, message, 401, null, 'UNAUTHORIZED');
};

/**
 * Error 403 - Prohibido
 */
const forbidden = (res, message = 'No tiene permisos para esta acción') => {
  return error(res, message, 403, null, 'FORBIDDEN');
};

/**
 * Error 404 - No encontrado
 */
const notFound = (res, message = 'Recurso no encontrado') => {
  return error(res, message, 404, null, 'NOT_FOUND');
};

/**
 * Error 409 - Conflicto (duplicado)
 */
const conflict = (res, message = 'El recurso ya existe') => {
  return error(res, message, 409, null, 'CONFLICT');
};

/**
 * Error 422 - Error de negocio
 */
const unprocessable = (res, message) => {
  return error(res, message, 422, null, 'BUSINESS_ERROR');
};

/**
 * Error 500 - Error interno
 */
const serverError = (res, message = 'Error interno del servidor', errorObj = null) => {
  console.error('[SERVER ERROR]', errorObj || message);
  return error(res, message, 500, null, 'INTERNAL_ERROR');
};

module.exports = {
  success,
  successMessage,
  created,
  paginated,
  error,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError
};