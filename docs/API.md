# Documentación de la API - ISTHO CRM

## Información General

| Propiedad | Valor |
|-----------|-------|
| **Base URL** | `http://localhost:5000/api/v1` (desarrollo) |
| **Formato** | JSON |
| **Autenticación** | Bearer Token (JWT) |
| **Timeout** | 30 segundos |

## Autenticación

### JWT (JSON Web Tokens)

Todas las rutas protegidas requieren el header:
```
Authorization: Bearer <token>
```

**Configuración JWT:**
- Algoritmo: HS256
- Expiración token de acceso: 1 hora (configurable)
- Expiración refresh token: 30 días
- Issuer: `istho-crm`
- Audience: `web`

### API Key WMS

Los endpoints de sincronización WMS requieren:
```
X-WMS-API-Key: <api-key>
```

## Formato de Respuesta Estándar

### Respuesta exitosa
```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { ... }
}
```

### Respuesta paginada
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Respuesta de error
```json
{
  "success": false,
  "message": "Descripción del error",
  "error": "Detalle técnico (solo en desarrollo)"
}
```

### Códigos HTTP Utilizados
| Código | Significado |
|--------|------------|
| 200 | OK |
| 201 | Creado |
| 400 | Bad Request (validación) |
| 401 | No autenticado |
| 403 | Sin permisos |
| 404 | No encontrado |
| 409 | Conflicto (duplicado) |
| 500 | Error del servidor |

---

## 1. Autenticación (`/auth`)

### POST `/auth/login`
**Acceso:** Público

Acepta email o nombre de usuario en el campo `email`.

**Body:**
```json
{
  "email": "usuario@ejemplo.com o nombre_usuario",
  "password": "contraseña123"
}
```

**Respuesta exitosa (200):**
```json
{
  "success": true,
  "message": "Login exitoso",
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@istho.com",
    "nombre": "Admin",
    "apellido": "ISTHO",
    "nombre_completo": "Admin ISTHO",
    "rol": "admin",
    "rol_id": 1,
    "cliente_id": null,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 3600,
    "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

**Errores:**
- `401` - Credenciales inválidas
- `403` - Cuenta bloqueada (tras 5 intentos fallidos, 15 min)

---

### POST `/auth/forgot-password`
**Acceso:** Público

**Body:**
```json
{
  "email": "usuario@ejemplo.com"
}
```

**Respuesta (200):** Siempre retorna éxito (no revela si el email existe)

---

### POST `/auth/reset-password`
**Acceso:** Público

**Body:**
```json
{
  "token": "abc123...",
  "password": "nuevaContraseña123"
}
```

---

### GET `/auth/me`
**Acceso:** Autenticado

**Respuesta (200):** Datos del usuario actual con permisos

---

### PUT `/auth/me`
**Acceso:** Autenticado

**Body:**
```json
{
  "nombre": "Nuevo Nombre",
  "apellido": "Nuevo Apellido",
  "telefono": "3001234567"
}
```

---

### POST `/auth/logout`
**Acceso:** Autenticado

---

### PUT `/auth/cambiar-password`
**Acceso:** Autenticado

**Body:**
```json
{
  "passwordActual": "contraseña123",
  "passwordNueva": "nuevaContraseña456"
}
```

---

### POST `/auth/me/avatar`
**Acceso:** Autenticado (multipart/form-data)

Sube foto de perfil del usuario. Máximo 2MB (JPEG, PNG, WEBP).

**Body:** `avatar` (file)

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Foto de perfil actualizada",
  "data": { "avatar_url": "/uploads/avatars/avatar_1_1234567890.png" }
}
```

---

### DELETE `/auth/me/avatar`
**Acceso:** Autenticado

Elimina la foto de perfil del usuario.

---

