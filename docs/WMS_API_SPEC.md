# Especificación API WMS — ISTHO CRM (CenthriX)

Documentación técnica completa de la API de sincronización con WMS Copérnico.

## Autenticación

Todas las rutas requieren el header:

```
X-WMS-API-Key: <valor_de_WMS_API_KEY>
```

| Código | Situación |
|--------|-----------|
| 401 | Header `X-WMS-API-Key` ausente |
| 403 | API Key inválida |
| 500 | Variable `WMS_API_KEY` no configurada en el servidor |

---

## Endpoints

| Método | Ruta | Descripción | Status |
|--------|------|-------------|--------|
| GET | `/api/v1/wms/sync/status` | Health check | 200 |
| POST | `/api/v1/wms/sync/productos` | Sincronizar catálogo de productos | 200 |
| POST | `/api/v1/wms/sync/entradas` | Crear operación de entrada (CO) | 201 |
| POST | `/api/v1/wms/sync/salidas` | Crear operación de salida (PK) | 201 |
| POST | `/api/v1/wms/sync/kardex` | Crear ajuste de inventario (CR) | 201 |

---

## 1. Health Check

**GET** `/api/v1/wms/sync/status`

```json
// Response 200
{
  "success": true,
  "message": "WMS Sync API activa",
  "timestamp": "2026-03-24T00:00:00.000Z",
  "version": "1.0.0"
}
```

---

## 2. Sincronizar Productos

**POST** `/api/v1/wms/sync/productos`

### Request

```json
{
  "nit": "800245795-0",
  "productos": [
    {
      "codigo": "PRD-001",
      "descripcion": "Caja cartón corrugado 60x40",
      "unidad_medida": "UND"
    }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nit` | string | **Sí** | NIT del cliente (debe existir y estar activo) |
| `productos` | array | **Sí** | Array no vacío de productos |
| `productos[].codigo` | string | **Sí** | SKU / código del producto (único por cliente) |
| `productos[].descripcion` | string | **Sí** | Nombre o descripción del producto |
| `productos[].unidad_medida` | string | No | Unidad de medida (default: `"UND"`) |

### Response 200

```json
{
  "success": true,
  "message": "Productos sincronizados: 3 creados, 2 actualizados",
  "data": {
    "creados": 3,
    "actualizados": 2,
    "errores": [],
    "total": 5
  }
}
```

### Reglas de negocio

- **Upsert** por `cliente_id + sku`: si el SKU ya existe → actualiza descripción; si no → crea con cantidad 0
- Productos con `codigo` o `descripcion` vacíos se agregan a `errores[]` pero no detienen el batch
- **Idempotente**: ejecutar múltiples veces es seguro, solo actualiza `ultima_sincronizacion_wms`

---

## 3. Entrada (CO — Recepción)

**POST** `/api/v1/wms/sync/entradas`

### Request

```json
{
  "nit": "800245795-0",
  "documento_origen": "REM-904869",
  "fecha_ingreso": "2026-03-18",
  "tipo_documento": "Remisión",
  "observaciones": "Remisión de 6 cajas desde proveedor ABC",
  "detalles": [
    {
      "producto": "PRD-001",
      "cantidad": 100,
      "descripcion": "Caja cartón corrugado 60x40",
      "unidad_medida": "UND",
      "lote": "LOT-2026-A",
      "lote_externo": "PROV-LOT-001",
      "fecha_vencimiento": "2027-03-18",
      "documento_asociado": "FAC-001",
      "caja": "CJ-000001",
      "ubicacion": "A-01-01",
      "peso": 25.5
    }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nit` | string | **Sí** | NIT del cliente |
| `documento_origen` | string | **Sí** | Número de documento WMS (único, previene duplicados) |
| `fecha_ingreso` | string | No | Fecha YYYY-MM-DD (default: hoy) |
| `tipo_documento` | string | No | Tipo de documento (informativo, ej: "Remisión") |
| `observaciones` | string | No | Notas adicionales |
| `detalles` | array | **Sí** | Array no vacío de líneas de detalle |

