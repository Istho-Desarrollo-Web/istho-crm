'use strict';

const logger = require('../utils/logger');

/**
 * Transforma una orden del WMS CenthriX en el payload que esperan
 * wmsSyncService.syncEntrada() o wmsSyncService.syncSalida().
 *
 * type 1 → entrada (CO)
 * type 2 → salida (PK)
 *
 * @param {object} ordenWms    - Objeto orden del WMS (GET /orders/:id)
 * @param {Array}  itemsArr    - orderItems del WMS (incluyen pallets[])
 * @returns {{ tipo: 'entrada'|'salida', payload: object }}
 */
async function mapearOrden(ordenWms, itemsArr) {
  const { id: wmsId, type, systemNumberOrder, customerNumberOrder, customer, warehouse } = ordenWms;

  const nit = customer?.nit || customer?.taxId || customer?.identification || customer?.rut;
  if (!nit) {
    logger.warn(`[WmsOrderMapper] Orden ${wmsId}: campos customer disponibles: ${Object.keys(customer || {}).join(', ')}`);
    throw new Error(`Orden WMS ${wmsId}: sin NIT de cliente (customer.nit/taxId/identification faltante)`);
  }

  // Número de documento visible: preferir el número del cliente (20260430) sobre el interno (SYS-000001)
  const docOrigen = customerNumberOrder || systemNumberOrder;

  // Strip HTML de observations ("< p>Prueba</p>" → "Prueba")
  const obsTexto = ordenWms.observations
    ? ordenWms.observations.replace(/<[^>]*>/g, '').trim()
    : '';

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
        detalles.push({
          producto: sku,
          descripcion: item.product?.name || sku,
          cantidad: Number(pallet.quantity) || 0,
          unidad_medida: item.product?.unitMeasure || 'UND',
          lote: pallet.lot || item.lot || null,
          fecha_vencimiento: (pallet.dueDate || item.dueDate)
            ? (pallet.dueDate || item.dueDate).split('T')[0]
            : null,
          caja: pallet.palletCode || null,
        });
      }
    } else {
      // Sin pallets: una línea por item con la cantidad total
      detalles.push({
        producto: sku,
        descripcion: item.product?.name || sku,
        cantidad: Number(item.quantity) || 0,
        unidad_medida: item.product?.unitMeasure || 'UND',
        lote: item.lot || null,
        fecha_vencimiento: item.dueDate ? item.dueDate.split('T')[0] : null,
        caja: null,
      });
    }
  }

  if (detalles.length === 0) {
    throw new Error(`Orden WMS ${wmsId}: todos los ítems carecen de SKU`);
  }

  const bodega = warehouse?.name || '';
  const observaciones = obsTexto || `Polling WMS${bodega ? ' - ' + bodega : ''}`;

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
        numero_picking: docOrigen,
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
