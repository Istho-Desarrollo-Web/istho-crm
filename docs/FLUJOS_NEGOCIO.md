# Flujos de Negocio - ISTHO CRM

> **Nota:** Para la especificación técnica completa con todos los campos, schemas request/response y reglas de validación, ver [WMS_API_SPEC.md](WMS_API_SPEC.md).

## 1. Sincronización WMS (Copérnico)

El sistema WMS Copérnico envía datos a ISTHO CRM mediante una API REST autenticada con API Key (`X-WMS-API-Key`).

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
WMS Centhrix                               ISTHO CRM
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
5. El SKU **debe existir** previamente en inventario (no se auto-crea). Líneas con SKU no encontrado se omiten

**Reglas transversales (todas las operaciones):**
1. **Descripción fallback:** Catálogo maestro > descripción enviada > SKU > "Producto S/D"
2. **tipo_documento_wms** es fijo por tipo: CO (entradas), PK (salidas), CR (kardex)
3. **Número de caja auto-generado:** Si no se envía `caja`, se genera `CJ-NNNNNN` (6 dígitos aleatorios)
4. **Campos opcionales por línea:** `lote_externo`, `ubicacion`, `peso`, `pedido` (solo salidas)
5. **Stock mínimo 0:** El stock nunca puede ser negativo (`Math.max(0, resultado)`)
6. **alertas_silenciadas** se limpia a NULL en cada cambio de stock

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

---

## 9. Flujo de Caja Menor

### 9.1 Modelo de datos

- **CajaMenor.asignado_a** — FK a Usuario. Cualquier usuario activo del CRM puede ser asignado
- **MovimientoCajaMenor.usuario_id** — FK a Usuario. Quien registra el movimiento
- **MovimientoCajaMenor.viaje_id** — FK a Viaje. Solo aplica si el usuario asignado tiene rol `conductor`

### 9.2 Flujo General

```
1. CREAR CAJA MENOR (Financiera/Admin/Supervisor)
   └── Seleccionar usuario asignado (cualquier usuario activo)
   └── Definir saldo inicial
   └── Estado: "abierta"
   └── Notificación al usuario asignado

2. REGISTRAR MOVIMIENTOS (usuario asignado)
   ├── Tipo: Egreso o Ingreso
   ├── Concepto: lista predefinida (ACPM, Peajes, Alimentación, etc.)
   ├── Valor
   ├── Soporte: archivo adjunto (base64 en BD)
   ├── Viaje: solo visible si asignado es conductor
   └── Estado: pendiente (aprobado=false, rechazado=false)

3. APROBAR/RECHAZAR (Financiera/Admin/Supervisor)
   ├── Aprobar: valor_aprobado puede diferir del solicitado
   ├── Rechazar: valor_aprobado=0, con observaciones
   └── Saldo se recalcula con solo movimientos aprobados

4. RECARGAR SALDO (Financiera)
   └── Crear movimiento tipo "ingreso", concepto "recarga"

5. CERRAR CAJA (Financiera/Admin/Supervisor)
   ├── Opción A: "Guardar saldo" → saldo se traslada a próxima caja
   └── Opción B: "Entregar al usuario" → egreso de liquidación, saldo=$0
```

### 9.3 Cálculo de Saldo

```
Saldo = Saldo Inicial + Saldo Trasladado + Σ Ingresos Aprobados - Σ Egresos Aprobados

- Solo cuentan movimientos con aprobado=true
- Se usa valor_aprobado (no el valor original)
- Saldo trasladado viene de caja anterior (campo caja_anterior_id)
```

### 9.4 Permisos

| Acción | Admin | Supervisor | Financiera | Conductor | Operador |
|--------|-------|-----------|------------|-----------|----------|
| Crear caja | ✅ | ✅ | ✅ | - | - |
| Ver cajas | Todas | Todas | Todas | Solo suyas | Solo suyas |
| Editar caja | ✅ | ✅ | ✅ | - | - |
| Cerrar caja | ✅ | ✅ | ✅ | - | - |
| Crear movimiento | ✅ | ✅ | ✅ | Solo en sus cajas | Solo en sus cajas |
| Asociar viaje | ✅ | ✅ | ✅ | ✅ | - (no visible) |
| Editar movimiento | ✅ | ✅ | ✅ | Solo pendientes | Solo pendientes |
| Aprobar/Rechazar | ✅ | ✅ | ✅ | - | - |

### 9.5 Conceptos de Movimiento

**Egresos:** cuadre_de_caja, descargues, acpm, administracion, alimentacion, comisiones, desencarpe, encarpe, hospedaje, otros, seguros, repuestos, tecnicomecanica, peajes, ligas, parqueadero, urea, liquidacion

**Ingresos:** ingreso_adicional, recarga, cuadre_de_caja, peajes_ingreso, ligas_ingresos, parqueadero_ingresos, urea_ingresos

---

## 10. Reportes Programados

### 10.1 Tipos de Reporte Disponibles