### POST `/auth/refresh`
**Acceso:** Autenticado

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "token": "nuevo_access_token...",
    "expiresIn": 3600
  }
}
```

---

### POST `/auth/registro`
**Acceso:** Solo admin

**Body:**
```json
{
  "username": "nuevo_usuario",
  "email": "nuevo@ejemplo.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "rol_id": 3,
  "cliente_id": null
}
```

---

## 2. Inventario (`/inventario`)

### GET `/inventario`
**Acceso:** Autenticado + permiso `inventario:ver`

**Query Params:**
| Param | Tipo | Descripción |
|-------|------|-------------|
| `page` | number | Página (default: 1) |
| `limit` | number | Registros por página (default: 20) |
| `search` | string | Búsqueda por producto, SKU o código de barras |
| `estado` | string | `disponible`, `bajo_stock`, `agotado`, `reservado`, `dañado`, `cuarentena`, `vencido` |
| `categoria` | string | Filtro por categoría |
| `zona` | string | Filtro por zona de bodega |
| `cliente_id` | number | Filtro por cliente (auto-inyectado para portal) |
| `stock_bajo` | boolean | Solo productos con stock bajo |
| `por_vencer` | boolean | Solo productos próximos a vencer |
| `sort` | string | Campo de ordenamiento |
| `order` | string | `ASC` o `DESC` |

**Respuesta (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sku": "PRD-001",
      "producto": "Producto Ejemplo",
      "descripcion": "Descripción del producto",
      "categoria": "General",
      "cantidad": 100,
      "cantidad_reservada": 10,
      "cantidad_disponible": 90,
      "stock_minimo": 20,
      "stock_maximo": 500,
      "unidad_medida": "UND",
      "ubicacion": "A-01-01",
      "zona": "A",
      "costo_unitario": 15000.00,
      "valor_total": 1500000.00,
      "estado": "disponible",
      "codigo_wms": "WMS-001",
      "cliente": {
        "id": 1,
        "razon_social": "Cliente SA",
        "nit": "900123456-7"
      }
    }
  ],
  "pagination": { ... }
}
```

---

### GET `/inventario/stats`
**Acceso:** Autenticado + permiso `inventario:ver`

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "totalProductos": 150,
    "valorTotal": 45000000.00,
    "stockBajo": 12,
    "vencidos": 3,
    "topStockBajo": [ ... ],
    "topProximosVencer": [ ... ]
  }
}
```

---

### GET `/inventario/alertas`
**Acceso:** Autenticado + permiso `inventario:ver`

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "agotado": [ ... ],
    "bajo_stock": [ ... ],
    "por_vencer": [ ... ]
  }
}
```

---

### GET `/inventario/:id`
**Acceso:** Autenticado + permiso `inventario:ver`

---

### GET `/inventario/:id/movimientos`
**Acceso:** Autenticado + permiso `inventario:ver`

**Query:** `page`, `limit`, `tipo`, `desde`, `hasta`

---

### GET `/inventario/:id/estadisticas`
**Acceso:** Autenticado + permiso `inventario:ver`

**Query:** `meses` (default: 6)

**Respuesta:** Datos mensuales para gráficos (entradas, salidas, ajustes por mes)

---

### GET `/inventario/:id/cajas`
**Acceso:** Autenticado + permiso `inventario:ver`

**Respuesta:** Lista de cajas físicas asociadas al producto

---

### POST `/inventario`
**Acceso:** Operador+ (no clientes)

**Body:**
```json
{
  "cliente_id": 1,
  "sku": "PRD-NEW",
  "producto": "Nuevo Producto",
  "descripcion": "Descripción",
  "categoria": "General",
  "unidad_medida": "UND",
  "cantidad": 0,
  "stock_minimo": 10,
  "stock_maximo": 500,
  "ubicacion": "A-01-01",
  "costo_unitario": 15000.00
}
```

---

### PUT `/inventario/:id`
**Acceso:** Operador+ (no clientes)

---

### POST `/inventario/:id/ajustar`
**Acceso:** Operador+ (no clientes)

**Body:**
```json
{
  "tipo": "entrada",
  "cantidad": 50,
  "motivo": "Recepción de proveedor",
  "documento_referencia": "FAC-001",
  "ubicacion_destino": "A-01-01"
}
```

`tipo` puede ser: `entrada`, `salida`, `ajuste`

---

### DELETE `/inventario/:id`
**Acceso:** Supervisor+

---

### PUT `/inventario/alertas/:alertaId/atender`
**Acceso:** Autenticado

---

### DELETE `/inventario/alertas/:alertaId`
**Acceso:** Autenticado

---

## 3. Operaciones (`/operaciones`)

### GET `/operaciones`
**Acceso:** Autenticado

**Query:** `page`, `limit`, `tipo` (ingreso/salida/kardex), `estado`, `cliente_id`, `desde`, `hasta`, `search`

