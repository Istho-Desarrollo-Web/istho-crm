/**
 * ISTHO CRM - Validadores de Vehículos
 *
 * Esquemas de validación para endpoints de vehículos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { body, param, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

const TIPOS_VEHICULO = ['sencillo', 'tractomula', 'turbo', 'dobletroque', 'minimula', 'otro'];
const ESTADOS_VEHICULO = ['activo', 'inactivo', 'mantenimiento'];

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
 * Validación para crear vehículo
 */
const crearVehiculoValidator = [
  body('placa')
    .trim()
    .notEmpty().withMessage('La placa es requerida')
    .isLength({ min: 4, max: 10 }).withMessage('La placa debe tener entre 4 y 10 caracteres')
    .matches(/^[A-Za-z0-9]+$/).withMessage('La placa solo puede contener letras y números'),

  body('tipo_vehiculo')
    .notEmpty().withMessage('El tipo de vehículo es requerido')
    .isIn(TIPOS_VEHICULO).withMessage(`Tipo inválido. Opciones: ${TIPOS_VEHICULO.join(', ')}`),

  body('capacidad_ton')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('La capacidad debe ser un número positivo'),

  body('marca')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La marca no puede exceder 50 caracteres'),

  body('modelo')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('El modelo no puede exceder 10 caracteres'),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('El color no puede exceder 30 caracteres'),

  body('vencimiento_soat')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '') return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('La fecha del SOAT debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),

  body('vencimiento_tecnicomecanica')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '') return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('La fecha de tecnomecánica debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),

  body('poliza_responsabilidad')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La póliza no puede exceder 50 caracteres'),

  body('numero_motor')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El número de motor no puede exceder 50 caracteres'),

  body('numero_chasis')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El número de chasis no puede exceder 50 caracteres'),

  body('conductor_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('ID de conductor inválido'),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('La descripción no puede exceder 2000 caracteres'),

  validar
];

/**
 * Validación para actualizar vehículo
 */
const actualizarVehiculoValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de vehículo inválido'),

  body('placa')
    .optional()
    .trim()
    .isLength({ min: 4, max: 10 }).withMessage('La placa debe tener entre 4 y 10 caracteres')
    .matches(/^[A-Za-z0-9]+$/).withMessage('La placa solo puede contener letras y números'),

  body('tipo_vehiculo')
    .optional()
    .isIn(TIPOS_VEHICULO).withMessage(`Tipo inválido. Opciones: ${TIPOS_VEHICULO.join(', ')}`),

  body('capacidad_ton')
    .optional({ nullable: true })
    .isFloat({ min: 0 }).withMessage('La capacidad debe ser un número positivo'),

  body('marca')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La marca no puede exceder 50 caracteres'),

  body('modelo')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('El modelo no puede exceder 10 caracteres'),

  body('color')
    .optional()
    .trim()
    .isLength({ max: 30 }).withMessage('El color no puede exceder 30 caracteres'),

  body('vencimiento_soat')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '') return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('La fecha del SOAT debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),

  body('vencimiento_tecnicomecanica')
    .optional({ nullable: true })
    .custom((value) => {
      if (!value || value === '') return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('La fecha de tecnomecánica debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),

  body('poliza_responsabilidad')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La póliza no puede exceder 50 caracteres'),

  body('numero_motor')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El número de motor no puede exceder 50 caracteres'),

  body('numero_chasis')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El número de chasis no puede exceder 50 caracteres'),

  body('conductor_id')
    .optional({ nullable: true })
    .isInt({ min: 1 }).withMessage('ID de conductor inválido'),

  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('La descripción no puede exceder 2000 caracteres'),

  body('estado')
    .optional()
    .isIn(ESTADOS_VEHICULO).withMessage(`Estado inválido. Opciones: ${ESTADOS_VEHICULO.join(', ')}`),

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
  crearVehiculoValidator,
  actualizarVehiculoValidator,
  idParamValidator
};
