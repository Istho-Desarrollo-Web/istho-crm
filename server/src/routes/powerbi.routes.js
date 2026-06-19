'use strict';

const express = require('express');
const router = express.Router();
const powerbiAuth = require('../middleware/powerbiAuth');
const powerbiController = require('../controllers/powerbiController');

// Todas las rutas Power BI usan autenticación por API key (Bearer token)
router.use(powerbiAuth);

router.get('/kpis', powerbiController.kpis);
router.get('/operaciones', powerbiController.operaciones);
router.get('/inventario', powerbiController.inventario);
router.get('/clientes', powerbiController.clientes);
router.get('/viajes', powerbiController.viajes);

module.exports = router;
