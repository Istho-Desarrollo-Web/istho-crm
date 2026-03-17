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

router.use(verificarToken);

// Rutas especiales
router.get('/conceptos', movimientoController.listarConceptos);
router.put('/aprobar-masivo', requierePermiso('movimientos', 'aprobar'), movimientoController.aprobarMasivo);

// CRUD
router.get('/', requierePermiso('movimientos', 'ver'), movimientoController.listar);
router.get('/:id', requierePermiso('movimientos', 'ver'), movimientoController.obtenerPorId);
router.post('/', requierePermiso('movimientos', 'crear'), uploadSoporte.single('soporte'), movimientoController.crear);
router.put('/:id', requierePermiso('movimientos', 'editar'), uploadSoporte.single('soporte'), movimientoController.actualizar);
router.put('/:id/aprobar', requierePermiso('movimientos', 'aprobar'), movimientoController.aprobar);
router.delete('/:id', requierePermiso('movimientos', 'eliminar'), movimientoController.eliminar);

module.exports = router;
