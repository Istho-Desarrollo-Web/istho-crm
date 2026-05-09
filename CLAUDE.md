# CLAUDE.md

## Project
CRM **CenthriX** — logística, transporte y almacenamiento para ISTHO S.A.S. (Girardota, Colombia).  
Monorepo: `server/` (Express+Sequelize+MySQL) · `frontend/` (React 19+Vite+Tailwind 4+MUI 7).

## Commands
```bash
cd server && npm run dev       # puerto 5000
cd frontend && npm run dev     # puerto 5173
```
Seeds idempotentes se ejecutan en cada startup via `initializeDatabase()`. Manual: `node src/scripts/seedRolesPermisos.js`

## Backend
Flujo: Routes → `verifyToken → cargarCachePermisos → requierePermiso` → Controllers → Services → Models  
- `/auth/refresh` NO lleva auth middleware
- Helpers: `success(res, data, msgOrStatus)` / `paginated()` / `error()` / `notFound()` — 3er arg string=mensaje, número=status
- `registerErrorHandlers()` DESPUÉS de todas las rutas. Health check ANTES de error handlers.
- Auditoría obligatoria en todo write: `Auditoria.registrar({ tabla, registro_id, accion, usuario_id, ... })`

## Frontend
- Providers en `main.jsx`: `AuthProvider → SocketProvider → NotificacionesProvider` (orden crítico)
- `uploadClient` interceptor extrae `response.data` — no hacer `.data.data`
- `useNotification` default export. Exporta `success`/`error`/`warning`/`info` — **NO** `showSuccess`/`showError`
- `formatDate` singleton: `setPreferencias(prefs)` desde AuthContext. `useIdleTimer` montado en ProtectedLayout.
- Aliases: `@`→`src/`, `@components`, `@pages`, `@hooks`, `@context`, `@api`, `@utils`, `@styles`, `@assets`

## Componentes de Formulario (Crítico)

**Regla:** NO usar `<select>` ni `<input type="date">` nativos en ningún formulario nuevo. Usar siempre los componentes custom.

### FilterDropdown — reemplaza `<select>`
```jsx
import { FilterDropdown } from '../../../components/common';

// Pattern A — estado local (sin React Hook Form)
<FilterDropdown
  options={[{ value: '', label: 'Todos' }, { value: 'activo', label: 'Activo' }]}
  value={filtro}
  onChange={(v) => setFiltro(v)}
/>

// Pattern B — React Hook Form con Controller
<Controller
  name="campo"
  control={control}
  render={({ field }) => (
    <FilterDropdown
      options={[{ value: '', label: 'Seleccionar...' }, ...opciones]}
      value={String(field.value || '')}   // IDs numéricos de BD: SIEMPRE String()
      onChange={(v) => field.onChange(v)}
    />
  )}
/>
```
- `compact` prop para barras de filtros (tablas, dashboards)
- Sin prop `disabled` — deshabilitar con: `<div className={cond ? 'pointer-events-none opacity-60' : ''}>`
- Si el formulario aún no tenía `Controller`: agregar a import de RHF y destructurar `control` del `useForm()`

### DatePicker — reemplaza `<input type="date">`
```jsx
import { DatePicker } from '../../../components/common';
// Construido sobre react-day-picker@9.14.0 (ya instalado)

// Pattern A — estado local
<DatePicker value={fechaStr} onChange={(v) => setFecha(v)} />

// Pattern C — React Hook Form con Controller
<Controller
  name="fecha"
  control={control}
  render={({ field }) => (
    <DatePicker value={field.value || ''} onChange={(v) => field.onChange(v)} />
  )}
/>
```
- El valor es siempre `YYYY-MM-DD` (string, nunca Date object)
- Para parsear en frontend: `new Date(value + 'T00:00:00')` (evita desfase de zona horaria)
- Sin prop `disabled` — mismo patrón wrapper que FilterDropdown

