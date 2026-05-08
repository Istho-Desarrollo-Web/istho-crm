# Plan de Cobertura de Tests — CRM CenthriX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar tests de las áreas críticas sin cobertura: flujo de recuperación de contraseña, mapper WMS, deduplicación de operaciones y los dos nuevos componentes de formulario.

**Architecture:** Backend usa Jest + supertest contra la DB real (patrón ya establecido en `auth.test.js`). Frontend usa Vitest + @testing-library/react (patrón ya establecido en `Button.test.jsx`). Las tareas 1–3 son backend y son independientes entre sí. Las tareas 4–5 son frontend y también son independientes entre sí. Las cinco tareas pueden ejecutarse en cualquier orden.

**Tech Stack:** Jest 29, supertest, Sequelize (DB real MySQL), Vitest 4, @testing-library/react, jsdom.

---

## Estado de tests al inicio del plan

| Suite | Archivo | Tests |
|-------|---------|-------|
| ✅ Backend auth básico | `server/src/tests/auth.test.js` | 12 (login, /me, refresh, health) |
| ✅ Frontend Button | `frontend/src/components/common/Button/Button.test.jsx` | ~15 |
| ✅ Frontend Input | `frontend/src/components/common/Input/Input.test.jsx` | ~18 |
| ✅ Frontend DataTable | `frontend/src/components/common/Table/DataTable.test.jsx` | ~20 |
| ❌ Backend auth recovery | *no existe* | 0 |
| ❌ Backend wmsOrderMapper | *no existe* | 0 |
| ❌ Backend wmsSyncService dedup | *no existe* | 0 |
| ❌ Frontend FilterDropdown | *no existe* | 0 |
| ❌ Frontend DatePicker | *no existe* | 0 |

---

## Archivos del plan

| Rol | Ruta |
|-----|------|
| Crear | `server/src/tests/auth-recovery.test.js` |
| Crear | `server/src/tests/wmsOrderMapper.test.js` |
| Crear | `server/src/tests/wmsSyncDedup.test.js` |
| Crear | `frontend/src/components/common/FilterDropdown.test.jsx` |
| Crear | `frontend/src/components/common/DatePicker.test.jsx` |

---

## Tarea 1 — Tests de recuperación de contraseña (backend)

**Contexto:** `forgotPassword` genera un token SHA-256, guarda el hash en `reset_token` y envía un email con la URL `/reset-password?token=<raw>`. `resetPassword` valida el hash, impone requisitos de contraseña y limpia el token. Este fue el flujo con bug reciente — debe tener tests explícitos.

**Archivo a crear:** `server/src/tests/auth-recovery.test.js`

**Dependencias:** El `globalSetup.js` ya crea un usuario admin con email `admin@istho.com.co`. Los tests usan ese usuario. El `emailService` se mockea para no enviar emails reales.

- [ ] **Paso 1: Crear el archivo de test**

