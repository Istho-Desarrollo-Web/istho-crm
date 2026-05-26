# Módulo de Solicitudes del Cliente — Diseño

## Goal

Permitir que los usuarios del portal cliente creen avisos de ingreso de mercancía y solicitudes de despacho directamente desde el CRM, generando automáticamente un borrador de operación que el equipo ISTHO revisa y confirma.

## Architecture

Un módulo independiente `solicitudes` con sus propias tablas en base de datos, desacoplado del modelo `Operacion` existente. Al confirmar una solicitud, se crea la `Operacion` real vinculada via `solicitud_id`. Los usuarios internos de ISTHO (admin/supervisor/operador) se asignan explícitamente a cada cliente mediante una tabla `cliente_responsables`, garantizando que las notificaciones lleguen solo a los responsables correctos.

## Tech Stack

- **Backend:** Express + Sequelize + MySQL, patrón existente Routes → Middleware → Controller → Service → Model
- **Frontend:** React 19 + Vite + Tailwind 4, componentes comunes existentes (FilterDropdown, DatePicker, AccionesDropdown)
- **Almacenamiento adjuntos:** S3 bucket `istho-crm-files`, carpeta `solicitudes/{id}/`
- **Notificaciones:** Socket.IO (tiempo real) + Nodemailer con Handlebars (email)
- **Migraciones:** Umzug (patrón existente)

---

## Módulo 1 — Base de Datos

### Tabla `solicitudes`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | Auto-incremental |
| `numero_solicitud` | VARCHAR | Correlativo `SOL-YYYY-NNNN` único |
| `tipo` | ENUM | `ingreso` / `despacho` |
| `cliente_id` | FK → Cliente | Cliente que genera la solicitud |
| `creado_por` | FK → Usuario | Usuario portal que la crea |
| `estado` | ENUM | `recibida` / `en_proceso` / `completada` / `rechazada` |
| `prioridad` | ENUM | `normal` / `urgente` |
| `fecha_estimada` | DATEONLY | Fecha estimada de llegada o despacho deseado |
| `numero_documento` | VARCHAR | Remisión, factura o número de orden de compra |
| `transportista` | VARCHAR | Nombre del transportista (ingreso) |
| `direccion_entrega` | VARCHAR | Dirección de entrega (despacho) |
| `contacto_destino` | VARCHAR | Nombre y teléfono del contacto en destino (despacho) |
| `notas` | TEXT | Observaciones libres |
| `documento_url` | VARCHAR | URL S3 del adjunto (PDF/imagen) |
| `operacion_id` | FK → Operacion | Vinculada al confirmar (nullable) |
| `createdAt` / `updatedAt` | DATETIME | Timestamps automáticos |

### Tabla `solicitud_detalles`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | |
| `solicitud_id` | FK → Solicitud | |
| `referencia` | VARCHAR | Código o referencia del producto |
| `descripcion` | VARCHAR | Descripción del producto |
| `cantidad` | DECIMAL | Cantidad solicitada |
| `unidad` | ENUM | `caja` / `pallet` / `unidad` |

### Tabla `solicitud_comentarios`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | |
| `solicitud_id` | FK → Solicitud | |
| `usuario_id` | FK → Usuario | Quien comenta (cliente o ISTHO) |
| `mensaje` | TEXT | Contenido del comentario |
| `archivo_url` | VARCHAR | URL S3 de adjunto opcional |
| `es_interno` | BOOLEAN | `true` = solo visible para ISTHO |

### Tabla `cliente_responsables`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | INT PK | |
| `cliente_id` | FK → Cliente | |
| `usuario_id` | FK → Usuario | Solo roles: `admin`, `supervisor`, `operador` |
| `createdAt` / `updatedAt` | DATETIME | |

**Restricción:** `(cliente_id, usuario_id)` único. No se pueden asignar usuarios con rol `conductor`, `financiera` o `cliente`.

---

## Módulo 2 — Backend

### Archivos nuevos

```
server/src/
  models/
    Solicitud.js
    SolicitudDetalle.js
    SolicitudComentario.js
  controllers/
    solicitudController.js
  routes/
    solicitud.routes.js
  migrations/
    20260526000001-create-solicitudes.js
    20260526000002-create-solicitud-detalles.js
    20260526000003-create-solicitud-comentarios.js
    20260526000004-create-cliente-responsables.js
```

### Archivos modificados

