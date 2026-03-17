# Flujos de Negocio - ISTHO CRM

## 1. Sincronización WMS (Copérnico)

El sistema WMS Copérnico envía datos a ISTHO CRM mediante una API REST autenticada con API Key.

### 1.1 Flujo de Sincronización de Productos

```
WMS Copérnico                              ISTHO CRM
     │                                         │
     │  POST /wms/sync/productos               │
     │  Header: X-WMS-API-Key                  │
     │  Body: { nit, productos[] }             │
     ├────────────────────────────────────────>│
     │                                         │
     │                              Buscar Cliente por NIT
     │                              Verificar estado activo
     │                                         │
     │                              Para cada producto:
     │                              ┌─ SKU existe? ─────────┐
     │                              │  SI: Actualizar        │
     │                              │  NO: Crear Inventario  │
     │                              └────────────────────────┘
     │                                         │
     │  Respuesta: { creados, actualizados }   │
     │<────────────────────────────────────────┤
```

### 1.2 Flujo de Entrada (CO - Recepción)

```
WMS Copérnico                              ISTHO CRM
     │                                         │
     │  POST /wms/sync/entradas                │
     │  Body: { nit, documento_origen,         │
     │          detalles[] }                   │
     ├────────────────────────────────────────>│
     │                                         │
     │                    ┌── TRANSACCIÓN ──────────────────┐
     │                    │                                  │
     │                    │  1. Buscar Cliente por NIT       │
     │                    │  2. Verificar duplicado          │
     │                    │     (documento_origen)           │
     │                    │  3. Generar numero_operacion     │
     │                    │     (OP-2026-XXXX)               │
     │                    │  4. Crear Operacion              │
     │                    │     tipo=ingreso                 │
     │                    │     tipo_documento_wms=CO        │
     │                    │     estado=pendiente             │
     │                    │                                  │
     │                    │  Para cada línea de detalle:     │
     │                    │  5. Upsert Inventario (cantidad) │
     │                    │  6. Crear OperacionDetalle       │
     │                    │  7. Crear CajaInventario         │
     │                    │     estado=disponible            │
     │                    │     numero_caja=CJ-XXXXXX       │
     │                    │  8. Crear MovimientoInventario   │
     │                    │                                  │
     │                    │  9. Crear Notificación           │
     │                    │                                  │
     │                    └── COMMIT o ROLLBACK ────────────┘
     │                                         │
     │  Respuesta: { operacion_id,             │
     │    numero_operacion, cajas_creadas }    │
     │<────────────────────────────────────────┤
```

### 1.3 Flujo de Salida (PK - Picking/Despacho)

```
WMS Copérnico                              ISTHO CRM
     │                                         │
     │  POST /wms/sync/salidas                 │
     │  Body: { nit, numero_picking,           │
     │          sucursal_entrega,              │
     │          ciudad_destino, detalles[] }   │
     ├────────────────────────────────────────>│
     │                                         │
     │                    ┌── TRANSACCIÓN ──────────────────┐
     │                    │                                  │
     │                    │  1. Buscar Cliente por NIT       │
     │                    │  2. Verificar duplicado          │
     │                    │     (numero_picking)             │
     │                    │  3. Crear Operacion              │
     │                    │     tipo=salida                  │
     │                    │     tipo_documento_wms=PK        │
     │                    │                                  │
     │                    │  Para cada línea:                │
     │                    │  4. Buscar Inventario por SKU    │
     │                    │  5. Reducir cantidad             │
     │                    │  6. Crear OperacionDetalle       │
     │                    │  7. Crear CajaInventario         │
     │                    │     estado=despachada            │
     │                    │  8. Crear MovimientoInventario   │
     │                    │                                  │
     │                    └── COMMIT o ROLLBACK ────────────┘
```

### 1.4 Flujo de Kardex (CR - Ajuste de Inventario)

