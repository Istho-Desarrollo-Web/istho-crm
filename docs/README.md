# ISTHO CRM - Sistema de Gestión Logística e Inventario

## Descripción General

**ISTHO CRM** es un sistema integral de gestión logística y de inventario desarrollado para **ISTHO S.A.S.** (Centro Logístico Industrial del Norte), ubicado en Girardota, Antioquia, Colombia. El sistema permite la administración completa de clientes, inventario, operaciones de bodega, despachos, auditorías y la integración bidireccional con el sistema WMS Copérnico.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | React 19 + Vite + Tailwind CSS 4 + MUI 7 + Lucide Icons |
| **Backend** | Node.js + Express 4.18 + Sequelize 6 (ORM) |
| **Base de Datos** | MySQL (XAMPP local / Railway producción) |
| **Autenticación** | JWT con refresh tokens (HS256) |
| **Email** | Nodemailer + Handlebars templates |
| **Exportaciones** | ExcelJS (Excel) + PDFKit (PDF) |
| **Archivos** | Multer (uploads de fotos, PDFs, documentos) |

## Módulos del Sistema

### 1. Autenticación y Autorización
- Login con JWT + refresh tokens (1h acceso / 30d refresh)
- **Login con email o nombre de usuario**
- 4 roles: **admin**, **supervisor**, **operador**, **cliente** (portal)
- Sistema de permisos dual: Rol→Permiso (N:M) + override por usuario
- Bloqueo de cuenta tras 5 intentos fallidos (15 min)
- Forzar cambio de contraseña en primer login (modal compacto)
- Recuperación de contraseña por email
- **Foto de perfil** (avatar) con upload/eliminación

### 2. Portal Cliente
- Navegación filtrada por rol (menú `soloInternos`)
- Middleware `filtrarPorCliente` inyecta automáticamente el `cliente_id`
- Permisos granulares por módulo/acción en JSON

### 3. Inventario
- Una referencia (fila) por SKU por cliente (unique: `cliente_id` + `sku`)
- Cajas físicas individuales (`CajaInventario`) con lote, ubicación y estado
- Alertas de stock bajo/agotado con gestión (atender/descartar/silenciar)
- Movimientos históricos con trazabilidad completa
- Estadísticas mensuales para gráficos
- **Restricción WMS**: Productos con `codigo_wms` no permiten editar/eliminar/entrada/salida manual

### 4. Integración WMS (Copérnico)
- API autenticada con `X-WMS-API-Key`
- **syncProductos**: Sincronización de catálogo de SKUs
- **syncEntrada** (CO): Recepción de mercancía → Operación + Cajas + Stock
- **syncSalida** (PK): Picking/Despacho → Operación + Cajas despachadas
- **syncKardex** (CR): Ajustes de inventario con máquina de estados de cajas
- Auto-generación de números de caja `CJ-XXXXXX`
- Verificación de duplicados por documento de origen

### 5. Auditorías WMS (Entradas, Salidas, Kardex)
- **Entradas** (verde): Verificación de líneas, logística obligatoria, evidencias
- **Salidas** (azul): Datos de despacho (picking, sucursal, ciudad destino)
- **Kardex** (púrpura): Flujo simplificado, logística opcional
- Stepper de estado, KPIs, cierre con selección de plantilla de email
- **Exportar a CSV y Excel** desde cada listado (Entradas, Salidas, Kardex)
- **Búsqueda por documento WMS** en los 3 módulos
- **Paginación** con 20 registros por página

### 6. Plantillas de Email
- 3 plantillas predeterminadas (entrada, salida, kardex) + plantilla general
- Variables Handlebars dinámicas
- Firma configurable por plantilla con **logo de empresa** (upload → base64)
- Editor CRUD con preview en tiempo real
- Diseño corporativo: header oscuro con logo, barra naranja, footer con datos de contacto
- Logo incrustado como base64 para compatibilidad con todos los clientes de email

### 7. Auditoría de Acciones
- Registro de todas las acciones del sistema (crear, actualizar, eliminar, login, logout)
- Snapshots antes/después de cada cambio
- IP real del usuario y user agent

### 8. Reportes
- **Reporte de Operaciones**: KPIs + gráficos (barras por estado, pie ingresos/salidas) + tendencia mensual + variaciones % + Excel/PDF
- **Reporte de Inventario**: KPIs + gráficos (pie por estado, barras top productos por valor) + Excel/PDF
- **Reporte de Clientes**: KPIs + gráficos (pie activos/inactivos, pie por tipo) + columna productos por cliente + Excel/PDF
- **Filtros persistentes en URL** (fecha_desde, fecha_hasta, cliente_id)
- **Enviar por email**: Modal para enviar cualquier reporte con adjuntos Excel, PDF o ambos
- **Reportes comparativos**: Tendencia de operaciones últimos 6 meses + variación mes actual vs anterior
- **Reportes programados**: Envío automático con cron (diario, semanal, quincenal, mensual) a múltiples destinatarios

