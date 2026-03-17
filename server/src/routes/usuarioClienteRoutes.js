/**
 * ============================================================================
 * ISTHO CRM - Rutas de Usuarios Cliente
 * ============================================================================
 * Endpoints para gestionar usuarios con acceso al portal de cliente.
 * 
 * Base: /api/clientes/:clienteId/usuarios
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 * @date Enero 2026
 */

const express = require('express');
const router = express.Router({ mergeParams: true }); // Para acceder a :clienteId
const usuarioClienteController = require('../controllers/usuarioClienteController');

// ✅ CORREGIDO: Importar con nombres correctos
const { verificarToken, checkRole } = require('../middleware/auth');

const { body, param, query, validationResult } = require('express-validator');

// ════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE DE VALIDACIÓN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Middleware para manejar errores de validación
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors.array().map(err => ({
        campo: err.path || err.param,
        mensaje: err.msg
      }))
    });
  }
  next();
};

// ════════════════════════════════════════════════════════════════════════════
// VALIDACIONES
// ════════════════════════════════════════════════════════════════════════════

const validarClienteId = [
  param('clienteId')
    .isInt({ min: 1 })
    .withMessage('ID de cliente inválido')
];

const validarUsuarioId = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de usuario inválido')
];

const validarCrearUsuario = [
  body('nombre_completo')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido')
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre debe tener entre 3 y 200 caracteres'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El email es requerido')
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('telefono')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 })
    .withMessage('El teléfono no puede exceder 20 caracteres'),
  
  body('cargo')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 })
    .withMessage('El cargo no puede exceder 100 caracteres'),
  
  body('password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  
  body('permisos_cliente')
    .optional()
    .isObject()
    .withMessage('Los permisos deben ser un objeto válido'),
  
  body('enviar_email')
    .optional()
    .isBoolean()
    .withMessage('enviar_email debe ser booleano')
];

const validarActualizarUsuario = [
  body('nombre_completo')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('El nombre debe tener entre 3 y 200 caracteres'),
  
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('telefono')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 20 }),
  
  body('cargo')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 100 }),
  
  body('permisos_cliente')
    .optional()
    .isObject()
    .withMessage('Los permisos deben ser un objeto válido'),
  
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('activo debe ser booleano')
];

const validarResetearPassword = [
  body('nueva_password')
    .optional()
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres'),
  
  body('enviar_email')
    .optional()
    .isBoolean()
    .withMessage('enviar_email debe ser booleano')
];

// ════════════════════════════════════════════════════════════════════════════
// RUTAS
// ════════════════════════════════════════════════════════════════════════════

// ✅ Todas las rutas requieren autenticación y rol admin/supervisor
router.use(verificarToken);
router.use(checkRole(['admin', 'supervisor']));

/**
 * GET /api/clientes/:clienteId/usuarios
 * Listar usuarios de un cliente
 */
router.get(
  '/',
  validarClienteId,
  validate,
  usuarioClienteController.listar
);

/**
 * POST /api/clientes/:clienteId/usuarios
 * Crear nuevo usuario para cliente
 */
router.post(
  '/',
  validarClienteId,
  validarCrearUsuario,
  validate,
  usuarioClienteController.crear
);

/**
 * GET /api/clientes/:clienteId/usuarios/:id
 * Obtener usuario específico
 */
router.get(
  '/:id',
  validarClienteId,
  validarUsuarioId,
  validate,
  usuarioClienteController.obtenerPorId
);

/**
 * PUT /api/clientes/:clienteId/usuarios/:id
 * Actualizar usuario
 */
router.put(
  '/:id',
  validarClienteId,
  validarUsuarioId,
  validarActualizarUsuario,
  validate,
  usuarioClienteController.actualizar
);

/**
 * DELETE /api/clientes/:clienteId/usuarios/:id
 * Desactivar usuario
 */
router.delete(
  '/:id',
  validarClienteId,
  validarUsuarioId,
  validate,
  usuarioClienteController.desactivar
);

/**
 * POST /api/clientes/:clienteId/usuarios/:id/reactivar
 * Reactivar usuario desactivado
 */
router.post(
  '/:id/reactivar',
  validarClienteId,
  validarUsuarioId,
  validate,
  usuarioClienteController.reactivar
);

/**
 * POST /api/clientes/:clienteId/usuarios/:id/resetear-password
 * Resetear contraseña
 */
router.post(
  '/:id/resetear-password',
  validarClienteId,
  validarUsuarioId,
  validarResetearPassword,
  validate,
  usuarioClienteController.resetearPassword
);

/**
 * POST /api/clientes/:clienteId/usuarios/:id/reenviar-invitacion
 * Reenviar email de invitación
 */
router.post(
  '/:id/reenviar-invitacion',
  validarClienteId,
  validarUsuarioId,
  validate,
  usuarioClienteController.reenviarInvitacion
);

module.exports = router;