```
WMS Copérnico                              ISTHO CRM
     │                                         │
     │  POST /wms/sync/kardex                  │
     │  Body: { nit, documento_origen,         │
     │          motivo, detalles[] }           │
     ├────────────────────────────────────────>│
     │                                         │
     │                    ┌── TRANSACCIÓN ──────────────────┐
     │                    │                                  │
     │                    │  1. Buscar Cliente por NIT       │
     │                    │  2. Crear Operacion              │
     │                    │     tipo=kardex                  │
     │                    │     tipo_documento_wms=CR        │
     │                    │     motivo_kardex=motivo         │
     │                    │                                  │
     │                    │  Para cada línea:                │
     │                    │  ┌── MÁQUINA DE ESTADOS ────┐   │
     │                    │  │                           │   │
     │                    │  │  Buscar caja existente    │   │
     │                    │  │  por numero_caja          │   │
     │                    │  │                           │   │
     │                    │  │  CASO 1: Suma + Disponible│   │
     │                    │  │  → cantidad += delta      │   │
     │                    │  │                           │   │
     │                    │  │  CASO 2: Resta + Disponible│  │
     │                    │  │  → cantidad -= delta      │   │
     │                    │  │  → si cantidad=0:         │   │
     │                    │  │    estado='inactiva'      │   │
     │                    │  │    ubicación=null         │   │
     │                    │  │                           │   │
     │                    │  │  CASO 3: Suma + Inactiva  │   │
     │                    │  │  → estado='disponible'    │   │
     │                    │  │  → ubicación=recepción    │   │
     │                    │  │  → cantidad += delta      │   │
     │                    │  │                           │   │
     │                    │  │  CASO 4: Suma + Despachada│   │
     │                    │  │  → estado='disponible'    │   │
     │                    │  │  → ubicación=recepción    │   │
     │                    │  │  → cantidad += delta      │   │
     │                    │  │                           │   │
     │                    │  │  CASO 5: Resta + Despachada│  │
     │                    │  │  → NO PERMITIDO           │   │
     │                    │  │  → línea omitida          │   │
     │                    │  │                           │   │
     │                    │  └───────────────────────────┘   │
     │                    │                                  │
     │                    │  Actualizar Inventario.cantidad  │
     │                    │  Crear MovimientoInventario      │
     │                    │                                  │
     │                    └── COMMIT o ROLLBACK ────────────┘
```

**Reglas de negocio del Kardex:**
1. Cuando no viene `documento_origen`, se usa el `motivo` como `documento_wms`
2. Cada movimiento registra: delta (+/-), motivo, usuario WMS
3. Los contadores `lineas_procesadas` y `lineas_error` son reales (no estimados)
4. La ubicación de reactivación es la zona de recepción configurada

---

## 2. Flujo de Auditoría WMS

Las auditorías son el proceso de verificación humana de las operaciones sincronizadas desde el WMS.

### 2.1 Ciclo de Vida de una Auditoría

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  PENDIENTE   │────>│  EN_PROCESO  │────>│   CERRADO    │
│              │     │              │     │              │
│ WMS sincroniza│     │ Operador     │     │ Auditoría    │
│ la operación │     │ verifica     │     │ completada   │
│              │     │ líneas       │     │ + email      │
└──────────────┘     └──────────────┘     └──────────────┘
```

### 2.2 Proceso de Auditoría Detallado

```
1. RECEPCIÓN (Automática)
   └── WMS sincroniza entrada/salida/kardex
       └── Se crea Operación con estado 'pendiente'
           └── Aparece en listado de auditorías

2. INICIO DE AUDITORÍA
   └── Operador abre la auditoría
       └── Estado cambia a 'en_proceso'

3. VERIFICACIÓN DE LÍNEAS
   └── Para cada línea de detalle:
       ├── ✅ Verificar: cantidad correcta
       ├── ❌ Eliminar: faltante o sobrante
       └── 🔄 Restaurar: revertir eliminación

   └── Registrar averías:
       ├── Seleccionar línea afectada
       ├── Indicar cantidad dañada
       ├── Tipo de avería
       └── Subir foto de evidencia

