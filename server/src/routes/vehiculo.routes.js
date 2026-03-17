/**
 * ISTHO CRM - Rutas de Vehículos
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const vehiculoController = require('../controllers/vehiculoController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');

router.use(verificarToken);

// Rutas especiales (antes de :id)
router.get('/conductores', vehiculoController.listarConductores);
router.get('/alertas-vencimiento', requierePermiso('vehiculos', 'ver'), vehiculoController.alertasVencimiento);

// CRUD
router.get('/', requierePermiso('vehiculos', 'ver'), vehiculoController.listar);
router.get('/:id', requierePermiso('vehiculos', 'ver'), vehiculoController.obtenerPorId);
router.post('/', requierePermiso('vehiculos', 'crear'), vehiculoController.crear);
router.put('/:id', requierePermiso('vehiculos', 'editar'), vehiculoController.actualizar);
router.delete('/:id', requierePermiso('vehiculos', 'eliminar'), vehiculoController.eliminar);

module.exports = router;