---

### GET `/operaciones/stats`
**Acceso:** Autenticado

---

### GET `/operaciones/:id`
**Acceso:** Autenticado

**Respuesta incluye:** detalles, averías, documentos, cajas, cliente, creador, cerrador

---

### POST `/operaciones`
**Acceso:** Operador+ (no clientes)

**Body:**
```json
{
  "tipo": "ingreso",
  "cliente_id": 1,
  "origen": "Proveedor X",
  "destino": "Bodega ISTHO",
  "observaciones": "Recepción programada",
  "detalles": [
    {
      "sku": "PRD-001",
      "producto": "Producto A",
      "cantidad": 50,
      "lote": "LOT-001",
      "unidad_medida": "UND"
    }
  ]
}
```

---

### PUT `/operaciones/:id/transporte`
**Acceso:** Operador+

**Body:**
```json
{
  "vehiculo_placa": "ABC-123",
  "vehiculo_tipo": "Furgón",
  "conductor_nombre": "Juan Pérez",
  "conductor_cedula": "1234567890",
  "conductor_telefono": "3001234567"
}
```

---

### POST `/operaciones/:id/averias`
**Acceso:** Operador+

**Body (multipart/form-data):**
- `sku`: string
- `cantidad`: number
- `tipo_averia`: string
- `descripcion`: string
- `foto`: file (imagen, max 10MB)

---

### POST `/operaciones/:id/documentos`
**Acceso:** Operador+

**Body (multipart/form-data):**
- `descripcion`: string
- `archivo`: file (PDF/Excel/Word/imagen, max 50MB)

---

### POST `/operaciones/:id/cerrar`
**Acceso:** Operador+

**Body:**
```json
{
  "observaciones_cierre": "Todo conforme",
  "correos_destino": "cliente@ejemplo.com,supervisor@istho.com"
}
```

---

### POST `/operaciones/:id/reenviar-correo`
**Acceso:** Supervisor+

**Body:**
```json
{
  "correos_destino": "nuevo@destino.com"
}
```

---

### DELETE `/operaciones/:id`
**Acceso:** Supervisor+

---

## 4. Sincronización WMS (`/wms/sync`)

> Todos los endpoints WMS requieren header `X-WMS-API-Key`

### POST `/wms/sync/status`
**Health check del API WMS**

**Respuesta (200):**
```json
{
  "success": true,
  "message": "API WMS activa",
  "timestamp": "2026-03-14T10:00:00.000Z"
}
```

---

### POST `/wms/sync/productos`
**Sincronizar catálogo de productos**

**Body:**
```json
{
  "nit": "900123456-7",
  "productos": [
    {
      "codigo": "PRD-001",
      "descripcion": "Producto Ejemplo",
      "unidad_medida": "UND",
      "categoria": "General",
      "codigo_barras": "7701234567890"
    }
  ]
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "creados": 3,
    "actualizados": 5,
    "errores": 0,
    "detalles": [ ... ]
  }
}
```

---

### POST `/wms/sync/entradas`
**Sincronizar recepción de mercancía (CO)**

**Body:**
```json
{
  "nit": "900123456-7",
  "documento_origen": "CO-2026-001",
  "fecha_documento": "2026-03-14",
  "origen": "Proveedor ABC",
  "observaciones": "Remisión de 6 cajas",
  "detalles": [
    {
      "codigo": "PRD-001",
      "descripcion": "Producto A",
      "cantidad": 100,
      "unidad_medida": "UND",
      "lote": "LOT-2026-A",
      "numero_caja": "CJ-000001",
      "peso": 25.5,
      "ubicacion": "A-01-01"
    }
  ]
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "operacion_id": 15,
    "numero_operacion": "OP-2026-0015",
    "tipo": "ingreso",
    "tipo_documento_wms": "CO",
    "lineas_procesadas": 4,
    "lineas_error": 0,
    "cajas_creadas": 6,
    "stock_actualizado": true
  }
}
```

---

### POST `/wms/sync/salidas`
**Sincronizar picking/despacho (PK)**

