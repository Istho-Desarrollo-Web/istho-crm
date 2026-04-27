/**
 * ISTHO CRM - Validadores de Caja Menor
 *
 * Esquemas de validación para endpoints de cajas menores.
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
 * Validación para crear caja menor
 */
const crearCajaMenorValidator = [
  body('asignado_a')
    .notEmpty()
    .withMessage('El usuario asignado es requerido')
    .isInt({ min: 1 })
    .withMessage('ID de usuario inválido'),

  body('saldo_inicial')
    .notEmpty()
    .withMessage('El saldo inicial es requerido')
    .isFloat({ min: 0 })
    .withMessage('El saldo inicial no puede ser negativo'),

  body('caja_anterior_id')
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage('ID de caja anterior inválido'),

  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Las observaciones no pueden exceder 2000 caracteres'),

  validar,
];

/**
 * Validación para actualizar caja menor
 */
const actualizarCajaMenorValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de caja menor inválido'),

  body('asignado_a').optional().isInt({ min: 1 }).withMessage('ID de usuario inválido'),

  body('saldo_inicial')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('El saldo inicial no puede ser negativo'),

  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Las observaciones no pueden exceder 2000 caracteres'),

  validar,
];

/**
 * Validación para cerrar caja menor
 */
const cerrarCajaMenorValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de caja menor inválido'),

  body('accion_sobrante')
    .notEmpty()
    .withMessage('La acción para el sobrante es requerida')
    .isIn(['transferir', 'liquidar', 'sin_saldo'])
    .withMessage('Acción inválida. Opciones: transferir, liquidar, sin_saldo'),

  body('observaciones_cierre')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Las observaciones no pueden exceder 2000 caracteres'),

  validar,
];

/**
 * Validación de parámetro ID
 */
const idParamValidator = [param('id').isInt({ min: 1 }).withMessage('ID inválido'), validar];

module.exports = {
  validar,
  crearCajaMenorValidator,
  actualizarCajaMenorValidator,
  cerrarCajaMenorValidator,
  idParamValidator,
};
