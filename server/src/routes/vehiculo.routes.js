/**
 * ISTHO CRM - Rutas de Vehículos
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculoController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');
const {
  crearVehiculoValidator,
  actualizarVehiculoValidator,
  idParamValidator,
} = require('../validators/vehiculoValidator');

router.use(verificarToken);

// Rutas especiales (antes de :id)
router.get('/conductores', vehiculoController.listarConductores);
router.get(
  '/alertas-vencimiento',
  requierePermiso('vehiculos', 'ver'),
  vehiculoController.alertasVencimiento
);

// CRUD
router.get('/', requierePermiso('vehiculos', 'ver'), vehiculoController.listar);
router.get(
  '/:id',
  idParamValidator,
  requierePermiso('vehiculos', 'ver'),
  vehiculoController.obtenerPorId
);
router.post(
  '/',
  crearVehiculoValidator,
  requierePermiso('vehiculos', 'crear'),
  vehiculoController.crear
);
router.put(
  '/:id',
  actualizarVehiculoValidator,
  requierePermiso('vehiculos', 'editar'),
  vehiculoController.actualizar
);
router.delete(
  '/:id',
  idParamValidator,
  requierePermiso('vehiculos', 'eliminar'),
  vehiculoController.eliminar
);

module.exports = router;