**Body:**
```json
{
  "nit": "900123456-7",
  "numero_picking": "PK-2026-001",
  "fecha_documento": "2026-03-14",
  "destino": "Sucursal Medellín",
  "sucursal_entrega": "MDE-001",
  "ciudad_destino": "Medellín",
  "observaciones": "Pedido urgente",
  "detalles": [
    {
      "codigo": "PRD-001",
      "descripcion": "Producto A",
      "cantidad": 50,
      "unidad_medida": "UND",
      "numero_caja": "CJ-000001",
      "lote": "LOT-2026-A"
    }
  ]
}
```

---

### POST `/wms/sync/kardex`
**Sincronizar ajustes de inventario (CR)**

**Body:**
```json
{
  "nit": "900123456-7",
  "documento_origen": "KDC-2026-001",
  "motivo": "Ajuste por conteo físico",
  "fecha_documento": "2026-03-14",
  "observaciones": "Resultado de inventario cíclico",
  "detalles": [
    {
      "codigo": "PRD-001",
      "descripcion": "Producto A",
      "cantidad": 10,
      "unidad_medida": "UND",
      "numero_caja": "CJ-000001",
      "lote": "LOT-2026-A"
    }
  ]
}
```

**Reglas de negocio Kardex:**
- `cantidad > 0` (suma) a caja disponible → actualiza cantidad
- `cantidad < 0` (resta) a caja disponible → actualiza cantidad; si llega a 0 → estado `inactiva`, ubicación liberada
- `cantidad > 0` a caja inactiva → reactiva a `disponible`, ubicación = zona recepción
- `cantidad > 0` a caja despachada → reactiva a `disponible`, ubicación = zona recepción
- `cantidad < 0` a caja despachada → **NO permitido** (línea omitida)

---

## 5. Auditorías WMS (`/auditorias`)

### GET `/auditorias/entradas`
**Acceso:** Autenticado + permiso `inventario:ver`

**Query:** `page`, `limit`, `search`, `estado`, `cliente_id`, `desde`, `hasta`

---

### GET `/auditorias/entradas/:id`
**Acceso:** Autenticado + permiso `inventario:ver`

---

### GET `/auditorias/salidas`
**Acceso:** Autenticado + permiso `inventario:ver`

---

### GET `/auditorias/salidas/:id`
**Acceso:** Autenticado + permiso `inventario:ver`

---

### GET `/auditorias/kardex`
**Acceso:** Autenticado + permiso `kardex:ver`

---

### GET `/auditorias/kardex/:id`
**Acceso:** Autenticado + permiso `kardex:ver`

---

### PUT `/auditorias/:id/lineas/:lineaId/verificar`
**Acceso:** Operador+

**Body:**
```json
{
  "verificado": true
}
```

---

### DELETE `/auditorias/:id/lineas/:lineaId`
**Marcar línea como faltante/sobrante**

---

### PUT `/auditorias/:id/lineas/:lineaId/restaurar`
**Restaurar línea eliminada**

---

### PUT `/auditorias/:id/logistica`
**Acceso:** Operador+

**Body:**
```json
{
  "vehiculo_placa": "ABC-123",
  "vehiculo_tipo": "Furgón",
  "conductor_nombre": "Juan Pérez",
  "conductor_cedula": "1234567890",
  "conductor_telefono": "3001234567",
  "origen": "Proveedor X",
  "destino": "Bodega ISTHO"
}
```

---

### POST `/auditorias/:id/evidencias`
**Acceso:** Operador+ (multipart/form-data)

**Body:**
- `archivos[]`: files (PDFs + imágenes)
- `descripcion`: string

---

### POST `/auditorias/:id/cerrar`
**Acceso:** Operador+

**Body:**
```json
{
  "observaciones_cierre": "Auditoría completada sin novedad",
  "enviar_correo": true,
  "plantilla_id": 3,
  "correos_destino": "cliente@ejemplo.com"
}
```

**Requisitos para cierre:**
1. Todas las líneas verificadas
2. Al menos 1 PDF como evidencia
3. Al menos 1 foto como evidencia
4. Datos logísticos completos (obligatorio en entradas/salidas, opcional en kardex)

---

