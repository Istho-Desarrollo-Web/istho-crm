# Protección DDoS — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar defensa en profundidad contra DDoS en el backend Express: IP blocklist automática, slow-down progresivo y rate limits ajustados por categoría de endpoint.

**Architecture:** Tres middlewares en capas — `ipBlocklist` rechaza IPs bloqueadas antes de parsear body; `slowDown` añade delay progresivo para disuadir bots; `rateLimiter` aplica hard-block por usuario/IP. Los límites se registran como infracciones; 3 infracciones en 1h bloquean la IP automáticamente 1 hora.

**Tech Stack:** `express-rate-limit@8.3.2` (ya instalado) · `express-slow-down@2` (nuevo) · Node.js in-memory Map para blocklist · Logger Winston existente

---

## Mapa de archivos

| Archivo | Acción | Responsabilidad |
|---|---|---|
| `server/src/middleware/ipBlocklist.js` | Crear | Blocklist en memoria con auto-bloqueo, TTL y extracción de IP |
| `server/src/middleware/slowDown.js` | Crear | Instancias de slow-down por categoría |
| `server/src/middleware/rateLimiter.js` | Modificar | Límites ajustados + nuevos limiters + handler con infracción |
| `server/src/app.js` | Modificar | Nuevo orden de middlewares |
| `server/src/server.js` | Modificar | Aplicar `limiterHealth` a `/health` |
| `server/src/routes/wmsSync.routes.js` | Modificar | Aplicar `limiterWms` al router |
| `server/src/routes/auditorias.routes.js` | Modificar | Aplicar `limiterPesado` al router |
| `server/src/tests/ipBlocklist.test.js` | Crear | Tests unitarios de ipBlocklist (sin DB, sin Express) |

---

## Task 1: Instalar express-slow-down

**Files:**
- Modify: `server/package.json`

- [ ] **Step 1: Instalar el paquete**

```bash
cd server && npm install express-slow-down@2
```

Salida esperada: `added 1 package` (o similar, sin errores).

- [ ] **Step 2: Verificar que aparece en package.json**

```bash
grep "express-slow-down" package.json
```

Salida esperada: `"express-slow-down": "^2.x.x"`

- [ ] **Step 3: Commit**

```bash
git add server/package.json server/package-lock.json
git commit -m "chore: instalar express-slow-down@2 para protección DDoS"
```

---

## Task 2: Crear ipBlocklist.js (TDD)

**Files:**
- Create: `server/src/middleware/ipBlocklist.js`
- Create: `server/src/tests/ipBlocklist.test.js`

### Step 1: Escribir el test

- [ ] **Crear el archivo de test**

Crear `server/src/tests/ipBlocklist.test.js` con el siguiente contenido:

