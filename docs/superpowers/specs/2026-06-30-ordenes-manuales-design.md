# Creación de Órdenes Manuales — Design Spec

## Objetivo

Permitir que usuarios con rol **admin** creen operaciones de ingreso y salida directamente desde el CRM, sin requerir sincronización con el WMS. Cubre casos de registro retroactivo (operaciones que ya ocurrieron) y planificación anticipada (operaciones futuras).

---

## Contexto

El backend ya soporta creación manual vía `POST /operaciones` (modo sin `documento_wms`), pero:
- El permiso mínimo actual es `operador` — cualquier operador podría crear, no solo admin
- No existe ningún formulario en el frontend — el CRM solo consume operaciones del WMS

---

## Decisiones de Diseño

| Pregunta | Decisión |
|---|---|
| Productos en entradas | Libre (autocomplete del inventario + texto nuevo) |
| Productos en salidas | Busca inventario existente; warning si stock insuficiente con override admin |
| Ubicación UI | Modal en EntradasList y SalidasList, solo visible para admin |
| Estado inicial | Admin elige: `pendiente` o `cerrado` al crear |

---

## Backend

### 1. Cambio de permiso

**Archivo:** `server/src/routes/operacion.routes.js`

Cambiar `requiereRolMinimo('operador')` a `requiereRolMinimo('admin')` en `POST /operaciones`.

Las rutas WMS usan autenticación por `X-WMS-API-Key` (`/wms/sync/entrada|salida`) — no se ven afectadas. El polling job (`wmsPollingJob.js`) llama servicios directamente sin pasar por HTTP — tampoco afectado.

### 2. Campo `estado_inicial`

**Archivo:** `server/src/validators/operacionValidator.js`

Agregar validación de `estado_inicial` en el schema de creación:
- Valores permitidos: `'pendiente'` (default) · `'cerrado'`
- Opcional — si no se envía, default a `'pendiente'`

### 3. Lógica de stock según `estado_inicial`

**Archivo:** `server/src/controllers/operacionController.js`

| Tipo | `estado_inicial` | Efecto en stock |
|---|---|---|
| ingreso | pendiente | Ninguno al crear; incrementa al cerrar (comportamiento actual) |
| ingreso | cerrado | Incrementa `cantidad` en `CajaInventario` inmediatamente al crear |
| salida | pendiente | Reserva stock al crear (comportamiento actual) |
| salida | cerrado | Decrementa stock inmediatamente al crear |

Para `estado_inicial: 'cerrado'`, el controlador debe:
1. Crear la `Operacion` con `estado: 'cerrado'`
2. Procesar los detalles igual que en el flujo de cierre normal
3. Si `tipo: 'salida'` y stock insuficiente: solo continuar si el request trae `forzar: true`

### 4. Auditoría

**Archivo:** `server/src/controllers/operacionController.js`

Agregar `accion: 'creacion_manual'` en el `Auditoria.registrar` para distinguir operaciones creadas manualmente de las sincronizadas desde WMS.

---

## Frontend

### 5. Endpoint y servicio

**Archivo:** `frontend/src/api/endpoints.js`

```js
CREAR: '/operaciones'  // dentro de OPERACIONES_ENDPOINTS
```

**Archivo:** `frontend/src/api/auditorias.service.js`

```js
crearOperacion: (payload) => apiClient.post(OPERACIONES_ENDPOINTS.CREAR, payload)
```

### 6. Componente `CrearOperacionManualModal`

**Archivo:** `frontend/src/components/common/CrearOperacionManualModal.jsx`

**Props:**
- `tipo`: `'ingreso'` | `'salida'`
- `isOpen`: boolean
- `onClose`: () => void
- `onSuccess`: () => void

**Campos del formulario** (React Hook Form + Controller):

| Campo | Componente | Validación |
|---|---|---|
| Cliente | `FilterDropdown` | Required. Lista de clientes activos vía `clientesService.getAll()` |
| Fecha operación | `DatePicker` | Required. Default: fecha de hoy |
| Estado inicial | `FilterDropdown` | `pendiente` / `cerrado`. Default: `pendiente` |
| Documento de referencia | `input` texto nativo | Opcional (nro. remisión, OC, etc.). Se envía como campo `origen` en el payload — campo de texto libre en `Operacion` |
| Prioridad | `FilterDropdown` | normal / alta / urgente. Default: `normal` |

