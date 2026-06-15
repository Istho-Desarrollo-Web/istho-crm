/**
 * ISTHO CRM - Rutas de Contactos del Directorio
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

const { verifyToken, cargarCachePermisos, requierePermiso, requiereRolMinimo } = require('../middleware/auth');
const contactoController = require('../controllers/contactoController');
const {
  crearContactoDirectorioValidator,
  actualizarContactoDirectorioValidator,
  asignarClienteValidator,
  desasignarClienteValidator,
  idContactoValidator,
} = require('../validators/contactoValidator');

// Middleware de autenticación y permisos
router.use(verifyToken, cargarCachePermisos);

/**
 * GET /contactos
 * Listar todos los contactos del directorio
 */
router.get(
  '/',
  requierePermiso('contactos', 'ver'),
  requiereRolMinimo('admin'),
  contactoController.listar
);

/**
 * POST /contactos
 * Crear un nuevo contacto en el directorio
 */
router.post(
  '/',
  requierePermiso('contactos', 'crear'),
  requiereRolMinimo('admin'),
  crearContactoDirectorioValidator,
  contactoController.crear
);

/**
 * GET /contactos/:id
 * Obtener un contacto por ID
 */
router.get(
  '/:id',
  requierePermiso('contactos', 'ver'),
  requiereRolMinimo('admin'),
  idContactoValidator,
  contactoController.obtenerPorId
);

/**
 * PUT /contactos/:id
 * Actualizar un contacto existente
 */
router.put(
  '/:id',
  requierePermiso('contactos', 'editar'),
  requiereRolMinimo('admin'),
  actualizarContactoDirectorioValidator,
  contactoController.actualizar
);

/**
 * DELETE /contactos/:id
 * Desactivar un contacto (soft delete)
 */
router.delete(
  '/:id',
  requierePermiso('contactos', 'eliminar'),
  requiereRolMinimo('admin'),
  idContactoValidator,
  contactoController.desactivar
);

/**
 * POST /contactos/:id/clientes
 * Asignar un cliente a un contacto
 */
router.post(
  '/:id/clientes',
  requierePermiso('contactos', 'editar'),
  requiereRolMinimo('admin'),
  asignarClienteValidator,
  contactoController.asignarCliente
);

/**
 * DELETE /contactos/:id/clientes/:clienteId
 * Desasignar un cliente de un contacto
 */
router.delete(
  '/:id/clientes/:clienteId',
  requierePermiso('contactos', 'editar'),
  requiereRolMinimo('admin'),
  desasignarClienteValidator,
  contactoController.desasignarCliente
);

module.exports = router;
