# Prompt para Documentación del Proyecto ISTHO CRM

> Usa este prompt para iniciar una nueva conversación con Claude y generar la documentación técnica del proyecto.


## Prompt

Eres el documentador técnico del proyecto **ISTHO CRM**, un sistema de gestión logística y de inventario para ISTHO S.A.S. (Centro Logístico Industrial del Norte, Girardota, Antioquia, Colombia). Necesito que me ayudes a armar la documentación completa del proyecto basándote en el código fuente y en el siguiente contexto de lo implementado.

### Stack Tecnológico
- **Frontend**: React 18 + Vite + Tailwind CSS + Lucide Icons + Notistack
- **Backend**: Node.js/Express + Sequelize ORM (MySQL vía XAMPP)
- **Auth**: JWT con refresh tokens, 4 roles (admin, supervisor, operador, cliente)
- **Email**: Nodemailer + Handlebars templates personalizables
- **Modo Oscuro**: Toggle global con Ctrl+B

### Arquitectura de Modelos Principales
- **Cliente**: Empresas con NIT, contactos, estado
- **Inventario**: Una fila por SKU por cliente (unique: cliente_id + sku, SIN lote)
- **CajaInventario**: Cajas/estibas físicas individuales con lote, ubicación, estado (disponible, despachada, en_transito, dañada, devuelta, inactiva), vinculadas a Inventario y Operacion
- **Operacion**: Operaciones logísticas tipo ingreso, salida o kardex. Campos: numero_operacion, documento_wms, tipo_documento_wms (ENUM: CO, PK, CR), motivo_kardex, estado (pendiente, en_proceso, cerrado)
- **OperacionDetalle**: Líneas de cada operación (SKU, cantidad, caja, lote, etc.)
- **MovimientoInventario**: Historial de movimientos de stock
- **PlantillaEmail**: Plantillas Handlebars personalizables con tipo/subtipo y firma configurable
- **Usuario**: Con permisos duales (rol→permiso N:M para internos + permisos_cliente JSON para portal)
- **Auditoria**: Log de todas las acciones del sistema con IP real

### Módulos Implementados

#### 1. Autenticación y Autorización
- Login con JWT + refresh tokens
- 4 roles: admin, supervisor, operador, cliente (portal)
- Sistema de permisos dual: Rol→Permiso (N:M) para internos + `permisos_cliente` JSON para portal
- Override por usuario con `permisos_personalizados` JSON
- Middleware `filtrarPorCliente` para portal
- Forzar cambio de contraseña en primer login
- Recuperación de contraseña por email

#### 2. Portal Cliente
- FloatingHeader filtra menú por rol (soloInternos)
- PortalPermissionRoute para control de acceso por módulo/acción
- Clientes solo ven sus propios datos

#### 3. Inventario (CRUD + Cajas)
- Listado con búsqueda, filtros, paginación
- Detalle de producto con tab de Cajas físicas
- Alertas de stock bajo/agotado
- Consolidación de inventario por SKU

#### 4. Integración WMS (Copérnico)
- API con autenticación X-WMS-API-Key
- **syncProductos**: Sincronización de catálogo (crear/actualizar SKUs)
- **syncEntrada** (CO): Recepción de mercancía → Operacion(ingreso) + CajaInventario + stock
- **syncSalida** (PK): Picking/Despacho → Operacion(salida) + cajas despachadas + stock
- **syncKardex** (CR): Ajustes de inventario con reglas de negocio:
  - Suma a caja disponible: actualiza cantidad
  - Resta a caja disponible: actualiza cantidad; si llega a 0 → estado 'inactiva', ubicación liberada
  - Suma a caja inactiva: reactiva → 'disponible', ubicación = zona recepción
  - Suma a caja despachada: reactiva → 'disponible', ubicación = zona recepción
  - Resta a caja despachada: NO permitido (línea omitida)
  - Cada movimiento registra: delta (+/-), motivo, usuario
- Auto-generación de números de caja CJ-XXXXXX
- Verificación de duplicados por documento_origen/numero_picking
- Cuando no viene documento_origen en Kardex, se usa el motivo como documento_wms

#### 5. Auditorías WMS (Entradas, Salidas, Kardex)
- **Entradas** (verde/emerald): Verificación de líneas, formulario logístico obligatorio, evidencias (PDF + fotos), cierre con email
- **Salidas** (azul): Mismo flujo con datos de despacho (picking, sucursal, ciudad destino)
- **Kardex** (púrpura): Flujo simplificado — logística opcional, motivo como campo principal, progreso de 2 factores (líneas + evidencias)
- Columna "Tipo Doc." compartida: CO (entrada), PK (salida), CR (kardex)
- Listado con KPIs (pendientes/en_proceso/cerradas), búsqueda, filtros, paginación
- Detalle con stepper de estado, líneas verificables, averías, evidencias

