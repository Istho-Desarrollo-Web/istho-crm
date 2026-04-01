/**
 * ISTHO CRM - Rutas de Caja Menor
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const cajaMenorController = require('../controllers/cajaMenorController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');
const {
  crearCajaMenorValidator,
  actualizarCajaMenorValidator,
  cerrarCajaMenorValidator,
  idParamValidator
} = require('../validators/cajaMenorValidator');

router.use(verificarToken);

// Rutas especiales
router.get('/stats', requierePermiso('caja_menor', 'ver'), cajaMenorController.estadisticas);
router.get('/usuarios-asignables', requierePermiso('caja_menor', 'crear'), cajaMenorController.listarUsuariosAsignables);

// CRUD
router.get('/', requierePermiso('caja_menor', 'ver'), cajaMenorController.listar);
router.get('/:id', idParamValidator, requierePermiso('caja_menor', 'ver'), cajaMenorController.obtenerPorId);
router.post('/', crearCajaMenorValidator, requierePermiso('caja_menor', 'crear'), cajaMenorController.crear);
router.put('/:id', actualizarCajaMenorValidator, requierePermiso('caja_menor', 'editar'), cajaMenorController.actualizar);
router.put('/:id/cerrar', cerrarCajaMenorValidator, requierePermiso('caja_menor', 'cerrar'), cajaMenorController.cerrar);
router.delete('/:id', idParamValidator, requierePermiso('caja_menor', 'eliminar'), cajaMenorController.eliminar);

module.exports = router;
