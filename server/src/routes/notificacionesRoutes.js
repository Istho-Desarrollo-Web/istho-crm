/**
 * ============================================================================
 * ISTHO CRM - Rutas de Notificaciones
 * ============================================================================
 * Endpoints para gestión de notificaciones.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

const express = require('express');
const router = express.Router();
const notificacionesController = require('../controllers/notificacionesController');
const { verificarToken } = require('../middleware/auth');

// ════════════════════════════════════════════════════════════════════════════
// Todas las rutas requieren autenticación
// ════════════════════════════════════════════════════════════════════════════

router.use(verificarToken);

// ════════════════════════════════════════════════════════════════════════════
// RUTAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/notificaciones
 * Listar notificaciones del usuario
 * Query params: page, limit, tipo, no_leidas
 */
router.get('/', notificacionesController.listar);

/**
 * GET /api/v1/notificaciones/count
 * Contar notificaciones no leídas
 */
router.get('/count', notificacionesController.contarNoLeidas);

/**
 * PUT /api/v1/notificaciones/leer-todas
 * Marcar todas como leídas
 */
router.put('/leer-todas', notificacionesController.marcarTodasLeidas);

/**
 * DELETE /api/v1/notificaciones/leidas
 * Eliminar todas las leídas
 */
router.delete('/leidas', notificacionesController.eliminarLeidas);

/**
 * PUT /api/v1/notificaciones/:id/leer
 * Marcar una como leída
 */
router.put('/:id/leer', notificacionesController.marcarLeida);

/**
 * DELETE /api/v1/notificaciones/:id
 * Eliminar una notificación
 */
router.delete('/:id', notificacionesController.eliminar);

/**
 * POST /api/v1/notificaciones
 * Crear notificación (admin)
 */
router.post('/', notificacionesController.crear);

// ════════════════════════════════════════════════════════════════════════════
// EXPORTAR
// ════════════════════════════════════════════════════════════════════════════

module.exports = router;