### GET `/auditorias/stats`
**Acceso:** Autenticado

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "pendientes": 5,
    "en_proceso": 3,
    "cerradas": 42
  }
}
```

---

### GET `/auditorias/recientes`
**Acceso:** Autenticado

---

## 6. Clientes (`/clientes`)

### GET `/clientes`
**Acceso:** Autenticado (internos)

**Query:** `page`, `limit`, `search`, `estado`, `tipo_cliente`, `ciudad`

---

### GET `/clientes/stats`
**Acceso:** Autenticado

---

### GET `/clientes/:id`
**Acceso:** Autenticado

---

### POST `/clientes`
**Acceso:** Operador+ (no clientes)

**Body:**
```json
{
  "razon_social": "Empresa XYZ S.A.S.",
  "nit": "901234567-8",
  "direccion": "Cra 50 # 10-20",
  "ciudad": "Medellín",
  "departamento": "Antioquia",
  "telefono": "6041234567",
  "email": "contacto@xyz.com",
  "tipo_cliente": "corporativo",
  "sector": "Manufactura"
}
```

---

### PUT `/clientes/:id`
**Acceso:** Operador+

---

### DELETE `/clientes/:id`
**Acceso:** Supervisor+

---

### POST `/clientes/:id/logo`
**Acceso:** Operador+ (multipart/form-data, max 5MB imagen)

---

### GET `/clientes/:id/historial`
**Acceso:** Autenticado

---

### Contactos

#### GET `/clientes/:id/contactos`
#### POST `/clientes/:id/contactos`
**Body:**
```json
{
  "nombre": "María López",
  "cargo": "Jefe de Compras",
  "email": "maria@xyz.com",
  "telefono": "6041234567",
  "celular": "3001234567",
  "es_principal": true,
  "recibe_notificaciones": true
}
```
#### PUT `/clientes/:clienteId/contactos/:contactoId`
#### DELETE `/clientes/:clienteId/contactos/:contactoId`

---

## 7. Administración (`/admin`)

> Todos los endpoints requieren rol **admin**

### Usuarios Internos

#### GET `/admin/usuarios`
**Query:** `page`, `limit`, `search`, `rol_id`, `activo`

#### GET `/admin/usuarios/:id`
#### POST `/admin/usuarios`
**Body:**
```json
{
  "username": "nuevo_user",
  "email": "nuevo@istho.com",
  "nombre": "Juan",
  "apellido": "Pérez",
  "rol_id": 3,
  "cargo": "Operador de Bodega",
  "departamento": "Operaciones"
}
```
*Genera contraseña temporal y envía email de bienvenida*

#### PUT `/admin/usuarios/:id`
#### PUT `/admin/usuarios/:id/resetear-password`
**Body:**
```json
{
  "password": "nuevaContraseña123",
  "enviar_correo": true
}
```
Si `enviar_correo` es `true` y el usuario tiene email, se envía un correo con las nuevas credenciales.

#### POST `/admin/usuarios/:id/reenviar-credenciales`
#### GET `/admin/usuarios/:id/permisos`
#### PUT `/admin/usuarios/:id/permisos`
**Body:**
```json
{
  "permisos_personalizados": {
    "inventario": ["ver", "crear", "editar"],
    "reportes": ["ver", "exportar"]
  }
}
```
#### DELETE `/admin/usuarios/:id`
*Desactiva el usuario (no elimina)*

### Roles

#### GET `/admin/roles`
#### GET `/admin/roles/:id`
#### POST `/admin/roles`
**Body:**
```json
{
  "nombre": "Analista",
  "codigo": "analista",
  "descripcion": "Rol de análisis",
  "nivel_jerarquia": 60,
  "color": "#3B82F6",
  "permisos": [1, 2, 5, 8, 12]
}
```
#### PUT `/admin/roles/:id`
#### DELETE `/admin/roles/:id`
*No se pueden eliminar roles del sistema (`es_sistema: true`)*

### Permisos

#### GET `/admin/permisos`
*Solo lectura - catálogo de 42+ permisos*

---

## 8. Plantillas de Email (`/plantillas-email`)

### GET `/plantillas-email`
**Acceso:** Supervisor+

**Query:** `tipo`, `subtipo`, `activo`

---

### GET `/plantillas-email/:id`

---

### GET `/plantillas-email/campos/:tipo`
**Retorna variables Handlebars disponibles para el tipo de plantilla**

---

### POST `/plantillas-email`
**Acceso:** Supervisor+

**Body:**
```json
{
  "nombre": "Cierre Entrada Personalizado",
  "tipo": "operacion_cierre",
  "subtipo": "ingreso",
  "asunto_template": "Cierre operación {{numeroOperacion}}",
  "cuerpo_html": "<h1>{{tipoOperacion}}</h1><p>{{fecha}}</p>...",
  "firma_habilitada": true,
  "firma_html": "<p>Firma personalizada</p>"
}
```

---

### PUT `/plantillas-email/:id`

---

### DELETE `/plantillas-email/:id`

---

### POST `/plantillas-email/:id/preview`
**Body:**
```json
{
  "datos": {
    "tipoOperacion": "Entrada",
    "numeroOperacion": "OP-2026-0001",
    "fecha": "14/03/2026"
  }
}
```

---

### GET `/plantillas-email/logo-firma`
**Acceso:** Autenticado

Obtiene el logo de firma en base64 (data URI).

**Respuesta (200):**
```json
{
  "success": true,
  "data": { "logoDataUri": "data:image/png;base64,iVBORw0KGgo..." }
}
```

---

### POST `/plantillas-email/logo-firma`
**Acceso:** Supervisor+ (multipart/form-data)

Sube un logo para la firma de email. Se convierte a base64 y se usa en todas las firmas y en el header de los correos.

**Body:** `logo` (file, max 5MB, PNG/JPEG/WEBP)

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Logo de firma actualizado",
  "data": { "logoDataUri": "data:image/png;base64,..." }
}
```