```js
process.env.NODE_ENV = 'test';

const {
  esBloqueada,
  registrarInfraccion,
  bloquearManualmente,
  desbloquear,
  getIpCliente,
  _resetForTests,
  _resetCooldown,
  _setBlockedUntil,
} = require('../middleware/ipBlocklist');

beforeEach(() => {
  _resetForTests();
});

describe('esBloqueada', () => {
  test('retorna false para IP desconocida', () => {
    expect(esBloqueada('1.2.3.4')).toBe(false);
  });

  test('retorna false para bloqueo expirado', () => {
    _setBlockedUntil('1.2.3.4', new Date(Date.now() - 1000));
    expect(esBloqueada('1.2.3.4')).toBe(false);
  });

  test('retorna true para bloqueo vigente', () => {
    bloquearManualmente('1.2.3.4', 1);
    expect(esBloqueada('1.2.3.4')).toBe(true);
  });
});

describe('registrarInfraccion', () => {
  test('no bloquea con 1 infracción', () => {
    registrarInfraccion('2.2.2.2', 'test');
    expect(esBloqueada('2.2.2.2')).toBe(false);
  });

  test('no bloquea con 2 infracciones', () => {
    registrarInfraccion('2.2.2.2', 'test');
    _resetCooldown('2.2.2.2');
    registrarInfraccion('2.2.2.2', 'test');
    expect(esBloqueada('2.2.2.2')).toBe(false);
  });

  test('bloquea la IP tras 3 infracciones', () => {
    registrarInfraccion('3.3.3.3', 'test');
    _resetCooldown('3.3.3.3');
    registrarInfraccion('3.3.3.3', 'test');
    _resetCooldown('3.3.3.3');
    registrarInfraccion('3.3.3.3', 'test');
    expect(esBloqueada('3.3.3.3')).toBe(true);
  });

  test('el cooldown impide contar dos infracciones seguidas como dos', () => {
    registrarInfraccion('4.4.4.4', 'test');
    registrarInfraccion('4.4.4.4', 'test'); // ignorada por cooldown
    registrarInfraccion('4.4.4.4', 'test'); // ignorada por cooldown
    expect(esBloqueada('4.4.4.4')).toBe(false);
  });
});

describe('bloquearManualmente', () => {
  test('bloquea inmediatamente por N horas', () => {
    bloquearManualmente('5.5.5.5', 2);
    expect(esBloqueada('5.5.5.5')).toBe(true);
  });
});

describe('desbloquear', () => {
  test('elimina el bloqueo activo', () => {
    bloquearManualmente('6.6.6.6', 1);
    desbloquear('6.6.6.6');
    expect(esBloqueada('6.6.6.6')).toBe(false);
  });
});

describe('getIpCliente', () => {
  test('retorna req.ip cuando está disponible', () => {
    expect(getIpCliente({ ip: '10.0.0.1', headers: {} })).toBe('10.0.0.1');
  });

  test('retorna "unknown" si no hay IP', () => {
    expect(getIpCliente({ ip: undefined, headers: {} })).toBe('unknown');
  });
});
```

- [ ] **Step 2: Ejecutar el test — verificar que falla con "Cannot find module"**

```bash
cd server && npm test -- --testPathPattern=ipBlocklist --forceExit
```

Salida esperada: `Cannot find module '../middleware/ipBlocklist'`

### Step 3: Implementar ipBlocklist.js

- [ ] **Crear `server/src/middleware/ipBlocklist.js`**

```js
const logger = require('../utils/logger');

const blocklist = new Map();
const infraccionCooldown = new Map();

const COOLDOWN_MS = 10 * 60 * 1000;
const VENTANA_INFRACCIONES_MS = 60 * 60 * 1000;
const MAX_INFRACCIONES = 3;
const BLOQUEO_DURACION_H = 1;

function getIpCliente(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function esBloqueada(ip) {
  const entrada = blocklist.get(ip);
  if (!entrada || !entrada.blockedUntil) return false;
  if (entrada.blockedUntil > new Date()) return true;
  blocklist.delete(ip);
  return false;
}

function registrarInfraccion(ip, motivo = 'rate_limit') {
  const ahora = Date.now();

  const ultimaCooldown = infraccionCooldown.get(ip);
  if (ultimaCooldown && ahora - ultimaCooldown < COOLDOWN_MS) return;
  infraccionCooldown.set(ip, ahora);

  const entrada = blocklist.get(ip) || {
    infracciones: 0,
    primeraInfraccion: new Date(),
  };

  if (ahora - entrada.primeraInfraccion.getTime() > VENTANA_INFRACCIONES_MS) {
    entrada.infracciones = 0;
    entrada.primeraInfraccion = new Date();
  }

  entrada.infracciones++;
  blocklist.set(ip, entrada);

  if (entrada.infracciones >= MAX_INFRACCIONES) {
    bloquearManualmente(ip, BLOQUEO_DURACION_H, motivo);
  }
}

function bloquearManualmente(ip, horas = 1, motivo = 'manual') {
  const existing = blocklist.get(ip) || {
    infracciones: MAX_INFRACCIONES,
    primeraInfraccion: new Date(),
  };
  const blockedUntil = new Date(Date.now() + horas * 60 * 60 * 1000);
  blocklist.set(ip, { ...existing, blockedUntil, reason: motivo });
  logger.warn(`[BLOCKLIST] IP ${ip} bloqueada ${horas}h — motivo: ${motivo}`);
}

function desbloquear(ip) {
  blocklist.delete(ip);
  infraccionCooldown.delete(ip);
  logger.info(`[BLOCKLIST] IP ${ip} desbloqueada`);
}

const ipBlocklistMiddleware = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  const ip = getIpCliente(req);
  if (esBloqueada(ip)) {
    logger.warn(`[BLOCKLIST] Rechazada IP bloqueada: ${ip}`);
    return res.status(403).json({
      success: false,
      message: 'Acceso temporalmente restringido.',
      code: 'IP_BLOCKED',
    });
  }
  next();
};

setInterval(() => {
  const ahora = new Date();
  const ahoraMs = ahora.getTime();
  for (const [ip, entrada] of blocklist) {
    if (!entrada.blockedUntil || entrada.blockedUntil <= ahora) {
      blocklist.delete(ip);
    }
  }
  for (const [ip, ts] of infraccionCooldown) {
    if (ahoraMs - ts > VENTANA_INFRACCIONES_MS) {
      infraccionCooldown.delete(ip);
    }
  }
}, 5 * 60 * 1000);

function _resetForTests() {
  blocklist.clear();
  infraccionCooldown.clear();
}

function _resetCooldown(ip) {
  infraccionCooldown.delete(ip);
}

function _setBlockedUntil(ip, date) {
  blocklist.set(ip, {
    blockedUntil: date,
    infracciones: MAX_INFRACCIONES,
    primeraInfraccion: new Date(),
    reason: 'test',
  });
}

module.exports = {
  getIpCliente,
  esBloqueada,
  registrarInfraccion,
  bloquearManualmente,
  desbloquear,
  ipBlocklistMiddleware,
  _resetForTests,
  _resetCooldown,
  _setBlockedUntil,
};
```

