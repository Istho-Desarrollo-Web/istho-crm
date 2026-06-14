# Contexto CRM CenthriX — ISTHO S.A.S.

> Documento de contexto para proyecto Claude.ai. Cubre arquitectura, módulos, modelos, API, roles, convenciones críticas e infraestructura del CRM CenthriX.

---

## ¿Qué es CenthriX?

CenthriX es el CRM interno de **ISTHO S.A.S.** (Girardota, Antioquia, Colombia), empresa de logística, transporte y almacenamiento. Gestiona operaciones de bodega (entradas/salidas/kardex), inventario, clientes, viajes de conductores, cajas menores, solicitudes del portal cliente y reportes. Integrado bidireccionalmente con el **WMS Centhrix** (sistema de gestión de bodega móvil).

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js + Express + Sequelize 6 + MySQL 8.0 (AWS RDS) |
| Frontend | React 19 + Vite + Tailwind CSS 4 + Material UI 7 + Lucide Icons |
| Auth | JWT dual-token (access 24h / refresh 7d) + 2FA/TOTP |
| Email | Gmail SMTP + Nodemailer + Handlebars (Resend como backup) |
| Archivos | Multer + Amazon S3 bucket `istho-crm-files` (presigned URLs 15 min) |
| Exportación | ExcelJS (XLSX) + PDFKit (PDF) |
| Tiempo real | Socket.IO + Redis Upstash (opcional, multi-instancia) |
| Infra | AWS App Runner (backend) · Vercel (frontend) · RDS MySQL (db.t3.micro) |

**Puertos locales:** backend 5000 · frontend 5173

---

## Arquitectura del backend

### Flujo de request
```
Routes → verifyToken → cargarCachePermisos → requierePermiso → Controllers → Services → Models
```

- `/auth/refresh` NO lleva auth middleware
- Helpers de respuesta: `success(res, data)` · `paginated()` · `error()` · `notFound()`
- 3er arg del helper: string = mensaje personalizado, número = status HTTP
- Auditoría **obligatoria** en todo write: `Auditoria.registrar({ tabla, registro_id, accion, usuario_id })`
- Migraciones automáticas con **Umzug** en cada startup. NUNCA usar `sync({ alter: true })`
- Seeds idempotentes en cada startup vía `initializeDatabase()`
- `registerErrorHandlers()` DESPUÉS de todas las rutas. Health check ANTES de error handlers

### Variables de entorno clave
```
JWT_SECRET            # ≥32 chars, obligatorio — lanza error en startup si falta
CORS_ORIGIN           # URL exacta Vercel sin / final
WMS_API_KEY           # Clave para webhooks PUSH del WMS
WMS_BASE_URL          # URL base del WMS
WMS_SYNC_INTERVAL     # Minutos entre polling PULL
REDIS_URL             # Opcional — activa Socket.IO multi-instancia
# En producción: IAM Instance Role para S3 (NO configurar claves AWS en env)
```

---

## Módulos del frontend (15 módulos)

| Módulo | Ruta(s) | Descripción |
|--------|---------|-------------|
| Auth | `/login`, `/forgot-password`, `/reset-password` | Login con 2FA/TOTP, recuperación de contraseña, bloqueo 5 intentos |
| Dashboard | `/dashboard` | 3 variantes: operaciones (admin/sup/op/cliente), conductor, financiera |
| Clientes | `/clientes`, `/clientes/:id` | Lista paginada, detalle con tabs (info, contactos, usuarios portal, operaciones, inventario) |
| Inventario | `/inventario`, `/inventario/productos/:id` | Lista con alertas. Detalle con movimientos, cajas, ubicación WMS |
| Entradas | `/operaciones/entradas`, `/operaciones/entradas/:id` | Recepción, verificación por línea, averías con fotos, documentos |
| Salidas | `/operaciones/salidas`, `/operaciones/salidas/:id` | Despacho, reserva automática de stock |
| Kardex | `/operaciones/kardex`, `/operaciones/kardex/:id` | Ajustes de inventario (manuales y WMS) |
| Viajes | `/viajes/viajes`, `/viajes/vehiculos`, `/viajes/cajas-menores`, `/viajes/movimientos` | Viajes, vehículos, cajas menores, movimientos de caja |
| Solicitudes | `/solicitudes` | Portal cliente: avisos de ingreso y solicitudes de despacho. Vista interna para gestión |
| Reportes | `/reportes`, `/reportes/operaciones`, `/reportes/inventario`, etc. | 10 reportes exportables Excel/PDF + reportes programados |
| Notificaciones | `/notificaciones` | Centro de notificaciones en tiempo real |
| Plantillas Email | `/plantillas-email` | Editor Handlebars, vista previa, tipos de plantilla |
| Administración | `/administracion` | Usuarios, roles, permisos, sesiones, dashboard de seguridad |
| Auditoría | `/auditoria-acciones` | Log completo de acciones del sistema |
| Config WMS | `/configuracion-wms` | Parámetros de integración + dashboard de logs de sync |

