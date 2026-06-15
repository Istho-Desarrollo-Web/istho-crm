/**
 * ISTHO CRM - Rutas de Clientes
 *
 * Endpoints para gestión de clientes y contactos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Controlador
const clienteController = require('../controllers/clienteController');
const usuarioClienteRoutes = require('./usuarioClienteRoutes');

// Middleware
const { verificarToken } = require('../middleware/auth');
const { requiereRolMinimo, noClientes } = require('../middleware/roles');

// Upload
const { uploadLogo } = require('../config/multer');
const comprimir = require('../middleware/comprimir');

// Validadores
const {
  crearClienteValidator,
  actualizarClienteValidator,
  idParamValidator,
  listarClientesValidator,
} = require('../validators/clienteValidator');

const {
  asignarContactoDesdeClienteValidator,
  desasignarContactoDesdeClienteValidator,
} = require('../validators/contactoValidator');

// =============================================
// Todas las rutas requieren autenticación
// =============================================
router.use(verificarToken);

// =============================================
// RUTAS DE CLIENTES
// =============================================

/**
 * @route   GET /clientes
 * @desc    Listar clientes con paginación y filtros
 * @access  Privado (todos los roles autenticados)
 * @query   page, limit, search, estado, tipo_cliente, ciudad, sort, order
 */
router.get('/', listarClientesValidator, clienteController.listar);
// =============================================
// RUTAS DE USUARIOS CLIENTE
// =============================================
router.use('/:clienteId/usuarios', usuarioClienteRoutes);
/**
 * @route   GET /clientes/stats
 * @desc    Obtener estadísticas de clientes
 * @access  Privado (supervisor o superior)
 */
router.get('/stats', requiereRolMinimo('operador'), clienteController.estadisticas);

/**
 * @route   GET /clientes/plantilla-importacion
 * @desc    Descargar plantilla Excel para importación de clientes
 * @access  Privado (operador o superior)
 */
router.get(
  '/plantilla-importacion',
  noClientes,
  requiereRolMinimo('operador'),
  clienteController.descargarPlantillaImportacion
);

/**
 * @route   GET /clientes/:id
 * @desc    Obtener un cliente por ID
 * @access  Privado
 */
router.get('/:id', idParamValidator, clienteController.obtenerPorId);

/**
 * @route   POST /clientes
 * @desc    Crear un nuevo cliente
 * @access  Privado (supervisor o superior)
 */
router.post(
  '/',
  noClientes,
  requiereRolMinimo('operador'),
  crearClienteValidator,
  clienteController.crear
);

/**
 * @route   POST /clientes/importar
 * @desc    Importar clientes desde Excel (.xlsx)
 * @access  Privado (supervisor o superior)
 */
const multer = require('multer');
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});
router.post(
  '/importar',
  noClientes,
  requiereRolMinimo('supervisor'),
  uploadMemory.single('archivo'),
  clienteController.importarClientes
);

/**
 * @route   PUT /clientes/:id
 * @desc    Actualizar un cliente
 * @access  Privado (supervisor o superior)
 */
router.put(
  '/:id',
  noClientes,
  requiereRolMinimo('operador'),
  actualizarClienteValidator,
  clienteController.actualizar
);

/**
 * @route   DELETE /clientes/:id
 * @desc    Eliminar un cliente (soft delete)
 * @access  Privado (admin o supervisor)
 */
router.delete(
  '/:id',
  requiereRolMinimo('supervisor'),
  idParamValidator,
  clienteController.eliminar
);

/**
 * @route   POST /clientes/:id/logo
 * @desc    Subir logo del cliente
 * @access  Privado (operador o superior)
 */
router.post(
  '/:id/logo',
  noClientes,
  requiereRolMinimo('operador'),
  uploadLogo.single('logo'),
  comprimir({ maxWidthPx: 800 }),
  clienteController.subirLogo
);

/**
 * @route   GET /clientes/:id/historial
 * @desc    Obtener historial de operaciones del cliente
 * @access  Privado
 */
router.get('/:id/historial', idParamValidator, clienteController.historial);

// ── CONTACTOS (pivot M:N) ─────────────────────────────────────────────────────

// GET /clientes/:id/contactos — Listar contactos asignados (todos los roles con clientes.ver)
router.get('/:id/contactos', idParamValidator, clienteController.listarContactos);

// POST /clientes/:id/contactos/asignar — Asignar contacto existente (solo admin)
router.post(
  '/:id/contactos/asignar',
  noClientes,
  requiereRolMinimo('admin'),
  asignarContactoDesdeClienteValidator,
  clienteController.asignarContactoDesdeCliente
);

// DELETE /clientes/:id/contactos/:contactoId — Desasignar contacto (solo admin)
router.delete(
  '/:id/contactos/:contactoId',
  noClientes,
  requiereRolMinimo('admin'),
  desasignarContactoDesdeClienteValidator,
  clienteController.desasignarContactoDesdeCliente
);

// ─── RESPONSABLES ────────────────────────────────────────────────────────────

/**
 * @route   GET /clientes/:id/responsables
 * @desc    Listar responsables de un cliente
 * @access  Privado (supervisor o superior)
 */
router.get('/:id/responsables', requiereRolMinimo('supervisor'), clienteController.getResponsables);

/**
 * @route   POST /clientes/:id/responsables
 * @desc    Asignar responsable a un cliente
 * @access  Privado (admin)
 */
router.post('/:id/responsables', requiereRolMinimo('admin'), clienteController.addResponsable);

/**
 * @route   DELETE /clientes/:id/responsables/:uid
 * @desc    Remover responsable de un cliente
 * @access  Privado (admin)
 */
router.delete('/:id/responsables/:uid', requiereRolMinimo('admin'), clienteController.removeResponsable);

module.exports = router;
