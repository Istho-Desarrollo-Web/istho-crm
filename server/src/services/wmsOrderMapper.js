'use strict';

const logger = require('../utils/logger');

/**
 * Transforma una orden del WMS CenthriX en el payload que esperan
 * wmsSyncService.syncEntrada() o wmsSyncService.syncSalida().
 *
 * type 1 → entrada (CO)   — ubicacion = currentPosition (donde está guardado)
 * type 2 → salida  (PK)   — ubicacion = originalPosition (de dónde fue tomado)
 *
 * @param {object} ordenWms  - Objeto orden del WMS (GET /orders/:id)
 * @param {Array}  itemsArr  - orderItems del WMS (incluyen pallets[])
 * @returns {{ tipo: 'entrada'|'salida', payload: object }}
 */
async function mapearOrden(ordenWms, itemsArr) {
  const { id: wmsId, type, systemNumberOrder, customerNumberOrder, pickingNumber, customer, warehouse } = ordenWms;

  const nit = customer?.nit || customer?.taxId || customer?.identification || customer?.rut;
  if (!nit) {
    logger.warn(`[WmsOrderMapper] Orden ${wmsId}: campos customer: ${Object.keys(customer || {}).join(', ')}`);
    throw new Error(`Orden WMS ${wmsId}: sin NIT de cliente`);
  }

  // Número visible en CRM: preferir número del cliente (20260430) sobre el interno (SYS-000001)
  const docOrigen = customerNumberOrder || systemNumberOrder;

  // Strip HTML de observations
  const obsTexto = ordenWms.observations
    ? ordenWms.observations.replace(/<[^>]*>/g, '').trim()
    : '';

  const observaciones = obsTexto || null;
  const esEntrada = type === 1;

  // Mapear ítems → un detalle por pallet/caja
  const detalles = [];
  for (const item of itemsArr) {
    const sku = item.product?.sku || item.product?.code;
    if (!sku) {
      logger.warn(`[WmsOrderMapper] Ítem sin SKU en orden ${wmsId}, omitiendo`);
      continue;
    }

    const pallets = Array.isArray(item.pallets) ? item.pallets : [];

    if (pallets.length > 0) {
      for (const pallet of pallets) {
        // Ubicacion: para entrada = dónde está; para salida = de dónde salió
        const ubicacion = esEntrada
          ? (pallet.currentPosition?.code || pallet.currentZone?.name || null)
          : (pallet.originalPosition?.code || pallet.originalLocationLabel || null);

        detalles.push({
          producto: sku,
          descripcion: item.product?.name || sku,
          wms_product_id: item.product?.id || null,
          cantidad: Number(pallet.quantity) || 0,
          unidad_medida: item.product?.unitMeasure || 'UND',
          lote: pallet.lot || item.lot || null,
          fecha_vencimiento: (pallet.dueDate || item.dueDate)
            ? (pallet.dueDate || item.dueDate).split('T')[0]
            : null,
          caja: pallet.palletCode || null,
          ubicacion,
          wms_pallet_id: pallet.id || pallet.palletId || null,
        });
      }
    } else {
      // Sin pallets: una línea por item con la cantidad total
      detalles.push({
        producto: sku,
        descripcion: item.product?.name || sku,
        wms_product_id: item.product?.id || null,
        cantidad: Number(item.quantity) || 0,
        unidad_medida: item.product?.unitMeasure || 'UND',
        lote: item.lot || null,
        fecha_vencimiento: item.dueDate ? item.dueDate.split('T')[0] : null,
        caja: null,
        ubicacion: null,
      });
    }
  }

  if (detalles.length === 0) {
    throw new Error(`Orden WMS ${wmsId}: todos los ítems carecen de SKU`);
  }

  if (type === 1) {
    return {
      tipo: 'entrada',
      payload: {
        nit,
        documento_origen: docOrigen,
        tipo_orden: 'CO',
        wms_order_id: wmsId,
        conductor_nombre: ordenWms.vehicleDriver || null,
        vehiculo_placa: ordenWms.vehicle || null,
        observaciones,
        detalles,
      },
    };
  }

  if (type === 2) {
    return {
      tipo: 'salida',
      payload: {
        nit,
        numero_picking: pickingNumber || docOrigen,
        documento_wms: customerNumberOrder || null,
        tipo_orden: 'PK',
        wms_order_id: wmsId,
        conductor_nombre: ordenWms.vehicleDriver || null,
        vehiculo_placa: ordenWms.vehicle || null,
        sucursal_entrega: ordenWms.sucursalEntrega || ordenWms.sucursal_entrega || null,
        ciudad_destino: ordenWms.cityDestination || ordenWms.ciudad_destino || null,
        observaciones,
        detalles,
      },
    };
  }

  throw new Error(`Orden WMS ${wmsId}: tipo desconocido (${type}). Solo se soporta 1=entrada y 2=salida`);
}

module.exports = { mapearOrden };
