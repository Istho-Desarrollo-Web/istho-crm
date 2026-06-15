// server/src/validators/contactoValidator.js
const { body, param, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

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

const crearContactoDirectorioValidator = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('tipo')
    .optional()
    .isIn(['istho', 'externo']).withMessage('tipo debe ser "istho" o "externo"'),

  body('usuario_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error('usuario_id debe ser un entero positivo');
      }
      return true;
    }),

  body('cargo')
    .optional().trim()
    .isLength({ max: 100 }).withMessage('El cargo no puede exceder 100 caracteres'),

  body('telefono')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),

  body('celular')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El celular no puede exceder 50 caracteres'),

  body('email')
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (!value || value === '') return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) throw new Error('Debe ser un email válido');
      return true;
    }),

  body('recibe_notificaciones')
    .optional().isBoolean().withMessage('recibe_notificaciones debe ser booleano'),

  body('tipos_notificacion')
    .optional()
    .isArray().withMessage('tipos_notificacion debe ser un array'),

  body('notas')
    .optional().trim()
    .isLength({ max: 1000 }).withMessage('Las notas no pueden exceder 1000 caracteres'),

  validar,
];

const actualizarContactoDirectorioValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),

  body('nombre')
    .optional().trim()
    .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('tipo')
    .optional()
    .isIn(['istho', 'externo']).withMessage('tipo debe ser "istho" o "externo"'),

  body('usuario_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error('usuario_id debe ser un entero positivo');
      }
      return true;
    }),

  body('cargo')
    .optional().trim()
    .isLength({ max: 100 }).withMessage('El cargo no puede exceder 100 caracteres'),

  body('telefono')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),

  body('celular')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El celular no puede exceder 50 caracteres'),

  body('email')
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (value === null || value === '') return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) throw new Error('Debe ser un email válido');
      return true;
    }),

  body('recibe_notificaciones')
    .optional().isBoolean().withMessage('recibe_notificaciones debe ser booleano'),

  body('tipos_notificacion')
    .optional()
    .isArray().withMessage('tipos_notificacion debe ser un array'),

  body('notas')
    .optional().trim()
    .isLength({ max: 1000 }).withMessage('Las notas no pueden exceder 1000 caracteres'),

  body('activo')
    .optional().isBoolean().withMessage('activo debe ser booleano'),

  validar,
];

const asignarClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),

  body('cliente_id')
    .notEmpty().withMessage('cliente_id es requerido')
    .isInt({ min: 1 }).withMessage('cliente_id debe ser un entero positivo'),

  body('es_principal')
    .optional().isBoolean().withMessage('es_principal debe ser booleano'),

  validar,
];

const desasignarClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  param('clienteId').isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  validar,
];

const idContactoValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  validar,
];

const asignarContactoDesdeClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de cliente inválido'),

  body('contacto_id')
    .notEmpty().withMessage('contacto_id es requerido')
    .isInt({ min: 1 }).withMessage('contacto_id debe ser un entero positivo'),

  body('es_principal')
    .optional().isBoolean().withMessage('es_principal debe ser booleano'),

  validar,
];

const desasignarContactoDesdeClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  param('contactoId').isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  validar,
];

module.exports = {
  validar,
  crearContactoDirectorioValidator,
  actualizarContactoDirectorioValidator,
  asignarClienteValidator,
  desasignarClienteValidator,
  idContactoValidator,
  asignarContactoDesdeClienteValidator,
  desasignarContactoDesdeClienteValidator,
};