4. DATOS LOGÍSTICOS
   ├── Entradas/Salidas (OBLIGATORIO):
   │   ├── Placa del vehículo
   │   ├── Tipo de vehículo
   │   ├── Nombre del conductor
   │   ├── Cédula del conductor
   │   ├── Teléfono del conductor
   │   ├── Origen
   │   └── Destino
   │
   └── Kardex (OPCIONAL):
       └── Mismos campos pero no requeridos

5. EVIDENCIAS
   ├── Subir al menos 1 PDF (cumplido/remisión)
   └── Subir al menos 1 foto (evidencia fotográfica)

6. CIERRE
   ├── Verificar requisitos:
   │   ├── Todas las líneas verificadas ✅
   │   ├── Al menos 1 PDF ✅
   │   ├── Al menos 1 foto ✅
   │   └── Datos logísticos completos ✅ (si aplica)
   │
   └── Modal de cierre (CierreAuditoriaModal):
       ├── Toggle: enviar/no enviar correo
       ├── Selector de plantilla de email
       ├── Observaciones de cierre
       └── Confirmar cierre
```

### 2.3 Diferencias por Tipo de Auditoría

| Aspecto | Entrada (CO) | Salida (PK) | Kardex (CR) |
|---------|-------------|-------------|-------------|
| **Color UI** | Verde (emerald) | Azul (blue) | Púrpura (purple) |
| **Logística** | Obligatoria | Obligatoria | Opcional |
| **Documento principal** | Remisión | Picking | Motivo |
| **Campos extra** | origen | numero_picking, sucursal, ciudad_destino | motivo_kardex |
| **Progreso cierre** | 3 factores | 3 factores | 2 factores (sin logística) |
| **Plantilla email** | Subtipo: ingreso | Subtipo: salida | Subtipo: kardex |

---

## 3. Flujo de Cierre con Email

### 3.1 Proceso de Cierre

```
Operador hace clic en "Completar Auditoría"
     │
     ▼
┌─────────────────────────────────────┐
│     CierreAuditoriaModal            │
│                                     │
│  ☐ Enviar correo de notificación    │
│                                     │
│  Plantilla: [Dropdown]             │
│  ├── ⭐ Cierre Entrada (defecto)   │
│  ├── Cierre Personalizado          │
│  └── Cierre General                │
│                                     │
│  Observaciones: [____________]      │
│                                     │
│  [Cancelar]  [Completar Auditoría] │
└─────────────────────────────────────┘
     │
     ▼
POST /auditorias/:id/cerrar
Body: {
  observaciones_cierre,
  enviar_correo: true,
  plantilla_id: 3,
  correos_destino: "..."
}
     │
     ▼
┌── Backend ──────────────────────────┐
│                                     │
│  1. Actualizar Operación:           │
│     estado='cerrado'                │
│     fecha_cierre=now()              │
│     cerrado_por=usuario_id          │
│     observaciones_cierre            │
│                                     │
│  2. Si enviar_correo=true:          │
│     ├── Buscar plantilla:           │
│     │   plantilla_id específico     │
│     │   → o predeterminada+subtipo  │
│     │   → o predeterminada genérica │
│     │   → o cualquier activa        │
│     │                               │
│     ├── Compilar template           │
│     │   Handlebars con datos:       │
│     │   - tipoOperacion             │
│     │   - numeroOperacion           │
│     │   - documentoWms              │
│     │   - fecha                     │
│     │   - clienteNombre             │
│     │   - totalReferencias          │
│     │   - totalUnidades             │
│     │   - totalAverias              │
│     │   - origen, destino           │
│     │   - placa, conductor          │
│     │   - motivoKardex (si aplica)  │
│     │   - averias[]                 │
│     │   - productos[]               │
│     │                               │
│     ├── Agregar firma:              │
│     │   plantilla.firma_html        │
│     │   → o FIRMA_DEFAULT           │
│     │                               │
│     └── Enviar email:               │
│         Para: correos_destino       │
│         + contactos con             │
│           recibe_notificaciones     │
│                                     │
│  3. Registrar auditoría             │
│  4. Crear notificación              │
│                                     │
└─────────────────────────────────────┘
```

### 3.2 Fallback de Plantillas

El sistema selecciona la plantilla en este orden de prioridad:

```
1. plantilla_id proporcionado por el usuario
   └── Buscar por ID exacto

