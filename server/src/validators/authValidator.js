/**
 * ISTHO CRM - Validadores de Autenticación
 * 
 * Esquemas de validación para endpoints de auth.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { body, validationResult } = require('express-validator');
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

/**
 * Validación para login
 */
const loginValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('El usuario o email es requerido')
    .isLength({ min: 3 }).withMessage('Debe tener al menos 3 caracteres'),
  
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  
  validar
];

/**
 * Validación para registro de usuario
 */
const registroValidator = [
  body('username')
    .trim()
    .notEmpty().withMessage('El username es requerido')
    .isLength({ min: 3, max: 50 }).withMessage('El username debe tener entre 3 y 50 caracteres')
    .isAlphanumeric().withMessage('El username solo puede contener letras y números'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
  
  body('nombre_completo')
    .trim()
    .notEmpty().withMessage('El nombre completo es requerido')
    .isLength({ min: 3, max: 150 }).withMessage('El nombre debe tener entre 3 y 150 caracteres'),
  
  body('rol')
    .optional()
    .isIn(['admin', 'supervisor', 'operador', 'cliente']).withMessage('Rol no válido'),
  
  validar
];

/**
 * Validación para cambio de contraseña
 */
const cambiarPasswordValidator = [
  body('password_actual')
    .notEmpty().withMessage('La contraseña actual es requerida'),
  
  body('password_nuevo')
    .notEmpty().withMessage('La nueva contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
  
  body('confirmar_password')
    .notEmpty().withMessage('Debe confirmar la nueva contraseña')
    .custom((value, { req }) => {
      if (value !== req.body.password_nuevo) {
        throw new Error('Las contraseñas no coinciden');
      }
      return true;
    }),
  
  validar
];

/**
 * Validación para solicitar recuperación de contraseña
 */
const forgotPasswordValidator = [
  body('email')
    .trim()
    .notEmpty().withMessage('El email es requerido')
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  validar
];

/**
 * Validación para resetear contraseña
 */
const resetPasswordValidator = [
  body('token')
    .notEmpty().withMessage('El token es requerido'),
  
  body('password')
    .notEmpty().withMessage('La nueva contraseña es requerida')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage(
      'La contraseña debe contener al menos una mayúscula, una minúscula y un número'
    ),
  
  validar
];

module.exports = {
  validar,
  loginValidator,
  registroValidator,
  cambiarPasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator
};