#### 6. Sistema de Cierre de Auditoría con Selección de Plantilla
- Al hacer clic en "Completar Auditoría" se abre un modal (`CierreAuditoriaModal`)
- Toggle para enviar/no enviar correo de notificación
- Dropdown que carga todas las plantillas de email tipo `operacion_cierre`
- La plantilla predeterminada del subtipo (ingreso/salida/kardex) viene seleccionada por defecto
- El usuario puede seleccionar cualquier otra plantilla activa
- Badge "Por defecto" en la plantilla predeterminada con estrella
- Esquema de color adaptable por tipo de auditoría (emerald/blue/purple)
- Backend acepta `plantilla_id` opcional — si viene, usa esa plantilla directamente

#### 7. Plantillas de Email
- 3 plantillas predeterminadas (seed):
  - **Entrada** (subtipo: ingreso): Azul, datos de recepción, origen, transporte
  - **Salida** (subtipo: salida): Naranja, datos de despacho, picking, destino
  - **Kardex** (subtipo: kardex): Púrpura, motivo como dato principal, transporte opcional
- Variables Handlebars dinámicas (tipoOperacion, motivoKardex, productos, averias, etc.)
- Firma configurable por plantilla (o firma ISTHO por defecto)
- Editor CRUD para supervisores+
- Preview en tiempo real
- Fallback: predeterminada+subtipo → predeterminada genérica → cualquier activa

#### 8. Auditoría de Acciones
- Modelo Auditoria registra todas las acciones del sistema
- IP real del usuario (getClientIP)
- Listado con filtros por usuario, acción, tabla, fecha

#### 9. Dashboard, Reportes, Clientes CRUD, Administración (Usuarios + Roles + Permisos), Despachos, Notificaciones, Documentos, Modo Oscuro

### Archivos Clave del Proyecto
```
server/
├── src/
│   ├── models/                    # Sequelize models (index.js tiene asociaciones)
│   │   ├── Operacion.js           # tipo: ingreso|salida|kardex, tipo_documento_wms: CO|PK|CR
│   │   ├── CajaInventario.js      # tipo: entrada|salida|kardex, estado con 'inactiva'
│   │   ├── PlantillaEmail.js      # CAMPOS_POR_TIPO, FIRMA_DEFAULT
│   │   └── ...
│   ├── services/
│   │   ├── wmsSyncService.js      # syncProductos, syncEntrada, syncSalida, syncKardex
│   │   ├── emailService.js        # enviarCierreOperacion(op, correos, plantillaId)
│   │   └── notificacionService.js
│   ├── controllers/
│   │   ├── auditoriaWmsController.js  # CRUD auditorías + cerrarAuditoria (con plantilla_id)
│   │   ├── wmsSyncController.js       # Endpoints WMS API
│   │   ├── plantillaEmailController.js # CRUD plantillas (filtro por tipo+subtipo)
│   │   └── adminController.js
│   ├── middleware/
│   │   └── auth.js                # verificarToken, verificarPermisoCliente, cache 60s
│   ├── routes/
│   │   ├── wmsSync.routes.js      # /entradas, /salidas, /kardex, /productos, /status
│   │   ├── auditorias.routes.js   # /entradas, /salidas, /kardex, /:id/cerrar
│   │   └── operacion.routes.js    # /:id/reenviar-correo
│   └── scripts/
│       ├── seedRolesPermisos.js   # 45 permisos, 10 módulos (incluye kardex.ver/exportar)
│       ├── seedPlantillasEmail.js # 3 plantillas: entrada, salida, kardex
│       └── wms-test.js            # 14 pasos de simulación WMS completa
│
frontend/
├── src/
│   ├── api/
│   │   ├── endpoints.js           # Todos los endpoints centralizados
│   │   ├── auditorias.service.js  # getEntradas/Salidas/Kardex, cerrar, reenviarCorreo
│   │   ├── clientes.service.js    # CRUD clientes + contactos
│   │   └── plantillasEmail.service.js
│   ├── components/
│   │   ├── common/
│   │   │   ├── CierreAuditoriaModal.jsx  # Modal reutilizable con selector de plantilla
│   │   │   └── Modal/Modal.jsx
│   │   ├── layout/FloatingHeader.jsx     # Navegación con atajos de teclado
│   │   └── auth/PrivateRoute.jsx         # PortalPermissionRoute
│   ├── pages/
│   │   ├── Inventario/
│   │   │   ├── Entradas/
│   │   │   │   ├── EntradasList.jsx      # Listado con columna Tipo Doc. (CO)
│   │   │   │   └── EntradaAuditoria.jsx  # Auditoría con modal de cierre
│   │   │   ├── Salidas/
│   │   │   │   ├── SalidasList.jsx       # Listado con columna Tipo Doc. (PK)
│   │   │   │   └── SalidaAuditoria.jsx   # Auditoría con modal de cierre
│   │   │   └── Kardex/
│   │   │       ├── KardexList.jsx        # Listado púrpura, motivo como doc principal
│   │   │       └── KardexAuditoria.jsx   # Auditoría con modal de cierre
│   │   ├── Administracion/
│   │   ├── AuditoriaAcciones/
│   │   └── PlantillasEmail/
│   ├── context/
│   │   ├── AuthContext.jsx        # hasPermission, roles, portal
│   │   ├── AlertContext.jsx       # showAlert, showConfirm
│   │   └── ThemeContext.jsx       # Modo oscuro (Ctrl+B)
│   └── App.jsx                    # Rutas con lazy loading
│
scripts/
└── wms-test.js                    # Simulación día típico WMS (14 pasos)
```

