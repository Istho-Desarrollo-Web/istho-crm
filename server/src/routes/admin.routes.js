/**
 * ISTHO CRM - Rutas de Administración
 *
 * CRUD de Usuarios internos, Roles y Permisos.
 * Todas las rutas requieren autenticación y rol admin.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verificarToken } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

// Todas las rutas requieren autenticación + rol admin
router.use(verificarToken);
router.use(requiereRol('admin'));

// =============================================
// USUARIOS
// =============================================

router.get('/usuarios', adminController.listarUsuarios);
router.get('/usuarios/:id', adminController.obtenerUsuario);
router.post('/usuarios', adminController.crearUsuario);
router.put('/usuarios/:id', adminController.actualizarUsuario);
router.put('/usuarios/:id/resetear-password', adminController.resetearPassword);
router.post('/usuarios/:id/reenviar-credenciales', adminController.reenviarCredenciales);
router.get('/usuarios/:id/permisos', adminController.obtenerPermisosUsuario);
router.put('/usuarios/:id/permisos', adminController.actualizarPermisosUsuario);
router.delete('/usuarios/:id', adminController.desactivarUsuario);

// =============================================
// ROLES
// =============================================

router.get('/roles', adminController.listarRoles);
router.get('/roles/:id', adminController.obtenerRol);
router.post('/roles', adminController.crearRol);
router.put('/roles/:id', adminController.actualizarRol);
router.delete('/roles/:id', adminController.eliminarRol);

// =============================================
// PERMISOS (solo lectura)
// =============================================

router.get('/permisos', adminController.listarPermisos);

module.exports = router;
