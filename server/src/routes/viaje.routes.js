/**
 * ISTHO CRM - Rutas de Viajes
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const viajeController = require('../controllers/viajeController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');
const { crearViajeValidator, actualizarViajeValidator, idParamValidator } = require('../validators/viajeValidator');

router.use(verificarToken);

// Acciones especiales ANTES de :id genérico
router.put('/:id/completar', idParamValidator, requierePermiso('viajes', 'editar'), viajeController.completar);
router.put('/:id/anular', idParamValidator, requierePermiso('viajes', 'editar'), viajeController.anular);

// CRUD
router.get('/', requierePermiso('viajes', 'ver'), viajeController.listar);
router.get('/:id', idParamValidator, requierePermiso('viajes', 'ver'), viajeController.obtenerPorId);
router.post('/', crearViajeValidator, requierePermiso('viajes', 'crear'), viajeController.crear);
router.put('/:id', actualizarViajeValidator, requierePermiso('viajes', 'editar'), viajeController.actualizar);
router.delete('/:id', idParamValidator, requierePermiso('viajes', 'eliminar'), viajeController.eliminar);

module.exports = router;
