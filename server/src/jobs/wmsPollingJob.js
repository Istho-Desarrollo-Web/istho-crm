'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const wmsApiService = require('../services/wmsApiService');
const wmsOrderMapper = require('../services/wmsOrderMapper');
const { syncEntrada, syncSalida, syncKardex } = require('../services/wmsSyncService');

// Importación diferida para evitar circular en startup
const getModels = () => require('../models');

// ─── Kardex: descubrimiento de wms_pallet_id ─────────────────────────────────
async function _descubrirPalletIds() {
  const { CajaInventario } = getModels();

  const cajas = await CajaInventario.findAll({
    where: {
      wms_pallet_id: null,
      numero_caja: { [Op.not]: null },
    },
    limit: 10,
  });

  if (cajas.length === 0) return;
  logger.debug(`[WmsPolling] Descubriendo wms_pallet_id para ${cajas.length} cajas...`);

  for (const caja of cajas) {
    try {
      const pallet = await wmsApiService.searchPalletKardex(String(caja.numero_caja));
      const palletId = pallet?.id ?? pallet?.palletId;
      if (palletId) {
        await caja.update({ wms_pallet_id: palletId });
        logger.info(`[WmsPolling] wms_pallet_id guardado: caja ${caja.numero_caja} → ${palletId}`);
      }
    } catch {
      // El WMS no conoce esta caja — omitir silenciosamente
    }
  }
}

// ─── Kardex: polling de historial de ajustes ──────────────────────────────────
async function _pollKardexHistorial() {
  const { CajaInventario, Inventario, Cliente, WmsSyncLog } = getModels();

  const cajas = await CajaInventario.findAll({
    where: { wms_pallet_id: { [Op.not]: null } },
    include: [
      {
        model: Inventario,
        as: 'inventario',
        include: [{ model: Cliente, as: 'cliente' }],
      },
    ],
  });

  if (cajas.length === 0) return;
  logger.debug(`[WmsPolling] Revisando kardex de ${cajas.length} cajas...`);

  // Deduplicación dentro del ciclo: evita procesar el mismo ajuste
  // si varias cajas CRM apuntan al mismo palletCode WMS
  const procesadasEnCiclo = new Set();

  for (const caja of cajas) {
    try {
      const items = await wmsApiService.getKardexHistory(caja.wms_pallet_id, {
        limit: 50,
        page: 1,
      });
      const historial = Array.isArray(items) ? items : [];

      // Primera vez: sólo marcar timestamp, no procesar histórico
      if (!caja.wms_kardex_ultima_sync) {
        const masReciente = historial[0];
        await caja.update({
          wms_kardex_ultima_sync: masReciente
            ? new Date(masReciente.createdAt)
            : new Date(),
        });
        continue;
      }

      const ultimaSync = new Date(caja.wms_kardex_ultima_sync);
      const nuevos = historial.filter((e) => new Date(e.createdAt) > ultimaSync);
      if (nuevos.length === 0) continue;

      const nit = caja.inventario?.cliente?.nit;
      if (!nit) {
        logger.warn(`[WmsPolling] Kardex: sin NIT para caja ${caja.numero_caja}, omitiendo`);
        continue;
      }

      for (const entry of nuevos) {
        const cantidad = entry.operation === 'Carga' ? entry.quantity : -entry.quantity;
        const palletCode = entry.palletCode || caja.numero_caja;

        // Clave única del ajuste: palletCode + timestamp + operación + cantidad
        const entryKey = `${palletCode}::${entry.createdAt}::${entry.operation}::${entry.quantity}`.substring(0, 150);

        // Deduplicación dentro del ciclo (múltiples cajas CRM → mismo pallet WMS)
        if (procesadasEnCiclo.has(entryKey)) {
          logger.debug(`[WmsPolling] Kardex duplicado (ciclo): ${entryKey}`);
          continue;
        }

        // Deduplicación entre ciclos (ciclos anteriores ya lo procesaron)
        const yaExiste = await WmsSyncLog.findOne({
          where: { tipo: 'polling_kardex', estado: 'exitoso', documento_origen: entryKey },
        });
        if (yaExiste) {
          procesadasEnCiclo.add(entryKey);
          continue;
        }

        procesadasEnCiclo.add(entryKey);

        try {
          const resultado = await syncKardex({
            nit,
            motivo: entry.motive?.name,
            detalles: [
              {
                producto: entry.product?.sku || caja.inventario?.sku,
                descripcion: caja.inventario?.descripcion || caja.inventario?.producto,
                caja: palletCode,
                cantidad,
                lote: caja.lote || null,
                unidad_medida: caja.inventario?.unidad_medida || 'UND',
              },
            ],
          });
          WmsSyncLog.create({
            tipo: 'polling_kardex',
            documento_origen: entryKey,
            nit,
            estado: 'exitoso',
            detalles: {
              operacion_id: resultado?.operacion_id,
              numero_operacion: resultado?.numero_operacion,
              motivo: entry.motive?.name,
              operacion_wms: entry.operation,
              cantidad: entry.quantity,
              pallet_code: palletCode,
            },
          }).catch(() => {});
          logger.info(
            `[WmsPolling] Kardex sincronizado: caja=${palletCode}, op=${entry.operation}, qty=${entry.quantity}, motivo=${entry.motive?.name}`
          );
        } catch (entryErr) {
          WmsSyncLog.create({
            tipo: 'polling_kardex',
            documento_origen: entryKey,
            nit,
            estado: 'fallido',
            error_mensaje: entryErr.message,
            detalles: { motivo: entry.motive?.name, operacion_wms: entry.operation, pallet_code: palletCode },
          }).catch(() => {});
          logger.error(`[WmsPolling] Error kardex entrada ${palletCode}: ${entryErr.message}`);
        }
      }

      // Actualizar timestamp al más reciente procesado
      const masRecienteNuevo = nuevos.reduce((max, e) =>
        new Date(e.createdAt) > new Date(max.createdAt) ? e : max
      );
      await caja.update({ wms_kardex_ultima_sync: new Date(masRecienteNuevo.createdAt) });
    } catch (err) {
      logger.error(`[WmsPolling] Error kardex caja ${caja.numero_caja}: ${err.message}`);
    }
  }
}

