/**
 * ISTHO CRM - Rutas de Contactos del Directorio
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');
const contactoController = require('../controllers/contactoController');
const {
  crearContactoDirectorioValidator,
  actualizarContactoDirectorioValidator,
  asignarClienteValidator,
  desasignarClienteValidator,
  idContactoValidator,
} = require('../validators/contactoValidator');

const multer = require('multer');
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

// Middleware de autenticación y permisos
router.use(verificarToken);

/**
 * GET /contactos/exportar/excel
 * Exportar contactos a Excel
 */
router.get(
  '/exportar/excel',
  requierePermiso('contactos', 'ver'),
  contactoController.exportarExcel
);

/**
 * GET /contactos/plantilla-importacion
 * Descargar plantilla Excel para importación masiva
 */
router.get(
  '/plantilla-importacion',
  requierePermiso('contactos', 'ver'),
  contactoController.descargarPlantilla
);

/**
 * POST /contactos/importar
 * Importar contactos desde Excel
 */
router.post(
  '/importar',
  requierePermiso('contactos', 'crear'),
  uploadMemory.single('archivo'),
  contactoController.importarContactos
);

/**
 * GET /contactos
 * Listar todos los contactos del directorio
 */
router.get(
  '/',
  requierePermiso('contactos', 'ver'),
  contactoController.listar
);

/**
 * POST /contactos
 * Crear un nuevo contacto en el directorio
 */
router.post(
  '/',
  requierePermiso('contactos', 'crear'),
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
  actualizarContactoDirectorioValidator,
  contactoController.actualizar
);

/**
 * PATCH /contactos/bulk
 * Activar múltiples contactos (soft-delete reverso masivo)
 */
router.patch(
  '/bulk',
  requierePermiso('contactos', 'eliminar'),
  contactoController.activarMasivo
);

/**
 * DELETE /contactos/bulk
 * Desactivar múltiples contactos (soft delete masivo)
 */
router.delete(
  '/bulk',
  requierePermiso('contactos', 'eliminar'),
  contactoController.desactivarMasivo
);

/**
 * DELETE /contactos/:id
 * Desactivar un contacto (soft delete)
 */
router.delete(
  '/:id',
  requierePermiso('contactos', 'eliminar'),
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
  desasignarClienteValidator,
  contactoController.desasignarCliente
);

module.exports = router;
