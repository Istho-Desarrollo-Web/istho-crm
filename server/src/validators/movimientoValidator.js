/**
 * ISTHO CRM - Validadores de Movimientos de Caja Menor
 *
 * Esquemas de validación para endpoints de movimientos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { body, param, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

const CONCEPTOS_EGRESO = [
  'cuadre_de_caja', 'descargues', 'acpm', 'administracion', 'alimentacion',
  'comisiones', 'desencarpe', 'encarpe', 'hospedaje', 'otros',
  'seguros', 'repuestos', 'tecnicomecanica', 'peajes', 'ligas',
  'parqueadero', 'urea', 'liquidacion'
];

const CONCEPTOS_INGRESO = [
  'ingreso_adicional', 'recarga', 'cuadre_de_caja', 'peajes_ingreso',
  'ligas_ingresos', 'parqueadero_ingresos', 'urea_ingresos'
];

const TODOS_CONCEPTOS = [...new Set([...CONCEPTOS_EGRESO, ...CONCEPTOS_INGRESO])];

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

/**
 * Validación para crear movimiento
 */
const crearMovimientoValidator = [
  body('caja_menor_id')
    .notEmpty().withMessage('La caja menor es requerida')
    .isInt({ min: 1 }).withMessage('ID de caja menor inválido'),

  body('tipo_movimiento')
    .notEmpty().withMessage('El tipo de movimiento es requerido')
    .isIn(['ingreso', 'egreso']).withMessage('Tipo inválido. Opciones: ingreso, egreso'),

  body('concepto')
    .trim()
    .notEmpty().withMessage('El concepto es requerido')
    .isIn(TODOS_CONCEPTOS).withMessage('Concepto no válido'),

  body('concepto_otro')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La descripción del concepto no puede exceder 100 caracteres')
    .custom((value, { req }) => {
      if (req.body.concepto === 'otros' && (!value || !value.trim())) {
        throw new Error('Debe especificar el concepto cuando selecciona "otros"');
      }
      return true;
    }),

  body('valor')
    .notEmpty().withMessage('El valor es requerido')
    .isFloat({ min: 0.01 }).withMessage('El valor debe ser mayor a cero'),

  body('viaje_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('ID de viaje inválido'),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('La descripción no puede exceder 2000 caracteres'),

  validar
];

/**
 * Validación para actualizar movimiento
 */
const actualizarMovimientoValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de movimiento inválido'),

  body('tipo_movimiento')
    .optional()
    .isIn(['ingreso', 'egreso']).withMessage('Tipo inválido. Opciones: ingreso, egreso'),

  body('concepto')
    .optional()
    .trim()
    .isIn(TODOS_CONCEPTOS).withMessage('Concepto no válido'),

  body('concepto_otro')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La descripción del concepto no puede exceder 100 caracteres'),

  body('valor')
    .optional()
    .isFloat({ min: 0.01 }).withMessage('El valor debe ser mayor a cero'),

  body('viaje_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('ID de viaje inválido'),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('La descripción no puede exceder 2000 caracteres'),

  validar
];

/**
 * Validación para aprobar/rechazar movimiento
 */
const aprobarMovimientoValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de movimiento inválido'),

  body('aprobado')
    .notEmpty().withMessage('El estado de aprobación es requerido')
    .isBoolean().withMessage('aprobado debe ser verdadero o falso'),

  body('valor_aprobado')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('El valor aprobado debe ser un número positivo'),

  body('observaciones_aprobacion')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Las observaciones no pueden exceder 2000 caracteres'),

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

module.exports = {
  validar,
  crearMovimientoValidator,
  actualizarMovimientoValidator,
  aprobarMovimientoValidator,
  idParamValidator
};