// ─── Estado interno ───────────────────────────────────────────────────────────
let _pollingJob = null;
let _ejecutando = false;

// ─── Lógica principal ─────────────────────────────────────────────────────────
async function _ejecutarPoll() {
  if (_ejecutando) {
    logger.debug('[WmsPolling] Tick ignorado — ejecución anterior aún en curso');
    return;
  }
  _ejecutando = true;

  const { Operacion, WmsSyncLog } = getModels();
  let procesadas = 0;
  let errores = 0;

  try {
    logger.info('[WmsPolling] Iniciando ciclo de polling...');

    let ordenes;
    try {
      const resultado = await wmsApiService.getOrdenes({ limit: 50, page: 1 });
      // getOrdenes puede retornar { data: [], meta: {} } o []
      ordenes = Array.isArray(resultado) ? resultado : (resultado?.data ?? []);
    } catch (err) {
      logger.error('[WmsPolling] Error al consultar órdenes WMS:', err.message);
      await WmsSyncLog.create({
        tipo: 'polling_entrada',
        estado: 'fallido',
        error_mensaje: `Error de conexión al WMS: ${err.message}`,
      });
      return;
    }

    const ordenesCompletadas = ordenes.filter((o) => o.orderStatus?.name === 'Finalizada');
    logger.info(`[WmsPolling] ${ordenesCompletadas.length} órdenes finalizadas de ${ordenes.length} totales`);

    for (const orden of ordenesCompletadas) {
      try {
        // ── Deduplicación cruzada PUSH + PULL ─────────────────────────────
        const existente = await Operacion.findOne({
          where: {
            [Op.or]: [
              { wms_order_id: orden.id },
              ...(orden.systemNumberOrder
                ? [{ documento_wms: orden.systemNumberOrder.toString() }]
                : []),
              ...(orden.customerNumberOrder
                ? [{ documento_wms: orden.customerNumberOrder.toString() }]
                : []),
            ],
          },
          paranoid: false,
        });
        if (existente) {
          logger.debug(`[WmsPolling] Orden ${orden.id} (${orden.systemNumberOrder}) ya existe → omitiendo`);
          continue;
        }

        // ── Obtener detalle completo (incluye NIT y orderItems con pallets) ─
        const detalle = await wmsApiService.getOrdenDetalle(orden.id);
        const ordenCompleta = (detalle && typeof detalle === 'object' && !Array.isArray(detalle))
          ? { ...orden, ...detalle }
          : orden;
        const itemsArr = Array.isArray(ordenCompleta.orderItems) ? ordenCompleta.orderItems : [];

        const { tipo, payload } = await wmsOrderMapper.mapearOrden(ordenCompleta, itemsArr);

        // ── Sincronizar ───────────────────────────────────────────────────
        let resultado;
        const tipoLog = tipo === 'entrada' ? 'polling_entrada' : 'polling_salida';

        if (tipo === 'entrada') {
          resultado = await syncEntrada(payload);
        } else {
          resultado = await syncSalida(payload);
        }

        // ── Guardar wms_order_id en la operación creada ───────────────────
        if (resultado?.operacion_id) {
          await Operacion.update(
            { wms_order_id: orden.id },
            { where: { id: resultado.operacion_id } }
          );
        }

        await WmsSyncLog.create({
          tipo: tipoLog,
          documento_origen: orden.systemNumberOrder,
          nit: ordenCompleta.customer?.nit,
          estado: 'exitoso',
          detalles: {
            wms_order_id: orden.id,
            operacion_id: resultado?.operacion_id,
            numero_operacion: resultado?.numero_operacion,
          },
        });

        procesadas++;
        logger.info(`[WmsPolling] Orden ${orden.id} sincronizada → ${resultado?.numero_operacion || resultado?.operacion_id}`);
      } catch (err) {
        errores++;
        logger.error(`[WmsPolling] Error procesando orden ${orden.id}: ${err.message}`);

        const tipoLog = (orden.type === 2) ? 'polling_salida' : 'polling_entrada';
        await WmsSyncLog.create({
          tipo: tipoLog,
          documento_origen: orden.systemNumberOrder,
          nit: orden.customer?.nit,
          estado: 'fallido',
          error_mensaje: err.message,
          detalles: { wms_order_id: orden.id },
        }).catch(() => {});
      }
    }

    logger.info(`[WmsPolling] Ciclo completo — procesadas: ${procesadas}, errores: ${errores}`);

    // Kardex: descubrir IDs de pallets nuevos y sincronizar ajustes recientes
    await _descubrirPalletIds().catch((err) =>
      logger.error('[WmsPolling] Error en descubrimiento de pallets:', err.message)
    );
    await _pollKardexHistorial().catch((err) =>
      logger.error('[WmsPolling] Error en polling kardex:', err.message)
    );
  } finally {
    _ejecutando = false;
  }
}

// ─── API pública ──────────────────────────────────────────────────────────────
function iniciarPollingWms() {
  if (_pollingJob) return;

  const intervalo = parseInt(process.env.WMS_SYNC_INTERVAL || '5', 10);
  const expresion = `*/${intervalo} * * * *`;

  if (!cron.validate(expresion)) {
    logger.error(`[WmsPolling] Expresión cron inválida: ${expresion}`);
    return;
  }

  _pollingJob = cron.schedule(expresion, _ejecutarPoll, {
    timezone: 'America/Bogota',
  });

  logger.info(`[WmsPolling] Job iniciado — cada ${intervalo} min (${expresion})`);
}

function detenerPollingWms() {
  if (_pollingJob) {
    _pollingJob.stop();
    _pollingJob = null;
    logger.info('[WmsPolling] Job detenido');
  }
}

async function ejecutarPollingManual() {
  logger.info('[WmsPolling] Ejecución manual solicitada');
  await _ejecutarPoll();
}

function getEstadoPolling() {
  return {
    activo: _pollingJob !== null,
    ejecutando: _ejecutando,
  };
}

module.exports = {
  iniciarPollingWms,
  detenerPollingWms,
  ejecutarPollingManual,
  getEstadoPolling,
};