---

## Modelos de base de datos (33 modelos)

> Convención global: `underscored: true` → columna `created_at` = propiedad JS `createdAt`

### Usuarios y roles
| Modelo | Tabla | Campos clave |
|--------|-------|-------------|
| `Usuario` | `usuarios` | `id`, `nombre`, `apellido`, `email`, `password_hash`, `rol_id`, `cliente_id`, `es_cliente`, `permisos_cliente` (JSON), `ultimo_acceso`, `intentos_fallidos`, `bloqueado_hasta`, `totp_secret`, `totp_habilitado`, `totp_backup_codes` (JSON) |
| `Rol` | `roles` | `id`, `nombre`, `codigo`, `nivel_jerarquia`, `es_sistema`, `color` |
| `Permiso` | `permisos` | `id`, `modulo`, `accion`, `descripcion`, `grupo` |
| `RolPermiso` | `rol_permisos` | `rol_id`, `permiso_id` (N:M) |
| `PasswordHistorico` | `password_historicos` | `usuario_id`, `password_hash` |
| `TokenBlacklist` | `token_blacklist` | `usuario_id`, `token`, `fecha_revocacion` |

### Clientes
| Modelo | Tabla | Campos clave |
|--------|-------|-------------|
| `Cliente` | `clientes` | `id`, `codigo_cliente`, `razon_social`, `nit`, `direccion`, `ciudad`, `estado` (activo/inactivo/suspendido), `tipo_cliente`, `codigo_wms` |
| `Contacto` | `contactos` | `cliente_id`, `nombre`, `email`, `cargo`, `es_principal`, `recibe_notificaciones` |
| `ClienteResponsable` | `cliente_responsables` | `cliente_id`, `usuario_id` |

### Operaciones WMS
| Modelo | Tabla | Campos clave |
|--------|-------|-------------|
| `Operacion` | `operaciones` | `id`, `numero_operacion`, `tipo` (ingreso/salida/kardex), `cliente_id`, `documento_wms`, `wms_order_id` (UUID), `fecha_documento`, `estado` (pendiente/en_proceso/cerrado/anulado), `editado_admin` (bool), `cerrado_por` |
| `OperacionDetalle` | `operacion_detalle` | `operacion_id`, `inventario_id`, `sku`, `cantidad`, `cantidad_averia`, `lote`, `fecha_vencimiento`, `verificado` |
| `OperacionAveria` | `operacion_averias` | `operacion_id`, `detalle_id`, `sku`, `cantidad`, `tipo_averia`, `descripcion`, `foto_url` |
| `OperacionDocumento` | `operacion_documentos` | `operacion_id`, `archivo_url`, `s3_key`, `tipo`, `subido_por` |

### Inventario
| Modelo | Tabla | Campos clave |
|--------|-------|-------------|
| `Inventario` | `inventario` | `id`, `cliente_id`, `sku` (UNIQUE per cliente), `producto`, `categoria`, `cantidad`, `cantidad_reservada`, `stock_minimo`, `precio_unitario`, `fecha_vencimiento`, `wms_product_id`, `alertas_silenciadas` (JSON) |
| `CajaInventario` | `caja_inventario` | `inventario_id`, `operacion_id`, `numero_caja`, `cantidad`, `lote`, `ubicacion`, `estado`, `wms_pallet_id`, `wms_kardex_ultima_sync` |
| `MovimientoInventario` | `movimientos_inventario` | `inventario_id`, `usuario_id`, `operacion_id`, `tipo` (entrada/salida/reserva/ajuste/kardex_wms), `cantidad`, `motivo`, `stock_anterior`, `stock_resultante` |

