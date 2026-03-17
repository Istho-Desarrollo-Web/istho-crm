/**
 * ISTHO CRM - Rutas de Caja Menor
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const cajaMenorController = require('../controllers/cajaMenorController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');

router.use(verificarToken);

// Rutas especiales
router.get('/stats', requierePermiso('caja_menor', 'ver'), cajaMenorController.estadisticas);

// CRUD
router.get('/', requierePermiso('caja_menor', 'ver'), cajaMenorController.listar);
router.get('/:id', requierePermiso('caja_menor', 'ver'), cajaMenorController.obtenerPorId);
router.post('/', requierePermiso('caja_menor', 'crear'), cajaMenorController.crear);
router.put('/:id', requierePermiso('caja_menor', 'editar'), cajaMenorController.actualizar);
router.put('/:id/cerrar', requierePermiso('caja_menor', 'cerrar'), cajaMenorController.cerrar);
router.delete('/:id', requierePermiso('caja_menor', 'eliminar'), cajaMenorController.eliminar);

module.exports = router;