### 9. Notificaciones en Tiempo Real (WebSocket)
- **Socket.IO** con autenticación JWT en el handshake
- Notificación instantánea al navegador cuando ocurre: sync WMS, cierre de auditoría, stock bajo/agotado, nuevo cliente, nuevo usuario portal, reporte programado
- Toast automático con color según prioridad (urgente=rojo, alta=naranja, normal=azul)
- Badge del header se actualiza sin recargar la página
- Reconexión automática (hasta 10 intentos)
- Proxy WebSocket configurado en Vite para desarrollo

### 10. Búsqueda Global (Ctrl+K)
- Modal de búsqueda cross-módulo desde cualquier página
- Busca en: Inventario, Clientes, Entradas, Salidas, Kardex
- Resultados agrupados por módulo con navegación por teclado
- Debounce 400ms, mínimo 2 caracteres

### 12. Otros Módulos
- **Dashboard**: KPIs consolidados con gráficos (Recharts)
- **Clientes CRUD**: Gestión de empresas con contactos y logo
- **Despachos**: Gestión de envíos con transporte y documentos
- **Notificaciones**: Sistema de notificaciones en tiempo real
- **Documentos**: Gestión documental por operación
- **Administración**: Gestión de usuarios, roles y permisos con reseteo de contraseña + envío por email
- **Modo Oscuro**: Toggle global con `Ctrl+B`

## Estructura del Proyecto

```
istho-crm/
├── server/                          # Backend Node.js/Express
│   ├── server.js                    # Punto de entrada
│   ├── src/
│   │   ├── app.js                   # Configuración Express
│   │   ├── config/                  # Configuración (DB, JWT, Email, Multer)
│   │   ├── models/                  # Modelos Sequelize (15 modelos)
│   │   ├── controllers/             # Controladores (11 controladores)
│   │   ├── services/                # Lógica de negocio (WMS, Email, Notificaciones)
│   │   ├── routes/                  # Rutas Express (12 archivos)
│   │   ├── middleware/              # Auth, roles, permisos
│   │   ├── validators/              # Validación de entrada
│   │   ├── utils/                   # Helpers, logger, responses
│   │   ├── scripts/                 # Seeds y utilidades
│   │   └── templates/               # Plantillas de email (Handlebars)
│   └── uploads/                     # Archivos subidos (logos, averías, cumplidos)
│
├── frontend/                        # Frontend React/Vite
│   ├── src/
│   │   ├── App.jsx                  # Rutas con lazy loading
│   │   ├── api/                     # Servicios API y endpoints
│   │   ├── components/              # Componentes reutilizables
│   │   │   ├── common/              # Modal, CierreAuditoriaModal, GlobalSearch
│   │   │   ├── layout/              # FloatingHeader, ProtectedLayout
│   │   │   └── auth/                # PrivateRoute, ForceChangePasswordModal
│   │   ├── context/                 # AuthContext, ThemeContext, AlertContext
│   │   ├── pages/                   # Páginas por módulo
│   │   ├── hooks/                   # Custom hooks
│   │   ├── utils/                   # Utilidades frontend
│   │   └── styles/                  # Estilos globales
│   └── vite.config.js               # Config Vite con proxy y aliases
│
├── scripts/                         # Scripts de prueba
│   └── wms-test.js                  # Simulación WMS (14 pasos)
│
└── docs/                            # Documentación técnica
    ├── README.md                    # Este archivo
    ├── API.md                       # Documentación de la API
    ├── INSTALACION.md               # Guía de instalación
    ├── MODELOS.md                   # Modelos de base de datos
    ├── FLUJOS_NEGOCIO.md            # Flujos de negocio
    └── GUIA_DESARROLLO.md           # Guía de desarrollo
```

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
# Editar server/.env con datos de MySQL y JWT

# 4. Inicializar base de datos
cd server
node src/scripts/seedRolesPermisos.js
node src/scripts/seedPlantillasEmail.js

# 5. Iniciar en desarrollo
cd server && npm run dev          # Backend en :5000
cd frontend && npm run dev        # Frontend en :5173
```

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [API.md](API.md) | Endpoints, autenticación, request/response |
| [INSTALACION.md](INSTALACION.md) | Guía de instalación y configuración |
| [MODELOS.md](MODELOS.md) | Modelos de base de datos y relaciones |
| [FLUJOS_NEGOCIO.md](FLUJOS_NEGOCIO.md) | Flujos WMS, auditorías, cierre con email |
| [GUIA_DESARROLLO.md](GUIA_DESARROLLO.md) | Convenciones, estructura, cómo agregar módulos |

## Roles del Sistema

| Rol | Nivel | Descripción |
|-----|-------|-------------|
| **admin** | 100 | Acceso total al sistema |
| **supervisor** | 75 | Gestión operativa y reportes |
| **operador** | 50 | Operaciones diarias de bodega |
| **cliente** | 10 | Portal de cliente (solo sus datos) |

## Despliegue

- **Local**: XAMPP (MySQL) + Node.js
- **Producción**: Railway (MySQL + Node.js)

## Licencia

Propiedad de ISTHO S.A.S. - Todos los derechos reservados.
