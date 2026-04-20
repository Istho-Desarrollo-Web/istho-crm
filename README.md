# CRM CenthriX — ISTHO S.A.S.

Sistema integral de gestión logística, transporte y almacenamiento para **ISTHO S.A.S.** (Centro Logístico Industrial del Norte), Girardota, Antioquia, Colombia. Certificación ISO 9001:2015.

## Stack Tecnológico

### Frontend

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| **Framework UI** | React | 19.x |
| **Bundler** | Vite | 7.x |
| **Estilos** | Tailwind CSS | 4.x |
| **Componentes UI** | MUI (Material UI) | 7.x |
| **Iconos** | Lucide React | 0.562.x |
| **Routing** | React Router DOM | 7.x |
| **HTTP Client** | Axios | 1.x |
| **Formularios** | React Hook Form + Yup | 7.x / 1.x |
| **Gráficos** | Recharts | 3.x |
| **Notificaciones** | Notistack | 3.x |
| **Real-time** | Socket.io Client | 4.x |
| **Fechas** | date-fns | 4.x |
| **Exportación Excel** | XLSX (SheetJS) | 0.18.x |
| **Compresión imágenes** | browser-image-compression | 2.x |
| **Observabilidad** | Vercel Analytics + Speed Insights | 2.x |

### Backend

| Categoría | Tecnología | Versión |
|-----------|-----------|---------|
| **Runtime** | Node.js | ≥ 20 |
| **Framework HTTP** | Express | 4.18.x |
| **ORM** | Sequelize | 6.x |
| **Base de datos** | MySQL 2 | 3.x |
| **Autenticación** | JSON Web Token (HS256) | 9.x |
| **Hash contraseñas** | bcryptjs | 2.x |
| **Validación** | express-validator | 7.x |
| **Seguridad HTTP** | Helmet | 7.x |
| **CORS** | cors | 2.x |
| **Subida de archivos** | Multer | 1.x |
| **Almacenamiento cloud** | Cloudinary SDK | 2.x |
| **Email producción** | Resend | 6.x |
| **Email desarrollo** | Nodemailer | 6.x |
| **Plantillas email** | Handlebars | 4.x |
| **Exportación Excel** | ExcelJS | 4.x |
| **Exportación PDF** | PDFKit | 0.17.x |
| **Real-time** | Socket.io | 4.x |
| **Tareas programadas** | node-cron | 4.x |
| **Logging HTTP** | Morgan | 1.x |
| **IDs únicos** | UUID | 9.x |

### Infraestructura y DevOps

| Componente | Plataforma |
|-----------|-----------|
| **Backend + BD** | Railway (MySQL + Node.js) |
| **Frontend** | Vercel |
| **Archivos y medios** | Cloudinary |
| **Email transaccional** | Resend |

## Módulos del Sistema

### Autenticación y Autorización
- Login con JWT + refresh tokens (24h acceso / 7d refresh)
- 6 roles: **admin**, **supervisor**, **financiera**, **operador**, **conductor**, **cliente** (portal)
- Sistema de permisos granular por módulo/acción con caché en memoria (TTL 60s)
- Bloqueo de cuenta tras 5 intentos fallidos (15 min)
- Forzar cambio de contraseña en primer login
- Recuperación de contraseña por email

### Dashboard
- KPIs diferenciados por rol (Admin/WMS, Financiera, Conductor, Operador)
- Estadísticas de operaciones por tipo (Entradas, Salidas, Kardex) y estado
- Gráficos de distribución con Recharts
- Tablas de auditorías recientes (entradas y salidas)
- Saludo dinámico por hora del día y acciones rápidas contextuales

### Búsqueda Global (Ctrl+K)
- Busca en todos los módulos simultáneamente con debounce
- Filtro por permisos: solo muestra módulos accesibles al rol del usuario
- Prefijo de módulo: `v ` busca solo Viajes, `c ` solo Clientes, etc.
- Historial de búsquedas recientes (localStorage)
- Resaltado de texto coincidente en resultados
- Enlace "Ver todos" lleva al módulo con el filtro pre-aplicado
- Navegación con teclado (↑ ↓ Enter)

### Clientes
- CRUD con contactos, documentación tributaria y estado comercial (activo/inactivo/suspendido)
- Contactos con selección de tipos de notificación: Todas / Entradas / Salidas / Kardex
- Portal de cliente con navegación filtrada y permisos granulares por módulo
- Middleware `filtrarPorCliente` inyecta automáticamente el `cliente_id`