2. Predeterminada + subtipo
   └── tipo='operacion_cierre' AND subtipo=tipo_operacion AND es_predeterminada=true

3. Predeterminada genérica
   └── tipo='operacion_cierre' AND es_predeterminada=true

4. Cualquier activa
   └── tipo='operacion_cierre' AND activo=true

5. Sin plantilla → Error
```

---

## 4. Sistema de Permisos

### 4.1 Flujo de Verificación de Permisos

```
Request entrante
     │
     ▼
verificarToken (middleware)
     │
     ├── Decodificar JWT
     ├── Buscar usuario en DB
     ├── Cargar permisos desde caché (TTL: 60s)
     └── Poblar req.user con helpers
     │
     ▼
verificarPermisoCliente(modulo, accion) (middleware)
     │
     ├── ¿Es admin?
     │   └── SI → Permitir todo
     │
     ├── ¿Es usuario portal (cliente)?
     │   └── Verificar permisos_cliente JSON
     │       { modulo: { accion: true/false } }
     │
     ├── ¿Tiene permisos_personalizados?
     │   └── SI → Verificar override JSON
     │
     └── Verificar permisos del rol (caché)
         └── rolTienePermiso(rol_id, modulo, accion)
             └── Buscar en RolPermiso (N:M)
```

### 4.2 Caché de Permisos

```
┌──────────────────────────────────────┐
│          Caché de Permisos           │
│          TTL: 60 segundos            │
│                                      │
│  roles: {                            │
│    1: { nombre: 'admin', permisos: { │
│      dashboard: ['ver', 'exportar'], │
│      clientes: ['ver', 'crear',...], │
│      ...                             │
│    }},                               │
│    2: { nombre: 'supervisor', ... }, │
│    ...                               │
│  }                                   │
│                                      │
│  Invalidar al:                       │
│  - Crear/editar/eliminar rol         │
│  - Modificar permisos de rol         │
└──────────────────────────────────────┘
```

---

## 5. Flujo de Autenticación

### 5.1 Login

```
Usuario                    Frontend                   Backend
  │                           │                          │
  │  Email + Password         │                          │
  ├──────────────────────────>│                          │
  │                           │  POST /auth/login        │
  │                           ├─────────────────────────>│
  │                           │                          │
  │                           │  ┌── Verificaciones ──┐  │
  │                           │  │ 1. Email existe?    │  │
  │                           │  │ 2. Cuenta activa?   │  │
  │                           │  │ 3. No bloqueada?    │  │
  │                           │  │ 4. Password válido? │  │
  │                           │  │ 5. Reset intentos   │  │
  │                           │  │ 6. Log auditoría    │  │
  │                           │  └─────────────────────┘  │
  │                           │                          │
  │                           │  { token, refreshToken,  │
  │                           │    user, expiresIn }     │
  │                           │<─────────────────────────┤
  │                           │                          │
  │                           │  Guardar en localStorage │
  │                           │  ├── token               │
  │                           │  ├── refreshToken        │
  │                           │  └── user                │
  │                           │                          │
  │  ¿requiere_cambio_password?│                         │
  │  SI → ForceChangePasswordModal                       │
  │  NO → Redirigir a /dashboard                         │
  │<──────────────────────────┤                          │
```

### 5.2 Refresh Token

```
Request con token expirado
     │
     ▼
Response 401 (interceptor Axios)
     │
     ▼
POST /auth/refresh
Body: { refreshToken }
     │
     ├── Válido → Nuevo token → Reintentar request original
     │
     └── Inválido → Logout → Redirigir a /login