## Permisos (Crítico)
- Rutas: siempre `PermissionRoute(module, action)`. Solo `AdminRoute` para `/administracion`, `/auditoria-acciones`, `/configuracion-wms`
- **Clientes portal** (`rol=cliente`): usan `permisos_cliente` JSON + `getPermisos()` en `Usuario.js` — sistema SEPARADO de permisos por rol. Seeds NO afectan clientes portal. Módulos forzados en `getPermisos()`: `clientes/operaciones/configuracion/perfil`
- `PERMISOS_POR_ROL` en `AuthContext.jsx` debe tener los 6 roles sincronizados con `seedRolesPermisos.js`. Rol faltante cae a `cliente`
- `/configuracion` usa `PermissionRoute module="perfil" action="ver"` — todos los roles incluido `cliente` necesitan `perfil.ver`
- Supervisor: `notificaciones: ['ver']` — sin editar plantillas de email
- Menú: cada sub-item href necesita `if (item.href==='...') return hasPermission(...)` explícito en `FloatingHeader`

## Base de Datos
- `underscored: true` → columna `created_at` = propiedad JS `createdAt`
- **Migraciones con Umzug** — NO usar `sync({ alter: true })`. Umzug corre `src/migrations/*.js` automáticamente en cada startup.
- Al agregar columnas a un modelo: crear migración con `npm run migration:create -- <nombre>`, luego reiniciar el servidor.
- Scripts: `migration:create` · `migration:status` · `migration:up` · `migration:undo`
- Fechas: `DATEONLY` en Sequelize, parsear con `new Date(date+'T00:00:00')` en frontend
- Precios: enteros en BD, `Intl.NumberFormat('es-CO')` en frontend

## Deploy
- **App Runner (backend, us-west-2):** NO configurar `PORT` — lo inyecta App Runner automáticamente (8080). `CORS_ORIGIN` = URL exacta de Vercel (sin `/` final). Start command DEBE ser `node server/server.js` desde raíz (NO `cd server && node server.js` — App Runner ejecuta sin shell).
- **Vercel (frontend):** Root dir `frontend` (no `./frontend`)
- **S3 (archivos, us-west-2):** bucket `istho-crm-files`. Carpetas: avatares/ soportes/ evidencias/{id}/ averias/{id}/ branding/. En producción: IAM Instance Role, NO claves en env. Acceso via presigned URLs (15 min TTL). Logo emails = URL S3 pública (`/branding/logo-email.png`).
- **RDS MySQL 8.0** (`istho-crm-db`, db.t3.micro, sin acceso público). Conectado via VPC connector al App Runner.
- **Redis (Upstash, opcional):** `REDIS_URL` en App Runner activa Socket.IO multi-instancia. Sin Redis = single-instance (actual).
- Seeds se ejecutan en cada deploy automáticamente

## Notificaciones
`accion_url` en BD puede tener rutas legacy. `normalizarUrlNotificacion()` en `FloatingHeader.jsx` corrige:  
`/inventario/:id` → `/inventario/productos/:id` · `/inventario/entradas|salidas/:id` → `/operaciones/entradas|salidas/:id`

## Convenciones
- Todo en **español**: código, comentarios, commits, UI
- camelCase español (`obtenerCliente`), kebab API (`/cambiar-password`), PascalCase componentes
- Imports case-sensitive (Linux prod ≠ Windows dev) — siempre usar casing exacto
- `onClick={fn}` con params → envuelve: `onClick={() => fn()}` (SyntheticEvent se pasa como primer arg)
- PDFKit: `margins:{top:0,bottom:0,left:0,right:0}` para paginación manual; sin glifo U+258C — usar `doc.rect().fill()`

## Identidad Visual
Acento `#E74C3C` hover `#C0392B` · Fondo dark `#0F1023`/`#151631`/`#1A1B3A` · Éxito `#2ECC71`  
Tipografía: **Segoe UI** (body/datos) · **Rajdhani** (display font, headings de páginas — clase `font-display`)  
Dark mode tokens: `dark:bg-centhrix-bg` / `dark:bg-centhrix-card` / `dark:bg-centhrix-surface` — **NO** usar `dark:bg-slate-[6-9]`  
Colores de charts centralizados en `frontend/src/utils/chartColors.js` → exporta `CHART_COLORS`

## Seguridad (Crítico)
- **Descargas de archivos** (reportes Excel/PDF, plantillas): usar `fetch + blob URL` con `Authorization: Bearer` en header — **NUNCA** pasar `?token=JWT` en la URL (queda en logs, historial, Referer)
- **Respuestas API**: excluir siempre `password_hash`, `reset_token`, `reset_token_expires` con `attributes: { exclude: [...] }`
- **JWT_SECRET**: obligatorio con ≥ 32 caracteres — el servidor lanza error en startup si no está configurado
- **HTML de usuario**: sanitizar con `DOMPurify` antes de `dangerouslySetInnerHTML` (ver `PlantillasEmail`)