### Viajes y logística
| Modelo | Tabla | Campos clave |
|--------|-------|-------------|
| `Vehiculo` | `vehiculos` | `id`, `placa` (UNIQUE), `tipo`, `marca`, `modelo`, `anio`, `capacidad`, `conductor_id`, `estado` |
| `Viaje` | `viajes` | `id`, `numero`, `fecha`, `vehiculo_id`, `conductor_id`, `caja_menor_id`, `cliente_nombre`, `origen`, `destino`, `estado` (pendiente/completado/anulado), `odometro_inicio`, `odometro_fin` |
| `CajaMenor` | `cajas_menores` | `id`, `numero`, `asignado_a`, `creado_por`, `saldo_inicial`, `saldo_actual`, `total_ingresos`, `total_egresos`, `estado` (abierta/en_revision/cerrada), `caja_anterior_id` |
| `MovimientoCajaMenor` | `movimientos_caja_menor` | `caja_menor_id`, `viaje_id`, `tipo` (ingreso/egreso), `concepto`, `monto`, `soporte_url`, `estado_aprobacion` (pendiente_aprobacion/aprobado/rechazado), `aprobado_por` |

### Solicitudes (portal cliente)
| Modelo | Tabla | Campos clave |
|--------|-------|-------------|
| `Solicitud` | `solicitudes` | `id`, `numero_solicitud`, `tipo` (ingreso/despacho), `cliente_id`, `creado_por`, `estado` (recibida/en_proceso/completada/rechazada), `prioridad`, `operacion_id` (FK al vincular) |
| `SolicitudDetalle` | `solicitud_detalles` | `solicitud_id`, `sku`, `descripcion`, `cantidad`, `unidad_medida` |
| `SolicitudComentario` | `solicitud_comentarios` | `solicitud_id`, `usuario_id`, `texto` |
| `SolicitudDocumento` | `solicitud_documentos` | `solicitud_id`, `s3_key`, `nombre_original` |

### Auditoría, notificaciones y config
| Modelo | Tabla | Campos clave |
|--------|-------|-------------|
| `Auditoria` | `auditorias` | `tabla`, `registro_id`, `accion` (crear/actualizar/eliminar), `usuario_id`, `valores_anterior` (JSON), `valores_nuevo` (JSON), `ip_address` |
| `Notificacion` | `notificaciones` | `usuario_id`, `tipo`, `titulo`, `mensaje`, `accion_url`, `prioridad`, `leida`, `fecha_lectura` |
| `PlantillaEmail` | `plantillas_email` | `nombre`, `tipo`, `asunto`, `cuerpo_html` (Handlebars), `firma_habilitada`, `firma_html`, `activa`, `variables_disponibles` |
| `ReporteProgramado` | `reportes_programados` | `nombre`, `tipo_reporte`, `filtros` (JSON), `frecuencia` (diaria/semanal/mensual), `destinatarios` (JSON), `proximo_envio`, `activo` |
| `WmsSyncLog` | `wms_sync_logs` | `tipo_sync`, `origen` (push/polling), `wms_order_id`, `documento`, `payload` (JSON — solo PUSH), `estado` (exito/error/duplicado) |
| `ConfiguracionWms` | `configuracion_wms` | `codigo` (UNIQUE), `nombre`, `valor`, `tipo` (string/boolean/number), `es_activo` |
| `BackupRegistro` | `backup_registros` | `tabla`, `registro_id`, `datos_backup` (JSON), `motivo`, `usuario_id` |

---

## API REST — Grupos de endpoints

**Base URL:** `/api/v1/`
**Auth:** `Authorization: Bearer <token>` (excepto `/auth/refresh` y endpoints WMS)