| Tipo | Datos incluidos | Formatos |
|------|----------------|----------|
| **operaciones** | Operaciones WMS + cliente | Excel, PDF |
| **inventario** | Productos + stock + cliente | Excel, PDF |
| **clientes** | Clientes + contactos + total productos | Excel, PDF |
| **viajes** | Viajes + conductor + vehículo + caja menor | Excel, PDF |
| **cajas_menores** | Cajas menores + usuario asignado + creador | Excel, PDF |
| **gastos** | Movimientos + caja menor + usuario + viaje | Excel, PDF |

### 10.2 Flujo

```
1. CREAR REPORTE PROGRAMADO (Admin/Supervisor)
   ├── Nombre descriptivo
   ├── Tipo de reporte (6 opciones)
   ├── Formato: Excel, PDF o ambos
   ├── Frecuencia: cron expression (presets disponibles)
   ├── Destinatarios: emails separados por coma
   └── Filtros opcionales: cliente_id, estado

2. EJECUCIÓN AUTOMÁTICA (node-cron, timezone Bogotá)
   ├── Consulta datos según tipo
   ├── Genera archivos en formatos seleccionados
   ├── Envía por email con adjuntos
   ├── Actualiza ultima_ejecucion
   └── Limpia archivos temporales

3. EJECUCIÓN MANUAL
   └── POST /reportes/programados/:id/ejecutar
       └── Misma lógica que cron, ejecución inmediata
```

### 10.3 Frecuencias Predefinidas

| Frecuencia | Cron | Descripción |
|-----------|------|-------------|
| Diario | `0 7 * * *` | Todos los días a las 7:00 AM |
| Semanal | `0 8 * * 1` | Lunes a las 8:00 AM |
| Bisemanal | `0 8 * * 1,5` | Lunes y Viernes a las 8:00 AM |
| Mensual | `0 7 1 * *` | Primer día del mes a las 7:00 AM |
| Quincenal | `0 7 1,15 * *` | Días 1 y 15 a las 7:00 AM |

### 10.4 Filtros para Gastos

El tipo `gastos` soporta filtro por estado en el campo `filtros`:

```json
{ "estado": "aprobado" }    // Solo movimientos aprobados
{ "estado": "rechazado" }   // Solo rechazados
{ "estado": "pendiente" }   // Solo pendientes de aprobación
```

### 10.5 Permisos

| Acción | Admin | Supervisor | Otros |
|--------|-------|-----------|-------|
| Ver reportes programados | ✅ | ✅ | - |
| Crear reporte programado | ✅ | ✅ | - |
| Ejecutar manualmente | ✅ | ✅ | - |
| Editar/Eliminar | ✅ | ✅ | - |

Requiere permiso `reportes.crear` (configurado en seedRolesPermisos).

## 12. Almacenamiento de Archivos (Cloudinary)

### Flujo de upload
```
Usuario sube archivo → Multer guarda en /uploads/temp/ → cloudinaryService.subir()
  → Si es imagen: compresión automática (1920px, quality auto)
  → Si es PDF/ZIP/RAR: upload raw sin transformación
  → URL de Cloudinary se guarda en BD → Archivo temporal se elimina
```

### Tipos de archivos
| Tipo | Carpeta Cloudinary | Límites |
|---|---|---|
| Avatares de usuario | `istho-crm/avatares/` | 1 imagen por usuario, se sobreescribe |
| Soportes de caja menor | `istho-crm/soportes/` | 1 por movimiento |
| Evidencias de auditoría | `istho-crm/evidencias/{operacion_id}/` | 10 fotos+ZIP + 5 PDFs |
| Fotos de averías | `istho-crm/averias/{operacion_id}/` | 1 por avería |
| Logo de emails | `istho-crm/branding/logo-email` | Fijo, subido una vez |

### Email de cierre de auditoría
- El email incluye **enlaces** a las evidencias en Cloudinary (no adjuntos)
- Logo del email via URL de Cloudinary (no base64) para mantener el email bajo 102KB (límite Gmail)
- Sección "Evidencias Adjuntas" con botones "Ver archivo" que abren URLs de Cloudinary

### Fallback
Si `CLOUDINARY_CLOUD_NAME` no está configurado, el sistema vuelve al comportamiento anterior (base64 en BD para avatares/soportes, rutas locales para evidencias).

## 13. Autenticación — Dual Token

### Flujo
```
Login → access_token (24h) + refresh_token (7d)
  │
  ├── Token válido → Usa normalmente
  │
  └── Token expira (401) → Interceptor envía refreshToken en body a /auth/refresh
        ├── Refresh válido → Nuevo par de tokens → Retry transparente
        └── Refresh expirado → Logout → Login
```

### Reglas
- Access token: payload `{ id, username, email, rol }`, TTL `JWT_EXPIRES_IN` (24h)
- Refresh token: payload `{ id, tipo: 'refresh' }`, TTL `JWT_REFRESH_EXPIRES_IN` (7d)
- Endpoint `/auth/refresh` NO usa `verificarToken` middleware (acepta refresh token expirado en access)
- Cada refresh genera par nuevo (token rotation)
- Validación de contraseña: 8 chars + mayúscula + número + carácter especial (frontend + backend)