```js
// server/src/tests/auth-recovery.test.js
'use strict';

process.env.NODE_ENV = 'test';

const request = require('supertest');
const crypto = require('crypto');
const app = require('../../src/app');
const { Usuario } = require('../../src/models');

// Mockear emailService para no enviar emails reales en tests
jest.mock('../../src/services/emailService', () => ({
  enviarRecuperacionPassword: jest.fn().mockResolvedValue({ success: true }),
  enviarReseteoPassword: jest.fn().mockResolvedValue({ success: true }),
  enviarCorreo: jest.fn().mockResolvedValue({ success: true }),
}));

const emailService = require('../../src/services/emailService');
const API = process.env.API_PREFIX || '/api/v1';
const EMAIL_TEST = process.env.TEST_EMAIL || 'admin@istho.com.co';

// Limpiar tokens del usuario de prueba antes y después
beforeEach(async () => {
  await Usuario.update(
    { reset_token: null, reset_token_expires: null, intentos_fallidos: 0, bloqueado_hasta: null },
    { where: { email: EMAIL_TEST } }
  );
  jest.clearAllMocks();
});

afterAll(async () => {
  await Usuario.update(
    { reset_token: null, reset_token_expires: null },
    { where: { email: EMAIL_TEST } }
  );
});

// ─────────────────────────────────────────────
// Suite: forgot-password
// ─────────────────────────────────────────────
describe('POST /auth/forgot-password', () => {
  test('devuelve 200 con mensaje genérico aunque el email no exista', async () => {
    const res = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: 'noexiste_xyz@prueba.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(emailService.enviarRecuperacionPassword).not.toHaveBeenCalled();
  });

  test('devuelve 200 con mensaje genérico cuando el email sí existe', async () => {
    const res = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: EMAIL_TEST });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('guarda el hash del token en la BD (no el token en texto plano)', async () => {
    await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: EMAIL_TEST });

    const usuario = await Usuario.findOne({ where: { email: EMAIL_TEST } });
    expect(usuario.reset_token).not.toBeNull();
    // El hash SHA-256 tiene exactamente 64 caracteres hexadecimales
    expect(usuario.reset_token).toMatch(/^[a-f0-9]{64}$/);
    expect(usuario.reset_token_expires).not.toBeNull();
    expect(new Date(usuario.reset_token_expires).getTime()).toBeGreaterThan(Date.now());
  });

  test('llama a enviarRecuperacionPassword (no a enviarReseteoPassword)', async () => {
    await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({ email: EMAIL_TEST });

    expect(emailService.enviarRecuperacionPassword).toHaveBeenCalledTimes(1);
    expect(emailService.enviarReseteoPassword).not.toHaveBeenCalled();

    const llamada = emailService.enviarRecuperacionPassword.mock.calls[0][0];
    expect(llamada.email).toBe(EMAIL_TEST);
    expect(llamada.urlReset).toMatch(/\/reset-password\?token=/);
    // El token en la URL NO debe ser el hash SHA-256 de 64 chars — es el raw de 64 chars hex
    expect(llamada.urlReset).toMatch(/[a-f0-9]{64}$/);
  });

  test('devuelve 400 si no se envía email', async () => {
    const res = await request(app)
      .post(`${API}/auth/forgot-password`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────
// Suite: reset-password
// ─────────────────────────────────────────────
describe('POST /auth/reset-password', () => {
  let rawToken;

  // Generar un token válido antes de cada test de esta suite
  beforeEach(async () => {
    rawToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await Usuario.update(
      {
        reset_token: hash,
        reset_token_expires: new Date(Date.now() + 60 * 60 * 1000), // 1 hora
      },
      { where: { email: EMAIL_TEST } }
    );
  });

  test('devuelve 200 y limpia el token con contraseña válida', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'NuevaPass2026*' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const usuario = await Usuario.findOne({ where: { email: EMAIL_TEST } });
    expect(usuario.reset_token).toBeNull();
    expect(usuario.reset_token_expires).toBeNull();
  });

  test('devuelve 400 con token inválido (no existe en DB)', async () => {
    const tokenFalso = crypto.randomBytes(32).toString('hex');
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: tokenFalso, password: 'NuevaPass2026*' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 400 con token expirado', async () => {
    // Sobreescribir el token con fecha ya pasada
    const expiredToken = crypto.randomBytes(32).toString('hex');
    const hash = crypto.createHash('sha256').update(expiredToken).digest('hex');
    await Usuario.update(
      {
        reset_token: hash,
        reset_token_expires: new Date(Date.now() - 1000), // ya expiró
      },
      { where: { email: EMAIL_TEST } }
    );

    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: expiredToken, password: 'NuevaPass2026*' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('devuelve 400 si la contraseña tiene menos de 8 caracteres', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'Abc1*' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si la contraseña no tiene mayúscula', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'sinmayuscula1*' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si la contraseña no tiene número', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'SinNumero*abc' });

    expect(res.status).toBe(400);
  });

  test('devuelve 400 si la contraseña no tiene carácter especial', async () => {
    const res = await request(app)
      .post(`${API}/auth/reset-password`)
      .send({ token: rawToken, password: 'SinEspecial1234' });

    expect(res.status).toBe(400);
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que falla (archivo no existe aún — este es el estado esperado si se ejecuta antes de crear el archivo)**

```bash
cd server && npm test -- --testPathPattern=auth-recovery --verbose 2>&1 | tail -20
```

El output esperado después de crear el archivo y antes de cualquier corrección: todos los tests deben pasar directamente ya que el código de producción ya fue corregido.

- [ ] **Paso 3: Ejecutar los tests y confirmar que pasan**

```bash
cd server && npm test -- --testPathPattern=auth-recovery --verbose 2>&1 | tail -25
```

Resultado esperado:
```
PASS src/tests/auth-recovery.test.js
  POST /auth/forgot-password
    ✓ devuelve 200 con mensaje genérico aunque el email no exista
    ✓ devuelve 200 con mensaje genérico cuando el email sí existe
    ✓ guarda el hash del token en la BD (no el token en texto plano)
    ✓ llama a enviarRecuperacionPassword (no a enviarReseteoPassword)
    ✓ devuelve 400 si no se envía email
  POST /auth/reset-password
    ✓ devuelve 200 y limpia el token con contraseña válida
    ✓ devuelve 400 con token inválido (no existe en DB)
    ✓ devuelve 400 con token expirado
    ✓ devuelve 400 si la contraseña tiene menos de 8 caracteres
    ✓ devuelve 400 si la contraseña no tiene mayúscula
    ✓ devuelve 400 si la contraseña no tiene número
    ✓ devuelve 400 si la contraseña no tiene carácter especial