### Script de Test WMS (wms-test.js) — 14 Pasos
1. Health check API
2. Sincronización de catálogo (8 productos, 2 clientes)
3. Recepción #1: Remisión grande (4 SKUs, 6 cajas)
4. Recepción #2: Devolución de cliente (1 caja)
5. Picking #1: Despacho a sucursal (3 cajas)
6. Picking #2: Pedido urgente (1 caja)
7. Kardex #1: Suma a caja disponible (+10 UND)
8. Kardex #2: Resta total → caja inactiva (-34 UND)
9. Kardex #3: Reactivación de caja inactiva (+15 UND)
10. Kardex #4: Reactivación de caja despachada (+50 UND)
11. Verificar auditoría de entrada (numero_caja mapeado)
12. Verificar auditoría de kardex (motivo, tipo_documento_wms=CR)
13. Pruebas de duplicados (entradas + pickings)
14. Pruebas de error (NIT inválido, sin detalles, kardex sin motivo, resta en despachada)

### Cambios Realizados Hoy (2026-03-14)

#### Backend
1. **Modelo Operacion**: Agregado tipo `kardex`, ENUM `tipo_documento_wms` (CO/PK/CR), campo `motivo_kardex`
2. **Modelo CajaInventario**: Agregado tipo `kardex`, estado `inactiva`
3. **wmsSyncService**: Función `syncKardex` completa (~150 líneas) con máquina de estados de cajas, validación de resta en despachada antes de crear detalle, contadores reales de líneas procesadas
4. **wmsSyncController + routes**: Endpoint POST /wms/sync/kardex
5. **auditoriaWmsController**: `listarKardex`, `obtenerKardexPorId`, estadísticas y recientes con kardex, `cerrarAuditoria` acepta `plantilla_id`
6. **emailService**: Soporte kardex como subtipo, campo `motivoKardex`, parámetro `plantillaId` opcional
7. **plantillaEmailController**: Filtro por `subtipo` en listado
8. **PlantillaEmail modelo**: Campo `motivoKardex` en CAMPOS_POR_TIPO
9. **seedPlantillasEmail**: Plantilla #3 Kardex (púrpura)
10. **seedRolesPermisos**: Permisos `kardex.ver` y `kardex.exportar`
11. **wms-test.js**: Ampliado de 9 a 14 pasos con escenarios Kardex completos

#### Frontend
1. **KardexList.jsx** (nuevo): Listado púrpura con motivo como documento principal, columna "Doc. Externo"
2. **KardexAuditoria.jsx** (nuevo): Auditoría con logística opcional, motivo prominente, modal de cierre
3. **CierreAuditoriaModal.jsx** (nuevo): Modal reutilizable con selector de plantilla de email
4. **EntradaAuditoria.jsx**: Integración del modal de cierre (reemplaza showConfirm)
5. **SalidaAuditoria.jsx**: Integración del modal de cierre
6. **EntradasList.jsx**: Columna "Tipo Doc." con badge CO
7. **SalidasList.jsx**: Columna "Tipo Doc." con badge PK
8. **FloatingHeader.jsx**: Menú Kardex con atajo G K
9. **App.jsx**: Rutas /inventario/kardex y /inventario/kardex/:id
10. **endpoints.js**: KARDEX y KARDEX_BY_ID en AUDITORIAS_ENDPOINTS
11. **auditorias.service.js**: getKardex y getKardexById
12. **clientes.service.js**: Fix CONTACTO_BY_ID → CONTACTO (bug en eliminar/actualizar contactos)

---

**Con esta información, lee el código fuente del proyecto y genera la documentación técnica completa incluyendo:**
1. README.md principal del proyecto
2. Documentación de la API (endpoints, autenticación, request/response)
3. Guía de instalación y configuración
4. Documentación de modelos de base de datos
5. Flujos de negocio (WMS sync, auditorías, cierre con email)
6. Guía de desarrollo (convenciones, estructura, cómo agregar módulos)
