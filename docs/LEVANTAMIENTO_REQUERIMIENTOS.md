# Levantamiento de Requerimientos y Mejoras Implementadas
## CRM CenthriX — ISTHO S.A.S.

**Fecha:** 2026-05-07  
**Versión del sistema:** 1.2.0  
**Elaborado por:** Osman Gallego  
**Cliente:** ISTHO S.A.S. — Centro Logístico Industrial del Norte, Girardota, Antioquia, Colombia  
**Certificación:** ISO 9001:2015

---

## 1. Contexto del Negocio

ISTHO S.A.S. es una empresa de logística, transporte y almacenamiento que opera un centro bodega en Girardota (Antioquia). Sus servicios incluyen recepción de mercancía, almacenamiento, picking y transporte de carga. Para gestionar estas operaciones se usa el sistema WMS externo **CenthriX**, que registra y controla los movimientos físicos en bodega.

**Situación anterior:** La empresa contaba con un CRM donde ya se manejaba la información operativa, financiera y de clientes. Sin embargo, el sistema presentaba las siguientes deficiencias que motivaron el proceso de mejora:

- **Interfaz poco intuitiva:** La experiencia de usuario era compleja y difícil de usar para el personal operativo, generando fricción en las tareas del día a día.
- **Ausencia de reportes programados:** No había forma de automatizar el envío periódico de reportes a los interesados; todo era manual.
- **Sin notificaciones en tiempo real:** El personal debía refrescar manualmente las páginas para ver cambios en inventario, cierres de auditoría o alertas de stock.
- **Reportes incompletos:** Faltaban reportes clave como el de averías, el comparativo de operaciones entre períodos y el reporte detallado de clientes.
- **Sin exportación a Excel ni PDF:** Los datos no podían descargarse en formatos estándar para análisis externo o archivo.

El proceso de mejora buscó resolver cada uno de estos puntos sin reemplazar el sistema, sino evolucionándolo hacia una plataforma más completa y moderna.

---

## 2. Levantamiento de Requerimientos

El levantamiento identificó las brechas del sistema existente y las funcionalidades nuevas que debían incorporarse. Los requerimientos se clasificaron según su origen: mejora de funcionalidad existente (🔧) o nueva funcionalidad (✨).

### 2.1 Requerimientos de Acceso y Seguridad

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------ | ---- | --------- |
| REQ-SEC-01 | Sistema multiusuario con roles diferenciados (admin, supervisor, financiera, operador, conductor, cliente) | 🔧 Mejora | Alta |
| REQ-SEC-02 | Autenticación con usuario o email + contraseña | 🔧 Mejora | Alta |
| REQ-SEC-03 | Bloqueo de cuenta tras intentos fallidos repetidos | 🔧 Mejora | Alta |
| REQ-SEC-04 | Forzar cambio de contraseña en el primer login | 🔧 Mejora | Alta |
| REQ-SEC-05 | Recuperación de contraseña por email (enlace seguro, no contraseña temporal) | 🔧 Mejora | Alta |
| REQ-SEC-06 | Autenticación de dos factores (2FA) con aplicación TOTP | ✨ Nueva | Media |
| REQ-SEC-07 | Control granular de permisos por módulo y acción con interfaz mejorada | 🔧 Mejora | Alta |
| REQ-SEC-08 | Portal de acceso independiente para clientes externos | 🔧 Mejora | Media |

### 2.2 Requerimientos de Inventario y WMS

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------- | ---- | --------- |
| REQ-WMS-01 | Sincronización automática bidireccional con el WMS CenthriX (PUSH + PULL) | ✨ Nueva | Alta |
| REQ-WMS-02 | Registro de entradas (CO), salidas (PK) y ajustes kardex (CR) | 🔧 Mejora | Alta |
| REQ-WMS-03 | Control de stock por SKU y por caja/pallet individual | 🔧 Mejora | Alta |
| REQ-WMS-04 | Alertas de stock bajo y agotado con gestión (atender/descartar/silenciar) | ✨ Nueva | Media |
| REQ-WMS-05 | Visualización de ubicación física del producto en bodega (rack y posición) | ✨ Nueva | Media |
| REQ-WMS-06 | Historial completo de movimientos por producto | 🔧 Mejora | Alta |
| REQ-WMS-07 | Restricciones de edición manual para productos sincronizados desde WMS | ✨ Nueva | Alta |

