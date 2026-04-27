/**
 * ISTHO CRM - Rutas Dashboard WMS CenthriX
 *
 * Endpoints para monitoreo de sincronizaciones WMS.
 * Autenticación JWT + permiso configuracion_wms.ver (solo admins).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const wmsDashboardController = require('../controllers/wmsDashboardController');
const { verificarToken } = require('../middleware/auth');
const { requierePermiso } = require('../middleware/roles');

router.use(verificarToken);

router.get(
  '/status',
  requierePermiso('configuracion_wms', 'ver'),
  wmsDashboardController.getStatus
);
router.get(
  '/estadisticas',
  requierePermiso('configuracion_wms', 'ver'),
  wmsDashboardController.getEstadisticas
);
router.get(
  '/historial',
  requierePermiso('configuracion_wms', 'ver'),
  wmsDashboardController.getHistorial
);
router.post(
  '/reejecutar',
  requierePermiso('configuracion_wms', 'ver'),
  wmsDashboardController.reejecutarUltimoSync
);

module.exports = router;