**Líneas de detalle** (`useFieldArray`):

Tabla con filas dinámicas (mínimo 1). Cada fila:
- **Producto/SKU** — autocomplete (ver abajo)
- **Cantidad** — número > 0
- **Unidad de medida** — texto (kg, und, caja, etc.)
- **Lote** — texto, opcional
- Botón quitar fila (deshabilitado si es la única fila)

Botón "Agregar producto" al pie de la tabla.

**Autocomplete de producto — comportamiento por tipo:**

*Para ingresos (`tipo='ingreso'`):*
- Input de texto libre con sugerencias del inventario existente (`GET /inventario/productos?buscar=X`)
- Si el admin escribe un SKU/nombre que no existe en inventario, se acepta igual
- Si `estado_inicial: 'pendiente'`: el producto nuevo se creará en BD cuando la operación pase a `cerrado`
- Si `estado_inicial: 'cerrado'`: el controlador crea el producto inmediatamente (mismo flujo que el cierre normal, ejecutado en la misma transacción de creación)

*Para salidas (`tipo='salida'`):*
- Busca solo en inventario existente (`GET /inventario/productos?buscar=X`)
- Al seleccionar, muestra badge de stock disponible junto al nombre: `Stock: 42 und`
- Si `cantidad ingresada > stock_disponible`: muestra banner amarillo debajo de la tabla: _"Una o más líneas superan el stock disponible."_ + checkbox _"Crear igualmente (el admin es responsable)"_ que el admin debe marcar para habilitar el botón Guardar
- El flag `forzar: true` se envía al backend cuando ese checkbox está marcado

**Submit:**
- Construye payload: `{ tipo, cliente_id, fecha_operacion, estado_inicial, documento_referencia, prioridad, detalles: [...], forzar }`
- `POST /api/v1/operaciones`
- Al éxito: llama `onSuccess()` y muestra notificación `success('Operación creada correctamente')`
- Al error: muestra `error(message)` del response

### 7. Integración en páginas de lista

**Archivo:** `frontend/src/pages/Inventario/Entradas/EntradasList.jsx`

Agregar al `AccionesDropdown`:
```jsx
{ label: 'Nueva entrada', icon: PlusCircle, onClick: () => setModalCrear(true), hidden: user?.rol !== 'admin' }
```

Estado local: `const [modalCrear, setModalCrear] = useState(false)`

Al final del JSX:
```jsx
<CrearOperacionManualModal
  tipo="ingreso"
  isOpen={modalCrear}
  onClose={() => setModalCrear(false)}
  onSuccess={() => { setModalCrear(false); fetchData(); }}
/>
```

**Archivo:** `frontend/src/pages/Inventario/Salidas/SalidasList.jsx`

Idéntico al anterior con `tipo="salida"` y label `'Nueva salida'`.

`KardexList.jsx` — no aplica.

---

## Restricciones y Reglas de Negocio

- Solo `rol === 'admin'` puede crear operaciones manuales (frontend oculta el botón; backend rechaza con 403 si otro rol intenta)
- Operaciones creadas manualmente tienen `documento_wms: null` y `wms_order_id: null`
- El campo `numero_operacion` se autogenera igual que siempre: `OP-YYYY-XXXX`
- Si `estado_inicial: 'cerrado'`, no se puede volver a `pendiente` ni `en_proceso` (el flujo de estados solo avanza)
- Auditoría registra `accion: 'creacion_manual'` para trazabilidad

---

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `server/src/routes/operacion.routes.js` | `requiereRolMinimo('admin')` en `POST /` |
| `server/src/validators/operacionValidator.js` | Agregar `estado_inicial` al schema |
| `server/src/controllers/operacionController.js` | Lógica de stock para `estado_inicial: 'cerrado'` + `accion: 'creacion_manual'` |
| `frontend/src/api/endpoints.js` | Agregar `CREAR` a `OPERACIONES_ENDPOINTS` |
| `frontend/src/api/auditorias.service.js` | Agregar `crearOperacion(payload)` |
| `frontend/src/components/common/CrearOperacionManualModal.jsx` | Crear componente nuevo |
| `frontend/src/components/common/index.js` | Exportar `CrearOperacionManualModal` |
| `frontend/src/pages/Inventario/Entradas/EntradasList.jsx` | Botón + modal |
| `frontend/src/pages/Inventario/Salidas/SalidasList.jsx` | Botón + modal |