### 2.3 Requerimientos de Auditorías Operativas

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------- | ---- | --------- |
| REQ-AUD-01 | Flujo de verificación de entradas con stepper de estados visual | 🔧 Mejora | Alta |
| REQ-AUD-02 | Flujo de verificación de salidas/despachos con datos de transporte | 🔧 Mejora | Alta |
| REQ-AUD-03 | Flujo de kardex simplificado con ajustes de inventario | 🔧 Mejora | Alta |
| REQ-AUD-04 | Adjuntar evidencias fotográficas y PDF a cada auditoría | 🔧 Mejora | Media |
| REQ-AUD-05 | Notificación por email al cerrar una auditoría | 🔧 Mejora | Alta |
| REQ-AUD-06 | Registro de averías con evidencia fotográfica y reporte | ✨ Nueva | Media |
| REQ-AUD-07 | Exportación de listados de auditoría a Excel | ✨ Nueva | Media |
| REQ-AUD-08 | Búsqueda por número de documento WMS en los 3 módulos | ✨ Nueva | Alta |

### 2.4 Requerimientos de Clientes y Contratos

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------- | ---- | --------- |
| REQ-CLI-01 | CRUD completo de empresas clientes con contactos y logo | 🔧 Mejora | Alta |
| REQ-CLI-02 | Portal de cliente con consulta de inventario y operaciones propias | 🔧 Mejora | Media |
| REQ-CLI-03 | Gestión de despachos con información de transporte y documentos | 🔧 Mejora | Media |

### 2.5 Requerimientos de Reportería

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------- | ---- | --------- |
| REQ-REP-01 | Reportes de operaciones, inventario y clientes con KPIs y gráficos | 🔧 Mejora | Alta |
| REQ-REP-02 | Exportación de reportes en Excel y PDF | ✨ Nueva | Alta |
| REQ-REP-03 | Reporte de averías con costos y frecuencia | ✨ Nueva | Media |
| REQ-REP-04 | Envío de reportes por correo electrónico con adjuntos | ✨ Nueva | Media |
| REQ-REP-05 | Programación de envío automático de reportes (diario, semanal, mensual) | ✨ Nueva | Media |
| REQ-REP-06 | Filtros por rango de fechas y cliente, persistentes en URL | ✨ Nueva | Media |
| REQ-REP-07 | Reportes comparativos: tendencia de operaciones últimos 6 meses | ✨ Nueva | Baja |

### 2.6 Requerimientos Financieros y Logísticos

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------- | ---- | --------- |
| REQ-FIN-01 | Gestión de cajas menores asignables a cualquier empleado (no solo conductores) | 🔧 Mejora | Alta |
| REQ-FIN-02 | Registro de movimientos de caja menor con soporte documental en S3 | 🔧 Mejora | Alta |
| REQ-FIN-03 | Aprobación de gastos de caja menor | 🔧 Mejora | Media |
| REQ-FIN-04 | Módulo de vehículos y viajes para conductores | 🔧 Mejora | Media |
| REQ-FIN-05 | Registro de gastos por viaje | 🔧 Mejora | Media |