## Roles (nivel jerárquico)
admin(100) · supervisor(75) · financiera(60) · operador(50) · conductor(30) · cliente(10)

## WMS Integration (CenthriX)

### Modelo dual PUSH + PULL
- **PUSH** (WMS → CRM): `POST /wms/sync/entrada|salida|kardex` con `X-WMS-API-Key`. Permanente.
- **PULL** (cron cada `WMS_SYNC_INTERVAL` min): `server/src/jobs/wmsPollingJob.js` — consulta WMS y sincroniza órdenes finalizadas (`orderStatus.name === 'Finalizada'`).
- Deduplicación: `wms_order_id` (UUID WMS en tabla `operaciones`) + `documento_wms` (número de orden).

### Kardex desde app WMS
- Ajustes kardex del WMS móvil llegan vía polling de historial por pallet (`_pollKardexHistorial`).
- `CajaInventario` tiene `wms_pallet_id` (UUID) y `wms_kardex_ultima_sync` (DATE).
- Primera vez que se descubre un pallet: **solo marcar timestamp**, NO procesar historial (evita floods).
- Operación WMS: `"Carga"` → cantidad positiva; `"Descarga"` → cantidad negativa.

### wms_sync_logs — reglas clave
- PUSH logs: incluyen `payload` → re-ejecutables desde dashboard.
- PULL logs: tipos `polling_entrada`/`polling_salida`, **sin `payload`** → NO re-ejecutables.
- KPI aggregation: normalizar `.replace('polling_', '')` al acumular conteos por tipo.
- NIT en polling: usar `ordenCompleta.customer?.nit` (del detalle), NO `orden.customer?.nit` (el listado no trae NIT).

### Kardex — filtros activos
- **Polling** (`_pollKardexHistorial`): solo procesa `entry.operation === 'Carga'`. Las Descargas se ignoran (las genera el polling de órdenes de picking → evita duplicados).
- **Frontend** (tab Movimientos en ProductoDetail): filtra `!(tipo==='salida' && motivo.startsWith('Kardex WMS'))` para no mostrar Descargas que ya llegan por polling de órdenes.

### Tab Ubicación WMS (ProductoDetail)
- Tabla: N° Caja · Posición en bodega · Bodega · Lote · Cantidad
- **Bodega**: se resuelve con `GET /warehouses` (una sola llamada paralela) → `bodegaMap[warehouseId]`. Campo nombre en WMS: `name` (ej: `"Bodega 106"`).
- **N° Caja**: se resuelve desde `CajaInventario.wms_pallet_id` en BD local (una sola query).
- **`zoneName`** del WMS siempre es `null` — no usar. La coordenada completa viene en `coordinate` (ej: `"RACK-A1-M6-N1-P3"`).
- Colección Postman: `docs/ISTHO_WMS_Postman_Collection.json` (57 endpoints, 14 carpetas).

## Tutorial Interactivo (driver.js)

- Librería: **driver.js v1.4.0** — botón `?` fijo en `FloatingHeader`, se muestra solo si la ruta tiene tour configurado.
- Config centralizada: `frontend/src/utils/tutorialConfig.js` (objeto `TUTORIALES` + mapa `RUTAS_CON_TOUR`).
- Hook: `frontend/src/hooks/useTutorial.js` — expone `iniciarTour(modulo)` y `haTomadoTour(modulo)`. Persiste en `localStorage` como `centhrix_tour_<modulo>`.
- **DOM-resiliente**: `useTutorial` filtra pasos cuyos `element` no existen en el DOM antes de lanzar el tour (previene crash en páginas que comparten la misma clave de tour).
- Detección de ruta dinámica en `FloatingHeader.moduloActivo` (useMemo):
  - Rutas estáticas → `RUTAS_CON_TOUR[pathname]`
  - Rutas con `:id` → regex: `/operaciones/(entradas|salidas|kardex)/\d+` → `'operacion_detalle'` · `/inventario/productos/\d+` → `'producto_detalle'` · `/clientes/\d+` → `'cliente_detalle'`
- **Regla de IDs**: al agregar elementos ancla en una página, usar `id="tour-<modulo>-<elemento>"`. Solo agregar el `id` al componente o div que ya existe — no crear wrappers nuevos salvo que sea inevitable.
- **Pages con tour activo** (clave → ruta):