---

## 9. WebSocket (Socket.IO)

### Conexión

```javascript
// Frontend
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: 'jwt_token_aqui' },
  transports: ['websocket', 'polling'],
});
```

**Autenticación:** JWT en `auth.token` durante el handshake. El servidor verifica issuer/audience.

### Eventos del Servidor → Cliente

| Evento | Datos | Cuándo se emite |
|--------|-------|-----------------|
| `notificacion:nueva` | `{ tipo, titulo, mensaje, prioridad, accion_url, created_at }` | Cada vez que se crea una notificación para el usuario |

**Ejemplos de triggers:**
- Sync WMS (entrada/salida/kardex) → notifica a usuarios del cliente + admins
- Cierre de auditoría → notifica a usuarios del cliente
- Stock bajo/agotado → notifica a admins/supervisores
- Nuevo cliente/usuario portal → notifica a admins
- Reporte programado creado → notifica a admins

### Proxy en Desarrollo (Vite)

```javascript
// vite.config.js
proxy: {
  '/socket.io': { target: 'http://localhost:5000', ws: true }
}
```

---

## 10. Auditoría de Acciones (`/auditoria-acciones`)

### GET `/auditoria-acciones`
**Acceso:** Admin

**Query:** `page`, `limit`, `usuario_id`, `accion`, `tabla`, `desde`, `hasta`, `search`

---

### GET `/auditoria-acciones/stats`
**Respuesta:** Estadísticas de acciones por tipo, usuario, tabla

---

### GET `/auditoria-acciones/tablas`
**Respuesta:** Lista de tablas auditadas

---

## 10. Notificaciones (`/notificaciones`)

### GET `/notificaciones`
**Acceso:** Autenticado

**Query:** `page`, `limit`, `tipo`, `leida`

---

### GET `/notificaciones/count`
**Respuesta:** `{ noLeidas: 5 }`

---

### PUT `/notificaciones/:id/leer`
---

### PUT `/notificaciones/leer-todas`
---

### DELETE `/notificaciones/:id`
---

### DELETE `/notificaciones/leidas`
*Elimina todas las notificaciones leídas*

---

## 11. Reportes (`/reportes`)

### GET `/reportes/dashboard`
**Acceso:** Autenticado

**Respuesta:** KPIs consolidados (clientes activos, usuarios, operaciones, valor inventario)

---

### GET `/reportes/despachos`
**Query:** `desde`, `hasta`, `cliente_id`, `formato` (json/excel/pdf)

---

### GET `/reportes/inventario`
**Query:** `cliente_id`, `estado`, `formato`

---

### GET `/reportes/clientes/excel`
**Acceso:** Operador+

**Query:** `fecha_desde`, `fecha_hasta`, `estado`, `tipo_cliente`

### GET `/reportes/clientes/pdf`
**Acceso:** Operador+

**Query:** `fecha_desde`, `fecha_hasta`, `estado`, `tipo_cliente`

---

### POST `/reportes/enviar-email`
**Acceso:** Supervisor+