### 2.7 Requerimientos de Comunicación y Experiencia de Usuario

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------- | ---- | --------- |
| REQ-COM-01 | Notificaciones en tiempo real en el navegador sin recargar la página | ✨ Nueva | Alta |
| REQ-COM-02 | Plantillas de email personalizables con logo, firma y preview en tiempo real | 🔧 Mejora | Media |
| REQ-COM-03 | Búsqueda global en todos los módulos (Ctrl+K) | ✨ Nueva | Media |
| REQ-COM-04 | Interfaz responsiva y optimizada para uso en móvil | 🔧 Mejora | Alta |
| REQ-COM-05 | Componentes de formulario consistentes (dropdowns, calendarios personalizados) | 🔧 Mejora | Alta |
| REQ-COM-06 | Modo oscuro completo en toda la aplicación | 🔧 Mejora | Media |

### 2.8 Requerimientos de Infraestructura

| ID | Requerimiento | Tipo | Prioridad |
| -- | ------------- | ---- | --------- |
| REQ-INF-01 | Migración a infraestructura cloud más estable (AWS App Runner + RDS) | 🔧 Mejora | Alta |
| REQ-INF-02 | Almacenamiento de archivos en S3 con URLs privadas (presigned, TTL 15 min) | ✨ Nueva | Alta |
| REQ-INF-03 | Copias de seguridad automáticas nocturnas de la base de datos | ✨ Nueva | Alta |
| REQ-INF-04 | Soporte para 15+ usuarios simultáneos desde la misma red corporativa | 🔧 Mejora | Alta |
| REQ-INF-05 | Pipeline CI/CD con lint, tests y build automáticos en cada push | ✨ Nueva | Media |

---

## 3. Mejoras Implementadas

### 3.1 Autenticación y Seguridad

#### ✅ Flujo de Autenticación Robusto
- Login con **email o nombre de usuario** (antes solo nombre de usuario)
- Tokens JWT duales: acceso (24 h) + refresh (7 días) con rotación automática
- Bloqueo de cuenta tras **5 intentos fallidos** durante 15 minutos
- Forzar cambio de contraseña en primer login mediante modal compacto (sin redirigir)

#### ✅ Recuperación de Contraseña por Email (corregida)
- **Problema anterior:** El sistema enviaba el token criptográfico de 64 caracteres como si fuera una contraseña, lo que impedía al usuario autenticarse.
- **Solución:** Flujo separado por tipo:
  - **Admin resetea contraseña:** Se genera una contraseña temporal legible y se envía en el email con instrucciones de login.
  - **Autoservicio (olvidé mi contraseña):** Se envía un enlace seguro de un solo uso (`/reset-password?token=…`) válido por **1 hora**. El usuario define su nueva contraseña en el formulario.
- El token se almacena como hash SHA-256 en la base de datos; el token en texto plano nunca se guarda.
- Nueva plantilla de email `recuperacion-password.html` con botón de acción y URL de respaldo.

#### ✅ Autenticación de Dos Factores (2FA TOTP)
- Implementado con `otplib` v13 compatible con Google Authenticator y Authy
- Flujo: escaneo de QR → ingreso de código de verificación → activación
- **8 códigos de recuperación** de un solo uso para acceso de emergencia
- Pantalla de verificación 2FA integrada en el flujo de login

#### ✅ Dispositivo Confiable ("Confiar en este navegador")
- Checkbox en la pantalla de verificación 2FA
- Genera un JWT firmado de 30 días almacenado en `localStorage`
- Los logins subsiguientes desde ese navegador saltan la pantalla 2FA automáticamente
- El token expira o se invalida si el usuario cierra sesión explícitamente

#### ✅ Mejoras de Seguridad Transversales
- **JWT_SECRET** obligatorio con ≥ 32 caracteres — el servidor no arranca si no está configurado
- Sanitización de HTML con **DOMPurify** en el editor de plantillas de email (previene XSS)
- Descarga de archivos (reportes Excel/PDF) via `fetch + blob URL` con header `Authorization: Bearer` — **nunca** parámetro `?token=` en la URL (evita exposición en logs y historial)
- Respuestas API excluyen siempre `password_hash`, `reset_token`, `reset_token_expires`
- Rate limiting por **usuario autenticado** (no por IP), permitiendo múltiples usuarios en la misma red corporativa sin interferencia (500 req/15 min por usuario)

