'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/forklifDriverKardexController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');

router.use(verificarToken);

// Búsqueda de estiba por código (lectura de código QR / barcode)
router.get('/search-pallet', requierePermiso('inventario', 'ver'), ctrl.searchPallet);

// Motivos de ajuste disponibles en el WMS
router.get('/motives', requierePermiso('inventario', 'ver'), ctrl.getMotives);

// Historial de ajustes de una estiba específica
router.get('/history', requierePermiso('inventario', 'ver'), ctrl.getHistory);

// Confirmar ajuste (Carga o Descarga)
router.post('/', requierePermiso('inventario', 'editar'), ctrl.submitAdjustment);

module.exports = router;