### Inventario
- Una referencia por SKU por cliente (unique: `cliente_id + sku`)
- Cajas físicas individuales (`CajaInventario`) con lote, ubicación y estado
- Alertas de stock bajo/agotado/próximo a vencer con gestión (atender/descartar/silenciar)
- Movimientos históricos con trazabilidad completa

### Integración WMS (Centhrix)
- API autenticada con `X-WMS-API-Key`
- **syncProductos**: Sincronización de catálogo de SKUs
- **syncEntrada** (CO): Recepción de mercancía → Operación + Cajas + Stock
- **syncSalida** (PK): Picking/Despacho → Operación + Cajas despachadas
- **syncKardex** (CR): Ajustes de inventario con máquina de estados de cajas
- Validación dinámica de estados, tipos de orden y motivos de kardex via `ConfiguracionWms`
- Panel de administración en `/configuracion-wms` para gestionar reglas
- Documentación completa en [docs/WMS_API_SPEC.md](docs/WMS_API_SPEC.md)

### Auditorías WMS
- **Entradas** (verde): Verificación de líneas, logística obligatoria, evidencias
- **Salidas** (azul): Datos de despacho (picking, sucursal, ciudad destino)
- **Kardex** (púrpura): Flujo simplificado, logística opcional
- Evidencias subidas a Cloudinary (fotos + PDFs)
- Stepper de estado, KPIs, cierre con selección de plantilla de email
- Preview de destinatarios antes de cerrar (filtrado por tipo de notificación del contacto)

### Vehículos
- Gestión de flota con control de documentos (SOAT, tecnomecánica)
- Alertas de vencimiento de documentos
- Vista tabla/tarjetas con filtros

### Viajes
- Creación con asignación de conductor, vehículo, ruta y caja menor
- Auto-selección de conductor al elegir vehículo
- Detalle con gastos asociados

### Cajas Menores
- Asignables a **cualquier usuario** del sistema (campo `asignado_a`)
- Flujo de egresos, ingresos, aprobación y cierre contable
- 18 conceptos de egreso, 7 de ingreso (incluyendo recarga y liquidación)
- Cierre con opción de trasladar saldo o entregar al usuario
- Campo viaje solo visible si el usuario asignado tiene rol conductor

### Movimientos de Caja Menor
- Creación con soporte adjunto (Cloudinary / base64 fallback)
- Aprobación individual y masiva
- Valor aprobado puede diferir del solicitado
- Vista detalle con preview de soporte

### Reportes
- Reportes operativos (operaciones, inventario, clientes) y financieros (viajes, cajas menores, gastos)
- Exportación Excel y PDF desde backend
- KPIs, gráficos de distribución por tipo/estado y tablas de datos por reporte
- Tendencia comparativa de últimos 6 meses (operaciones)
- Envío de reportes por email directamente desde la UI
- **Reportes programados**: 6 tipos con envío automático por email (node-cron)

### Plantillas de Email
- 3 plantillas predeterminadas (entrada, salida, kardex)
- Variables Handlebars dinámicas
- Firma configurable por plantilla
- Logo desde Cloudinary (evita límite de 102KB de Gmail)
- Editor CRUD con preview en tiempo real

### Administración
- CRUD de usuarios con envío de credenciales por email
- Gestión de roles y permisos granulares
- Sesiones activas con opción de cierre forzado
- Auditoría de acciones (crear, actualizar, eliminar, login, logout)

### Perfil y Configuración
- Edición de datos personales y avatar (Cloudinary / base64 fallback)
- Cambio de contraseña
- Preferencias: tema oscuro/claro, sonido de notificaciones

### Notificaciones
- En tiempo real via WebSocket (Socket.io)
- Tipos: WMS sync, aprobación de gastos, cierre de caja, alertas de inventario, vehículos
- Panel con filtros por tipo y prioridad
- Badge con contador (máx. "+9") y sonido configurable

## Roles del Sistema

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| **admin** | 100 | Acceso total. Usuarios, configuración WMS, plantillas email |
| **supervisor** | 75 | Operaciones, reportes, auditoría, plantillas, aprobación de gastos |
| **financiera** | 60 | Cajas menores, aprobación de gastos, vehículos, viajes |
| **operador** | 50 | Operaciones de bodega, cajas menores asignadas |
| **conductor** | 30 | Viajes, gastos de viaje, vehículos asignados, cajas menores |
| **cliente** | 10 | Portal: inventario, operaciones, reportes propios |