| Grupo | Prefijo | Endpoints destacados |
|-------|---------|---------------------|
| Auth | `/auth` | `POST /login`, `POST /refresh`, `POST /logout`, `POST /solicitar-reset`, `POST /resetear-password`, `POST /2fa/validar`, `POST /2fa/setup`, `POST /2fa/activar` |
| Clientes | `/clientes` | CRUD + `/importar` + `/:id/contactos` + `/:id/usuarios` + `/:id/usuarios/:uid/permisos` |
| Inventario | `/inventario` | CRUD + `/alertas` + `/:id/movimientos` + `/:id/cajas` + `/:id/ajustar` + `/importar` |
| Operaciones | `/operaciones` | CRUD + `/:id/cerrar` + `/:id/averias` (multipart) + `/:id/documentos` + `DELETE /:id` (anular, body `{ motivo }`) + `PATCH /:id/editar-admin` |
| Auditorías WMS | `/auditorias` | `GET /entradas\|salidas\|kardex` + `/:id` + `/:tipo/excel` + `/:id/lineas/:lineaId/verificar` |
| Viajes | `/viajes` | CRUD + `/:id/completar` + `/:id/anular` |
| Vehículos | `/vehiculos` | CRUD |
| Cajas menores | `/cajas-menores` | CRUD + `/:id/cerrar` + `/:id/movimientos` (CRUD + aprobar/rechazar) |
| Solicitudes | `/solicitudes` | CRUD + `/:id/estado` (PATCH) + `/:id/vincular` + `/:id/comentarios` + `/:id/documento` (multipart) |
| Reportes | `/reportes` | Por slug: `/operaciones`, `/inventario`, `/inventario-ubicacion`, `/clientes`, `/viajes-reporte`, `/cajas-menores-reporte`, `/gastos-reporte`, `/averias`, `/solicitudes` — cada uno con `/excel` y `/pdf` |
| WMS PUSH | `/wms/sync` | `POST /entrada`, `POST /salida`, `POST /kardex` (auth: `X-WMS-API-Key`) |
| WMS Dashboard | `/wms/dashboard` | `GET /stats`, `GET /logs` |
| Notificaciones | `/notificaciones` | Listar, marcar leída/todas, contar no leídas, eliminar |
| Emails | `/emails` | `POST /enviar` (manual — modo plantilla o libre), `GET /historial` |
| Plantillas email | `/plantillas-email` | CRUD + `/:id/vista-previa` |
| Admin | `/admin` | `/usuarios` CRUD · `/roles` CRUD · `/sesiones` listar+cerrar · `/seguridad` dashboard |
| Auditoría acciones | `/auditoria-acciones` | Listar + stats + export Excel/PDF |
| Reportes programados | `/reportes/programados` | CRUD + ejecución manual |

---

## Roles y permisos

### Jerarquía
```
admin(100) · supervisor(75) · financiera(60) · operador(50) · conductor(30) · cliente(10)
```

### Módulos y acciones disponibles (42 permisos)
```
dashboard         → ver, exportar
clientes          → ver, crear, editar, eliminar, exportar, importar
inventario        → ver, crear, editar, eliminar, ajustar, exportar, alertas
operaciones       → ver, exportar, reenviar_correo
auditoria         → ver
reportes          → ver, crear, exportar, descargar
usuarios          → ver, crear, editar, eliminar
roles             → ver, crear, editar, eliminar
configuracion     → ver, editar
notificaciones    → ver, crear, editar, enviar, eliminar
vehiculos         → ver, crear, editar, eliminar
viajes            → ver, crear, editar, eliminar, exportar
caja_menor        → ver, crear, editar, cerrar, aprobar, eliminar, exportar
movimientos       → ver, crear, editar, eliminar, aprobar
plantillas_email  → ver, crear, editar, eliminar
solicitudes       → ver, crear, comentar, exportar
perfil            → ver, cambiar_password, editar
```

### Sistema de permisos para usuarios del portal cliente
Los usuarios con `rol=cliente` tienen un sistema **separado e independiente**: campo `permisos_cliente` (JSON) en `Usuario`. El método `getPermisos()` fuerza siempre los módulos: `clientes`, `operaciones`, `configuracion`, `perfil`, `notificaciones`, `solicitudes`. Sus permisos se editan desde `/administracion → Clientes → usuario → Permisos`.

