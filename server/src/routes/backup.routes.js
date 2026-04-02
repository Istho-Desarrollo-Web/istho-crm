/**
 * ISTHO CRM - Rutas de Backup
 *
 * - POST /registrar     → Sin JWT, con API key (llamado por GitHub Actions)
 * - GET  /historial     → JWT + admin
 * - POST /ejecutar      → JWT + admin
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { verificarToken } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

// Sin autenticación JWT — se autentica con X-Backup-Token (API key)
router.post('/registrar', backupController.registrarBackup);

// Rutas protegidas — admin only
router.get('/historial', verificarToken, requiereRol('admin'), backupController.obtenerHistorial);
router.post('/ejecutar', verificarToken, requiereRol('admin'), backupController.ejecutarBackup);

module.exports = router;