**Campos por línea de detalle:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `producto` | string | **Sí** | SKU del producto |
| `cantidad` | number | **Sí** | Cantidad a ingresar (entero positivo) |
| `descripcion` | string | No | Descripción del producto (ver lógica de fallback) |
| `unidad_medida` | string | No | Unidad de medida (default: `"UND"`) |
| `lote` | string | No | Número de lote interno |
| `lote_externo` | string | No | Número de lote del proveedor/externo |
| `fecha_vencimiento` | string | No | Fecha de vencimiento YYYY-MM-DD |
| `documento_asociado` | string | No | Factura, remisión u otro documento relacionado |
| `caja` | string/number | No | Número de caja (auto-genera `CJ-NNNNNN` si no se envía) |
| `ubicacion` | string | No | Zona de almacenamiento (ej: "A-01-01") |
| `peso` | number | No | Peso en kg |

### Response 201

```json
{
  "success": true,
  "message": "Entrada OP-2026-0042 creada exitosamente",
  "data": {
    "operacion_id": 123,
    "numero_operacion": "OP-2026-0042",
    "cliente_id": 5,
    "cliente": "EMPRESA XYZ S.A.S.",
    "documento_wms": "REM-904869",
    "total_lineas": 4,
    "total_unidades": 348,
    "estado": "pendiente"
  }
}
```

### Reglas de negocio

1. **Duplicados**: Si `documento_origen` ya existe como `documento_wms` en otra operación → error 400, rollback completo
2. **Inventario**: Upsert por `cliente_id + sku`. Si el producto no existe → lo crea con cantidad 0, luego suma
3. **Stock**: `stock_anterior + cantidad = stock_resultante`. Nunca negativo
4. **Cajas**: Si la caja ya existe en estado "disponible" → skip con warning. Si no → crea nueva
5. **Número de caja auto**: Si no se envía `caja`, se genera `CJ-NNNNNN` (6 dígitos aleatorios)
6. **Descripción fallback**: Catálogo maestro > `descripcion` enviada > SKU > `"Producto S/D"`
7. **Operación creada** con: `tipo="ingreso"`, `tipo_documento_wms="CO"`, `estado="pendiente"`
8. **Transacción atómica**: Todo se crea o nada se crea (rollback completo en error)

---

## 4. Salida (PK — Picking/Despacho)

**POST** `/api/v1/wms/sync/salidas`

### Request

```json
{
  "nit": "800245795-0",
  "numero_picking": "PK-34921",
  "documento_wms": "DES-001",
  "sucursal_entrega": "MDE-001",
  "ciudad_destino": "Medellín",
  "observaciones": "Pedido urgente - despachar hoy",
  "detalles": [
    {
      "producto": "PRD-001",
      "cantidad": 50,
      "descripcion": "Caja cartón corrugado 60x40",
      "unidad_medida": "UND",
      "lote_interno": "LOT-2026-A",
      "lote_externo": "PROV-LOT-001",
      "fecha_vencimiento": "2027-03-18",
      "caja": "CJ-000001",
      "pedido": "PED-001",
      "documento_asociado": "FAC-001",
      "ubicacion": "A-01-01",
      "peso": 12.5
    }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nit` | string | **Sí** | NIT del cliente |
| `numero_picking` | string | No | Número de picking del WMS (recomendado, usado para duplicados) |
| `documento_wms` | string | No | Documento WMS alternativo |
| `sucursal_entrega` | string | No | Sucursal de destino |
| `ciudad_destino` | string | No | Ciudad de destino |
| `observaciones` | string | No | Notas adicionales |
| `detalles` | array | **Sí** | Array no vacío de líneas |

