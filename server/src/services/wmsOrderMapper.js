'use strict';

const logger = require('../utils/logger');

/**
 * Transforma una orden del WMS CenthriX en el payload que esperan
 * wmsSyncService.syncEntrada() o wmsSyncService.syncSalida().
 *
 * type 1 → entrada (CO)
 * type 2 → salida (PK)
 *
 * @param {object} ordenWms  - Objeto orden del WMS (GET /orders/:id o del listado)
 * @param {Array}  itemsPallets - Items del WMS (GET /orders/:id/order-items-pallets)
 * @returns {{ tipo: 'entrada'|'salida', payload: object }}
 */
async function mapearOrden(ordenWms, itemsPallets) {
  const { id: wmsId, type, systemNumberOrder, customer, warehouse } = ordenWms;

  if (!customer?.nit) {
    throw new Error(`Orden WMS ${wmsId}: sin NIT de cliente (customer.nit faltante)`);
  }

  // Mapear ítems → detalles CRM
  const detalles = [];
  for (const item of itemsPallets) {
    const sku = item.product?.sku || item.product?.code;
    if (!sku) {
      logger.warn(`[WmsOrderMapper] Ítem sin SKU en orden ${wmsId}, omitiendo`);
      continue;
    }
    const cantidad = Array.isArray(item.pallets)
      ? item.pallets.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0)
      : Number(item.quantity) || 0;

    detalles.push({
      producto: sku,
      descripcion: item.product?.name || sku,
      cantidad,
      unidad_medida: item.product?.unitMeasure || 'UND',
    });
  }

  if (detalles.length === 0) {
    throw new Error(`Orden WMS ${wmsId}: todos los ítems carecen de SKU`);
  }

  const bodega = warehouse?.name || '';

  if (type === 1) {
    return {
      tipo: 'entrada',
      payload: {
        nit: customer.nit,
        documento_origen: systemNumberOrder,
        tipo_orden: 'CO',
        wms_order_id: wmsId,
        observaciones: `Polling WMS${bodega ? ' - ' + bodega : ''}`,
        detalles,
      },
    };
  }

  if (type === 2) {
    return {
      tipo: 'salida',
      payload: {
        nit: customer.nit,
        numero_picking: systemNumberOrder,
        tipo_orden: 'PK',
        wms_order_id: wmsId,
        sucursal_entrega: ordenWms.sucursalEntrega || ordenWms.sucursal_entrega || null,
        ciudad_destino: ordenWms.cityDestination || ordenWms.ciudad_destino || null,
        observaciones: `Polling WMS${bodega ? ' - ' + bodega : ''}`,
        detalles,
      },
    };
  }

  throw new Error(`Orden WMS ${wmsId}: tipo desconocido (${type}). Solo se soporta 1=entrada y 2=salida`);
}

module.exports = { mapearOrden };
