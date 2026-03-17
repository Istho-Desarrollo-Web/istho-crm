/**
 * ISTHO CRM - Rutas de Auditoría de Acciones
 *
 * Consulta del log de auditoría del sistema.
 * Solo accesible por admin.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const auditoriaController = require('../controllers/auditoriaController');
const { verificarToken } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

router.use(verificarToken);
router.use(requiereRol('admin'));

router.get('/', auditoriaController.listar);
router.get('/stats', auditoriaController.stats);
router.get('/tablas', auditoriaController.tablas);

module.exports = router;
