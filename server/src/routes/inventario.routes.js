/**
 * ISTHO CRM - Rutas de Inventario
 * 
 * Define los endpoints para el módulo de inventario.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const express = require('express');
const router = express.Router();

// Controller
const inventarioController = require('../controllers/inventarioController');

// Middlewares
const { verificarToken, filtrarPorCliente } = require('../middleware/auth');
const { requiereRol } = require('../middleware/roles');

// Validators
const {
  crearInventarioValidator,
  actualizarInventarioValidator,
  idParamValidator,
  clienteIdParamValidator,
  listarInventarioValidator,
  ajustarCantidadValidator
} = require('../validators/inventarioValidator');

// ═══════════════════════════════════════════════════════════════════════════
// RUTAS PÚBLICAS (requieren solo autenticación)
// ═══════════════════════════════════════════════════════════════════════════

// Aplicar autenticación y filtro por cliente a todas las rutas
router.use(verificarToken);
router.use(filtrarPorCliente);

// ═══════════════════════════════════════════════════════════════════════════
// CONSULTAS Y LISTADOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/v1/inventario
 * Listar inventario con paginación y filtros
 */
router.get('/', 
  listarInventarioValidator,
  inventarioController.listar
);

/**
 * GET /api/v1/inventario/stats
 * Obtener estadísticas/KPIs de inventario
 */
router.get('/stats', 
  inventarioController.estadisticas
);

/**
 * GET /api/v1/inventario/alertas
 * Obtener alertas de stock bajo, agotados y vencimientos
 */
router.get('/alertas', 
  inventarioController.alertas
);

/**
 * GET /api/v1/inventario/cliente/:clienteId
 * Obtener inventario de un cliente específico
 */
router.get('/cliente/:clienteId', 
  clienteIdParamValidator,
  inventarioController.obtenerPorCliente
);

/**
 * GET /api/v1/inventario/:id
 * Obtener un item de inventario por ID
 */
router.get('/:id', 
  idParamValidator,
  inventarioController.obtenerPorId
);

/**
 * GET /api/v1/inventario/:id/movimientos
 * Obtener historial de movimientos de un producto
 */
router.get('/:id/movimientos', 
  idParamValidator,
  inventarioController.obtenerMovimientos
);

/**
 * GET /api/v1/inventario/:id/estadisticas
 * Obtener estadísticas de movimientos para gráficos
 */
router.get('/:id/estadisticas', 
  idParamValidator,
  inventarioController.obtenerEstadisticasProducto
);

/**
 * GET /api/v1/inventario/:id/cajas
 * Obtener cajas/detalles de operaciones asociadas al producto
 */
router.get('/:id/cajas',
  idParamValidator,
  inventarioController.obtenerCajas
);

// ═══════════════════════════════════════════════════════════════════════════
// OPERACIONES DE ESCRITURA (requieren rol operador+)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /api/v1/inventario
 * Crear un nuevo item de inventario
 */
router.post('/', 
  requiereRol('admin', 'supervisor', 'operador'),
  crearInventarioValidator,
  inventarioController.crear
);

/**
 * PUT /api/v1/inventario/:id
 * Actualizar un item de inventario
 */
router.put('/:id', 
  requiereRol('admin', 'supervisor', 'operador'),
  actualizarInventarioValidator,
  inventarioController.actualizar
);

/**
 * POST /api/v1/inventario/:id/ajustar
 * Ajustar cantidad (entrada, salida, ajuste)
 */
router.post('/:id/ajustar', 
  requiereRol('admin', 'supervisor', 'operador'),
  ajustarCantidadValidator,
  inventarioController.ajustarCantidad
);

/**
 * POST /api/v1/inventario/:id/movimientos
 * Alias para ajustar (compatibilidad con frontend)
 */
router.post('/:id/movimientos', 
  requiereRol('admin', 'supervisor', 'operador'),
  ajustarCantidadValidator,
  inventarioController.ajustarCantidad
);

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE ALERTAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PUT /api/v1/inventario/alertas/:alertaId/atender
 * Marcar una alerta como atendida
 */
router.put('/alertas/:alertaId/atender', 
  requiereRol('admin', 'supervisor', 'operador'),
  inventarioController.atenderAlerta
);

/**
 * DELETE /api/v1/inventario/alertas/:alertaId
 * Descartar una alerta
 */
router.delete('/alertas/:alertaId', 
  requiereRol('admin', 'supervisor'),
  inventarioController.descartarAlerta
);

// ═══════════════════════════════════════════════════════════════════════════
// ELIMINACIÓN (requiere rol supervisor+)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * DELETE /api/v1/inventario/:id
 * Eliminar un item de inventario
 */
router.delete('/:id', 
  requiereRol('admin', 'supervisor'),
  idParamValidator,
  inventarioController.eliminar
);

module.exports = router;