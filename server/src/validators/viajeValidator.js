/**
 * ISTHO CRM - Validadores de Viajes
 *
 * Esquemas de validación para endpoints de viajes.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { body, param, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

/**
 * Middleware para ejecutar validaciones
 */
const validar = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const erroresFormateados = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return errorResponse(res, 'Error de validación', 400, erroresFormateados, 'VALIDATION_ERROR');
  }

  next();
};

/**
 * Validación para crear viaje
 */
const crearViajeValidator = [
  body('vehiculo_id')
    .notEmpty()
    .withMessage('El vehículo es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de vehículo inválido'),

  body('conductor_id')
    .notEmpty()
    .withMessage('El conductor es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de conductor inválido'),

  body('fecha')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha debe ser válida (YYYY-MM-DD)'),

  body('origen')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El origen no puede exceder 100 caracteres'),

  body('destino')
    .trim()
    .notEmpty()
    .withMessage('El destino es requerido')
    .isLength({ max: 100 })
    .withMessage('El destino no puede exceder 100 caracteres'),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres'),

  body('caja_menor_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('ID de caja menor inválido'),

  body('cliente_nombre')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre del cliente no puede exceder 200 caracteres'),

  body('documento_cliente')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El documento no puede exceder 50 caracteres'),

  body('peso')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El peso debe ser un número positivo'),

  body('valor_descargue')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El valor de descargue debe ser un número positivo'),

  body('num_personas')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('El número de personas debe ser un entero positivo'),

  body('no_factura')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El número de factura no puede exceder 50 caracteres'),

  body('valor_viaje')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El valor del viaje debe ser un número positivo'),

  validar,
];

/**
 * Validación para actualizar viaje
 */
const actualizarViajeValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de viaje inválido'),

  body('vehiculo_id').optional().isInt({ min: 1 }).withMessage('ID de vehículo inválido'),

  body('conductor_id').optional().isInt({ min: 1 }).withMessage('ID de conductor inválido'),

  body('fecha')
    .optional({ nullable: true })
    .isISO8601()
    .withMessage('La fecha debe ser válida (YYYY-MM-DD)'),

  body('origen')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El origen no puede exceder 100 caracteres'),

  body('destino')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El destino no puede exceder 100 caracteres'),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('La descripción no puede exceder 2000 caracteres'),

  body('caja_menor_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('ID de caja menor inválido'),

  body('cliente_nombre')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre del cliente no puede exceder 200 caracteres'),

  body('documento_cliente')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El documento no puede exceder 50 caracteres'),

  body('peso')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El peso debe ser un número positivo'),

  body('valor_descargue')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El valor de descargue debe ser un número positivo'),

  body('num_personas')
    .optional({ nullable: true })
    .isInt({ min: 0 })
    .withMessage('El número de personas debe ser un entero positivo'),

  body('no_factura')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('El número de factura no puede exceder 50 caracteres'),

  body('facturado').optional().isBoolean().withMessage('facturado debe ser verdadero o falso'),

  body('valor_viaje')
    .optional({ nullable: true })
    .isFloat({ min: 0 })
    .withMessage('El valor del viaje debe ser un número positivo'),

  body('estado')
    .optional()
    .isIn(['activo', 'completado', 'anulado'])
    .withMessage('Estado no válido'),

  validar,
];

/**
 * Validación de parámetro ID
 */
const idParamValidator = [param('id').isInt({ min: 1 }).withMessage('ID inválido'), validar];

module.exports = {
  validar,
  crearViajeValidator,
  actualizarViajeValidator,
  idParamValidator,
};
