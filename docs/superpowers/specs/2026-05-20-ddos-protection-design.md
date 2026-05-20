# Diseño: Protección DDoS — CenthriX CRM

**Fecha:** 2026-05-20  
**Estado:** Aprobado  
**Alcance:** Backend Express (App Runner) — defensa en profundidad sin Redis

---

## Contexto

El backend de CenthriX corre en AWS App Runner expuesto directamente a internet (sin CDN ni proxy intermedio). Cloudflare está planificado para cuando se adquiera dominio propio; hasta entonces la protección debe implementarse completamente a nivel de aplicación.

**Restricciones:**
- Sin Redis en producción (limitación de VPC — App Runner + RDS en VPC privada sin NAT Gateway hacia Upstash)
- Sin cambios de infraestructura
- La solución debe ser compatible con Cloudflare cuando llegue (1 cambio de configuración)

**Paquete nuevo requerido:** `express-slow-down` (mismo ecosistema que `express-rate-limit` ya instalado)

---

## Arquitectura

### Archivos

```
server/src/middleware/
  rateLimiter.js     ← MODIFICAR: nuevos límites + onLimitReached registra infracción
  slowDown.js        ← CREAR: slow-down progresivo por categoría
  ipBlocklist.js     ← CREAR: blocklist en memoria con auto-bloqueo y TTL
server/src/app.js    ← MODIFICAR: nuevo orden de middlewares
```

### Cadena de middlewares (orden crítico)

```
CORS
Helmet
IP Blocklist          ← rechazo antes de parsear body (máxima eficiencia)
Slow-down general
Rate limit general
Body parsing
Morgan
Routes                ← cada ruta aplica su limiter específico
```

---

## Módulo: `ipBlocklist.js`

### Estructura de datos

```js
// Map en memoria
// clave: IP string ("190.5.12.88")
// valor: { blockedUntil: Date, reason: string, infracciones: number, primeraInfraccion: Date }
const blocklist = new Map()
```

### API pública

| Función | Descripción |
|---|---|
| `esBloqueada(ip)` | Retorna `true` si la IP tiene bloqueo vigente |
| `registrarInfraccion(ip, motivo)` | Suma 1 infracción; si llega a 3 en < 1h, bloquea automáticamente 1h |
| `bloquearManualmente(ip, horas)` | Bloqueo inmediato (para uso futuro desde UI admin) |
| `desbloquear(ip)` | Elimina bloqueo |
| `getIpCliente(req)` | Extrae IP real — centraliza la lógica para Cloudflare-ready |

### Auto-bloqueo

```
Infracción 1 → registrar timestamp
Infracción 2 → registrar
Infracción 3 → si (now - primeraInfraccion) < 1h → bloquear 1h
             → sino → resetear contador (infracciones antiguas no cuentan)
```

### Cloudflare-ready

`getIpCliente(req)` hoy retorna `req.ip` (X-Forwarded-For via trust proxy). Cuando llegue Cloudflare, se actualiza solo esta función para leer `req.headers['cf-connecting-ip']` primero — ningún otro middleware cambia.

### Limpieza automática

`setInterval` cada 5 minutos purga entradas con `blockedUntil` expirado para evitar crecimiento ilimitado del Map.

### Respuesta al bloqueo

```json
HTTP 403
{ "success": false, "message": "Acceso temporalmente restringido.", "code": "IP_BLOCKED" }
```

Sin `Retry-After` header — no revelar el TTL al atacante.

---

## Módulo: `slowDown.js`

Usa `express-slow-down` v2.x. Aplica delay progresivo **antes** del hard-block del rate limiter.

### Configuración por categoría

| Categoría | Delay inicia en | Incremento | Máximo |
|---|---|---|---|
| General autenticado | request 80 | +100ms cada req | 2000ms |
| Login | request 5 | +200ms cada req | 2000ms |
| Exportaciones | request 10 | +150ms cada req | 2000ms |
| Endpoints pesados | request 30 | +100ms cada req | 2000ms |

**Comportamiento:** El atacante recibe respuestas válidas pero cada vez más lentas. No sabe con certeza si fue detectado. El delay aplica por IP (o por usuario si está autenticado).

---

## Módulo: `rateLimiter.js` (actualizado)

### Tabla de límites

| Limiter | Ventana | Máximo | Key | onLimitReached |
|---|---|---|---|---|
| `limiterGeneral` | 15 min | 200 req | usuario o IP | `registrarInfraccion` |
| `limiterLogin` | 15 min | 10 req | IP | `registrarInfraccion` |
| `limiterForgotPassword` | 15 min | 5 req | IP | — |
| `limiterTotp` | 15 min | 5 req | IP | `registrarInfraccion` |
| `limiterExport` | 15 min | 20 req | usuario o IP | — |
| `limiterPesado` | 15 min | 60 req | usuario o IP | `registrarInfraccion` |
| `limiterWms` | 1 min | 120 req | API Key header | — |
| `limiterHealth` | 1 min | 60 req | IP | — |

**`onLimitReached`:** Cuando aplica, llama a `ipBlocklist.registrarInfraccion(ip, motivo)`. Tras 3 infracciones en 1h, la IP queda bloqueada automáticamente.

### Cambio importante

El limiter general pasa a aplicar **también en desarrollo** con límites 3x más altos (600 req/15 min en dev vs 200 en producción) para detectar patrones durante desarrollo sin bloquear el trabajo normal.

---

## Actualización de `app.js`

```js
// Orden actualizado:
app.use(cors(corsOptions))
app.use(helmet({ ... }))

// IP Blocklist — primer rechazo, antes de todo
app.use(ipBlocklistMiddleware)

// Slow-down + Rate limit general
app.use(slowDownGeneral)
app.use(limiterGeneral)  // solo endpoints que no son /health ni /socket.io

// Body parsing, Morgan, rutas — igual que hoy
```

El health check recibe su propio `limiterHealth` directamente en la definición de la ruta en `server.js`.

---

## Logging de seguridad

Todos los eventos usan el `logger` existente (sin tablas nuevas):

| Evento | Nivel | Mensaje |
|---|---|---|
| IP bloqueada automáticamente | `warn` | `[BLOCKLIST] IP x.x.x.x bloqueada 1h (3 infracciones)` |
| Hard block rate limit | `warn` | `[RATE_LIMIT] IP x.x.x.x — limiter: login` |
| Slow-down activado (>50% límite) | `info` | `[SLOW_DOWN] IP x.x.x.x — delay Xms` |
| Desbloqueo manual | `info` | `[BLOCKLIST] IP x.x.x.x desbloqueada manualmente` |

---

## Compatibilidad con Cloudflare (futuro)

Cuando se configure Cloudflare:
1. Actualizar `getIpCliente(req)` en `ipBlocklist.js` para leer `CF-Connecting-IP`
2. Cambiar `app.set('trust proxy', 1)` a las IPs de Cloudflare
3. El rate limiter y el blocklist automáticamente usarán la IP real del visitante

No hay cambios en las rutas, controladores ni lógica de negocio.

---

## Lo que NO incluye este diseño

- Blocklist persistida en MySQL (Opción C — over-engineered para el tráfico actual)
- Panel de administración de IPs bloqueadas (queda como mejora futura)
- Redis store (no disponible en producción; la solución es MemoryStore)
- Socket.IO rate limiting (el adaptador de Socket.IO maneja su propia protección de conexión)
