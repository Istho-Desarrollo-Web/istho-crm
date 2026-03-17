/**
 * ISTHO CRM - Validadores de Cliente
 * 
 * Esquemas de validación para endpoints de clientes y contactos.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { body, param, query, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

/**
 * Middleware para ejecutar validaciones
 */
const validar = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const erroresFormateados = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    
    return errorResponse(
      res, 
      'Error de validación', 
      400, 
      erroresFormateados,
      'VALIDATION_ERROR'
    );
  }
  
  next();
};

// =============================================
// VALIDADORES DE CLIENTE
// =============================================

/**
 * Validación para crear cliente
 */
const crearClienteValidator = [
  body('razon_social')
    .trim()
    .notEmpty().withMessage('La razón social es requerida')
    .isLength({ min: 3, max: 200 }).withMessage('La razón social debe tener entre 3 y 200 caracteres'),
  
  body('nit')
    .trim()
    .notEmpty().withMessage('El NIT es requerido')
    .isLength({ min: 5, max: 20 }).withMessage('El NIT debe tener entre 5 y 20 caracteres'),
  
  body('direccion')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('La dirección no puede exceder 255 caracteres'),
  
  body('ciudad')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La ciudad no puede exceder 100 caracteres'),
  
  body('departamento')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El departamento no puede exceder 100 caracteres'),
  
  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('sitio_web')
    .optional()
    .trim()
    .isURL().withMessage('Debe ser una URL válida'),
  
  body('tipo_cliente')
    .optional()
    .isIn(['corporativo', 'pyme', 'persona_natural']).withMessage('Tipo de cliente no válido'),
  
  body('sector')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El sector no puede exceder 100 caracteres'),
  
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo', 'suspendido']).withMessage('Estado no válido'),
  
  body('fecha_inicio_relacion')
    .optional()
    .isISO8601().withMessage('Fecha de inicio debe ser válida (YYYY-MM-DD)'),
  
  body('credito_aprobado')
    .optional()
    .isFloat({ min: 0 }).withMessage('El crédito aprobado debe ser un número positivo'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Las notas no pueden exceder 2000 caracteres'),
  
  body('codigo_wms')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El código WMS no puede exceder 50 caracteres'),
  
  validar
];

/**
 * Validación para actualizar cliente
 */
const actualizarClienteValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  body('razon_social')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('La razón social debe tener entre 3 y 200 caracteres'),
  
  body('nit')
    .optional()
    .trim()
    .isLength({ min: 5, max: 20 }).withMessage('El NIT debe tener entre 5 y 20 caracteres'),
  
  body('direccion')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('La dirección no puede exceder 255 caracteres'),
  
  body('ciudad')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La ciudad no puede exceder 100 caracteres'),
  
  body('departamento')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El departamento no puede exceder 100 caracteres'),
  
  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('sitio_web')
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (value === '' || value === null) return true;
      // Validar URL manualmente
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error('Debe ser una URL válida');
      }
    }),
  
  body('tipo_cliente')
    .optional()
    .isIn(['corporativo', 'pyme', 'persona_natural']).withMessage('Tipo de cliente no válido'),
  
  body('sector')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El sector no puede exceder 100 caracteres'),
  
  body('estado')
    .optional()
    .isIn(['activo', 'inactivo', 'suspendido']).withMessage('Estado no válido'),
  
  body('fecha_inicio_relacion')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === '' || value === null) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Fecha debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),
  
  body('credito_aprobado')
    .optional()
    .isFloat({ min: 0 }).withMessage('El crédito aprobado debe ser un número positivo'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Las notas no pueden exceder 2000 caracteres'),
  
  body('codigo_wms')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El código WMS no puede exceder 50 caracteres'),
  
  validar
];

/**
 * Validación de parámetro ID
 */
const idParamValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID inválido'),
  
  validar
];

/**
 * Validación de query params para listado
 */
const listarClientesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  
  query('estado')
    .optional()
    .isIn(['activo', 'inactivo', 'suspendido', 'todos']).withMessage('Estado no válido'),
  
  query('tipo_cliente')
    .optional()
    .isIn(['corporativo', 'pyme', 'persona_natural', 'todos']).withMessage('Tipo no válido'),
  
  query('sort')
    .optional()
    .isIn(['razon_social', 'codigo_cliente', 'created_at', 'ciudad', 'estado'])
    .withMessage('Campo de ordenamiento no válido'),
  
  query('order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Orden debe ser ASC o DESC'),
  
  validar
];

// =============================================
// VALIDADORES DE CONTACTO
// =============================================

/**
 * Validación para crear contacto
 */
const crearContactoValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  
  body('cargo')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El cargo no puede exceder 100 caracteres'),
  
  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),
  
  body('celular')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El celular no puede exceder 50 caracteres'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('es_principal')
    .optional()
    .isBoolean().withMessage('es_principal debe ser verdadero o falso'),
  
  body('recibe_notificaciones')
    .optional()
    .isBoolean().withMessage('recibe_notificaciones debe ser verdadero o falso'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  
  validar
];

/**
 * Validación para actualizar contacto
 */
const actualizarContactoValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  param('contactoId')
    .isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),
  
  body('cargo')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El cargo no puede exceder 100 caracteres'),
  
  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),
  
  body('celular')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El celular no puede exceder 50 caracteres'),
  
  body('email')
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (value === '' || value === null) return true;
      // Validar email manualmente
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        throw new Error('Debe ser un email válido');
      }
      return true;
    }),
  
  body('es_principal')
    .optional()
    .isBoolean().withMessage('es_principal debe ser verdadero o falso'),
  
  body('recibe_notificaciones')
    .optional()
    .isBoolean().withMessage('recibe_notificaciones debe ser verdadero o falso'),
  
  body('activo')
    .optional()
    .isBoolean().withMessage('activo debe ser verdadero o falso'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),
  
  validar
];

/**
 * Validación de parámetros para contacto
 */
const contactoParamsValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  param('contactoId')
    .isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  
  validar
];

module.exports = {
  validar,
  // Clientes
  crearClienteValidator,
  actualizarClienteValidator,
  idParamValidator,
  listarClientesValidator,
  // Contactos
  crearContactoValidator,
  actualizarContactoValidator,
  contactoParamsValidator
};