---

### 3.2 Control de Permisos y Roles

#### ✅ Matriz de Permisos Rediseñada
- **Antes:** Tabla cruzada estática con checkboxes difícil de leer
- **Después:** Interfaz por tabs (un tab por rol) con tarjetas de módulo en grid 2 columnas
- Auto-guardado instantáneo: cada cambio se persiste sin botón de guardar
- Indicador visual en tiempo real: contador de permisos activos por rol y por módulo
- Compatible con modo claro y oscuro

#### ✅ 6 Roles Operativos Alineados al Negocio
| Rol | Nivel | Alcance |
|-----|-------|---------|
| Admin | 100 | Acceso total |
| Supervisor | 75 | Operaciones, reportes, configuración |
| Financiera | 60 | Cajas menores, gastos, vehículos |
| Operador | 50 | Bodega, inventario, auditorías |
| Conductor | 30 | Viajes, gastos propios, cajas asignadas |
| Cliente | 10 | Portal de consulta de sus propios datos |

#### ✅ Portal Cliente con Sistema de Permisos Independiente
- Los usuarios de rol `cliente` usan un sistema de permisos JSON separado del sistema de roles internos
- Permisos configurables por cada cliente vía panel de administración
- El middleware `filtrarPorCliente` inyecta automáticamente el `cliente_id` en todas las consultas para aislar los datos

---

### 3.3 Integración WMS CenthriX

#### ✅ Modelo Dual PUSH + PULL
**Problema anterior:** No existía integración automática entre el WMS y el CRM.

**PUSH (WMS → CRM):** El WMS notifica al CRM via webhook autenticado con `X-WMS-API-Key` cuando se completa una operación. Endpoints:
- `POST /wms/sync/productos` — sincronización del catálogo de SKUs
- `POST /wms/sync/entradas` — recepciones (CO)
- `POST /wms/sync/salidas` — despachos (PK)
- `POST /wms/sync/kardex` — ajustes de inventario (CR)

**PULL (CRM → WMS, polling cada N minutos):** El CRM consulta periódicamente la API del WMS y sincroniza las órdenes con estado "Finalizada". Configurable via `WMS_SYNC_INTERVAL` (por defecto cada 5 minutos).

**Deduplicación cruzada PUSH↔PULL:** Por `wms_order_id` (UUID del WMS) y `documento_wms` (número de orden), evitando duplicados cuando ambos mecanismos procesan la misma orden.

#### ✅ Sincronización de Kardex desde App Móvil WMS
- Los ajustes realizados desde la app móvil del WMS no llegaban al CRM (sin webhook para kardex móvil)
- Solución: polling del historial de ajustes por pallet (`GET /forklift-drivers/kardex/history`)
- Cada `CajaInventario` almacena su `wms_pallet_id` (UUID WMS) y `wms_kardex_ultima_sync` (fecha del último ajuste procesado)
- Primera sincronización: solo marca timestamp sin procesar historial previo (evita flood de movimientos históricos)

#### ✅ Tab de Ubicación Física en Detalle de Producto
- Los productos sincronizados desde el WMS muestran un tab "Ubicación WMS"
- Tabla: N° Caja · Coordenada en bodega · Bodega · Lote · Cantidad
- El nombre de la bodega se resuelve con una sola llamada `GET /warehouses`, no N llamadas individuales
- El N° de caja del CRM se resuelve desde la base de datos local cruzando `wms_pallet_id`

#### ✅ Dashboard WMS de Sincronización
- KPIs en tiempo real: operaciones sincronizadas, errores, tasa de éxito
- Historial de logs con estado (exitoso/fallido), tipo de operación y timestamp
- Botón de re-ejecución para logs fallidos de PUSH (con payload guardado)
- Botón para ejecutar el polling manualmente desde la interfaz
- Distingue visualmente logs PUSH (re-ejecutables) de PULL (sin payload)