| Clave | Ruta(s) | IDs requeridos |
| --- | --- | --- |
| `dashboard_operaciones` | `/dashboard` (admin/supervisor/operador/cliente) | `tour-dash-kpis`, `tour-dash-grafico`, `tour-dash-alertas` |
| `dashboard_conductor` | `/dashboard` (conductor) | `tour-dash-caja`, `tour-dash-registrar` |
| `dashboard_financiera` | `/dashboard` (financiera) | `tour-dash-resumen`, `tour-dash-pendientes` |
| `clientes` | `/clientes` | `tour-clientes-tabla`, `tour-clientes-filtros`, `tour-clientes-exportar`, `tour-clientes-nuevo` |
| `inventario` | `/inventario` | `tour-inventario-kpis`, `tour-inventario-buscar`, `tour-inventario-tabla` |
| `operaciones` | `/operaciones/entradas` | `tour-ops-exportar`, `tour-ops-filtros`, `tour-ops-tabla` |
| `salidas` | `/operaciones/salidas` | `tour-salidas-kpis`, `tour-salidas-filtros`, `tour-salidas-tabla` |
| `kardex` | `/operaciones/kardex` | `tour-kardex-kpis`, `tour-kardex-filtros`, `tour-kardex-tabla` |
| `operacion_detalle` | `/operaciones/(entradas\|salidas\|kardex)/:id` | `tour-op-header`, `tour-op-lineas`, `tour-op-logistica`, `tour-op-evidencias` |
| `cliente_detalle` | `/clientes/:id` | `tour-cliente-kpis`, `tour-cliente-tabs` |
| `producto_detalle` | `/inventario/productos/:id` | `tour-producto-kpis`, `tour-producto-stock`, `tour-producto-tabs` |
| `viajes` | `/viajes/viajes` | `tour-viajes-exportar`, `tour-viajes-filtros`, `tour-viajes-tabla`, `tour-viajes-nuevo` |
| `vehiculos` | `/viajes/vehiculos` | `tour-vehiculos-tabla`, `tour-vehiculos-nuevo` |
| `cajas_menores` | `/viajes/cajas-menores` | `tour-cajas-tabla`, `tour-cajas-nueva` |
| `movimientos` | `/viajes/movimientos` | `tour-movimientos-tabla`, `tour-movimientos-nuevo` |
| `reportes` | `/reportes` | `tour-reportes-header`, `tour-reportes-cards` |
| `reportes_operaciones` | `/reportes/operaciones` | `tour-reportes-operaciones-filtros`, `-kpis`, `-exportar` |
| `reportes_inventario` | `/reportes/inventario` | `tour-reportes-inventario-filtros`, `-kpis`, `-exportar` |
| `reportes_inventario_ubicacion` | `/reportes/inventario-ubicacion` | `tour-reportes-inventario-ubicacion-filtros`, `-kpis`, `-exportar` |
| `reportes_clientes` | `/reportes/clientes` | `tour-reportes-clientes-filtros`, `-kpis`, `-exportar` |
| `reportes_viajes` | `/reportes/viajes` | `tour-reportes-viajes-filtros`, `-kpis`, `-exportar` |
| `reportes_cajas_menores` | `/reportes/cajas-menores` | `tour-reportes-cajas-menores-kpis`, `-exportar` (sin filtros) |
| `reportes_gastos` | `/reportes/gastos` | `tour-reportes-gastos-filtros`, `-kpis`, `-exportar` |
| `reportes_averias` | `/reportes/averias` | `tour-reportes-averias-filtros`, `-kpis`, `-exportar` |
| `reportes_programados` | `/reportes/programados` | `tour-reportes-programados-tabla`, `tour-reportes-programados-nuevo` |
| `administracion_usuarios` | `/administracion?tab=usuarios` (default) | `tour-admin-usuarios-tabla`, `tour-admin-usuarios-nuevo` |
| `administracion_roles` | `/administracion?tab=roles` | `tour-admin-roles-tabla`, `tour-admin-roles-nuevo` |
| `administracion_sesiones` | `/administracion?tab=sesiones` | `tour-admin-sesiones-tabla` |
| `administracion_seguridad` | `/administracion?tab=seguridad` | `tour-admin-seguridad-panel` |

## Docs
`docs/WMS_API_SPEC.md` · `docs/FLUJOS_NEGOCIO.md` · `docs/API.md` · `docs/manuales/` · `DEPLOY.md`
