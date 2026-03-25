# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ISTHO CRM (branded as **CenthriX**) is a logistics, transportation, and warehouse management system for ISTHO S.A.S. (Girardota, Antioquia, Colombia). Monorepo with `server/` (backend) and `frontend/` (frontend).

## Commands

### Backend (run from `server/`)
```bash
npm run dev          # Dev server with nodemon (port 5000)
npm start            # Production mode
npm test             # Jest tests
npm run test:coverage
npm run lint         # ESLint
npm run db:migrate   # Sequelize migrations
npm run db:seed      # Sequelize seeds
```

### Frontend (run from `frontend/`)
```bash
npm run dev          # Vite dev server (port 5173)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint
```

### Database Seeds (first time or after model changes)
Seeds run automatically on server startup via `server.js → initializeDatabase()`. They are idempotent.
```bash
node src/scripts/seedRolesPermisos.js      # Roles, permissions, admin user
node src/scripts/seedPlantillasEmail.js    # Email templates
node src/scripts/seedConfiguracionWms.js   # WMS integration config (motivos, tipos, estados)
```

### WMS Test Script
```bash
# Windows
set CRM_API_URL=https://backend.up.railway.app/api/v1&& set WMS_API_KEY=key&& node scripts/wms-test.js
```

## Architecture

### Backend: Express + Sequelize + MySQL
- **Entry:** `server/server.js` → creates HTTP server, Socket.io, health check, then `app.js` for Express middleware
- **Pattern:** Routes → Middleware (auth/permissions) → Controllers → Services → Models
- **Auth:** Dual-token JWT (access 24h + refresh 7d). `/auth/refresh` NO requires auth middleware. Middleware chain: `verifyToken → cargarCachePermisos → requierePermiso`
- **File Storage:** Cloudinary (production) with base64 fallback. Service: `src/services/cloudinaryService.js`. Folders: avatares/, soportes/, evidencias/, averias/, branding/
- **Permissions:** Role-based with per-module actions (e.g., `inventario: ['ver', 'crear', 'editar']`). Cached 1 min in memory. ALL routes use `PermissionRoute` (not role-based guards)
- **Real-time:** Socket.io for notifications and live updates
- **Email:** Resend (API HTTP, production) or Nodemailer SMTP (development fallback). Config in `src/config/email.js`
- **WMS Integration:** Copérnico sync via `wmsSyncService.js` — products, entries (CO), exits (PK), kardex (CR). Dynamic validation via `ConfiguracionWms` model. See `docs/WMS_API_SPEC.md`
- **Reports:** ExcelJS for Excel, PDFKit for PDF. Scheduled reports via node-cron. 6 types: operaciones, inventario, clientes, viajes, cajas_menores, gastos. See `docs/FLUJOS_NEGOCIO.md` §10
- **Response helpers:** Always use `success()`, `paginated()`, `error()`, `notFound()` from `src/utils/responses.js`
- **Error handlers:** Registered via `app.registerErrorHandlers()` — MUST be called AFTER all route definitions

### Frontend: React 19 + Vite + Tailwind 4 + MUI 7
- **Routing:** React Router with lazy loading. Permission-based guards: `PermissionRoute`, `AdminRoute`, `PortalPermissionRoute`
- **State:** Context-based (AuthContext, ThemeContext, NotificacionesContext, SocketContext)
- **API layer:** Axios client with interceptors in `src/api/client.js`. Centralized endpoints in `src/api/endpoints.js`
- **Forms:** React Hook Form + Yup validation
- **Charts:** Recharts
- **Notifications:** Notistack with `useNotification` hook (default export, not named)
- **Dark mode:** Toggle with ThemeContext, stored in user preferences (JSON column in usuarios)
- **Menu:** Dynamic filtering via `hasPermission()` from AuthContext — each sub-item filtered individually

### Visual Identity — CenthriX
- **Accent:** #E74C3C (red), hover: #C0392B
- **Dark backgrounds:** #0F1023 (primary), #151631 (secondary), #1A1B3A (cards)
- **Success:** #2ECC71 (green)
- **Typography:** Segoe UI
- **Logo:** `frontend/src/assets/Centhrix WMS - ISTHO-03.svg`

### Vite Aliases
`@` → `src/`, `@components`, `@pages`, `@hooks`, `@context`, `@api`, `@utils`, `@styles`, `@assets`

## Roles & Hierarchy
1. **admin** (nivel 100) — Full access, `*` wildcard permissions
2. **supervisor** (nivel 75) — Operations, reports, email templates, WMS config (view)
3. **financiera** (nivel 60) — Vehicles, trips, petty cash, approvals
4. **operador** (nivel 50) — Warehouse operations, petty cash (own)
5. **conductor** (nivel 30) — Trips, expenses, own vehicles, petty cash (own)
6. **cliente** (nivel 10) — Portal filtered by `cliente_id`