- [ ] **Step 4: Ejecutar los tests — verificar que pasan**

```bash
cd server && npm test -- --testPathPattern=ipBlocklist --forceExit
```

Salida esperada: `Tests: 9 passed, 9 total`

- [ ] **Step 5: Commit**

```bash
git add server/src/middleware/ipBlocklist.js server/src/tests/ipBlocklist.test.js
git commit -m "feat: módulo ipBlocklist con auto-bloqueo en memoria y TTL"
```

---

## Task 3: Crear slowDown.js

**Files:**
- Create: `server/src/middleware/slowDown.js`

> No se escriben tests de integración para slow-down: requeriría hacer 80+ requests en un test. Se confía en los tests del paquete `express-slow-down`. La verificación es manual vía `curl`.

- [ ] **Step 1: Crear `server/src/middleware/slowDown.js`**

```js
const { slowDown } = require('express-slow-down');
const { keyGeneratorAutenticado } = require('./rateLimiter');

const ventana = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10);
const windowMs = ventana * 60 * 1000;

const skipSiemprePermitidos = (req) =>
  req.path === '/health' || req.path.startsWith('/socket.io');

// General: delay desde request 80, +100ms por request adicional, máx 2s
const slowDownGeneral = slowDown({
  windowMs,
  delayAfter: 80,
  delayMs: (hits) => hits * 100,
  maxDelayMs: 2000,
  keyGenerator: keyGeneratorAutenticado,
  skip: skipSiemprePermitidos,
});

// Login: delay desde request 5, +200ms por request adicional, máx 2s
const slowDownLogin = slowDown({
  windowMs,
  delayAfter: 5,
  delayMs: (hits) => hits * 200,
  maxDelayMs: 2000,
});

// Exportaciones: delay desde request 10, +150ms por request adicional, máx 2s
const slowDownExport = slowDown({
  windowMs,
  delayAfter: 10,
  delayMs: (hits) => hits * 150,
  maxDelayMs: 2000,
  keyGenerator: keyGeneratorAutenticado,
});

// Endpoints pesados (búsquedas bulk, auditorías): delay desde request 30
const slowDownPesado = slowDown({
  windowMs,
  delayAfter: 30,
  delayMs: (hits) => hits * 100,
  maxDelayMs: 2000,
  keyGenerator: keyGeneratorAutenticado,
});

module.exports = { slowDownGeneral, slowDownLogin, slowDownExport, slowDownPesado };
```

- [ ] **Step 2: Verificar que el módulo carga sin errores**

```bash
cd server && node -e "require('./src/middleware/slowDown'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/slowDown.js
git commit -m "feat: slow-down progresivo por categoría de endpoint"
```

---

## Task 4: Actualizar rateLimiter.js

**Files:**
- Modify: `server/src/middleware/rateLimiter.js`