## Atajos de Teclado

| Atajo | Acción |
|-------|--------|
| `Ctrl+K` | Abrir búsqueda global |
| `Ctrl+B` | Alternar modo oscuro/claro |
| `Ctrl+/` | Ver listado de atajos |
| `G D` | Ir a Dashboard |
| `G C` | Ir a Clientes |
| `G I` | Ir a Inventario |
| `G E` | Ir a Entradas |
| `G S` | Ir a Salidas |
| `G K` | Ir a Kardex |
| `G V` | Ir a Vehículos |
| `G T` | Ir a Viajes |
| `G M` | Ir a Cajas Menores |
| `G R` | Ir a Reportes |

## Inicio Rápido

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd istho-crm

# 2. Instalar dependencias
cd server && npm install
cd ../frontend && npm install

# 3. Configurar variables de entorno
cp server/.env.example server/.env
# Editar server/.env con datos de MySQL, JWT, email y Cloudinary

# 4. Iniciar en desarrollo
cd server && npm run dev          # Backend en :5000
cd ../frontend && npm run dev     # Frontend en :5173
```

Los seeds de roles, permisos, plantillas de email y configuración WMS se ejecutan automáticamente al iniciar el servidor.

## Variables de Entorno Principales

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` / `MYSQL_URL` | Conexión MySQL |
| `JWT_SECRET` | Secreto para access tokens |
| `JWT_REFRESH_SECRET` | Secreto para refresh tokens |
| `RESEND_API_KEY` | API key de Resend (email producción) |
| `CLOUDINARY_CLOUD_NAME` | Nombre del cloud en Cloudinary |
| `CLOUDINARY_API_KEY` | API key de Cloudinary |
| `CLOUDINARY_API_SECRET` | API secret de Cloudinary |
| `WMS_API_KEY` | Key para autenticar llamadas del WMS |
| `CORS_ORIGIN` | URL exacta del frontend (sin trailing slash) |

## Despliegue

| Componente | Plataforma | Configuración |
|-----------|-----------|---------------|
| **Backend** | Railway | `server/railway.toml` + `server/nixpacks.toml`. Health check: `/health` |
| **Frontend** | Vercel | `frontend/vercel.json`. Root directory: `frontend` |
| **Base de datos** | Railway MySQL | `MYSQL_URL` (interna) para backend |
| **Archivos** | Cloudinary | Avatares, soportes, evidencias, averías y branding |
| **Email** | Resend | API HTTP. Requiere verificar dominio para enviar a externos |

> **Importante:** NO definir variable `PORT` en Railway (se asigna automáticamente). `CORS_ORIGIN` debe coincidir con la URL exacta de Vercel sin trailing slash.

Para detalles completos de deploy ver [DEPLOY.md](DEPLOY.md).

## Identidad Visual — CenthriX

| Token | Valor |
|-------|-------|
| Accent | `#E74C3C` (Rojo Energía) |
| Hover | `#C0392B` |
| Primary Dark | `#0F1023` / `#151631` / `#1A1B3A` |
| Success | `#2ECC71` (Verde Logístico) |
| Font | Segoe UI |
| Logo | `frontend/src/assets/Centhrix WMS - ISTHO-03.svg` |

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [CLAUDE.md](CLAUDE.md) | Guía para Claude Code (instrucciones de desarrollo) |
| [DEPLOY.md](DEPLOY.md) | Guía de despliegue Railway + Vercel |
| [docs/API.md](docs/API.md) | Endpoints, autenticación, request/response |
| [docs/WMS_API_SPEC.md](docs/WMS_API_SPEC.md) | Especificación completa API WMS |
| [docs/FLUJOS_NEGOCIO.md](docs/FLUJOS_NEGOCIO.md) | Flujos WMS, auditorías, cajas menores, reportes |
| [docs/INSTALACION.md](docs/INSTALACION.md) | Guía de instalación y configuración |
| [docs/GUIA_DESARROLLO.md](docs/GUIA_DESARROLLO.md) | Convenciones y estructura del código |
| [docs/manuales/](docs/manuales/) | Soporte administrativo + Manual de usuario (MD, HTML, Word) |

## Licencia

Propiedad de ISTHO S.A.S. — Todos los derechos reservados.