```
server/src/
  models/index.js               — registrar asociaciones nuevas
  models/Cliente.js             — hasMany ClienteResponsable
  models/Operacion.js           — belongsTo Solicitud (opcional, via solicitud_id)
  models/Usuario.js             — agregar 'solicitudes' a PERMISOS_CLIENTE_DEFAULT
  routes/index.js               — montar solicitud.routes
  routes/cliente.routes.js      — agregar endpoints de responsables
  controllers/clienteController.js — métodos getResponsables / addResponsable / removeResponsable
```

### Endpoints

#### Solicitudes

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| `POST` | `/solicitudes` | cliente | Crear solicitud + líneas de detalle |
| `GET` | `/solicitudes` | cliente / admin / supervisor | Listar (cliente ve solo las suyas) |
| `GET` | `/solicitudes/:id` | cliente / admin / supervisor | Detalle con detalles y comentarios |
| `PATCH` | `/solicitudes/:id/estado` | admin / supervisor | Cambiar estado (en_proceso / completada / rechazada) |
| `PATCH` | `/solicitudes/:id/vincular` | admin / supervisor | Vincular a `Operacion` real |
| `POST` | `/solicitudes/:id/comentarios` | cliente / admin / supervisor | Agregar comentario o archivo |
| `POST` | `/solicitudes/:id/documento` | cliente | Subir adjunto a S3 (multipart) |

#### Responsables por cliente

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| `GET` | `/clientes/:id/responsables` | admin / supervisor | Listar responsables asignados |
| `POST` | `/clientes/:id/responsables` | admin | Asignar usuario como responsable |
| `DELETE` | `/clientes/:id/responsables/:uid` | admin | Quitar responsable |

### Acciones automáticas al crear una solicitud

1. Generar número correlativo `SOL-YYYY-NNNN` (con bloqueo de transacción para evitar duplicados)
2. Guardar líneas de detalle en `solicitud_detalles`
3. Subir adjunto a S3 `solicitudes/{id}/` si viene archivo
4. Consultar `cliente_responsables` para obtener los usuarios a notificar; fallback a todos los `admin` si no hay ninguno
5. Crear notificación CRM vía `notificacionService.notificarMultiple()` con `accion_url: '/clientes/{cliente_id}?tab=solicitudes&id={solicitud_id}'` y `accion_label: 'Ver solicitud'`
6. Enviar email al equipo responsable con resumen de la solicitud y botón "Ver Solicitud" enlazando a la misma URL
7. Registrar en tabla `Auditoria`

### Permisos del portal cliente

```js
// Agregar a PERMISOS_CLIENTE_DEFAULT en Usuario.js
solicitudes: ['ver', 'crear', 'comentar']
```

```js
// Agregar a PERMISOS_POR_ROL.cliente en AuthContext.jsx
solicitudes: ['ver', 'crear', 'comentar']
```

---

## Módulo 3 — Frontend (Portal Cliente)

### Archivos nuevos

```
frontend/src/
  pages/Solicitudes/
    SolicitudesList.jsx     — lista con tabs Ingresos / Despachos
    SolicitudDetail.jsx     — detalle + hilo de comentarios
    SolicitudForm.jsx       — modal de creación (campos dinámicos por tipo)
  api/
    solicitudes.service.js  — CRUD solicitudes, comentarios, adjuntos
```

### Archivos modificados

```
frontend/src/
  App.jsx                         — agregar ruta /solicitudes y /solicitudes/:id
  components/common/FloatingHeader.jsx — agregar ítem "Solicitudes" al menú portal cliente
  pages/Clientes/ClienteDetail.jsx     — nueva pestaña "Solicitudes" + sección "Equipo ISTHO asignado"
  utils/tutorialConfig.js              — agregar tour solicitudes
  pages/Reportes/ReportesList.jsx      — agregar card "Reporte de Solicitudes"
```

### Navegación

- **Portal cliente:** Nueva entrada "Solicitudes" en `FloatingHeader` — ruta `/solicitudes` — permiso `solicitudes.ver`
- **Usuarios ISTHO:** Acceden desde `ClienteDetail.jsx` → tab "Solicitudes" (no tienen entrada global en el menú)
- La ruta `/solicitudes` usa `PermissionRoute module="solicitudes" action="ver"`

### SolicitudesList.jsx

- Tabs: **Ingresos** / **Despachos**
- Filtros: estado (todas/recibida/en_proceso/completada/rechazada), fecha desde/hasta, búsqueda por número
- Cada fila: número de solicitud, fecha, estado (badge con color), prioridad (badge urgente en rojo)
- Botón "Nueva Solicitud" abre `SolicitudForm`
- Click en fila navega a `SolicitudDetail`

### SolicitudForm.jsx (modal)