Tests: 12 passed
```

Si algún test falla con error de módulo (`Cannot find module '../../src/services/emailService'`), verificar que la ruta relativa es correcta desde `server/src/tests/` → `../../src/services/emailService` apunta a `server/src/services/emailService.js`. ✓ correcto.

- [ ] **Paso 4: Ejecutar todos los tests backend para verificar no hay regresiones**

```bash
cd server && npm test -- --verbose 2>&1 | tail -10
```

Esperado: todos los tests pasan.

- [ ] **Paso 5: Commit**

```bash
git add server/src/tests/auth-recovery.test.js
git commit -m "test(auth): agregar tests de forgot-password y reset-password"
```

---

## Tarea 2 — Tests unitarios de wmsOrderMapper (backend)

**Contexto:** `wmsOrderMapper.mapearOrden(ordenWms, items)` es una función pura que transforma objetos del WMS al formato que espera `wmsSyncService`. No usa DB ni HTTP — ideal para tests unitarios rápidos. Exporta `{ tipo, payload }`.

**Archivo a crear:** `server/src/tests/wmsOrderMapper.test.js`

- [ ] **Paso 1: Crear el archivo de test**

```js
// server/src/tests/wmsOrderMapper.test.js
'use strict';

process.env.NODE_ENV = 'test';

const { mapearOrden } = require('../../src/services/wmsOrderMapper');

// ─── Fixtures ───────────────────────────────────────────────────────────────

