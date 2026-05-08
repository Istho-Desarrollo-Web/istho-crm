'use strict';

/**
 * Tests unitarios puros para wmsOrderMapper.
 * No requieren DB ni HTTP — mapearOrden es una función pura (async).
 *
 * Ejecutar: cd server && npm test -- --testPathPattern=wmsOrderMapper --verbose
 */

const { mapearOrden } = require('../services/wmsOrderMapper');

// ─── Fixtures base ────────────────────────────────────────────────────────────

const ordenBase = {
  id: 'uuid-wms-001',
  type: 1,
  systemNumberOrder: 'SYS-000001',
  customerNumberOrder: '20260430',
  customer: { nit: '900123456', name: 'Cliente Test' },
  warehouse: { name: 'Bodega 106' },
  vehicleDriver: 'Juan Pérez',
  vehicle: 'ABC-123',
  observations: '<p>Observación HTML</p>',
};

const itemsConPallets = [
  {
    product: { id: 'prod-1', sku: 'SKU-001', name: 'Producto Test', unitMeasure: 'UND' },
    pallets: [
      {
        id: 'pallet-001',
        palletCode: 'CJ-000001',
        quantity: 10,
        lot: 'LOTE-A',
        dueDate: '2027-01-15T00:00:00Z',
        currentPosition: { code: 'RACK-A1-M1' },
        originalPosition: { code: 'RACK-B2-M3' },
      },
    ],
  },
];

// ─── Suite 1: type=1 (entrada CO) ─────────────────────────────────────────────

describe('mapearOrden — type=1 (entrada CO)', () => {
  test('1. retorna tipo="entrada" con payload correcto (nit, tipo_orden="CO", wms_order_id)', async () => {
    const result = await mapearOrden(ordenBase, itemsConPallets);

    expect(result.tipo).toBe('entrada');
    expect(result.payload.nit).toBe('900123456');
    expect(result.payload.tipo_orden).toBe('CO');
    expect(result.payload.wms_order_id).toBe('uuid-wms-001');
    expect(Array.isArray(result.payload.detalles)).toBe(true);
    expect(result.payload.detalles.length).toBeGreaterThan(0);
  });

  test('2. prefiere customerNumberOrder sobre systemNumberOrder como documento_origen', async () => {
    const result = await mapearOrden(ordenBase, itemsConPallets);

    expect(result.payload.documento_origen).toBe('20260430');
  });

  test('3. usa systemNumberOrder si no hay customerNumberOrder', async () => {
    const ordenSinClienteNum = { ...ordenBase, customerNumberOrder: null };
    const result = await mapearOrden(ordenSinClienteNum, itemsConPallets);

    expect(result.payload.documento_origen).toBe('SYS-000001');
  });

  test('4. limpia HTML de observations (el resultado no contiene etiquetas <p>)', async () => {
    const result = await mapearOrden(ordenBase, itemsConPallets);

    expect(result.payload.observaciones).not.toMatch(/<p>/);
    expect(result.payload.observaciones).toMatch(/Observación HTML/);
  });

  test('5. mapea ubicación desde currentPosition para entradas', async () => {
    const result = await mapearOrden(ordenBase, itemsConPallets);

    expect(result.payload.detalles[0].ubicacion).toBe('RACK-A1-M1');
  });

  test('6. mapea lote y fecha_vencimiento desde pallet (formato YYYY-MM-DD)', async () => {
    const result = await mapearOrden(ordenBase, itemsConPallets);
    const detalle = result.payload.detalles[0];

    expect(detalle.lote).toBe('LOTE-A');
    expect(detalle.fecha_vencimiento).toBe('2027-01-15');
  });

  test('7. un item sin pallets genera una línea con cantidad del item y ubicacion=null', async () => {
    const itemsSinPallets = [
      {
        product: { id: 'prod-2', sku: 'SKU-002', name: 'Producto Sin Pallet', unitMeasure: 'KG' },
        quantity: 25,
        pallets: [],
      },
    ];
    const result = await mapearOrden(ordenBase, itemsSinPallets);
    const detalle = result.payload.detalles[0];

    expect(detalle.cantidad).toBe(25);
    expect(detalle.ubicacion).toBeNull();
  });
});

// ─── Suite 2: type=2 (salida PK) ──────────────────────────────────────────────

describe('mapearOrden — type=2 (salida PK)', () => {
  const ordenSalida = {
    ...ordenBase,
    customer: { ...ordenBase.customer },
    warehouse: { ...ordenBase.warehouse },
    type: 2,
  };

  test('1. retorna tipo="salida" con payload correcto (tipo_orden="PK", numero_picking)', async () => {
    const result = await mapearOrden(ordenSalida, itemsConPallets);

    expect(result.tipo).toBe('salida');
    expect(result.payload.tipo_orden).toBe('PK');
    expect(result.payload.wms_order_id).toBe('uuid-wms-001');
    // Para salidas el número de documento se llama numero_picking, no documento_origen
    expect(result.payload.numero_picking).toBe('20260430');
  });

  test('2. mapea ubicación desde originalPosition para salidas', async () => {
    const result = await mapearOrden(ordenSalida, itemsConPallets);

    expect(result.payload.detalles[0].ubicacion).toBe('RACK-B2-M3');
  });
});

// ─── Suite 3: casos de error ───────────────────────────────────────────────────

describe('mapearOrden — casos de error', () => {
  test('1. lanza error si la orden no tiene NIT de cliente', async () => {
    const ordenSinNit = { ...ordenBase, customer: { name: 'Sin NIT' } };

    await expect(mapearOrden(ordenSinNit, itemsConPallets))
      .rejects.toThrow(/sin NIT de cliente/);
  });

  test('2. lanza error si todos los ítems carecen de SKU', async () => {
    const itemsSinSku = [
      {
        product: { id: 'prod-3', name: 'Sin SKU' },
        pallets: [],
        quantity: 5,
      },
    ];

    await expect(mapearOrden(ordenBase, itemsSinSku))
      .rejects.toThrow(/todos los ítems carecen de SKU/);
  });

  test('3. omite ítem sin SKU pero incluye el que sí tiene SKU (items mixtos)', async () => {
    const itemsMixtos = [
      {
        product: { id: 'prod-bad', name: 'Sin SKU' }, // sin sku
        pallets: [],
        quantity: 3,
      },
      {
        product: { id: 'prod-ok', sku: 'SKU-OK', name: 'Con SKU', unitMeasure: 'UND' },
        pallets: [
          {
            id: 'pallet-ok',
            palletCode: 'CJ-OK',
            quantity: 7,
            lot: null,
            dueDate: null,
            currentPosition: { code: 'RACK-C1' },
            originalPosition: { code: 'RACK-C1' },
          },
        ],
      },
    ];

    const result = await mapearOrden(ordenBase, itemsMixtos);

    // Solo 1 detalle — el ítem sin SKU fue omitido
    expect(result.payload.detalles).toHaveLength(1);
    expect(result.payload.detalles[0].producto).toBe('SKU-OK');
  });

  test('4. lanza error para type desconocido (type=3)', async () => {
    const ordenTipoDesconocido = { ...ordenBase, type: 3 };

    await expect(mapearOrden(ordenTipoDesconocido, itemsConPallets))
      .rejects.toThrow(/tipo desconocido.*3/);
  });
});