---

### 3.4 Módulos de Inventario

#### ✅ Control de Cajas/Pallets Individuales
- Cada referencia (SKU × cliente) tiene cajas físicas individuales con lote, ubicación y estado
- Auto-generación de números de caja `CJ-XXXXXX`
- Buscador en la tabla de cajas dentro del detalle de producto
- Ordenamiento dinámico por columnas

#### ✅ Auditorías Operativas con Stepper
- **Entradas** (verde): verificación de líneas recibidas, logística obligatoria, evidencias fotográficas
- **Salidas** (azul): datos de despacho, picking, sucursal y ciudad destino
- **Kardex** (púrpura): flujo simplificado, logística opcional
- Cada auditoría tiene stepper de estado, KPIs de avance y cierre con selección de plantilla de email
- Exportación a Excel desde cada listado
- Búsqueda por número de documento WMS
- Paginación de 20 registros por página

#### ✅ Alertas de Stock
- Detección automática de stock bajo (umbral configurable) y agotado
- Gestión de alertas: atender, descartar o silenciar
- Notificación en tiempo real vía WebSocket al crear una alerta

---

### 3.5 Reportería

#### ✅ Reportes con KPIs, Gráficos y Exportación
- **Reporte de Operaciones:** KPIs + gráficos de barras por estado y pie de ingresos/salidas + tendencia mensual + variaciones % mes anterior
- **Reporte de Inventario:** KPIs + gráficos (pie por estado, top productos por valor) + exportación
- **Reporte de Clientes:** KPIs + gráficos (pie activos/inactivos, pie por tipo) + columna de productos por cliente
- **Reporte de Averías:** KPIs (total averías, costo estimado, frecuencia) + gráficos por tipo + tabla detallada

#### ✅ Envío por Email y Reportes Programados
- Modal para enviar cualquier reporte con adjunto Excel, PDF o ambos
- Programación con `node-cron` (zona horaria `America/Bogota`): diario, semanal, quincenal, mensual
- 6 tipos de reporte programado: operaciones, inventario, clientes, viajes, cajas menores, gastos
- Notificación en tiempo real al enviar un reporte programado

#### ✅ Filtros Persistentes en URL
- Los filtros de fecha, cliente y estado se almacenan en los query params de la URL
- Permite compartir el enlace con los mismos filtros aplicados y persistencia al recargar

---

### 3.6 Notificaciones y Comunicación en Tiempo Real

#### ✅ WebSocket con Socket.IO
- Autenticación JWT en el handshake
- Notificación instantánea para: sync WMS, cierre de auditoría, stock bajo/agotado, nuevo cliente, nuevo usuario portal, reporte enviado
- Toast automático con color según prioridad (urgente=rojo, alta=naranja, normal=azul)
- Badge del header se actualiza sin recargar la página
- Reconexión automática con `reconnectionAttempts: Infinity`
- Compatible con App Runner usando solo transporte `polling` (sin WebSocket nativo)
- Listener de `visibilitychange` para reconexión cuando el usuario vuelve a la pestaña en móvil

#### ✅ Plantillas de Email Personalizables
- Editor CRUD con preview en tiempo real
- 3 plantillas de operaciones (entrada, salida, kardex) + plantilla general
- Plantillas de sistema no editables: bienvenida, reseteo de contraseña admin, recuperación de contraseña
- Variables dinámicas con Handlebars
- Firma configurable por plantilla con logo de empresa
- Diseño corporativo: header oscuro con logo, barra naranja, footer con datos de contacto
- Logo incrustado como base64 para máxima compatibilidad con clientes de email

---

### 3.7 UI/UX y Accesibilidad