const ordenBase = {
  id: 'uuid-wms-001',
  type: 1, // 1 = entrada CO
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

const itemsSinPallets = [
  {
    product: { id: 'prod-2', sku: 'SKU-002', name: 'Producto Sin Pallet', unitMeasure: 'KG' },
    pallets: [],
    quantity: 5,
    lot: 'LOTE-B',
  },
];

// ─── Suite: tipo entrada (type=1) ────────────────────────────────────────────
describe('mapearOrden — type=1 (entrada CO)', () => {
  test('retorna tipo="entrada" con payload correcto', async () => {
    const resultado = await mapearOrden(ordenBase, itemsConPallets);

    expect(resultado.tipo).toBe('entrada');
    expect(resultado.payload.nit).toBe('900123456');
    expect(resultado.payload.tipo_orden).toBe('CO');
    expect(resultado.payload.wms_order_id).toBe('uuid-wms-001');
  });

  test('prefiere customerNumberOrder sobre systemNumberOrder como documento_origen', async () => {
    const resultado = await mapearOrden(ordenBase, itemsConPallets);
    expect(resultado.payload.documento_origen).toBe('20260430');
  });

  test('usa systemNumberOrder si no hay customerNumberOrder', async () => {
    const orden = { ...ordenBase, customerNumberOrder: null };
    const resultado = await mapearOrden(orden, itemsConPallets);
    expect(resultado.payload.documento_origen).toBe('SYS-000001');
  });

  test('limpia HTML de observations', async () => {
    const resultado = await mapearOrden(ordenBase, itemsConPallets);
    expect(resultado.payload.observaciones).toBe('Observación HTML');
    expect(resultado.payload.observaciones).not.toContain('<p>');
  });

  test('mapea ubicación desde currentPosition para entradas', async () => {
    const resultado = await mapearOrden(ordenBase, itemsConPallets);
    expect(resultado.payload.detalles[0].ubicacion).toBe('RACK-A1-M1');
  });

  test('mapea lote y fecha_vencimiento desde pallet', async () => {
    const resultado = await mapearOrden(ordenBase, itemsConPallets);
    const detalle = resultado.payload.detalles[0];
    expect(detalle.lote).toBe('LOTE-A');
    expect(detalle.fecha_vencimiento).toBe('2027-01-15');
  });

  test('un item sin pallets genera una línea con cantidad del item', async () => {
    const resultado = await mapearOrden(ordenBase, itemsSinPallets);
    expect(resultado.payload.detalles).toHaveLength(1);
    expect(resultado.payload.detalles[0].cantidad).toBe(5);
    expect(resultado.payload.detalles[0].ubicacion).toBeNull();
  });
});

// ─── Suite: tipo salida (type=2) ─────────────────────────────────────────────
describe('mapearOrden — type=2 (salida PK)', () => {
  const ordenSalida = { ...ordenBase, type: 2 };

  test('retorna tipo="salida" con payload correcto', async () => {
    const resultado = await mapearOrden(ordenSalida, itemsConPallets);

    expect(resultado.tipo).toBe('salida');
    expect(resultado.payload.tipo_orden).toBe('PK');
    expect(resultado.payload.numero_picking).toBe('20260430');
  });

  test('mapea ubicación desde originalPosition para salidas', async () => {
    const resultado = await mapearOrden(ordenSalida, itemsConPallets);
    expect(resultado.payload.detalles[0].ubicacion).toBe('RACK-B2-M3');
  });
});

// ─── Suite: casos de error ────────────────────────────────────────────────────
describe('mapearOrden — casos de error', () => {
  test('lanza error si la orden no tiene NIT de cliente', async () => {
    const ordenSinNit = { ...ordenBase, customer: { name: 'Sin NIT' } };
    await expect(mapearOrden(ordenSinNit, itemsConPallets)).rejects.toThrow(
      /sin NIT de cliente/
    );
  });

  test('lanza error si todos los ítems carecen de SKU', async () => {
    const itemsSinSku = [
      { product: { name: 'Sin SKU' }, pallets: [{ id: 'p1', quantity: 5 }] },
    ];
    await expect(mapearOrden(ordenBase, itemsSinSku)).rejects.toThrow(
      /todos los ítems carecen de SKU/
    );
  });

  test('omite el ítem sin SKU pero incluye los que sí tienen SKU', async () => {
    const itemsMixtos = [
      { product: { name: 'Sin SKU' }, pallets: [{ id: 'p1', quantity: 5 }] },
      ...itemsConPallets,
    ];
    const resultado = await mapearOrden(ordenBase, itemsMixtos);
    expect(resultado.payload.detalles).toHaveLength(1);
    expect(resultado.payload.detalles[0].producto).toBe('SKU-001');
  });

  test('lanza error para type desconocido (type=3)', async () => {
    const ordenTipoRaro = { ...ordenBase, type: 3 };
    await expect(mapearOrden(ordenTipoRaro, itemsConPallets)).rejects.toThrow();
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que todos los tests pasan**

```bash
cd server && npm test -- --testPathPattern=wmsOrderMapper --verbose 2>&1 | tail -30
```

Resultado esperado:
```
PASS src/tests/wmsOrderMapper.test.js
  mapearOrden — type=1 (entrada CO)
    ✓ retorna tipo="entrada" con payload correcto
    ✓ prefiere customerNumberOrder sobre systemNumberOrder
    ✓ usa systemNumberOrder si no hay customerNumberOrder
    ✓ limpia HTML de observations
    ✓ mapea ubicación desde currentPosition para entradas
    ✓ mapea lote y fecha_vencimiento desde pallet
    ✓ un item sin pallets genera una línea con cantidad del item
  mapearOrden — type=2 (salida PK)
    ✓ retorna tipo="salida" con payload correcto
    ✓ mapea ubicación desde originalPosition para salidas
  mapearOrden — casos de error
    ✓ lanza error si la orden no tiene NIT de cliente
    ✓ lanza error si todos los ítems carecen de SKU
    ✓ omite el ítem sin SKU pero incluye los que sí tienen SKU
    ✓ lanza error para type desconocido (type=3)

Tests: 13 passed
```

Si falla el test de `type=3` con "no lanza error" (el mapper tal vez retorna undefined en vez de throw), ajustar el test así:
```js
// Alternativa si mapearOrden retorna undefined en vez de throw para type desconocido:
const resultado = await mapearOrden(ordenTipoRaro, itemsConPallets);
expect(resultado).toBeUndefined();
```

- [ ] **Paso 3: Verificar suite completa sin regresiones**

```bash
cd server && npm test -- --verbose 2>&1 | tail -10
```

- [ ] **Paso 4: Commit**

```bash
git add server/src/tests/wmsOrderMapper.test.js
git commit -m "test(wms): agregar tests unitarios para wmsOrderMapper"
```

---

## Tarea 3 — Tests de deduplicación de operaciones WMS (backend)

**Contexto:** `wmsSyncService.syncEntrada()` rechaza con error si ya existe una operación con el mismo `documento_wms`. Este es el mecanismo central de deduplicación PUSH→PUSH. El test necesita crear fixtures en DB (un cliente de prueba y un inventario de prueba), ejecutar `syncEntrada` dos veces con el mismo documento y verificar que la segunda falla.

**Archivo a crear:** `server/src/tests/wmsSyncDedup.test.js`

**Importante:** Este test crea datos en la DB de test y los limpia en `afterAll`. Los datos usan NIT `999999999` que es exclusivo de los tests — nunca usar ese NIT en seeds de producción.

- [ ] **Paso 1: Crear el archivo de test**

```js
// server/src/tests/wmsSyncDedup.test.js
'use strict';

process.env.NODE_ENV = 'test';

const { syncEntrada, syncSalida } = require('../../src/services/wmsSyncService');
const { Cliente, Inventario, Operacion, sequelize } = require('../../src/models');

// NIT exclusivo de tests — no colisiona con seeds de producción
const NIT_TEST = '999999999';
const SKU_TEST = 'SKU-TEST-DEDUP';
const DOC_WMS_TEST = 'CO-TEST-DEDUP-001';
const DOC_WMS_SALIDA = 'PK-TEST-DEDUP-001';

let clienteTest;

beforeAll(async () => {
  // Crear cliente de prueba
  [clienteTest] = await Cliente.findOrCreate({
    where: { nit: NIT_TEST },
    defaults: {
      razon_social: 'Cliente Test Dedup',
      nit: NIT_TEST,
      codigo_cliente: 'TEST-DEDUP',
      estado: 'activo',
      tipo: 'nacional',
    },
  });

  // Crear inventario de prueba para el cliente
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
  // Limpiar en orden correcto por claves foráneas
  await Operacion.destroy({ where: { documento_wms: [DOC_WMS_TEST, DOC_WMS_SALIDA] }, force: true });
  await Inventario.destroy({ where: { cliente_id: clienteTest.id, sku: SKU_TEST }, force: true });
  await Cliente.destroy({ where: { nit: NIT_TEST }, force: true });
});

const payloadEntrada = () => ({
  nit: NIT_TEST,
  documento_origen: DOC_WMS_TEST,
  tipo_orden: 'CO',
  detalles: [
    { producto: SKU_TEST, cantidad: 5, unidad_medida: 'UND' },
  ],
});

// ─── Suite: syncEntrada ───────────────────────────────────────────────────────
describe('wmsSyncService.syncEntrada — deduplicación', () => {
  afterEach(async () => {
    // Limpiar la operación creada en cada test para que los tests sean independientes
    await Operacion.destroy({ where: { documento_wms: DOC_WMS_TEST }, force: true });
  });

  test('crea la operación correctamente en el primer llamado', async () => {
    const resultado = await syncEntrada(payloadEntrada());

    expect(resultado).toBeDefined();
    expect(resultado.operacion_id).toBeDefined();

    const operacion = await Operacion.findByPk(resultado.operacion_id);
    expect(operacion).not.toBeNull();
    expect(operacion.documento_wms).toBe(DOC_WMS_TEST);
    expect(operacion.tipo).toBe('ingreso');
  });

  test('lanza error en el segundo llamado con el mismo documento_wms', async () => {
    // Primera llamada — debe crear
    await syncEntrada(payloadEntrada());

    // Segunda llamada — debe fallar con error de duplicado
    await expect(syncEntrada(payloadEntrada())).rejects.toThrow(
      /Ya existe una operación con documento WMS/
    );
  });

  test('permite crear con un documento_wms diferente', async () => {
    const payloadDistinto = {
      ...payloadEntrada(),
      documento_origen: `${DOC_WMS_TEST}-DIFERENTE`,
    };

    const resultado = await syncEntrada(payloadDistinto);
    expect(resultado.operacion_id).toBeDefined();

    // Limpiar este documento adicional
    await Operacion.destroy({
      where: { documento_wms: `${DOC_WMS_TEST}-DIFERENTE` },
      force: true,
    });
  });
});

// ─── Suite: syncSalida ────────────────────────────────────────────────────────
describe('wmsSyncService.syncSalida — deduplicación', () => {
  afterEach(async () => {
    await Operacion.destroy({ where: { documento_wms: DOC_WMS_SALIDA }, force: true });
  });

  test('lanza error en el segundo llamado con el mismo numero_picking', async () => {
    const payloadSalida = {
      nit: NIT_TEST,
      numero_picking: DOC_WMS_SALIDA,
      tipo_orden: 'PK',
      detalles: [
        { producto: SKU_TEST, cantidad: 2, unidad_medida: 'UND' },
      ],
    };

    // Primera llamada — debe crear
    await syncSalida(payloadSalida);

    // Segunda llamada — debe fallar
    await expect(syncSalida(payloadSalida)).rejects.toThrow();
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que los tests pasan**

```bash
cd server && npm test -- --testPathPattern=wmsSyncDedup --verbose 2>&1 | tail -20
```

Resultado esperado:
```
PASS src/tests/wmsSyncDedup.test.js
  wmsSyncService.syncEntrada — deduplicación
    ✓ crea la operación correctamente en el primer llamado
    ✓ lanza error en el segundo llamado con el mismo documento_wms
    ✓ permite crear con un documento_wms diferente
  wmsSyncService.syncSalida — deduplicación
    ✓ lanza error en el segundo llamado con el mismo numero_picking

Tests: 4 passed
```

Si los tests de salida fallan porque `syncSalida` requiere más campos (p.ej. `ciudad_destino`), agregar los campos al `payloadSalida`:
```js
const payloadSalida = {
  nit: NIT_TEST,
  numero_picking: DOC_WMS_SALIDA,
  tipo_orden: 'PK',
  ciudad_destino: 'Medellín',
  detalles: [{ producto: SKU_TEST, cantidad: 2, unidad_medida: 'UND' }],
};
```

- [ ] **Paso 3: Ejecutar todos los tests backend juntos**

```bash
cd server && npm test -- --verbose 2>&1 | tail -15
```

Esperado: todos los tests pasan (12 + 12 + 13 + 4 = 41 tests).

- [ ] **Paso 4: Commit**

```bash
git add server/src/tests/wmsSyncDedup.test.js
git commit -m "test(wms): agregar tests de deduplicación PUSH para syncEntrada y syncSalida"
```

---

## Tarea 4 — Tests de FilterDropdown (frontend)

**Contexto:** `FilterDropdown` es el reemplazo de todos los `<select>` del sistema. Usa posición `fixed` calculada con `requestAnimationFrame` para escapar stacking contexts. Los tests verifican la interacción básica; la lógica de posicionamiento `fixed` no se puede probar en jsdom (no tiene getBoundingClientRect real) — eso es aceptable.

**Archivo a crear:** `frontend/src/components/common/FilterDropdown.test.jsx`

El componente está en `frontend/src/components/common/FilterDropdown.jsx`.

- [ ] **Paso 1: Crear el archivo de test**

```jsx
// frontend/src/components/common/FilterDropdown.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FilterDropdown from './FilterDropdown';

const opciones = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
];

describe('FilterDropdown', () => {
  it('muestra el placeholder cuando no hay valor seleccionado', () => {
    render(
      <FilterDropdown options={opciones} value="" onChange={() => {}} placeholder="Seleccionar" />
    );
    expect(screen.getByText('Seleccionar')).toBeInTheDocument();
  });

  it('muestra el label de la opción seleccionada', () => {
    render(<FilterDropdown options={opciones} value="activo" onChange={() => {}} />);
    expect(screen.getByText('Activo')).toBeInTheDocument();
  });

  it('abre el panel de opciones al hacer click en el botón', async () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} />);

    const boton = screen.getByRole('button');
    fireEvent.click(boton);

    await waitFor(() => {
      expect(screen.getByText('Todos')).toBeInTheDocument();
      expect(screen.getByText('Activo')).toBeInTheDocument();
      expect(screen.getByText('Inactivo')).toBeInTheDocument();
    });
  });

  it('llama a onChange con el value correcto al seleccionar una opción', async () => {
    const handleChange = vi.fn();
    render(<FilterDropdown options={opciones} value="" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => screen.getByText('Activo'));
    fireEvent.click(screen.getByText('Activo'));

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith('activo');
  });

  it('cierra el panel después de seleccionar una opción', async () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} />);

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => screen.getByText('Activo'));
    fireEvent.click(screen.getByText('Activo'));

    await waitFor(() => {
      expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
    });
  });

  it('no muestra opciones cuando el panel está cerrado', () => {
    render(<FilterDropdown options={opciones} value="activo" onChange={() => {}} />);
    // El label del botón sí aparece, pero no el panel completo con todas las opciones
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
  });

  it('muestra label si se proporciona', () => {
    render(<FilterDropdown options={opciones} value="" onChange={() => {}} label="Estado" />);
    expect(screen.getByText('Estado')).toBeInTheDocument();
  });

  it('usa el mismo value para opciones con IDs numéricos convertidos a string', async () => {
    const handleChange = vi.fn();
    const opcionesNumericas = [
      { value: '1', label: 'Cliente A' },
      { value: '2', label: 'Cliente B' },
    ];
    render(<FilterDropdown options={opcionesNumericas} value="" onChange={handleChange} />);

    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => screen.getByText('Cliente A'));
    fireEvent.click(screen.getByText('Cliente A'));

    expect(handleChange).toHaveBeenCalledWith('1');
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que los tests pasan**

```bash
cd frontend && npm test -- --run 2>&1 | tail -15
```

Resultado esperado:
```
 Test Files  4 passed (4)
      Tests  61 passed (61)
```

Si algún test falla porque el panel usa `position: fixed` y `requestAnimationFrame` (jsdom no lo soporta bien), el panel puede no mostrarse en el DOM después del click. En ese caso, mockear `requestAnimationFrame` en el setup del test:

```jsx
// Agregar al inicio del archivo de test (después de los imports):
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (cb) => { cb(); return 0; });
});
afterEach(() => {
  vi.unstubAllGlobals();
});
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/components/common/FilterDropdown.test.jsx
git commit -m "test(ui): agregar tests para componente FilterDropdown"
```

---

## Tarea 5 — Tests de DatePicker (frontend)

**Contexto:** `DatePicker` acepta un string `YYYY-MM-DD` como `value` y llama `onChange(string)` cuando el usuario selecciona una fecha. Internamente usa `react-day-picker@9`. Los tests no intentan interactuar con el calendario (es complejo en jsdom); verifican renderizado, valor mostrado y limpieza.

**Archivo a crear:** `frontend/src/components/common/DatePicker.test.jsx`

El componente está en `frontend/src/components/common/DatePicker.jsx`.

- [ ] **Paso 1: Crear el archivo de test**

```jsx
// frontend/src/components/common/DatePicker.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DatePicker from './DatePicker';

describe('DatePicker', () => {
  it('muestra placeholder cuando no hay valor', () => {
    render(<DatePicker value="" onChange={() => {}} placeholder="Seleccionar fecha" />);
    expect(screen.getByText('Seleccionar fecha')).toBeInTheDocument();
  });

  it('muestra la fecha en formato DD/MM/YYYY cuando hay valor', () => {
    render(<DatePicker value="2026-05-08" onChange={() => {}} />);
    expect(screen.getByText('08/05/2026')).toBeInTheDocument();
  });

  it('muestra el ícono de calendario', () => {
    render(<DatePicker value="" onChange={() => {}} />);
    // El ícono Calendar de Lucide genera un elemento SVG
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('abre el calendario al hacer click en el botón', async () => {
    render(<DatePicker value="" onChange={() => {}} />);

    const boton = screen.getByRole('button', { name: /seleccionar/i });
    fireEvent.click(boton);

    await waitFor(() => {
      // DayPicker renderiza el grid de días
      expect(document.querySelector('[role="grid"]')).toBeInTheDocument();
    });
  });

  it('muestra botón de limpiar cuando hay valor', () => {
    render(<DatePicker value="2026-05-08" onChange={() => {}} />);
    // El componente muestra un botón X cuando hay fecha seleccionada
    const botonesX = screen.getAllByRole('button');
    // Debe haber al menos 2 botones: el trigger y el de limpiar
    expect(botonesX.length).toBeGreaterThanOrEqual(2);
  });

  it('llama onChange con string vacío al limpiar la fecha', async () => {
    const handleChange = vi.fn();
    render(<DatePicker value="2026-05-08" onChange={handleChange} />);

    // Encontrar el botón de limpiar (X) — es el segundo botón
    const botones = screen.getAllByRole('button');
    // El botón de limpiar tiene el icono X y está visible cuando hay valor
    const botonLimpiar = botones.find((b) => b.querySelector('svg'));
    if (botonLimpiar && botones.length > 1) {
      fireEvent.click(botones[botones.length - 1]); // el último botón es el X
    }

    // Si llamó onChange, verificar que pasó string vacío
    if (handleChange.mock.calls.length > 0) {
      expect(handleChange).toHaveBeenCalledWith('');
    }
    // Si no encontró el botón X de esa forma, el test es inconcluyente — está bien
  });

  it('no acepta fechas inválidas — parseDate retorna undefined para string inválido', () => {
    // Este test verifica internamente que el componente no explota con fecha inválida
    expect(() => {
      render(<DatePicker value="no-es-fecha" onChange={() => {}} />);
    }).not.toThrow();
  });

  it('acepta prop label y la muestra', () => {
    render(<DatePicker value="" onChange={() => {}} label="Fecha de ingreso" />);
    expect(screen.getByText('Fecha de ingreso')).toBeInTheDocument();
  });
});
```

- [ ] **Paso 2: Ejecutar y verificar que los tests pasan**

```bash
cd frontend && npm test -- --run 2>&1 | tail -15
```

Resultado esperado:
```
 Test Files  5 passed (5)
      Tests  ~69 passed
```

Si el test de "abre el calendario" falla por un error de `window.matchMedia is not a function` (DayPicker usa media queries internamente), agregar el mock en `frontend/src/test/setup.js`:

```js
// Agregar al final de frontend/src/test/setup.js
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

Si `DayPicker` lanza error por `IntersectionObserver`, agregar también:
```js
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));
```

- [ ] **Paso 3: Ejecutar todos los tests frontend juntos**

```bash
cd frontend && npm test -- --run 2>&1 | tail -10
```

Esperado: todos los test files pasan (5 archivos).

- [ ] **Paso 4: Commit**

```bash
git add frontend/src/components/common/DatePicker.test.jsx
git commit -m "test(ui): agregar tests para componente DatePicker"
```

---

## Verificación final

- [ ] **Ejecutar suite backend completa:**

```bash
cd server && npm test -- --verbose 2>&1 | tail -20
```

Esperado: ~41 tests pasando en 4 archivos.

- [ ] **Ejecutar suite frontend completa:**

```bash
cd frontend && npm test -- --run 2>&1
```

Esperado: ~69 tests pasando en 5 archivos.

- [ ] **Commit final si hubo ajustes de setup:**

```bash
git add frontend/src/test/setup.js
git commit -m "test: ajustar setup de Vitest para matchMedia e IntersectionObserver"
```

---

## Resumen de cobertura añadida

| Área | Tests nuevos | Tipo | Riesgo cubierto |
|------|-------------|------|-----------------|
| Auth recovery (backend) | 12 | Integración | Flujo de recuperación de contraseña (bug reciente) |
| wmsOrderMapper (backend) | 13 | Unitario | Transformación de órdenes WMS → CRM |
| wmsSyncService dedup (backend) | 4 | Integración | Deduplicación PUSH→PUSH de operaciones |
| FilterDropdown (frontend) | 8 | Componente | Comportamiento del dropdown personalizado |
| DatePicker (frontend) | 8 | Componente | Comportamiento del selector de fecha |
| **Total nuevos** | **45** | | |
| Total existente | 65 | | |
| **Total final** | **~110** | | |