Genera un reporte y lo envía por email como adjunto. Soporta enviar Excel, PDF o ambos.

**Body:**
```json
{
  "tipo_reporte": "operaciones",
  "formatos": ["excel", "pdf"],
  "destinatarios": ["correo@ejemplo.com"],
  "cliente_id": 1,
  "filtros": { "estado": "cerrado" }
}
```

**Respuesta (200):**
```json
{
  "success": true,
  "message": "Reporte enviado en formato EXCEL + PDF a 1 destinatario(s)"
}
```

---

### GET `/reportes/comparativo`
**Acceso:** Autenticado

Datos de tendencia mensual (últimos N meses) con variación porcentual.

**Query:** `meses` (default: 6, máx: 12), `cliente_id`

**Respuesta (200):**
```json
{
  "success": true,
  "data": {
    "meses": [
      { "mes": "oct. 2025", "entradas": 5, "salidas": 3, "kardex": 1, "total_operaciones": 9 }
    ],
    "comparacion": {
      "operaciones": { "actual": 12, "anterior": 9, "variacion": 33 },
      "entradas": { "actual": 7, "anterior": 5, "variacion": 40 },
      "salidas": { "actual": 5, "anterior": 4, "variacion": 25 }
    }
  }
}
```

---

### Reportes Programados (CRUD)

#### GET `/reportes/programados`
**Acceso:** Supervisor+

Lista todos los reportes programados con su configuración y última ejecución.

#### POST `/reportes/programados`
**Acceso:** Supervisor+

**Body:**
```json
{
  "nombre": "Reporte semanal de inventario",
  "tipo_reporte": "inventario",
  "formato": "ambos",
  "cron_expresion": "0 8 * * 1",
  "frecuencia_label": "Lunes a las 8:00 AM",
  "destinatarios": "usuario@ejemplo.com,otro@ejemplo.com",
  "cliente_id": null,
  "filtros": {}
}
```

#### PUT `/reportes/programados/:id`
**Acceso:** Supervisor+

#### DELETE `/reportes/programados/:id`
**Acceso:** Supervisor+

#### POST `/reportes/programados/:id/ejecutar`
**Acceso:** Supervisor+

Ejecuta el reporte inmediatamente y lo envía por email.

---

### GET `/auditorias/:tipo/excel`
**Acceso:** Autenticado

Exporta auditorías a Excel. `:tipo` puede ser `entradas`, `salidas` o `kardex`.

**Query:** `estado`, `cliente_id`, `fecha_desde`, `fecha_hasta`

---

### GET `/reportes/operaciones`
**Query:** `tipo`, `estado`, `desde`, `hasta`, `formato`

---

## 12. Despachos (`/despachos`)

### GET `/despachos`
**Acceso:** Autenticado + permiso `despachos:ver`

---

### GET `/despachos/:id`
---

### GET `/despachos/stats`
---

### POST `/despachos`
**Acceso:** Operador+

---

### DELETE `/despachos/:id`
**Acceso:** Supervisor+ (anulación)

---

## 13. Documentos (`/documentos`)

### GET `/documentos`
### POST `/documentos/upload`
### GET `/documentos/:id/download`
### DELETE `/documentos/:id`

---

## Middleware de Seguridad

| Middleware | Descripción |
|-----------|-------------|
| `verificarToken` | Valida JWT en cada request protegido |
| `verificarPermisoCliente(modulo, accion)` | Verifica permisos dinámicos por módulo |
| `soloUsuariosInternos` | Bloquea acceso a usuarios portal |
| `filtrarPorCliente` | Inyecta `cliente_id` para usuarios portal |
| `verificarAccesoCliente` | Restringe acceso a datos del propio cliente |
| `verificarCambioPassword` | Fuerza cambio de contraseña si es requerido |
| `registrarAcceso` | Actualiza `último_acceso` del usuario |
| `requiereRol(...roles)` | Requiere rol específico |
| `requiereRolMinimo(rol)` | Requiere nivel jerárquico mínimo |

---

## Caché de Permisos

El sistema implementa un caché de permisos con TTL de 60 segundos para optimizar consultas:

- `cargarCachePermisos()` - Carga roles + permisos desde DB
- `invalidarCachePermisos()` - Se ejecuta al modificar roles/permisos
- `rolTienePermiso(rolId, modulo, accion)` - Consulta desde caché