#### ✅ Sistema de Diseño Consistente
- **Antes:** Mezcla de clases `slate-*` + colores hardcodeados `[#E74C3C]` + tokens `centhrix-*`, inconsistente entre componentes
- **Después:** Tokens CSS centralizados (`centhrix-bg`, `centhrix-card`, `centhrix-surface`) para dark mode; paleta de acento unificada con `orange-500`/`orange-700` en lugar de valores hex inline
- Colores de gráficos centralizados en `frontend/src/utils/chartColors.js`
- Tipografía: **Segoe UI** para datos/body · **Rajdhani** (Google Fonts) para headings de secciones

#### ✅ Componentes de Formulario Personalizados
**Problema:** Los `<select>` e `<input type="date">` nativos tienen apariencia inconsistente entre sistemas operativos y no respetan el dark mode del sistema.

**Solución:**
- **`FilterDropdown`:** Componente dropdown personalizado que reemplaza todos los `<select>` del sistema. Soporta posición `fixed` para escapar stacking contexts de modales, modo compacto para barras de filtro, y navegación por teclado.
- **`DatePicker`:** Componente de calendario construido sobre `react-day-picker@9.14.0` que reemplaza todos los `<input type="date">`. Incluye navegación rápida por mes y año. Valor siempre en formato `YYYY-MM-DD` (string).
- Reemplazados en todos los módulos: clientes, usuarios, productos, viajes, vehículos, caja menor, movimientos, plantillas, reportes, averías, WMS dashboard.

#### ✅ Accesibilidad ARIA (WCAG 2.1 AA)
- `aria-label` en todos los botones icon-only
- Roles ARIA en `DataTable` (tabla interactiva con ordenamiento): `role="columnheader"`, `aria-sort`
- `aria-label` en divs y spans interactivos (overlays, elementos clickeables)
- `Input` mejorado con indicador de campo obligatorio (`aria-required`) y texto de hint (`aria-describedby`)
- `Button` con estados `aria-pressed`, `aria-disabled`, `aria-busy` (loading)
- Corrección de hooks condicionales en `ClientesList.jsx` que causaban crash en React (violación de reglas de hooks)

#### ✅ Mejoras Responsive y Móvil
- Corrección de desbordamiento de tablas y grids en vista móvil
- Corrección de clipping de formularios en pantallas pequeñas
- Corrección de iconos distorsionados en formularios
- Posición `fixed` en FilterDropdown y DatePicker para escapar stacking contexts en modales
- El sistema es probado activamente en iPhone (dispositivo real de producción)

#### ✅ Optimizaciones de Rendimiento Frontend
- `React.memo` en `AlertWidget` para evitar re-renders innecesarios
- Progress bars implementadas con `transform: scaleX()` en lugar de `width` para evitar layout reflow (mejora CLS)
- Alt descriptivo en avatares del header
- Lazy loading de rutas con `React.lazy` + `Suspense`

---

### 3.8 Auditoría de Acciones del Sistema

- Registro de todas las acciones (crear, actualizar, eliminar, login, logout, exportar)
- Snapshot del estado antes y después de cada cambio
- IP real del usuario (considera proxies con `X-Forwarded-For`) y user agent
- Panel de auditoría exclusivo para admin con filtros por fecha, usuario y tipo de acción
- `registro_id: 0` para operaciones masivas (cumple restricción NOT NULL)

---

### 3.9 Búsqueda Global

- Modal activado con `Ctrl+K` desde cualquier página
- Busca simultáneamente en: Inventario, Clientes, Entradas, Salidas, Kardex
- Resultados agrupados por módulo con navegación por teclado (↑↓ + Enter)
- Debounce de 400 ms, mínimo 2 caracteres para disparar la búsqueda

---

### 3.10 Infraestructura y DevOps

#### ✅ Migración a AWS (desde Railway + Cloudinary)