Los seeds de `seedRolesPermisos.js` **NO afectan** clientes portal.

### Middleware de autorización
- `PermissionRoute(module, action)` — para todas las rutas del frontend
- `AdminRoute` — solo para `/administracion`, `/auditoria-acciones`, `/configuracion-wms`
- `requiereRolMinimo('supervisor')` — backend, para acciones como anular operaciones
- `/configuracion` usa `PermissionRoute module="perfil" action="ver"` — todos los roles lo necesitan

---

## Integraciones externas

### WMS Centhrix (integración principal)

**Modelo dual PUSH + PULL:**
- **PUSH** (WMS → CRM): `POST /wms/sync/entrada|salida|kardex` con header `X-WMS-API-Key`. Permanente.
- **PULL** (cron cada `WMS_SYNC_INTERVAL` min): `wmsPollingJob.js` consulta WMS y sincroniza órdenes con `orderStatus.name === 'Finalizada'`.

**Deduplicación:** `wms_order_id` (UUID WMS) + `documento_wms` (número orden).

**Kardex WMS:** polling por historial de pallet (`wms_pallet_id`). Primera vez que se descubre un pallet: solo marcar timestamp, NO procesar historial (evita floods). Operación `"Carga"` = cantidad positiva, `"Descarga"` = negativa.

**Logs de sincronización:**
- PUSH logs incluyen `payload` → re-ejecutables desde dashboard
- PULL logs: tipos `polling_entrada`/`polling_salida`, **sin `payload`** → NO re-ejecutables
- KPI aggregation: normalizar `.replace('polling_', '')` al acumular conteos por tipo

**NIT en polling:** usar `ordenCompleta.customer?.nit` (del detalle), NO `orden.customer?.nit` (el listado no trae NIT).

### AWS S3 (`istho-crm-files`, us-west-2)
```
avatares/           # Fotos de perfil
soportes/           # Documentos de cajas menores y solicitudes
evidencias/{id}/    # Fotos y PDFs de operaciones
averias/{id}/       # Fotos de daños en operaciones
branding/           # Logo email (URL pública: /branding/logo-email.png)
```
Acceso: presigned URLs 15 min. Auth producción: IAM Instance Role.

### Email
Gmail SMTP (principal) via Nodemailer. Plantillas Handlebars (archivos `.html` + BD). Logo desde S3 pública. Resend como backup.

### Socket.IO (tiempo real)
Eventos: `notificacion`, `actualizacion_operacion`, `alerta_inventario`, `error_sync`.
Redis Upstash (opcional) para multi-instancia App Runner.

---

## Flujos de negocio principales

### Ingreso de mercancía
1. Cliente crea aviso de ingreso en portal → 2. WMS genera orden → PUSH a CRM → 3. Operación `pendiente` creada → 4. Operador verifica por línea, registra averías con fotos → 5. Cierra: email enviado, `MovimientoInventario` tipo `entrada`, stock actualizado → 6. Auditoría registrada.

### Salida / Despacho
1. Cliente solicita despacho → 2. Operador crea operación salida, sistema **reserva** stock (`cantidad_reservada`) → 3. Operador verifica → 4. Cierra: reserva liberada, stock descontado, `MovimientoInventario` tipo `salida`, email → 5. Vincula a solicitud cliente.

### Ajuste Kardex
1. Operador WMS registra ajuste (reubicación, conteo) → 2. WMS PUSH a CRM → 3. `Operacion` tipo `kardex` creada → 4. `MovimientoInventario` tipo `kardex_wms` registrado.

### Cajas menores (conductores)
1. Financiera abre caja con saldo inicial → 2. Conductor asocia caja a viaje → 3. Conductor registra gastos (`pendiente_aprobacion`) → 4. Financiera aprueba/rechaza cada movimiento → 5. Financiera cierra caja (transfiere saldo o liquida).

### Solicitudes cliente (portal)
1. Usuario cliente crea solicitud tipo `ingreso` o `despacho` con documentos → 2. Equipo interno gestiona estados y agrega comentarios → 3. Vincula a operación cuando aplica → 4. Cliente notificado en tiempo real.

---

## Convenciones críticas del backend