```

### 5.3 Bloqueo de Cuenta

```
Intento fallido #1 → intentos_fallidos = 1
Intento fallido #2 → intentos_fallidos = 2
Intento fallido #3 → intentos_fallidos = 3
Intento fallido #4 → intentos_fallidos = 4
Intento fallido #5 → intentos_fallidos = 5
                      bloqueado_hasta = now() + 15 min

Intento #6 (dentro de 15 min) → "Cuenta bloqueada"
Intento (después de 15 min) → Se desbloquea, reset intentos
```

---

## 6. Flujo de Creación de Usuario

```
Admin                      Frontend                    Backend
  │                           │                           │
  │  Datos del nuevo usuario  │                           │
  ├──────────────────────────>│                           │
  │                           │  POST /admin/usuarios     │
  │                           ├──────────────────────────>│
  │                           │                           │
  │                           │  ┌── Proceso ──────────┐  │
  │                           │  │ 1. Verificar rol    │  │
  │                           │  │ 2. Check duplicados │  │
  │                           │  │ 3. Generar password │  │
  │                           │  │    temporal          │  │
  │                           │  │ 4. Hash password    │  │
  │                           │  │ 5. Crear usuario    │  │
  │                           │  │    requiere_cambio  │  │
  │                           │  │    _password=true   │  │
  │                           │  │ 6. Enviar email     │  │
  │                           │  │    bienvenida con   │  │
  │                           │  │    credenciales     │  │
  │                           │  │ 7. Log auditoría    │  │
  │                           │  └─────────────────────┘  │
  │                           │                           │
  │  Usuario creado ✅        │                           │
  │<──────────────────────────┤                           │

Nuevo usuario hace login:
  → ForceChangePasswordModal se muestra
  → Cambia contraseña
  → requiere_cambio_password = false
  → Acceso normal al sistema
```

---

## 7. Flujo de Alertas de Inventario

```
Ajuste de inventario (manual o WMS)
     │
     ▼
┌─────────────────────────────┐
│  Verificar stock            │
│                             │
│  cantidad == 0?             │
│  └── Alerta: AGOTADO ⛔    │
│                             │
│  cantidad <= stock_minimo?  │
│  └── Alerta: STOCK BAJO ⚠️ │
│                             │
│  fecha_vencimiento <= 30d?  │
│  └── Alerta: POR VENCER ⏰ │
│                             │
└─────────────────────────────┘
     │
     ▼
Crear Notificación para supervisores
     │
     ▼
Mostrar en /inventario/alertas
     │
     ├── Atender: Marcar como gestionada
     ├── Descartar: Eliminar alerta
     └── Silenciar: No mostrar por X días
         (alertas_silenciadas JSON)
```

---

## 8. Script de Test WMS (14 Pasos)

El script `scripts/wms-test.js` simula un día típico de operaciones WMS:

| Paso | Tipo | Descripción |
|------|------|-------------|
| 1 | Health | Verificar API activa |
| 2 | Sync | Sincronizar catálogo (8 productos, 2 clientes) |
| 3 | Entrada | Remisión grande (4 SKUs, 6 cajas) |
| 4 | Entrada | Devolución de cliente (1 caja) |
| 5 | Salida | Despacho a sucursal (3 cajas) |
| 6 | Salida | Pedido urgente (1 caja) |
| 7 | Kardex | Suma a caja disponible (+10 UND) |
| 8 | Kardex | Resta total → caja inactiva (-34 UND) |
| 9 | Kardex | Reactivación de caja inactiva (+15 UND) |
| 10 | Kardex | Reactivación de caja despachada (+50 UND) |
| 11 | Verify | Verificar auditoría de entrada |
| 12 | Verify | Verificar auditoría de kardex |
| 13 | Duplicate | Pruebas de duplicados (entradas + pickings) |
| 14 | Error | Pruebas de error (NIT inválido, sin motivo, resta en despachada) |

**Ejecución:**
```bash
cd server
node scripts/wms-test.js
```