| Componente | Antes | Después |
|-----------|-------|---------|
| Backend | Railway | AWS App Runner (us-west-2, 1 vCPU / 2 GB) |
| Base de datos | MySQL en Railway | AWS RDS MySQL 8.0 (db.t3.micro, Single-AZ) |
| Almacenamiento de archivos | Cloudinary | Amazon S3 (bucket `istho-crm-files`, privado) |
| Frontend | Vercel | Vercel (sin cambio) |
| Email | Gmail SMTP (bloqueado en Railway) | Gmail SMTP puerto 587 (funciona en App Runner) |

**Razones del cambio:**
- Railway bloqueaba el puerto SMTP 587, impidiendo el envío de emails
- Cloudinary tiene costos crecientes y limitaciones de transformaciones
- App Runner + IAM Instance Role elimina credenciales de AWS del código
- RDS con VPC Connector asegura que la base de datos no sea accesible desde internet

#### ✅ Almacenamiento de Archivos con S3
- Todos los archivos subidos van a S3, no al sistema de archivos del servidor (que es efímero en App Runner)
- Acceso mediante **presigned URLs con TTL de 15 minutos** para garantizar privacidad
- Logo de email almacenado con URL pública en `/branding/logo-email.png`
- Carpetas organizadas: `avatares/`, `soportes/`, `evidencias/{id}/`, `averias/{id}/`, `branding/`
- En producción: IAM Instance Role (sin credenciales en variables de entorno)

#### ✅ Backups Automáticos de Base de Datos
- GitHub Actions dispara un backup diario a las 2 AM (hora Colombia) hacia Backblaze B2
- Retención de 30 días con eliminación automática
- Botón en el panel de administración para disparar el backup manualmente vía API de GitHub
- Alerta por email al admin si el backup falla

#### ✅ Migraciones de Base de Datos con Umzug
- **Antes:** `sync({ alter: true })` que causaba timeouts y no soportaba renombrar columnas
- **Después:** Umzug ejecuta migraciones versionadas (`src/migrations/*.js`) automáticamente en cada startup
- Scripts disponibles: `migration:create`, `migration:status`, `migration:up`, `migration:undo`

#### ✅ CI/CD con GitHub Actions
- Workflow automático en cada push a `main`: lint → test → build
- Tests frontend con **Vitest** + `@testing-library/react`
- Tests backend con **Jest** con globalSetup para migraciones
- ESLint configurado en frontend y backend con entornos correctos (Node + Jest)

#### ✅ Optimizaciones de Capacidad
- Pool de conexiones MySQL: máximo 20 conexiones (suficiente para 15 usuarios simultáneos)
- Rate limiter por usuario autenticado (no por IP): 500 req/15 min (antes 100 req/IP causaba 429 frecuentes en redes corporativas con NAT)
- Rate limiter corre **después** de CORS para que los errores 429 lleguen correctamente al navegador
- `/socket.io` excluido del rate limiter general

---

## 4. Estado Actual del Sistema

### 4.1 Módulos en Producción

| Módulo | Estado | Notas |
|--------|--------|-------|
| Autenticación (JWT + 2FA + dispositivo confiable) | ✅ Activo | Flujo recuperación corregido en v1.2.0 |
| Inventario + Cajas | ✅ Activo | Restricción WMS en productos con `codigo_wms` |
| Integración WMS (PUSH + PULL) | ✅ Activo | Polling cada 5 min, kardex por historial de pallet |
| Auditorías (Entradas, Salidas, Kardex) | ✅ Activo | Stepper + cierre con email |
| Dashboard WMS | ✅ Activo | KPIs, historial, re-ejecución, polling manual |
| Tab Ubicación WMS | ✅ Activo | Por coordenada y bodega |
| Clientes + Portal Cliente | ✅ Activo | Sistema de permisos separado |
| Despachos | ✅ Activo | |
| Caja Menor (cualquier empleado) | ✅ Activo | Antes solo conductores |
| Vehículos y Viajes | ✅ Activo | |
| Reportes (Operaciones, Inventario, Clientes, Averías) | ✅ Activo | Con exportación y envío por email |
| Reportes Programados | ✅ Activo | 6 tipos, 4 frecuencias |
| Notificaciones en tiempo real | ✅ Activo | Socket.IO polling |
| Búsqueda Global (Ctrl+K) | ✅ Activo | |
| Plantillas de Email | ✅ Activo | Editor CRUD + preview |
| Administración de Usuarios y Roles | ✅ Activo | Matriz de permisos con tabs |
| Auditoría de Acciones | ✅ Activo | Snapshots antes/después |
| Backups automáticos | ✅ Activo | GitHub Actions → Backblaze B2 |