**Campos por línea de detalle:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `producto` | string | **Sí** | SKU del producto |
| `cantidad` | number | **Sí** | Cantidad a despachar (entero positivo) |
| `descripcion` | string | No | Descripción del producto |
| `unidad_medida` | string | No | Unidad de medida (default: `"UND"`) |
| `lote_interno` | string | No | Lote interno (alias: `lote`) |
| `lote_externo` | string | No | Lote externo/proveedor |
| `fecha_vencimiento` | string | No | Fecha de vencimiento YYYY-MM-DD |
| `caja` | string/number | No | Número de caja a despachar |
| `pedido` | string | No | Número de pedido del cliente |
| `documento_asociado` | string | No | Documento relacionado |
| `ubicacion` | string | No | Ubicación de origen |
| `peso` | number | No | Peso en kg |

### Response 201

```json
{
  "success": true,
  "message": "Salida OP-2026-0043 creada exitosamente (Picking: PK-34921)",
  "data": {
    "operacion_id": 124,
    "numero_operacion": "OP-2026-0043",
    "cliente_id": 5,
    "cliente": "EMPRESA XYZ S.A.S.",
    "numero_picking": "PK-34921",
    "total_lineas": 3,
    "total_unidades": 180,
    "estado": "pendiente"
  }
}
```

### Reglas de negocio

1. **Duplicados**: Si `numero_picking` O `documento_wms` ya existe → error 400, rollback
2. **Stock**: `Math.max(0, stock_anterior - cantidad)` — nunca negativo
3. **SKU no encontrado**: Si el producto no existe en inventario → la línea se salta silenciosamente
4. **Caja origen**: Busca caja por `numero_caja + inventario_id` en estado "disponible". Si existe → marca como "despachada"
5. **Caja salida**: Crea nuevo registro con `tipo="salida"`, `estado="despachada"`
6. **Destino**: Se concatena `sucursal_entrega, ciudad_destino` en el campo `destino`
7. **Operación creada** con: `tipo="salida"`, `tipo_documento_wms="PK"`, `estado="pendiente"`

---

## 5. Kardex (CR — Ajuste de Inventario)

**POST** `/api/v1/wms/sync/kardex`

### Request

```json
{
  "nit": "800245795-0",
  "documento_origen": "KDC-2026-001",
  "motivo": "Ajuste por conteo físico",
  "fecha_ingreso": "2026-03-18",
  "observaciones": "Resultado de inventario cíclico zona A",
  "detalles": [
    {
      "producto": "PRD-001",
      "cantidad": 10,
      "caja": "CJ-000001",
      "descripcion": "Caja cartón corrugado 60x40",
      "unidad_medida": "UND",
      "lote": "LOT-2026-A",
      "lote_externo": "PROV-LOT-001",
      "fecha_vencimiento": "2027-03-18",
      "peso": 5.0
    }
  ]
}
```

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `nit` | string | **Sí** | NIT del cliente |
| `documento_origen` | string | No | Documento de referencia (usa `motivo` si no viene) |
| `motivo` | string | **Sí** | Razón del ajuste (texto libre o predefinido) |
| `fecha_ingreso` | string | No | Fecha del ajuste YYYY-MM-DD (default: hoy) |
| `observaciones` | string | No | Notas adicionales |
| `detalles` | array | **Sí** | Array no vacío de líneas |

**Campos por línea de detalle:**

| Campo | Tipo | Requerido | Descripción |
|-------|------|-----------|-------------|
| `producto` | string | **Sí** | SKU del producto (**debe existir** en inventario) |
| `cantidad` | number | **Sí** | Ajuste: **positivo = suma**, **negativo = resta** |
| `caja` | string/number | No | Número de caja a ajustar |
| `descripcion` | string | No | Descripción del producto |
| `unidad_medida` | string | No | Unidad de medida (default: `"UND"`) |
| `lote` | string | No | Número de lote |
| `lote_externo` | string | No | Lote externo |
| `fecha_vencimiento` | string | No | Fecha de vencimiento YYYY-MM-DD |
| `peso` | number | No | Peso en kg |