**Campos comunes (ingreso y despacho):**
- Tipo (selector — fijo si viene de un tab)
- Fecha estimada (`DatePicker`)
- Número de documento / orden de compra
- Prioridad (`FilterDropdown`: normal / urgente)
- Notas (textarea)
- Adjunto (upload PDF/imagen → S3)
- Tabla dinámica de líneas: referencia, descripción, cantidad, unidad — con botón "Agregar línea" y eliminar por fila

**Solo ingreso:** Transportista / vehículo

**Solo despacho:** Dirección de entrega, contacto en destino (nombre + teléfono)

### SolicitudDetail.jsx

- Header: número, tipo, estado (badge), prioridad, fecha estimada, cliente
- Acciones ISTHO (solo admin/supervisor): cambiar estado, vincular a operación existente
- Si vinculada: enlace a la `Operacion` real
- Tabla de líneas de detalle (solo lectura)
- Sección adjunto: enlace de descarga si existe
- Hilo de comentarios: lista cronológica con avatar + nombre + fecha; comentarios internos marcados con 🔒; input + botón "Enviar" + opción de adjuntar archivo

### Sección "Equipo ISTHO asignado" en ClienteDetail.jsx

- Nueva sección en la pestaña de información del cliente (solo visible para admin)
- Lista los responsables asignados con nombre, rol y botón de quitar
- Selector de usuarios (filtrado a roles: admin, supervisor, operador) + botón "Asignar"

---

## Módulo 4 — Reporte de Solicitudes

### Archivos nuevos

```
frontend/src/pages/Reportes/ReporteSolicitudes.jsx
```

### Archivos modificados

```
server/src/controllers/reporteController.js  — agregar función reporteSolicitudes()
server/src/routes/reporte.routes.js          — agregar GET /reportes/solicitudes
frontend/src/pages/Reportes/ReportesList.jsx — agregar card "Solicitudes"
```

### Endpoint

`GET /reportes/solicitudes` — parámetros: `desde`, `hasta`, `cliente_id`, `tipo`, `estado`, `responsable_id`

**Acceso:** admin y supervisor ven todos los clientes; cliente portal ve solo sus propias solicitudes (filtrado por `cliente_id` automáticamente en backend).

### KPIs (cards superiores)

| Indicador | Descripción |
|---|---|
| Total solicitudes | Conteo en el período |
| Tasa de cumplimiento | Completadas / total × 100% |
| Tiempo promedio de respuesta | Promedio de días entre `createdAt` y fecha de vinculación a operación |
| Rechazadas | Conteo con motivo registrado (último comentario ISTHO) |

### Gráficas

1. **Solicitudes por mes** — gráfica de barras, separada por tipo (ingreso vs. despacho)
2. **Distribución por tipo** — dona (ingreso / despacho)
3. **Tiempo promedio por cliente** — barras horizontales ordenadas de mayor a menor
4. **Tasa de cumplimiento por responsable ISTHO** — barras horizontales

### Tabla de detalle

Columnas: N° Solicitud · Cliente · Tipo · Fecha envío · Tiempo respuesta (días) · Estado · Responsable ISTHO · N° Operación vinculada · Unidades solicitadas · Unidades reales · Diferencia

### Exportación

- Excel y PDF siguiendo patrón existente: `fetch + blob URL` con header `Authorization: Bearer`
- Ruta frontend: `/reportes/solicitudes`

---

## Estados y transiciones

```
recibida → en_proceso → completada
recibida → rechazada
en_proceso → rechazada
```

- Solo admin/supervisor pueden cambiar estado
- Al pasar a `en_proceso`: el responsable ISTHO queda registrado como el que tomó la solicitud
- Al pasar a `completada`: debe existir `operacion_id` vinculada (validación backend)
- Al pasar a `rechazada`: el PATCH debe incluir campo `motivo` (string requerido); el backend lo crea automáticamente como `SolicitudComentario` con `es_interno = false` para que el cliente vea el motivo

---

## Numeración de solicitudes

Formato: `SOL-YYYY-NNNN` donde `NNNN` es correlativo anual reiniciado cada año.
Ejemplo: `SOL-2026-0001`, `SOL-2026-0002` ... `SOL-2027-0001`

Implementación: consulta `MAX(numero_solicitud)` del año actual dentro de una transacción, incrementa y formatea. Sin tabla de secuencias separada.

---

## Consideraciones de seguridad

- Un cliente solo puede ver y operar sus propias solicitudes (filtrado por `cliente_id` en todos los endpoints)
- Los comentarios con `es_interno = true` no se retornan al cliente portal
- Los adjuntos se sirven via presigned URLs de S3 (15 min TTL), nunca con rutas públicas permanentes
- Auditoría registrada en cada cambio de estado y al vincular operación