### filtrarPorCliente + Multer
`filtrarPorCliente` inyecta `req.body.cliente_id` antes de que multer procese el formulario. Multer reemplaza `req.body` al parsear — borrando el `cliente_id` inyectado. En rutas `multipart/form-data` con usuarios cliente:

```js
// ❌ INCORRECTO — multer habrá borrado este valor
const { cliente_id } = req.body;

// ✅ CORRECTO — para rutas multipart con usuarios cliente
const cliente_id = (req.user.esCliente && req.user.cliente_id)
  ? req.user.cliente_id
  : req.body.cliente_id;
```

### auditoriaWmsController — 6 mapeos obligatorios
`auditoriaWmsController.js` construye objetos de respuesta explícitos (NO devuelve el modelo Sequelize directamente). Hay 6 puntos de mapeo: `listarEntradas`, `listarSalidas`, `listarKardex`, `obtenerEntradaPorId`, `obtenerSalidaPorId`, `obtenerKardexPorId`. Al agregar cualquier campo nuevo a `Operacion.js`, agregarlo en los **6 mapeos**, o el campo no llega al frontend.

### Anulación de operaciones
- Solo estados `pendiente` / `en_proceso` pueden anularse — `cerrado` y `anulado` NO
- `DELETE /operaciones/:id` con body `{ motivo }` — requiere `requiereRolMinimo('supervisor')`

### Migraciones
```bash
npm run migration:create -- <nombre>  # crear
npm run migration:status              # ver estado
npm run migration:up                  # aplicar
npm run migration:undo                # revertir última
```
Si Umzug no aplica: verificar `SELECT name FROM SequelizeMeta`. Aplicar manualmente con `sequelize.query('ALTER TABLE...') + INSERT INTO SequelizeMeta`.

---

## Convenciones críticas del frontend

### Componentes obligatorios en formularios
- **`FilterDropdown`** reemplaza todo `<select>` nativo. Con React Hook Form + Controller: `value={String(field.value || '')}` (IDs numéricos de BD siempre como String).
- **`DatePicker`** reemplaza todo `<input type="date">`. Valor: string `YYYY-MM-DD`. Parsear con `new Date(value + 'T00:00:00')`.

### MySQL DECIMAL como strings
Columnas `DECIMAL` llegan a JS como strings (`"100.000"`). Nunca renderizar en JSX directo. Usar:
```js
Number(val).toLocaleString('es-CO', { maximumFractionDigits: 2 })
```

### Respuesta paginada
```js
// Todos los endpoints paginados del CRM retornan:
{ data: { rows: [...], count: N } }  // campo .rows, NO .items
```

### Descargas seguras de archivos
```js
// ✅ CORRECTO — token en header
fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  .then(r => r.blob())
  .then(blob => { /* crear blob URL */ })

// ❌ INCORRECTO — token en URL queda en logs/historial
fetch(`${url}?token=${token}`)
```

### Hook de notificaciones
```js
import useNotification from '../../hooks/useNotification';
const { success, error, warning, info } = useNotification();
// NO: showSuccess, showError (no existen)
```

### uploadClient interceptor
Extrae `response.data` automáticamente — NO hacer doble `.data.data`.

### Providers (orden crítico en main.jsx)
```jsx
AuthProvider → SocketProvider → NotificacionesProvider
```

### Aliases Vite
`@` → `src/` · `@components` · `@pages` · `@hooks` · `@context` · `@api` · `@utils` · `@styles` · `@assets`

### Imports case-sensitive
Linux prod ≠ Windows dev. Siempre usar casing exacto en imports.

---

## Reportes — estructura estándar

Cada reporte con página propia usa:
1. `AccionesDropdown` con acciones Actualizar/Enviar/Excel/PDF
2. Skeleton en primera carga (`firstLoad`), overlay en recargas
3. `useSearchParams` para persistencia de filtros en URL
4. `fetchData` con `useCallback` + `useEffect([fetchData])`
5. `canDownload = hasPermission('reportes','exportar') || hasPermission('reportes','descargar')`
6. `EnviarReporteModal` al final del JSX

Backend por reporte: 3 endpoints (`GET /reportes/<slug>`, `/excel`, `/pdf`). Lógica compartida en helper `_build<Nombre>Query`.

