/**
 * ISTHO CRM - Rutas de Sincronización WMS
 *
 * Autenticación por API Key (header X-WMS-API-Key).
 * Estas rutas son llamadas por el WMS, no por el frontend.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const wmsSyncController = require('../controllers/wmsSyncController');
const logger = require('../utils/logger');

// ============================================================================
// MIDDLEWARE: API Key Authentication
// ============================================================================

/**
 * Verifica que la petición incluya una API Key válida.
 * La key se configura en la variable de entorno WMS_API_KEY.
 *
 * Header requerido: X-WMS-API-Key: <api_key>
 */
const verificarApiKey = (req, res, next) => {
  const apiKey = req.headers['x-wms-api-key'];
  const expectedKey = process.env.WMS_API_KEY;

  if (!expectedKey) {
    logger.error('[WMS Auth] WMS_API_KEY no configurada en variables de entorno');
    return res.status(500).json({
      success: false,
      message: 'Configuración del servidor incompleta',
    });
  }

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      message: 'API Key requerida (header X-WMS-API-Key)',
    });
  }

  if (apiKey !== expectedKey) {
    logger.warn('[WMS Auth] API Key inválida:', { ip: req.ip });
    return res.status(403).json({
      success: false,
      message: 'API Key inválida',
    });
  }

  next();
};

// Aplicar auth a todas las rutas
router.use(verificarApiKey);

// ============================================================================
// RUTAS
// ============================================================================

// Health check
router.get('/status', wmsSyncController.status);

// Sincronizar productos
router.post('/productos', wmsSyncController.syncProductos);

// Sincronizar entrada (ingreso de mercancía)
router.post('/entradas', wmsSyncController.syncEntrada);

// Sincronizar salida (picking/despacho)
router.post('/salidas', wmsSyncController.syncSalida);

// Sincronizar kardex (ajuste de unidades en cajas existentes)
router.post('/kardex', wmsSyncController.syncKardex);

module.exports = router;