## Caja Menor (Petty Cash)
- **Assignable to ANY user** (not just conductors). Field: `asignado_a` (FK to Usuario)
- **Movements:** Field `usuario_id` (FK to Usuario). Viaje association only visible if assigned user is conductor
- **All internal roles** have `caja_menor.ver` + `movimientos.ver/crear/editar` — each user only sees their own
- **Approval flow:** Financiera/Admin/Supervisor approve/reject. Only approved movements affect saldo
- **Closing:** Option to transfer surplus to next caja or liquidate to $0

## Database
- **ORM:** Sequelize 6 with MySQL. Config in `server/src/config/database.js`
- **Naming:** Models PascalCase, tables snake_case, columns snake_case. `underscored: true` in Sequelize
- **Sync:** `sequelize.sync({ alter: true })` in ALL environments — auto-migrates column changes on every deploy
- **Timezone:** All timestamps use `-05:00` (Colombia)
- **Key models:** Usuario, Rol, Permiso, Inventario, CajaInventario, Operacion, Vehiculo, Viaje, CajaMenor, MovimientoCajaMenor, ConfiguracionWms, Auditoria

## Deploy
- **Backend:** Railway (Nixpacks, Node 20). Config: `server/railway.toml` + `server/nixpacks.toml`. Health check: `/health`
- **Frontend:** Vercel. Config: `frontend/vercel.json`. Root directory: `frontend` (not `./frontend`)
- **Database:** Railway MySQL. Use `MYSQL_URL` (internal) for service-to-service, `MYSQL_PUBLIC_URL` for external access
- **DO NOT** set `PORT` variable in Railway — it assigns one automatically
- **CORS_ORIGIN** in Railway must match exact Vercel URL (no trailing slash)
- **File uploads** use Cloudinary (cloud storage, persistent). Avatars, soportes, evidencias, averías all go to Cloudinary. Fallback to base64 in DB if Cloudinary not configured. Variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **DB schema changes**: Set `DB_SYNC_ALTER=true` temporarily in Railway, deploy, then remove. Default is `alter: false` (fast startup)
- **Email logo**: Cloudinary URL (not base64) to keep email under Gmail's 102KB limit
- **Seeds run automatically** on every deploy via `initializeDatabase()` in server.js

## Conventions
- **Language:** All code, comments, commits, and UI in Spanish
- **Variables/functions:** camelCase in Spanish (`obtenerCliente`, `crearOperacion`)
- **API endpoints:** kebab-case (`/cambiar-password`, `/cajas-menores`)
- **Components:** PascalCase.jsx (`VehiculosList.jsx`, `CajaMenorDetail.jsx`)
- **Controllers:** `moduloController.js` with functions exported
- **Routes:** `modulo.routes.js`
- **Services:** `moduloService.js`
- **Case sensitivity:** Windows is case-insensitive, Linux (Vercel/Railway) is not. Always use exact casing for imports

## Critical Patterns
- Health check route MUST be registered BEFORE `app.registerErrorHandlers()` in `server.js`
- Seeds are idempotent — they only create what doesn't exist, safe to run on every deploy
- The `success()` response helper signature is `success(res, data, statusCodeOrMessage)` — if 3rd arg is string it's a message, if number it's status code
- Frontend `uploadClient` interceptor already extracts `response.data` — don't do `response.data.data`
- `useNotification` is a **default export**, not named: `import useNotification from '@hooks/useNotification'`
- Date fields: use `DATEONLY` in Sequelize to avoid timezone shifts. Parse with `new Date(date + 'T00:00:00')` on frontend
- Price/currency fields: store as integers in DB, format with `Intl.NumberFormat('es-CO')` on frontend
- Route protection: ALWAYS use `PermissionRoute` with module+action, NOT role-based guards like `OperadorRoute`
- **PERMISOS_POR_ROL** in `AuthContext.jsx` MUST include ALL 6 roles (admin, supervisor, financiera, operador, conductor, cliente). Missing roles fall back to `cliente` which causes permission leaks. Keep synced with `seedRolesPermisos.js`
- Admin endpoints (`/admin/*`) require admin role. For forms accessible by other roles, create specific endpoints (e.g., `/cajas-menores/usuarios-asignables`)
- WMS validation: Estado, tipo de orden y motivos se validan dinámicamente contra tabla `configuracion_wms`

## Documentation
- `docs/WMS_API_SPEC.md` — Complete WMS API specification with all fields, schemas, and business rules
- `docs/FLUJOS_NEGOCIO.md` — Business flows (WMS sync, audits, auth, permissions, alerts)
- `docs/API.md` — General API documentation
- `docs/GUIA_DESARROLLO.md` — Development guide
- `docs/INSTALACION.md` — Installation guide
- `DEPLOY.md` — Deployment guide (Railway + Vercel)
