/**
 * ISTHO CRM - Rutas de Viajes
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');

router.use(verificarToken);

// Acciones especiales ANTES de :id genérico
router.put('/:id/completar', requierePermiso('viajes', 'editar'), viajeController.completar);
router.put('/:id/anular', requierePermiso('viajes', 'editar'), viajeController.anular);

// CRUD
router.get('/', requierePermiso('viajes', 'ver'), viajeController.listar);
router.get('/:id', requierePermiso('viajes', 'ver'), viajeController.obtenerPorId);
router.post('/', requierePermiso('viajes', 'crear'), viajeController.crear);
router.put('/:id', requierePermiso('viajes', 'editar'), viajeController.actualizar);
router.delete('/:id', requierePermiso('viajes', 'eliminar'), viajeController.eliminar);

module.exports = router;
