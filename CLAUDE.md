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
- **Railway (backend):** NO configurar `PORT`. `CORS_ORIGIN` = URL exacta de Vercel (sin `/` final)
- **Vercel (frontend):** Root dir `frontend` (no `./frontend`)
- **Cloudinary:** avatares/ soportes/ evidencias/ averias/ branding/. Logo en emails = URL Cloudinary (Gmail límite 102KB)
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

## Docs
`docs/WMS_API_SPEC.md` · `docs/FLUJOS_NEGOCIO.md` · `docs/API.md` · `docs/manuales/` · `DEPLOY.md`
