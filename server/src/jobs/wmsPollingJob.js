'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const wmsApiService = require('../services/wmsApiService');
const wmsOrderMapper = require('../services/wmsOrderMapper');
const { syncEntrada, syncSalida } = require('../services/wmsSyncService');

// Importación diferida para evitar circular en startup
const getModels = () => require('../models');

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
          nit: orden.customer?.nit,
          estado: 'exitoso',
          detalles: { wms_order_id: orden.id, operacion_id: resultado?.operacion_id },
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