### Response 201

```json
{
  "success": true,
  "message": "Kardex OP-2026-0044 creado exitosamente (Motivo: Ajuste por conteo físico)",
  "data": {
    "operacion_id": 125,
    "numero_operacion": "OP-2026-0044",
    "cliente_id": 5,
    "cliente": "EMPRESA XYZ S.A.S.",
    "documento_wms": "KDC-2026-001",
    "motivo": "Ajuste por conteo físico",
    "total_lineas": 2,
    "total_unidades": 45,
    "lineas_omitidas": 0,
    "estado": "pendiente"
  }
}
```

### Reglas de negocio

1. **Duplicados**: Si `documento_origen` ya existe como kardex (tipo_documento_wms='CR') → error 400
2. **SKU obligatorio**: El producto **DEBE** existir en inventario. Si no → skip línea (warning)
3. **Dirección**: `cantidad > 0` → suma. `cantidad < 0` → resta

### Máquina de estados de cajas

| Operación | Estado actual | Acción | Estado resultante |
|-----------|--------------|--------|-------------------|
| **Suma** (+) | disponible | `caja.cantidad += abs(cantidad)` | disponible |
| **Suma** (+) | inactiva | Reactiva caja, ubicación = "RECEPCIÓN" | **disponible** |
| **Suma** (+) | despachada | Reactiva caja, ubicación = "RECEPCIÓN" | **disponible** |
| **Resta** (-) | disponible (resultado > 0) | `caja.cantidad -= abs(cantidad)` | disponible |
| **Resta** (-) | disponible (resultado = 0) | `caja.cantidad = 0`, ubicación = null | **inactiva** |
| **Resta** (-) | despachada | **PROHIBIDO** — línea omitida | sin cambio |

### Movimiento de inventario generado

| Dirección | MovimientoInventario.tipo | Motivo |
|-----------|--------------------------|--------|
| Suma (+) | `"entrada"` | `"Kardex WMS - {motivo}"` |
| Resta (-) | `"salida"` | `"Kardex WMS - {motivo}"` |

---

## Reglas transversales

### Cliente

- El NIT se busca con `trim()` y conversión a string
- El cliente debe existir **y** tener `estado = "activo"`
- Si no existe o está inactivo → error 400

### Número de operación

- Formato: `OP-{AÑO}-{SECUENCIAL}` (ej: `OP-2026-0042`)
- Secuencial de 4 dígitos, reinicia cada año
- Incluye operaciones soft-deleted en la secuencia (paranoid: false)

### Transacciones

- Todas las operaciones son **atómicas**: todo se crea o nada se crea
- Si falla cualquier línea → rollback completo de toda la operación
- Excepción: líneas omitidas en Kardex (SKU no encontrado) no causan rollback

### Notificaciones

- Se envían async después del commit (no bloquean la respuesta)
- Errores de notificación se ignoran (`.catch(() => {})`)
- Se notifica a admin y usuarios relacionados con el cliente

### Descripción de producto (fallback)

Cuando se recibe un producto en entrada/salida, la descripción se resuelve en este orden:

1. Descripción del catálogo maestro (Inventario existente)
2. `descripcion` enviada en la línea (si es diferente al SKU)
3. SKU como descripción
4. `"Producto S/D"` (sin descripción)

### Stock

- El stock **nunca puede ser negativo** (`Math.max(0, resultado)`)
- Campo `alertas_silenciadas` se limpia a NULL en cada cambio de stock

---

## Errores comunes