Reemplazar el contenido completo del archivo.

- [ ] **Step 1: Reemplazar `server/src/middleware/rateLimiter.js`**

```js
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const logger = require('../utils/logger');
const { getIpCliente, registrarInfraccion } = require('./ipBlocklist');

const ventana = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10);
const windowMs = ventana * 60 * 1000;

const maxGeneral =
  process.env.NODE_ENV === 'production'
    ? parseInt(process.env.RATE_LIMIT_MAX || '200', 10)
    : 600;

const mensajeError = (limite) => ({
  success: false,
  message: `Demasiadas solicitudes. Intente de nuevo en ${ventana} minutos.`,
  code: 'RATE_LIMIT_EXCEEDED',
  limite,
});

const keyGeneratorAutenticado = (req) => {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const payload = JSON.parse(
        Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString()
      );
      if (payload?.id) return `user:${payload.id}`;
    }
  } catch {
    // cae a IP
  }
  return getIpCliente(req);
};

const handlerConInfraccion = (motivo) => (req, res, next, options) => {
  const ip = getIpCliente(req);
  registrarInfraccion(ip, motivo);
  logger.warn(`[RATE_LIMIT] Hard block — limiter: ${motivo} — IP: ${ip}`);
  res.status(options.statusCode).json(options.message);
};

// General: 200 req / 15 min en producción, 600 en desarrollo
const limiterGeneral = rateLimit({
  windowMs,
  max: maxGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGeneratorAutenticado,
  message: mensajeError(maxGeneral),
  handler: handlerConInfraccion('general'),
});

// Login: 10 intentos / 15 min por IP
const limiterLogin = rateLimit({
  windowMs,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(10),
  handler: handlerConInfraccion('login'),
});

// Recuperación de contraseña: 5 / 15 min por IP
const limiterForgotPassword = rateLimit({
  windowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(5),
});

// Exportación de reportes: 20 / 15 min por usuario
const limiterExport = rateLimit({
  windowMs,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGeneratorAutenticado,
  message: mensajeError(20),
});

// Verificación TOTP: 5 / 15 min por IP
const limiterTotp = rateLimit({
  windowMs,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(5),
  handler: handlerConInfraccion('totp'),
});

// Endpoints pesados (búsquedas bulk, auditorías): 60 / 15 min por usuario
const limiterPesado = rateLimit({
  windowMs,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGeneratorAutenticado,
  message: mensajeError(60),
  handler: handlerConInfraccion('pesado'),
});

// WMS PUSH: 120 req / 1 min por API Key
const limiterWms = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-wms-api-key'] || getIpCliente(req),
  message: mensajeError(120),
});

// Health check: 60 req / 1 min por IP
const limiterHealth = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(60),
});

module.exports = {
  limiterGeneral,
  limiterLogin,
  limiterForgotPassword,
  limiterExport,
  limiterTotp,
  limiterPesado,
  limiterWms,
  limiterHealth,
  keyGeneratorAutenticado,
};
```

- [ ] **Step 2: Verificar que el módulo carga sin errores**

```bash
cd server && node -e "require('./src/middleware/rateLimiter'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Step 3: Commit**

```bash
git add server/src/middleware/rateLimiter.js
git commit -m "feat: ajustar límites rate limiter y agregar limiterPesado/Wms/Health"
```

---

## Task 5: Actualizar app.js — nueva cadena de middlewares

**Files:**
- Modify: `server/src/app.js`

- [ ] **Step 1: Agregar imports al inicio de app.js**

Localizar el bloque de imports existente (aprox línea 15–23) y agregar las dos líneas nuevas:

```js
// Líneas existentes:
const logger = require('./utils/logger');
const { notFound } = require('./utils/responses');
const {
  handleSequelizeError,
  handleValidationError,
  handleGenericError,
} = require('./middleware/errorHandler');
const { limiterGeneral } = require('./middleware/rateLimiter');

// AGREGAR después de limiterGeneral:
const { ipBlocklistMiddleware } = require('./middleware/ipBlocklist');
const { slowDownGeneral } = require('./middleware/slowDown');
```

- [ ] **Step 2: Reemplazar el bloque de seguridad en app.js**

Localizar y reemplazar este bloque completo (desde el comentario `// Rate limiting general` hasta el cierre `}`):

