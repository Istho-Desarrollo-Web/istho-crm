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
const configuracionWmsController = require('../controllers/configuracionWmsController');
const clienteController = require('../controllers/clienteController');
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
router.get('/usuarios/:id/clientes-asignados', clienteController.getClientesAsignados);
router.post('/usuarios/:id/clientes-asignados', clienteController.addClienteAsignado);
router.delete('/usuarios/:id/clientes-asignados/:clienteId', clienteController.removeClienteAsignado);
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

// =============================================
// SESIONES ACTIVAS
// =============================================

router.get('/sesiones', adminController.listarSesionesActivas);
router.post('/sesiones/cerrar-todas', adminController.cerrarTodasSesiones);
router.post('/sesiones/:id/cerrar', adminController.cerrarSesion);

// =============================================
// SEGURIDAD
// =============================================

router.get('/seguridad', adminController.dashboardSeguridad);
router.post('/usuarios/:id/desbloquear', adminController.desbloquearUsuario);

// =============================================
// CONFIGURACIÓN WMS
// =============================================

router.get('/configuracion-wms', configuracionWmsController.listar);
router.get('/configuracion-wms/:id', configuracionWmsController.obtener);
router.post('/configuracion-wms', configuracionWmsController.crear);
router.put('/configuracion-wms/:id', configuracionWmsController.actualizar);
router.delete('/configuracion-wms/:id', configuracionWmsController.eliminar);
router.patch('/configuracion-wms/:id/toggle', configuracionWmsController.toggleActivo);

module.exports = router;