| Error | Código | Causa | Solución |
|-------|--------|-------|----------|
| `API Key requerida` | 401 | Header `X-WMS-API-Key` ausente | Agregar header |
| `API Key inválida` | 403 | Key no coincide | Verificar `WMS_API_KEY` en variables de entorno |
| `Cliente con NIT X no encontrado` | 400 | NIT no existe en BD | Crear el cliente primero |
| `Cliente X está inactivo` | 400 | Cliente suspendido/inactivo | Reactivar cliente |
| `Ya existe una operación con documento X` | 400 | Duplicado de `documento_origen` o `numero_picking` | Usar documento diferente o verificar si ya fue procesado |
| `Se requiere un array de productos` | 400 | Campo `productos` vacío o ausente | Enviar al menos 1 producto |
| `Motivo es requerido para ajustes kardex` | 400 | Campo `motivo` ausente | Incluir razón del ajuste |

---

## Modelos de datos involucrados

### Operación (operaciones)

| Campo | Tipo | Valores | Descripción |
|-------|------|---------|-------------|
| `tipo` | ENUM | `ingreso`, `salida`, `kardex` | Tipo de operación |
| `tipo_documento_wms` | ENUM | `CO`, `PK`, `CR` | Tipo de documento WMS |
| `estado` | ENUM | `pendiente`, `en_proceso`, `cerrado`, `anulado` | Estado de la operación |
| `prioridad` | ENUM | `baja`, `normal`, `alta`, `urgente` | Prioridad (default: normal) |
| `numero_operacion` | STRING | `OP-YYYY-NNNN` | Auto-generado |
| `documento_wms` | STRING | Ej: `REM-904869` | Documento de referencia del WMS |
| `numero_picking` | STRING | Ej: `PK-34921` | Solo para salidas |
| `motivo_kardex` | STRING | Texto libre | Solo para kardex |
| `sucursal_entrega` | STRING | Ej: `MDE-001` | Solo para salidas |
| `ciudad_destino` | STRING | Ej: `Medellín` | Solo para salidas |

### Inventario (inventario)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `sku` | STRING | Código único por cliente |
| `producto` | STRING | Nombre del producto |
| `cantidad` | INTEGER | Stock actual (min: 0) |
| `unidad_medida` | STRING | Default: `"UND"` |
| `codigo_wms` | STRING | Código en WMS Copérnico |
| `estado` | ENUM | `disponible`, `reservado`, `dañado`, `cuarentena`, `vencido` |
| `ultima_sincronizacion_wms` | DATE | Timestamp de última sync |

### CajaInventario (caja_inventario)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `numero_caja` | STRING | Identificador de caja (ej: `CJ-000001`) |
| `tipo` | ENUM | `entrada`, `salida`, `kardex` |
| `estado` | ENUM | `disponible`, `despachada`, `en_transito`, `dañada`, `devuelta`, `inactiva` |
| `cantidad` | INTEGER | Unidades en la caja |
| `lote` | STRING | Lote interno |
| `lote_externo` | STRING | Lote del proveedor |
| `ubicacion` | STRING | Zona de almacenamiento |
| `peso` | DECIMAL | Peso en kg |

### MovimientoInventario (movimientos_inventario)

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `tipo` | ENUM | `entrada`, `salida`, `ajuste`, `reserva`, `liberacion`, `transferencia` |
| `cantidad` | INTEGER | Cantidad movida (siempre positivo) |
| `stock_anterior` | INTEGER | Stock antes del movimiento |
| `stock_resultante` | INTEGER | Stock después del movimiento |
| `motivo` | STRING | Razón del movimiento |
| `documento_referencia` | STRING | Documento de origen |

---

## Ejecución del script de pruebas

```bash
cd server

# Con variables de entorno (Linux/Mac)
CRM_API_URL=https://tu-backend.up.railway.app/api/v1 WMS_API_KEY=tu-api-key node scripts/wms-test.js

# Con variables de entorno (Windows)
set CRM_API_URL=https://tu-backend.up.railway.app/api/v1&& set WMS_API_KEY=tu-api-key&& node scripts/wms-test.js
```

El script ejecuta 14 pasos que simulan un día típico de operaciones WMS. Ver detalles en `docs/FLUJOS_NEGOCIO.md`, sección 8.
