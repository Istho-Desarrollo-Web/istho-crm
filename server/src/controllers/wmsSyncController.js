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
const { Auditoria, WmsSyncLog } = require('../models');
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
  const ip = getClientIP(req);
  try {
    const resultado = await wmsSyncService.syncProductos(req.body);

    await Promise.all([
      Auditoria.registrar({
        tabla: 'inventario',
        registro_id: null,
        accion: 'crear',
        usuario_id: null,
        usuario_nombre: 'WMS Centhrix',
        datos_nuevos: { creados: resultado.creados, actualizados: resultado.actualizados, total: resultado.total },
        ip_address: ip,
        descripcion: `Sync WMS productos: ${resultado.creados} creados, ${resultado.actualizados} actualizados`
      }),
      WmsSyncLog.create({
        tipo: 'productos',
        nit: req.body.nit,
        estado: 'exitoso',
        detalles: { creados: resultado.creados, actualizados: resultado.actualizados, total: resultado.total },
        payload: req.body,
        ip_origen: ip,
      }).catch(() => {}),
    ]);

    return res.json({
      success: true,
      message: `Productos sincronizados: ${resultado.creados} creados, ${resultado.actualizados} actualizados`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncProductos:', { message: error.message });
    WmsSyncLog.create({
      tipo: 'productos',
      nit: req.body?.nit,
      estado: 'fallido',
      error_mensaje: error.message,
      payload: req.body,
      ip_origen: ip,
    }).catch(() => {});
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
  const ip = getClientIP(req);
  try {
    const resultado = await wmsSyncService.syncEntrada(req.body);

    await Promise.all([
      Auditoria.registrar({
        tabla: 'operaciones',
        registro_id: resultado.id || null,
        accion: 'crear',
        usuario_id: null,
        usuario_nombre: 'WMS Centhrix',
        datos_nuevos: { numero_operacion: resultado.numero_operacion, documento_origen: req.body.documento_origen, tipo_documento: req.body.tipo_documento },
        ip_address: ip,
        descripcion: `Sync WMS entrada: ${resultado.numero_operacion} (doc: ${req.body.documento_origen || 'N/A'})`
      }),
      WmsSyncLog.create({
        tipo: 'entrada',
        documento_origen: req.body.documento_origen,
        nit: req.body.nit,
        estado: 'exitoso',
        detalles: { numero_operacion: resultado.numero_operacion, total_lineas: resultado.total_lineas, total_unidades: resultado.total_unidades },
        payload: req.body,
        ip_origen: ip,
      }).catch(() => {}),
    ]);

    return res.status(201).json({
      success: true,
      message: `Entrada ${resultado.numero_operacion} creada exitosamente`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncEntrada:', { message: error.message });
    WmsSyncLog.create({
      tipo: 'entrada',
      documento_origen: req.body?.documento_origen,
      nit: req.body?.nit,
      estado: 'fallido',
      error_mensaje: error.message,
      payload: req.body,
      ip_origen: ip,
    }).catch(() => {});
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
  const ip = getClientIP(req);
  try {
    const resultado = await wmsSyncService.syncSalida(req.body);

    await Promise.all([
      Auditoria.registrar({
        tabla: 'operaciones',
        registro_id: resultado.id || null,
        accion: 'crear',
        usuario_id: null,
        usuario_nombre: 'WMS Centhrix',
        datos_nuevos: { numero_operacion: resultado.numero_operacion, numero_picking: resultado.numero_picking, sucursal_entrega: req.body.sucursal_entrega },
        ip_address: ip,
        descripcion: `Sync WMS salida: ${resultado.numero_operacion} (picking: ${resultado.numero_picking || 'N/A'})`
      }),
      WmsSyncLog.create({
        tipo: 'salida',
        documento_origen: req.body.numero_picking || req.body.documento_wms,
        nit: req.body.nit,
        estado: 'exitoso',
        detalles: { numero_operacion: resultado.numero_operacion, numero_picking: resultado.numero_picking, total_lineas: resultado.total_lineas, total_unidades: resultado.total_unidades },
        payload: req.body,
        ip_origen: ip,
      }).catch(() => {}),
    ]);

    return res.status(201).json({
      success: true,
      message: `Salida ${resultado.numero_operacion} creada exitosamente (Picking: ${resultado.numero_picking || 'N/A'})`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncSalida:', { message: error.message });
    WmsSyncLog.create({
      tipo: 'salida',
      documento_origen: req.body?.numero_picking || req.body?.documento_wms,
      nit: req.body?.nit,
      estado: 'fallido',
      error_mensaje: error.message,
      payload: req.body,
      ip_origen: ip,
    }).catch(() => {});
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
  const ip = getClientIP(req);
  try {
    const resultado = await wmsSyncService.syncKardex(req.body);

    await Promise.all([
      Auditoria.registrar({
        tabla: 'operaciones',
        registro_id: resultado.id || null,
        accion: 'crear',
        usuario_id: null,
        usuario_nombre: 'WMS Centhrix',
        datos_nuevos: { numero_operacion: resultado.numero_operacion, motivo: resultado.motivo, documento_origen: req.body.documento_origen },
        ip_address: ip,
        descripcion: `Sync WMS kardex: ${resultado.numero_operacion} (motivo: ${resultado.motivo})`
      }),
      WmsSyncLog.create({
        tipo: 'kardex',
        documento_origen: req.body.documento_origen,
        nit: req.body.nit,
        estado: 'exitoso',
        detalles: { numero_operacion: resultado.numero_operacion, motivo: resultado.motivo, total_lineas: resultado.total_lineas, total_unidades: resultado.total_unidades },
        payload: req.body,
        ip_origen: ip,
      }).catch(() => {}),
    ]);

    return res.status(201).json({
      success: true,
      message: `Kardex ${resultado.numero_operacion} creado exitosamente (Motivo: ${resultado.motivo})`,
      data: resultado,
    });
  } catch (error) {
    logger.error('[WMS Sync] Error en syncKardex:', { message: error.message });
    WmsSyncLog.create({
      tipo: 'kardex',
      documento_origen: req.body?.documento_origen,
      nit: req.body?.nit,
      estado: 'fallido',
      error_mensaje: error.message,
      payload: req.body,
      ip_origen: ip,
    }).catch(() => {});
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// ============================================================================
// SYNC BATCH (LOTE MÚLTIPLE)
// ============================================================================

/**
 * POST /api/v1/wms/sync/batch
 *
 * Procesa múltiples operaciones en un solo request.
 * Cada ítem se ejecuta de forma independiente — si uno falla, los demás continúan.
 *
 * Body: {
 *   nit: "900797309",           // NIT global (puede ser sobreescrito por ítem)
 *   entradas: [ {...}, {...} ], // Array de documentos de entrada
 *   salidas:  [ {...}, {...} ], // Array de pickings
 *   kardex:   [ {...} ],        // Array de ajustes
 *   productos: [ {...} ]        // Array de SKUs (se sincroniza como un solo lote)
 * }
 */
const syncBatch = async (req, res) => {
  const ip = getClientIP(req);
  const {
    nit: nitGlobal,
    entradas  = [],
    salidas   = [],
    kardex    = [],
    productos = [],
  } = req.body;

  // Agrupar productos por NIT para soportar múltiples clientes
  const productosPorNit = {};
  for (const prod of productos) {
    const nit = prod.nit || nitGlobal;
    if (!nit) continue;
    if (!productosPorNit[nit]) productosPorNit[nit] = [];
    productosPorNit[nit].push(prod);
  }
  const gruposProductos = Object.keys(productosPorNit);

  const total = entradas.length + salidas.length + kardex.length + gruposProductos.length;

  if (total === 0) {
    return res.status(400).json({
      success: false,
      message: 'El batch está vacío. Envía al menos un ítem en entradas, salidas, kardex o productos.',
    });
  }

  const resultados = { entradas: [], salidas: [], kardex: [], productos: [] };
  let exitosos = 0;
  let fallidos = 0;

  // ── ENTRADAS ────────────────────────────────────────────────────────────────
  for (const item of entradas) {
    const data = { ...item, nit: item.nit || nitGlobal };
    try {
      const resultado = await wmsSyncService.syncEntrada(data);
      resultados.entradas.push({
        documento: item.documento_origen || null,
        estado: 'exitoso',
        numero_operacion: resultado.numero_operacion,
        total_lineas: resultado.total_lineas,
        total_unidades: resultado.total_unidades,
      });
      exitosos++;
    } catch (error) {
      resultados.entradas.push({
        documento: item.documento_origen || null,
        estado: 'fallido',
        error: error.message,
      });
      fallidos++;
    }
  }

  // ── SALIDAS ─────────────────────────────────────────────────────────────────
  for (const item of salidas) {
    const data = { ...item, nit: item.nit || nitGlobal };
    try {
      const resultado = await wmsSyncService.syncSalida(data);
      resultados.salidas.push({
        documento: item.numero_picking || item.documento_wms || null,
        estado: 'exitoso',
        numero_operacion: resultado.numero_operacion,
        numero_picking: resultado.numero_picking,
        total_lineas: resultado.total_lineas,
        total_unidades: resultado.total_unidades,
      });
      exitosos++;
    } catch (error) {
      resultados.salidas.push({
        documento: item.numero_picking || item.documento_wms || null,
        estado: 'fallido',
        error: error.message,
      });
      fallidos++;
    }
  }

  // ── KARDEX ──────────────────────────────────────────────────────────────────
  for (const item of kardex) {
    const data = { ...item, nit: item.nit || nitGlobal };
    try {
      const resultado = await wmsSyncService.syncKardex(data);
      resultados.kardex.push({
        documento: item.documento_origen || null,
        estado: 'exitoso',
        numero_operacion: resultado.numero_operacion,
        motivo: resultado.motivo,
        total_lineas: resultado.total_lineas,
      });
      exitosos++;
    } catch (error) {
      resultados.kardex.push({
        documento: item.documento_origen || null,
        estado: 'fallido',
        error: error.message,
      });
      fallidos++;
    }
  }

  // ── PRODUCTOS (agrupados por NIT) ───────────────────────────────────────────
  for (const [nit, items] of Object.entries(productosPorNit)) {
    try {
      const resultado = await wmsSyncService.syncProductos({ nit, productos: items });
      resultados.productos.push({
        nit,
        estado: 'exitoso',
        creados: resultado.creados,
        actualizados: resultado.actualizados,
        total: resultado.total,
      });
      exitosos++;
    } catch (error) {
      resultados.productos.push({ nit, estado: 'fallido', error: error.message });
      fallidos++;
    }
  }

  // ── AUDITORÍA Y LOG ─────────────────────────────────────────────────────────
  const detallesBatch = {
    exitosos,
    fallidos,
    total,
    por_tipo: {
      entradas: entradas.length,
      salidas:  salidas.length,
      kardex:   kardex.length,
      productos_skus: productos.length,
      productos_grupos_nit: gruposProductos.length,
    },
  };

  await Promise.all([
    Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: null,
      accion: 'crear',
      usuario_id: null,
      usuario_nombre: 'WMS CenthriX',
      datos_nuevos: detallesBatch,
      ip_address: ip,
      descripcion: `Sync WMS batch: ${exitosos}/${total} operaciones exitosas`,
    }),
    WmsSyncLog.create({
      tipo: 'batch',
      nit: nitGlobal || null,
      estado: fallidos === total ? 'fallido' : 'exitoso',
      detalles: detallesBatch,
      payload: req.body,
      ip_origen: ip,
    }).catch(() => {}),
  ]);

  return res.json({
    success: true,
    message: `Batch procesado: ${exitosos}/${total} operaciones exitosas`,
    data: {
      resumen: { total, exitosos, fallidos },
      resultados,
    },
  });
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
  syncBatch,
  status,
};