---

## Tutorial interactivo (driver.js v1.4.0)

- Config: `frontend/src/utils/tutorialConfig.js` (objeto `TUTORIALES` + mapa `RUTAS_CON_TOUR`)
- Hook: `frontend/src/hooks/useTutorial.js` — filtra pasos cuyos `element` no existen en DOM (previene crash)
- IDs de anclaje: `id="tour-<modulo>-<elemento>"` — solo agregar al elemento que ya existe, sin wrappers nuevos
- Persistencia: `localStorage` como `centhrix_tour_<modulo>`
- Detección de ruta dinámica en `FloatingHeader.moduloActivo` (useMemo): regex para rutas con `:id`

---

## Identidad visual CenthriX

| Token | Valor |
|-------|-------|
| Acento | `#E74C3C` (hover `#C0392B`) |
| Fondo dark | `#0F1023` / `#151631` / `#1A1B3A` |
| Éxito | `#2ECC71` |
| Tipografía body | Segoe UI |
| Tipografía display | Rajdhani (clase `font-display`) |
| Dark mode tokens | `dark:bg-centhrix-bg` · `dark:bg-centhrix-card` · `dark:bg-centhrix-surface` |

> **NO** usar `dark:bg-slate-[6-9]xx` — usar siempre los tokens centhrix.

Colores de gráficos centralizados en `frontend/src/utils/chartColors.js` → `CHART_COLORS`.

---

## Infraestructura de producción

| Componente | Servicio | Detalles |
|------------|---------|---------|
| Backend | AWS App Runner (us-west-2) | Start: `node server/server.js` desde raíz. PORT inyectado automáticamente (8080). NO configurar PORT |
| Frontend | Vercel | Root dir: `frontend` (no `./frontend`) |
| BD | RDS MySQL 8.0 `istho-crm-db` (db.t3.micro) | Sin acceso público. VPC Connector al App Runner |
| Archivos | S3 `istho-crm-files` (us-west-2) | IAM Instance Role en prod. Presigned URLs 15 min |
| Caché/Socket | Redis Upstash | Opcional. Sin Redis = single-instance App Runner (OK actual) |
| Email | Gmail SMTP (principal) · Resend (backup) | Nodemailer, plantillas Handlebars |

Seeds se ejecutan automáticamente en cada deploy vía `initializeDatabase()`.

**CORS_ORIGIN** en App Runner: URL exacta de Vercel **sin `/` final**. Diferente URL = 403 en todos los requests.

---

## Seguridad (crítico)

- **JWT_SECRET** ≥ 32 caracteres — el servidor lanza error fatal en startup si no está configurado
- **Respuestas API**: excluir siempre `password_hash`, `reset_token`, `reset_token_expires` con `attributes: { exclude: [...] }`
- **HTML de usuario**: sanitizar con `DOMPurify` antes de `dangerouslySetInnerHTML`
- **Descargas**: usar `fetch + blob URL` con header `Authorization: Bearer` — NUNCA `?token=JWT` en URL
- **S3 en producción**: IAM Instance Role — NUNCA `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` en variables de entorno

---

## Documentación disponible en el repo

- `docs/API.md` — spec completa de la API (150+ endpoints)
- `docs/MODELOS.md` — todos los modelos con campos y asociaciones
- `docs/WMS_API_SPEC.md` — spec integración WMS (PUSH + PULL)
- `docs/FLUJOS_NEGOCIO.md` — flujos detallados con diagramas ASCII
- `docs/SERVICIOS_EXTERNOS.md` — integraciones externas con variables de entorno
- `docs/ISTHO_WMS_Postman_Collection.json` — colección Postman (57 endpoints WMS)
- `DEPLOY.md` — guía de despliegue completa
- `docs/manuales/` — manuales de usuario

---

## Comandos de desarrollo

```bash
cd server && npm run dev       # backend puerto 5000
cd frontend && npm run dev     # frontend puerto 5173

# Migraciones (desde /server)
npm run migration:create -- nombre-migracion
npm run migration:status
npm run migration:up
npm run migration:undo

# Seeds (manual)
node src/scripts/seedRolesPermisos.js
```
