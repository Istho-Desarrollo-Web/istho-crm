'use strict';

const { CajaInventario, Inventario, Cliente } = require('../models');
const wmsApiService = require('../services/wmsApiService');
const wmsSyncService = require('../services/wmsSyncService');
const { success, serverError } = require('../utils/responses');
const logger = require('../utils/logger');

// GET /forklift-drivers/kardex/search-pallet?code=<palletCode>
const searchPallet = async (req, res) => {
  const { code } = req.query;
  if (!code || !code.trim()) {
    return res.status(400).json({
      success: false,
      status: 400,
      error: ['El código de búsqueda no puede estar vacío'],
    });
  }

  try {
    const pallet = await wmsApiService.searchPalletKardex(code.trim());
    return success(res, pallet, 'Estiba encontrada');
  } catch (err) {
    const wmsStatus = err.response?.status;
    logger.error('[ForklifKardex] Error searchPallet:', { message: err.message, wmsStatus });
    if (wmsStatus === 400 || wmsStatus === 404) {
      return res.status(404).json({ success: false, message: 'Estiba no encontrada en el WMS' });
    }
    return res.status(503).json({ success: false, message: 'WMS no disponible temporalmente' });
  }
};

// GET /forklift-drivers/kardex/motives
const getMotives = async (req, res) => {
  try {
    const motivos = await wmsApiService.getKardexMotives();
    return success(res, motivos, 'Motivos de ajuste obtenidos');
  } catch (err) {
    const wmsStatus = err.response?.status;
    logger.error('[ForklifKardex] Error getMotives:', { message: err.message, wmsStatus });
    return res.status(503).json({ success: false, message: 'WMS no disponible temporalmente' });
  }
};

// GET /forklift-drivers/kardex/history?palletId=<uuid>&page=1&limit=20
const getHistory = async (req, res) => {
  const { palletId, page = 1, limit = 20 } = req.query;
  if (!palletId) {
    return res.status(400).json({ success: false, message: 'palletId es requerido' });
  }
  try {
    const historial = await wmsApiService.getKardexHistory(palletId, { page, limit });
    return success(res, historial, 'Historial de ajustes obtenido');
  } catch (err) {
    const wmsStatus = err.response?.status;
    logger.error('[ForklifKardex] Error getHistory:', { message: err.message, wmsStatus });
    if (wmsStatus === 404) {
      return res.status(404).json({ success: false, message: 'Estiba no encontrada en el WMS' });
    }
    return res.status(503).json({ success: false, message: 'WMS no disponible temporalmente' });
  }
};

// POST /forklift-drivers/kardex
// Body: {
//   palletId      — UUID de la estiba en WMS
//   palletCode    — código corto (ej: "2") para búsqueda CRM
//   adjustmentType — "LOAD" | "DISCHARGE"
//   quantity      — número positivo de unidades
//   motiveId      — UUID del motivo (campo id de /motives)
//   motiveName    — nombre del motivo (campo name de /motives) para registro CRM
//   observations? — texto libre opcional
// }
const submitAdjustment = async (req, res) => {
  const { palletId, palletCode, adjustmentType, quantity, motiveId, motiveName, observations } =
    req.body;

  if (!palletId || !palletCode || !adjustmentType || !quantity || !motiveId || !motiveName) {
    return res.status(400).json({
      success: false,
      message:
        'palletId, palletCode, adjustmentType, quantity, motiveId y motiveName son requeridos',
    });
  }

  const cantidadNum = Number(quantity);
  if (isNaN(cantidadNum) || cantidadNum <= 0) {
    return res.status(400).json({ success: false, message: 'quantity debe ser un número positivo' });
  }
  if (!['LOAD', 'DISCHARGE'].includes(adjustmentType)) {
    return res
      .status(400)
      .json({ success: false, message: 'adjustmentType debe ser LOAD o DISCHARGE' });
  }

  try {
    // 1. Registrar el ajuste en el WMS
    const wmsResult = await wmsApiService.postKardexAdjustment({
      palletId,
      quantity: cantidadNum,
      adjustmentType,
      motiveId,
      observations: observations || null,
    });

    // 2. Sincronizar al inventario CRM en background (no bloquea la respuesta al móvil)
    _sincronizarEnCrm({ palletCode, adjustmentType, cantidadNum, motiveName }).catch((err) =>
      logger.error('[ForklifKardex] Error sincronizando en CRM:', { message: err.message })
    );

    return success(res, wmsResult, 'Ajuste registrado exitosamente');
  } catch (err) {
    const wmsStatus = err.response?.status;
    const wmsData = err.response?.data;
    logger.error('[ForklifKardex] Error submitAdjustment:', {
      message: err.message,
      wmsStatus,
      wmsData,
    });

    if (wmsStatus === 400) {
      return res.status(400).json({
        success: false,
        message: wmsData?.message || wmsData?.error?.[0] || 'El WMS rechazó el ajuste',
      });
    }
    if (wmsStatus === 404) {
      return res.status(404).json({ success: false, message: 'Estiba no encontrada en el WMS' });
    }
    return res.status(503).json({ success: false, message: 'WMS no disponible temporalmente' });
  }
};

async function _sincronizarEnCrm({ palletCode, adjustmentType, cantidadNum, motiveName }) {
  // Buscar la caja local para obtener SKU y cliente
  const caja = await CajaInventario.findOne({
    where: { numero_caja: palletCode },
    include: [{ model: Inventario, as: 'inventario', include: [{ model: Cliente, as: 'cliente' }] }],
  });

  if (!caja?.inventario?.cliente?.nit) {
    logger.warn(`[ForklifKardex] No se encontró CajaInventario local para palletCode=${palletCode}, omitiendo sync CRM`);
    return;
  }

  const { inventario, inventario: { cliente } } = caja;
  const cantidadAjuste = adjustmentType === 'LOAD' ? cantidadNum : -cantidadNum;

  await wmsSyncService.syncKardex({
    nit: cliente.nit,
    motivo: motiveName,
    detalles: [
      {
        producto: inventario.sku,
        descripcion: inventario.descripcion || inventario.producto,
        caja: palletCode,
        cantidad: cantidadAjuste,
        lote: caja.lote || null,
        unidad_medida: inventario.unidad_medida || 'UND',
      },
    ],
  });

  logger.info(`[ForklifKardex] Sync CRM completado para palletCode=${palletCode}`);
}

module.exports = { searchPallet, getMotives, getHistory, submitAdjustment };