```js
// ANTES — reemplazar este bloque:
// Rate limiting general — va DESPUÉS de CORS para que los 429 incluyan Access-Control-Allow-Origin
// En desarrollo se omite para no bloquear con los pollers activos (SesionesActivas, notificaciones)
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.path === '/health') return next();
    // Socket.IO polling maneja su propio flujo — excluir de rate limit general
    if (req.path.startsWith('/socket.io')) return next();
    return limiterGeneral(req, res, next);
  });
}

// DESPUÉS — nuevo bloque:
// IP Blocklist — rechazo inmediato antes de parsear body
app.use(ipBlocklistMiddleware);

// Slow-down progresivo (skip: /health y /socket.io tienen su propio manejo)
app.use(slowDownGeneral);

// Rate limit general — activo en todos los entornos (600/15min en dev, 200 en prod)
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  if (req.path.startsWith('/socket.io')) return next();
  if (process.env.NODE_ENV === 'test') return next();
  return limiterGeneral(req, res, next);
});
```

- [ ] **Step 3: Verificar que el servidor arranca sin errores**

```bash
cd server && node -e "require('./src/app'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Step 4: Commit**

```bash
git add server/src/app.js
git commit -m "feat: agregar ipBlocklist y slowDown a cadena de middlewares"
```

---

## Task 6: Aplicar limiterHealth en server.js

**Files:**
- Modify: `server/server.js`

- [ ] **Step 1: Agregar import de limiterHealth en server.js**

Localizar la línea de require al inicio de `server.js` (no hay imports de rateLimiter actualmente). Agregar después del `require('./src/app')`:

```js
const { limiterHealth } = require('./src/middleware/rateLimiter');
```

- [ ] **Step 2: Actualizar la ruta /health para aplicar el limiter**

Localizar en `server.js` la definición de la ruta `/health`:

```js
// ANTES:
app.get('/health', (req, res) => {

// DESPUÉS:
app.get('/health', limiterHealth, (req, res) => {
```

- [ ] **Step 3: Verificar que el módulo carga sin errores**

```bash
cd server && node -e "
  process.env.JWT_SECRET='testsecret32charsminimum123456789';
  process.env.DB_NAME='x'; process.env.DB_USER='x'; process.env.DB_HOST='x';
  require('./server.js');
  setTimeout(() => process.exit(0), 500);
" 2>&1 | head -20
```

Salida esperada: sin errores de require (puede haber error de conexión a DB — eso es esperado).

- [ ] **Step 4: Commit**

```bash
git add server/server.js
git commit -m "feat: aplicar limiterHealth (60 req/min) al endpoint /health"
```

---

## Task 7: Aplicar limiterWms a rutas WMS PUSH

**Files:**
- Modify: `server/src/routes/wmsSync.routes.js`

- [ ] **Step 1: Agregar import de limiterWms en wmsSync.routes.js**

Localizar los imports al inicio del archivo y agregar:

```js
const { limiterWms } = require('../middleware/rateLimiter');
```

- [ ] **Step 2: Aplicar limiterWms al router antes de verificarApiKey**

Localizar en el archivo la sección del middleware `verificarApiKey` y agregar `limiterWms` justo antes:

```js
// AGREGAR antes de la línea donde se usa verificarApiKey en las rutas:
router.use(limiterWms);
```

La línea debe quedar ANTES de cualquier `router.use(verificarApiKey)` o `router.post(..., verificarApiKey, ...)`.

- [ ] **Step 3: Verificar que el módulo carga**

```bash
cd server && node -e "require('./src/routes/wmsSync.routes'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/wmsSync.routes.js
git commit -m "feat: aplicar limiterWms (120 req/min) a endpoints WMS PUSH"
```

---

## Task 8: Aplicar limiterPesado + slowDownPesado a rutas de auditorías

**Files:**
- Modify: `server/src/routes/auditorias.routes.js`

- [ ] **Step 1: Agregar imports en auditorias.routes.js**

Localizar los imports existentes y agregar:

```js
const { limiterPesado } = require('../middleware/rateLimiter');
const { slowDownPesado } = require('../middleware/slowDown');
```

- [ ] **Step 2: Aplicar los middlewares al router después de verificarToken**

Localizar en `auditorias.routes.js` las líneas:

```js
router.use(verificarToken);
router.use(filtrarPorCliente);
```

Agregar inmediatamente después:

```js
router.use(slowDownPesado);
router.use(limiterPesado);
```

- [ ] **Step 3: Verificar que el módulo carga**

```bash
cd server && node -e "require('./src/routes/auditorias.routes'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/auditorias.routes.js
git commit -m "feat: aplicar slowDownPesado + limiterPesado a rutas de auditorías WMS"
```

---

## Task 9: Aplicar slowDownLogin a ruta de login

**Files:**
- Modify: `server/src/routes/auth.routes.js`

- [ ] **Step 1: Agregar import de slowDownLogin en auth.routes.js**

Localizar el import de rate limiters (línea 31 aprox):

```js
// ANTES:
const { limiterLogin, limiterForgotPassword, limiterTotp } = require('../middleware/rateLimiter');

// DESPUÉS — agregar la línea de slowDown:
const { limiterLogin, limiterForgotPassword, limiterTotp } = require('../middleware/rateLimiter');
const { slowDownLogin } = require('../middleware/slowDown');
```

- [ ] **Step 2: Agregar slowDownLogin a la ruta POST /login**

Localizar (línea 42 aprox):

```js
// ANTES:
router.post('/login', limiterLogin, loginValidator, authController.login);

// DESPUÉS:
router.post('/login', slowDownLogin, limiterLogin, loginValidator, authController.login);
```

- [ ] **Step 3: Verificar que el módulo carga**

```bash
cd server && node -e "require('./src/routes/auth.routes'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/auth.routes.js
git commit -m "feat: aplicar slowDownLogin (delay desde req 5) a ruta de login"
```

---

## Task 10: Aplicar slowDownExport a rutas de exportación

**Files:**
- Modify: `server/src/routes/reporte.routes.js`

- [ ] **Step 1: Agregar import de slowDownExport en reporte.routes.js**

Localizar el import de rate limiters al inicio del archivo:

```js
// ANTES:
const { limiterExport } = require('../middleware/rateLimiter');

// DESPUÉS:
const { limiterExport } = require('../middleware/rateLimiter');
const { slowDownExport } = require('../middleware/slowDown');
```

- [ ] **Step 2: Agregar slowDownExport antes de limiterExport**

Localizar en el archivo (aprox línea 21):

```js
// ANTES:
router.use(/\/(excel|pdf|csv)$/, limiterExport);

// DESPUÉS:
router.use(/\/(excel|pdf|csv)$/, slowDownExport, limiterExport);
```

- [ ] **Step 3: Verificar que el módulo carga**

```bash
cd server && node -e "require('./src/routes/reporte.routes'); console.log('OK')"
```

Salida esperada: `OK`

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/reporte.routes.js
git commit -m "feat: aplicar slowDownExport (delay desde req 10) a exportaciones"
```

---

## Task 11: Verificación final

- [ ] **Step 1: Ejecutar todos los tests**

```bash
cd server && npm test -- --forceExit
```

Salida esperada: todos los tests pasan (incluyendo los nuevos de ipBlocklist).

- [ ] **Step 2: Verificar el servidor arranca correctamente en desarrollo**

```bash
cd server && npm run dev
```

Verificar en consola:
- Sin errores de módulo no encontrado
- Línea `Servidor HTTP iniciado` aparece
- Sin errores de circular dependency

- [ ] **Step 3: Smoke test del endpoint /health con curl**

```bash
curl -s http://localhost:5000/health | python -m json.tool
```

Salida esperada:
```json
{
  "success": true,
  "message": "ISTHO CRM API está funcionando",
  ...
}
```

- [ ] **Step 4: Verificar headers de rate limit en respuesta**

```bash
curl -I http://localhost:5000/health
```

Verificar que aparecen los headers:
```
RateLimit-Limit: 60
RateLimit-Remaining: 59
RateLimit-Reset: <timestamp>
```

- [ ] **Step 5: Commit final si hay cambios pendientes**

```bash
git add -A
git status  # verificar qué hay pendiente
git commit -m "feat: protección DDoS completa — blocklist, slow-down y rate limits ajustados"
```