### 4.2 Infraestructura Activa

| Servicio | Proveedor | Costo aprox./mes |
|----------|-----------|-----------------|
| Backend | AWS App Runner (us-west-2) | ~$14–15 USD |
| Base de datos | AWS RDS MySQL 8.0 (db.t3.micro) | ~$14–15 USD |
| Almacenamiento | Amazon S3 (`istho-crm-files`) | ~$0.10 USD |
| Frontend | Vercel (Hobby free) | $0 |
| Email | Gmail SMTP | $0 |
| Email transaccional | Resend (Free, 3.000/mes) | $0 |
| Backups | Backblaze B2 (Free, 10 GB) | $0 |
| CI/CD | GitHub Actions (Free) | $0 |
| **Total** | | **~$30–32 USD/mes** |

### 4.3 URLs del Sistema

| Ambiente | URL |
|----------|-----|
| Frontend (producción) | https://istho-crm-six.vercel.app |
| Backend API (producción) | https://ebsnqupa45.us-west-2.awsapprunner.com |
| Frontend (desarrollo) | http://localhost:5173 |
| Backend API (desarrollo) | http://localhost:5000 |

---

## 5. Brechas de Calidad Identificadas (Pendientes)

Los siguientes ítems fueron identificados en auditoría de calidad (2026-04-22) y están pendientes de resolución:

| ID | Descripción | Severidad | Estado |
|----|-------------|-----------|--------|
| BRE-01 | Tests unitarios frontend con Vitest — cobertura básica (login, permisos, roles) | Media | Parcialmente iniciado |
| BRE-02 | Tests de integración backend — mayor cobertura de controllers | Media | Pendiente |
| BRE-03 | Variables de entorno en `.env` no deben estar en git — verificar `.gitignore` | Alta | Pendiente verificar |
| BRE-04 | Redis (Upstash) para Socket.IO multi-instancia en App Runner | Baja | Pendiente si se escala |
| BRE-05 | Dependencias de hooks faltantes en `AuthContext.jsx` (`useMemo`) y `Login.jsx` (`useEffect`) | Baja | Pendiente |

---

## 6. Stack Tecnológico Final

| Capa | Tecnología |
|------|-----------|
| Frontend | React 19 + Vite 6 + Tailwind CSS 4 + MUI 7 + Lucide Icons |
| Backend | Node.js 22 + Express 4.18 + Sequelize 6 (ORM) |
| Base de Datos | MySQL 8.0 (XAMPP local / AWS RDS producción) |
| Autenticación | JWT HS256 (access 24h + refresh 7d) + TOTP (otplib v13) |
| Email transaccional | Resend API + Nodemailer + Handlebars templates |
| Exportaciones | ExcelJS (Excel) + PDFKit (PDF) |
| Archivos | Multer + Amazon S3 (presigned URLs, TTL 15 min) |
| Notificaciones | Socket.IO 4.x (polling transport) |
| Migraciones | Umzug 3.x |
| CI/CD | GitHub Actions |
| Testing | Vitest (frontend) + Jest (backend) |
| Linting | ESLint 9.x + Prettier |

---

*Documento generado el 2026-05-07. Refleja el estado del sistema en la versión 1.2.0 (commit `d676127`).*
