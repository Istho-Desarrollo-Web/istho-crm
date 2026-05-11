/**
 * ISTHO CRM - Rutas de Email Manual
 *
 * @author Coordinación TI ISTHO
 */

const express = require('express');
const router = express.Router();

const emailController = require('../controllers/emailController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');

router.use(verificarToken);

router.post('/enviar', requierePermiso('notificaciones', 'enviar'), emailController.enviarManual);

module.exports = router;
