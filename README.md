# CRM CenthriX — ISTHO S.A.S.

Sistema integral de gestión logística, transporte y almacenamiento para **ISTHO S.A.S.** (Centro Logístico Industrial del Norte), Girardota, Antioquia, Colombia. Certificación ISO 9001:2015.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19 + Vite + Tailwind CSS 4 + MUI 7 + Lucide Icons |
| **Backend** | Node.js 20 + Express 4.18 + Sequelize 6 (ORM) |
| **Base de Datos** | MySQL 9.6 (Railway producción / XAMPP local) |
| **Autenticación** | JWT con refresh tokens (HS256) |
| **Email** | Resend (API HTTP, producción) / Nodemailer SMTP (desarrollo) |
| **Exportaciones** | ExcelJS (Excel) + PDFKit (PDF) |
| **Real-time** | Socket.io (notificaciones y actualizaciones en vivo) |
| **Deploy** | Railway (backend + MySQL) + Vercel (frontend) |

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
- Saludo dinámico por hora del día
- Acciones rápidas contextuales
- Gráficos con Recharts

### Clientes
- CRUD con contactos, documentación tributaria y estado comercial
- Portal de cliente con navegación filtrada y permisos granulares por módulo
- Middleware `filtrarPorCliente` inyecta automáticamente el `cliente_id`

### Inventario
- Una referencia por SKU por cliente (unique: `cliente_id + sku`)
- Cajas físicas individuales (`CajaInventario`) con lote, ubicación y estado
- Alertas de stock bajo/agotado/próximo a vencer con gestión (atender/descartar/silenciar)
- Movimientos históricos con trazabilidad completa

### Integración WMS (Copérnico)
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
- Stepper de estado, KPIs, cierre con selección de plantilla de email

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
- Creación con soporte adjunto (base64 en BD)
- Aprobación individual y masiva
- Valor aprobado puede diferir del solicitado
- Vista detalle con preview de soporte

### Reportes
- Reportes operativos (despachos, inventario, clientes) y financieros (viajes, cajas menores, gastos)
- Exportación Excel/CSV desde backend
- KPIs, gráficos y tablas de datos por tipo de reporte
- **Reportes programados**: 6 tipos con envío automático por email (node-cron)

### Plantillas de Email
- 3 plantillas predeterminadas (entrada, salida, kardex)
- Variables Handlebars dinámicas
- Firma configurable por plantilla
- Editor CRUD con preview en tiempo real

### Administración
- CRUD de usuarios con envío de credenciales por email
- Gestión de roles y permisos granulares
- Sesiones activas con opción de cierre forzado
- Auditoría de acciones (crear, actualizar, eliminar, login, logout)

### Perfil y Configuración
- Edición de datos personales y avatar (base64 en BD)
- Cambio de contraseña
- Preferencias: tema oscuro/claro, sonido de notificaciones

### Notificaciones
- En tiempo real via WebSocket (Socket.io)
- Tipos: WMS sync, aprobación de gastos, cierre de caja, alertas de inventario, vehículos
- Panel con filtros por tipo y prioridad

## Roles del Sistema

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| **admin** | 100 | Acceso total. Usuarios, configuración WMS, plantillas email |
| **supervisor** | 75 | Operaciones, reportes, auditoría, plantillas, aprobación de gastos |
| **financiera** | 60 | Cajas menores, aprobación de gastos, vehículos, viajes |
| **operador** | 50 | Operaciones de bodega, cajas menores asignadas |
| **conductor** | 30 | Viajes, gastos de viaje, vehículos asignados, cajas menores |
| **cliente** | 10 | Portal: inventario, operaciones, reportes propios |

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
# Editar server/.env con datos de MySQL, JWT y email

# 4. Iniciar en desarrollo
cd server && npm run dev          # Backend en :5000
cd ../frontend && npm run dev     # Frontend en :5173
```

Los seeds de roles, permisos, plantillas de email y configuración WMS se ejecutan automáticamente al iniciar el servidor.

## Despliegue

| Componente | Plataforma | Configuración |
|-----------|-----------|---------------|
| **Backend** | Railway | `server/railway.toml` + `server/nixpacks.toml`. Health check: `/health` |
| **Frontend** | Vercel | `frontend/vercel.json`. Root directory: `frontend` |
| **Base de datos** | Railway MySQL | `MYSQL_URL` (interna) para backend |
| **Email** | Resend | API HTTP. Requiere verificar dominio para enviar a externos |

> **Importante:** NO definir variable `PORT` en Railway (se asigna automáticamente). `CORS_ORIGIN` debe coincidir con la URL exacta de Vercel sin trailing slash.

Para detalles completos de deploy ver [DEPLOY.md](DEPLOY.md).

## Identidad Visual — CenthriX

| Token | Valor |
|-------|-------|
| Accent | `#E74C3C` (Rojo Energía) |
| Primary | `#1A1A2E` (Azul Marino) |
| Success | `#2ECC71` (Verde Logístico) |
| Dark BG | `#0F1023` / `#151631` / `#1A1B3A` |
| Font | Segoe UI |

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
