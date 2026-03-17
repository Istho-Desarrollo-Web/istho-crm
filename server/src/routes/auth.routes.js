/**
 * ISTHO CRM - Rutas de Autenticación
 * 
 * Endpoints para autenticación y gestión de usuarios.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Controlador
const authController = require('../controllers/authController');

// Middleware
const { verificarToken, verificarPermisoCliente } = require('../middleware/auth');
const { soloAdmin } = require('../middleware/roles');
const { uploadAvatar } = require('../config/multer');

// Validadores
const {
  loginValidator,
  registroValidator,
  cambiarPasswordValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} = require('../validators/authValidator');

// =============================================
// RUTAS PÚBLICAS (sin autenticación)
// =============================================

/**
 * @route   POST /auth/login
 * @desc    Iniciar sesión
 * @access  Público
 */
router.post('/login', loginValidator, authController.login);

/**
 * @route   POST /auth/forgot-password
 * @desc    Solicitar recuperación de contraseña
 * @access  Público
 */
router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);

/**
 * @route   POST /auth/reset-password
 * @desc    Restablecer contraseña con token
 * @access  Público
 */
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);

// =============================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =============================================

/**
 * @route   GET /auth/me
 * @desc    Obtener usuario actual
 * @access  Privado
 */
router.get('/me', verificarToken, authController.me);

/**
 * @route   PUT /auth/me
 * @desc    Actualizar perfil del usuario actual
 * @access  Privado
 */
router.put('/me', verificarToken, verificarPermisoCliente('perfil', 'editar'), authController.actualizarPerfil);

/**
 * @route   POST /auth/logout
 * @desc    Cerrar sesión
 * @access  Privado
 */
router.post('/logout', verificarToken, authController.logout);

/**
 * @route   PUT /auth/cambiar-password
 * @desc    Cambiar contraseña del usuario actual
 * @access  Privado
 */
router.put('/cambiar-password', verificarToken, verificarPermisoCliente('perfil', 'cambiar_password'), cambiarPasswordValidator, authController.cambiarPassword);

/**
 * @route   POST /auth/me/avatar
 * @desc    Subir foto de perfil
 * @access  Privado
 */
router.post('/me/avatar', verificarToken, uploadAvatar.single('avatar'), authController.subirAvatar);

/**
 * @route   DELETE /auth/me/avatar
 * @desc    Eliminar foto de perfil
 * @access  Privado
 */
router.delete('/me/avatar', verificarToken, authController.eliminarAvatar);

/**
 * @route   POST /auth/refresh
 * @desc    Refrescar token de acceso
 * @access  Privado
 */
router.post('/refresh', verificarToken, authController.refreshToken);

// =============================================
// RUTAS DE ADMINISTRACIÓN
// =============================================

/**
 * @route   POST /auth/registro
 * @desc    Registrar nuevo usuario
 * @access  Solo Admin
 */
router.post('/registro', verificarToken, soloAdmin, registroValidator, authController.registro);

module.exports = router;