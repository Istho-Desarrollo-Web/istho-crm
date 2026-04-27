/**
 * ISTHO CRM - Rutas de Movimientos de Caja Menor
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const movimientoController = require('../controllers/movimientoCajaMenorController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');
const { uploadSoporte } = require('../config/multer');
const {
  crearMovimientoValidator,
  actualizarMovimientoValidator,
  aprobarMovimientoValidator,
  idParamValidator,
} = require('../validators/movimientoValidator');

router.use(verificarToken);

// Rutas especiales
router.get('/conceptos', movimientoController.listarConceptos);
router.put(
  '/aprobar-masivo',
  requierePermiso('movimientos', 'aprobar'),
  movimientoController.aprobarMasivo
);

// CRUD
router.get('/', requierePermiso('movimientos', 'ver'), movimientoController.listar);
router.get(
  '/:id',
  idParamValidator,
  requierePermiso('movimientos', 'ver'),
  movimientoController.obtenerPorId
);
router.post(
  '/',
  uploadSoporte.single('soporte'),
  crearMovimientoValidator,
  requierePermiso('movimientos', 'crear'),
  movimientoController.crear
);
router.put(
  '/:id',
  uploadSoporte.single('soporte'),
  actualizarMovimientoValidator,
  requierePermiso('movimientos', 'editar'),
  movimientoController.actualizar
);
router.put(
  '/:id/aprobar',
  aprobarMovimientoValidator,
  requierePermiso('movimientos', 'aprobar'),
  movimientoController.aprobar
);
router.delete(
  '/:id',
  idParamValidator,
  requierePermiso('movimientos', 'eliminar'),
  movimientoController.eliminar
);

module.exports = router;
