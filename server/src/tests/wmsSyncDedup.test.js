/**
 * Tests de integración — Deduplicación WMS PUSH
 *
 * Verifica que syncEntrada y syncSalida rechacen
 * documentos duplicados correctamente.
 *
 * Ejecutar: npm test -- --testPathPattern=wmsSyncDedup --verbose
 */

process.env.NODE_ENV = 'test';

const { Cliente, Inventario, Operacion } = require('../../src/models');
const { syncEntrada, syncSalida } = require('../../src/services/wmsSyncService');

// ─────────────────────────────────────────────
// Constantes de prueba exclusivas de este test
// ─────────────────────────────────────────────
const NIT_TEST = '999999999';
const SKU_TEST = 'SKU-TEST-DEDUP';
const DOC_WMS_TEST = 'CO-TEST-DEDUP-001';
const DOC_WMS_SALIDA = 'PK-TEST-DEDUP-001';

let clienteTest;

// ─────────────────────────────────────────────
// Setup / Teardown global
// ─────────────────────────────────────────────
beforeAll(async () => {
  // Crear cliente de prueba
  [clienteTest] = await Cliente.findOrCreate({
    where: { nit: NIT_TEST },
    defaults: {
      razon_social: 'Cliente Test Dedup',
      nit: NIT_TEST,
      codigo_cliente: 'TEST-DEDUP',
      estado: 'activo',
      tipo_cliente: 'corporativo',
    },
  });

  // Crear inventario de prueba
  await Inventario.findOrCreate({
    where: { cliente_id: clienteTest.id, sku: SKU_TEST },
    defaults: {
      producto: 'Producto Test Dedup',
      unidad_medida: 'UND',
      cantidad: 100,
    },
  });
});

afterAll(async () => {
  // Limpiar en orden correcto por FK
  await Operacion.destroy({
    where: { documento_wms: [DOC_WMS_TEST, DOC_WMS_SALIDA] },
    force: true,
  });
  await Inventario.destroy({
    where: { cliente_id: clienteTest.id, sku: SKU_TEST },
    force: true,
  });
  await Cliente.destroy({ where: { nit: NIT_TEST }, force: true });
});

// ─────────────────────────────────────────────
// Suite 1: syncEntrada — deduplicación
// ─────────────────────────────────────────────
describe('wmsSyncService.syncEntrada — deduplicación', () => {
  // Payload base para entradas de prueba
  const payloadEntrada = () => ({
    nit: NIT_TEST,
    documento_origen: DOC_WMS_TEST,
    detalles: [
      {
        producto: SKU_TEST,
        descripcion: 'Producto Test Dedup',
        cantidad: 10,
        unidad_medida: 'UND',
      },
    ],
  });

  afterEach(async () => {
    await Operacion.destroy({ where: { documento_wms: DOC_WMS_TEST }, force: true });
  });

  test('crea la operación correctamente en el primer llamado', async () => {
    const resultado = await syncEntrada(payloadEntrada());

    // Verificar que retorna operacion_id
    expect(resultado).toHaveProperty('operacion_id');
    expect(typeof resultado.operacion_id).toBe('number');

    // Verificar que la operación existe en DB con el documento_wms correcto
    const operacion = await Operacion.findByPk(resultado.operacion_id, { paranoid: false });
    expect(operacion).not.toBeNull();
    expect(operacion.documento_wms).toBe(DOC_WMS_TEST);
    expect(operacion.tipo).toBe('ingreso');
  });

  test('lanza error en el segundo llamado con el mismo documento_wms', async () => {
    // Primer llamado — debe pasar
    await syncEntrada(payloadEntrada());

    // Segundo llamado — debe lanzar error
    await expect(syncEntrada(payloadEntrada())).rejects.toThrow(
      'Ya existe una operación con documento WMS'
    );
  });

  test('permite crear con un documento_wms diferente', async () => {
    const payloadDistinto = {
      ...payloadEntrada(),
      documento_origen: 'CO-TEST-DEDUP-002',
    };

    const resultado = await syncEntrada(payloadDistinto);

    expect(resultado).toHaveProperty('operacion_id');
    expect(resultado.documento_wms).toBe('CO-TEST-DEDUP-002');

    // Limpiar la operación extra creada en este test
    await Operacion.destroy({ where: { documento_wms: 'CO-TEST-DEDUP-002' }, force: true });
  });
});

// ─────────────────────────────────────────────
// Suite 2: syncSalida — deduplicación
// ─────────────────────────────────────────────
describe('wmsSyncService.syncSalida — deduplicación', () => {
  // Payload base para salidas de prueba
  const payloadSalida = () => ({
    nit: NIT_TEST,
    numero_picking: DOC_WMS_SALIDA,
    detalles: [
      {
        producto: SKU_TEST,
        descripcion: 'Producto Test Dedup',
        cantidad: 5,
        unidad_medida: 'UND',
      },
    ],
  });

  afterEach(async () => {
    await Operacion.destroy({ where: { documento_wms: DOC_WMS_SALIDA }, force: true });
  });

  test('lanza error en el segundo llamado con el mismo numero_picking', async () => {
    // Primer llamado — debe crear
    const resultado = await syncSalida(payloadSalida());
    expect(resultado).toBeDefined();
    expect(resultado.operacion_id).toBeDefined();

    // Segundo llamado con el mismo picking — debe lanzar error
    await expect(syncSalida(payloadSalida())).rejects.toThrow(
      /Ya existe una operación con picking\/documento/
    );
  });
});
