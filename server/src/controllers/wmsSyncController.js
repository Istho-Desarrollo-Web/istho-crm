/**
 * ISTHO CRM - Controlador de Sincronización WMS
 *
 * Endpoints para recibir datos del WMS Centhrix.
 * Autenticación por API Key (header X-WMS-API-Key).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const wmsSyncService = require('../services/wmsSyncService');
const { Auditoria } = require('../models');
const { getClientIP } = require('../utils/helpers');
const logger = require('../utils/logger');

// ============================================================================
// SYNC PRODUCTOS
// ============================================================================

/**
 * POST /api/v1/wms/sync/productos
 *
 * Body: {
 *   nit: "900797309",
 *   productos: [
 *     { codigo: "656355", descripcion: "PLACA ST 12.7 1220 2440 BR (86)" },
 *     ...
 *   ]
 * }
 */
const syncProductos = async (req, res) => {
  try {
    const resultado = await wmsSyncService.syncProductos(req.body);

    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: null,
      accion: 'crear',
      usuario_id: null,
      usuario_nombre: 'WMS Centhrix',
      datos_nuevos: { creados: resultado.creados, actualizados: resultado.actualizados, total: resultado.total },
      ip_address: getClientIP(req),
      descripcion: `Sync WMS productos: ${resultado.creados} creados, ${resultado.actualizados} actualizados`
    });

    return res.json({
      success: true,
      message: `Productos sincronizados: ${resultado.creados} creados, ${resultado.actualizados} actualizados`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncProductos:', { message: error.message });
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// SYNC ENTRADA
// ============================================================================

/**
 * POST /api/v1/wms/sync/entradas
 *
 * Body: {
 *   nit: "900797309",
 *   documento_origen: "ENT-2026-0001",
 *   fecha_ingreso: "2026-03-10",
 *   tipo_documento: "Factura",
 *   detalles: [
 *     { producto: "656355", descripcion: "PLACA ST...", cantidad: 86, unidad_medida: "UND", documento_asociado: "FAC-001" },
 *     ...
 *   ]
 * }
 */
const syncEntrada = async (req, res) => {
  try {
    const resultado = await wmsSyncService.syncEntrada(req.body);

    await Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: resultado.id || null,
      accion: 'crear',
      usuario_id: null,
      usuario_nombre: 'WMS Centhrix',
      datos_nuevos: { numero_operacion: resultado.numero_operacion, documento_origen: req.body.documento_origen, tipo_documento: req.body.tipo_documento },
      ip_address: getClientIP(req),
      descripcion: `Sync WMS entrada: ${resultado.numero_operacion} (doc: ${req.body.documento_origen || 'N/A'})`
    });

    return res.status(201).json({
      success: true,
      message: `Entrada ${resultado.numero_operacion} creada exitosamente`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncEntrada:', { message: error.message });
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// SYNC SALIDA (PICKING)
// ============================================================================

/**
 * POST /api/v1/wms/sync/salidas
 *
 * Body: {
 *   nit: "900797309",
 *   numero_picking: "34921",
 *   sucursal_entrega: "Sucursal Centro",
 *   ciudad_destino: "Medellín",
 *   detalles: [
 *     {
 *       producto: "656355",
 *       descripcion: "PLACA ST 12.7 1220 2440 BR (86)",
 *       caja: 198697,
 *       cantidad: 86,
 *       pedido: "KDC9059",
 *       lote_externo: "15/02/2026",
 *       lote_interno: "161675",
 *       fecha_vencimiento: "2036-02-19",
 *       peso: null
 *     },
 *     ...
 *   ]
 * }
 */
const syncSalida = async (req, res) => {
  try {
    const resultado = await wmsSyncService.syncSalida(req.body);

    await Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: resultado.id || null,
      accion: 'crear',
      usuario_id: null,
      usuario_nombre: 'WMS Centhrix',
      datos_nuevos: { numero_operacion: resultado.numero_operacion, numero_picking: resultado.numero_picking, sucursal_entrega: req.body.sucursal_entrega },
      ip_address: getClientIP(req),
      descripcion: `Sync WMS salida: ${resultado.numero_operacion} (picking: ${resultado.numero_picking || 'N/A'})`
    });

    return res.status(201).json({
      success: true,
      message: `Salida ${resultado.numero_operacion} creada exitosamente (Picking: ${resultado.numero_picking || 'N/A'})`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncSalida:', { message: error.message });
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// SYNC KARDEX (AJUSTE DE UNIDADES)
// ============================================================================

/**
 * POST /api/v1/wms/sync/kardex
 *
 * Body: {
 *   nit: "900797309",
 *   documento_origen: "KDX-2026-001",  // opcional
 *   fecha_ingreso: "2026-03-14",
 *   motivo: "Reconteo físico",
 *   detalles: [
 *     {
 *       producto: "656355",
 *       descripcion: "PLACA ST 12.7...",
 *       caja: 198697,
 *       cantidad: 10,         // positivo=suma, negativo=resta
 *       lote: "161675",
 *       lote_externo: "15/02/2026"
 *     },
 *     ...
 *   ]
 * }
 */
const syncKardex = async (req, res) => {
  try {
    const resultado = await wmsSyncService.syncKardex(req.body);

    await Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: resultado.id || null,
      accion: 'crear',
      usuario_id: null,
      usuario_nombre: 'WMS Centhrix',
      datos_nuevos: { numero_operacion: resultado.numero_operacion, motivo: resultado.motivo, documento_origen: req.body.documento_origen },
      ip_address: getClientIP(req),
      descripcion: `Sync WMS kardex: ${resultado.numero_operacion} (motivo: ${resultado.motivo})`
    });

    return res.status(201).json({
      success: true,
      message: `Kardex ${resultado.numero_operacion} creado exitosamente (Motivo: ${resultado.motivo})`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncKardex:', { message: error.message });
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// STATUS / HEALTH CHECK
// ============================================================================

/**
 * GET /api/v1/wms/sync/status
 * Verificar que el endpoint de sincronización está activo
 */
const status = async (req, res) => {
  return res.json({
    success: true,
    message: 'WMS Sync API activa',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
};

module.exports = {
  syncProductos,
  syncEntrada,
  syncSalida,
  syncKardex,
  status,
};
