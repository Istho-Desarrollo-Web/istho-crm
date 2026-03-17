# Modelos de Base de Datos - ISTHO CRM

## Diagrama de Relaciones

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Rol       │────<│ RolPermiso   │>────│  Permiso    │
│             │     └──────────────┘     │             │
│ id          │                          │ id          │
│ nombre      │                          │ modulo      │
│ codigo      │                          │ accion      │
│ nivel       │                          │ grupo       │
└──────┬──────┘                          └─────────────┘
       │ 1:N
       │
┌──────┴──────┐     ┌──────────────┐
│  Usuario    │────<│  Auditoria   │
│             │     │              │
│ id          │     │ tabla        │
│ username    │     │ registro_id  │
│ email       │     │ accion       │
│ rol_id ─────┤     │ datos_ant.   │
│ cliente_id──┤     │ datos_nuevos │
│ permisos_p. │     └──────────────┘
│ permisos_c. │
└──────┬──────┘
       │ N:1
       │
┌──────┴──────┐     ┌──────────────┐
│  Cliente    │────<│  Contacto    │
│             │     │              │
│ id          │     │ nombre       │
│ nit         │     │ cargo        │
│ razon_soc.  │     │ email        │
│ codigo_wms  │     │ es_principal │
└──────┬──────┘     └──────────────┘
       │ 1:N
       │
┌──────┴──────┐     ┌──────────────────┐     ┌─────────────────┐
│ Inventario  │────<│ CajaInventario   │     │ MovimientoInv.  │
│             │     │                  │     │                 │
│ sku (unique │     │ numero_caja      │     │ tipo            │
│  per client)│     │ lote             │     │ cantidad        │
│ cantidad    │     │ ubicacion        │     │ stock_anterior  │
│ stock_min   │     │ estado           │     │ stock_result.   │
│ costo_unit  │     │ tipo             │     │ motivo          │
└─────────────┘     └────────┬─────────┘     └─────────────────┘
                             │ N:1
                             │
┌─────────────┐     ┌────────┴─────────┐     ┌─────────────────┐
│ Op.Averia   │>────│   Operacion      │────<│  Op.Documento   │
│             │     │                  │     │                 │
│ foto_url    │     │ numero_operacion │     │ archivo_url     │
│ tipo_averia │     │ tipo (ing/sal/k) │     │ archivo_nombre  │
│ cantidad    │     │ documento_wms    │     │ descripcion     │
└─────────────┘     │ estado           │     └─────────────────┘
                    │ tipo_doc_wms     │
                    └────────┬─────────┘
                             │ 1:N
                    ┌────────┴─────────┐
                    │ Op.Detalle       │
                    │                  │
                    │ sku              │
                    │ producto         │
                    │ cantidad         │
                    │ numero_caja      │
                    │ verificado       │
                    └──────────────────┘

┌─────────────────┐     ┌─────────────────┐
│ PlantillaEmail  │     │  Notificacion   │
│                 │     │                 │
│ tipo            │     │ usuario_id      │
│ subtipo         │     │ tipo            │
│ asunto_template │     │ titulo          │
│ cuerpo_html     │     │ mensaje         │
│ firma_html      │     │ leida           │
└─────────────────┘     └─────────────────┘
```

---

## Modelos Detallados

### 1. Usuario

**Tabla:** `usuarios`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `username` | STRING(50) | UNIQUE, NOT NULL | Nombre de usuario |
| `email` | STRING(100) | UNIQUE, NOT NULL | Email (normalizado a minúsculas) |
| `password_hash` | STRING(255) | NOT NULL | Contraseña hasheada (bcrypt 12 rounds) |
| `nombre` | STRING(100) | NOT NULL | Nombre |
| `apellido` | STRING(100) | NOT NULL | Apellido |
| `nombre_completo` | STRING(200) | | Auto-generado: nombre + apellido |
| `rol` | STRING(20) | | Rol legacy (admin/supervisor/operador/cliente) |
| `rol_id` | INTEGER | FK → Rol | Rol dinámico |
| `activo` | BOOLEAN | DEFAULT true | Estado de la cuenta |
| `cliente_id` | INTEGER | FK → Cliente, NULL | Solo para usuarios portal |
| `permisos_cliente` | JSON | | Permisos del portal `{ modulo: { accion: bool } }` |
| `permisos_personalizados` | JSON | | Override de permisos por usuario |
| `requiere_cambio_password` | BOOLEAN | DEFAULT false | Forzar cambio en próximo login |
| `invitado_por` | INTEGER | FK → Usuario | Quién creó la cuenta |
| `fecha_invitacion` | DATE | | Fecha de creación de cuenta |
| `telefono` | STRING(20) | | |
| `cargo` | STRING(100) | | |
| `departamento` | STRING(100) | | |
| `avatar_url` | STRING(500) | | |
| `ultimo_acceso` | DATE | | Última vez que inició sesión |
| `reset_token` | STRING(255) | | Token de recuperación de contraseña |
| `reset_token_expires` | DATE | | Expiración del token (15 min) |
| `intentos_fallidos` | INTEGER | DEFAULT 0 | Intentos de login fallidos |
| `bloqueado_hasta` | DATE | | Bloqueo hasta (15 min tras 5 intentos) |

**Índices:** email, username, rol, activo, cliente_id, rol_id

**Hooks:**
- `beforeCreate`: Hashea password, sincroniza nombre_completo, normaliza email
- `beforeUpdate`: Mismos hooks si los campos cambiaron

**Métodos de instancia:**
- `verificarPassword(password)` → boolean
- `estaBloqueado()` → boolean
- `getNombreDisplay()` → string
- `esInterno()` / `esCliente()` / `esAdmin()` → boolean
- `tienePermiso(modulo, accion, permisosDB)` → boolean
- `getPermisos(permisosDB)` → object
- `toPublicJSON(permisosDB)` → object (sin datos sensibles)

---

### 2. Cliente

**Tabla:** `clientes`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `codigo_cliente` | STRING(20) | UNIQUE | Auto-generado: CLI-0001, CLI-0002... |
| `razon_social` | STRING(200) | NOT NULL | Nombre de la empresa |
| `nit` | STRING(20) | UNIQUE, NOT NULL | NIT colombiano |
| `direccion` | STRING(300) | | Dirección física |
| `ciudad` | STRING(100) | | |
| `departamento` | STRING(100) | | |
| `telefono` | STRING(20) | | |
| `email` | STRING(100) | | Email de contacto |
| `sitio_web` | STRING(200) | | |
| `tipo_cliente` | ENUM | corporativo, pyme, persona_natural | |
| `sector` | STRING(100) | | Sector económico |
| `estado` | ENUM | activo, inactivo, suspendido | |
| `fecha_inicio_relacion` | DATE | | |
| `credito_aprobado` | DECIMAL(15,2) | | Cupo de crédito |
| `logo_url` | STRING(500) | | Ruta al logo |
| `notas` | TEXT | | |
| `codigo_wms` | STRING(50) | | Código en WMS Copérnico |
| `ultima_sincronizacion_wms` | DATE | | Última sync con WMS |

**Índices:** codigo_cliente, nit, razon_social, estado, tipo_cliente, ciudad

**Hook:** `beforeCreate` auto-genera codigo_cliente secuencial

**Scopes:** `activos` (solo estado='activo'), `conContactos` (include Contacto)

---

### 3. Contacto

**Tabla:** `contactos`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `cliente_id` | INTEGER | FK → Cliente, NOT NULL | |
| `nombre` | STRING(100) | NOT NULL | |
| `cargo` | STRING(100) | | |
| `telefono` | STRING(20) | | |
| `celular` | STRING(20) | | |
| `email` | STRING(100) | | |
| `es_principal` | BOOLEAN | DEFAULT false | Contacto principal del cliente |
| `recibe_notificaciones` | BOOLEAN | DEFAULT true | Recibe emails de cierre |
| `notas` | TEXT | | |
| `activo` | BOOLEAN | DEFAULT true | |

**Hook:** `afterSave` - Si se marca como principal, desmarca los demás del mismo cliente

---

### 4. Inventario (Referencia de Producto)

**Tabla:** `inventario`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `cliente_id` | INTEGER | FK → Cliente | |
| `sku` | STRING(50) | NOT NULL | Código único por cliente |
| `codigo_barras` | STRING(50) | | |
| `producto` | STRING(200) | NOT NULL | Nombre del producto |
| `descripcion` | TEXT | | |
| `categoria` | STRING(100) | | |
| `unidad_medida` | STRING(20) | DEFAULT 'UND' | |
| `cantidad` | INTEGER | DEFAULT 0 | Stock total |
| `cantidad_reservada` | INTEGER | DEFAULT 0 | Reservado para despachos |
| `cantidad_disponible` | VIRTUAL | | `cantidad - cantidad_reservada` |
| `stock_minimo` | INTEGER | DEFAULT 0 | Umbral de alerta |
| `stock_maximo` | INTEGER | DEFAULT 0 | |
| `ubicacion` | STRING(50) | | Ubicación en bodega (ej: A-01-01) |
| `zona` | STRING(20) | | Zona de bodega |
| `lote` | STRING(50) | | Lote (legacy, ahora en CajaInventario) |
| `fecha_vencimiento` | DATE | | |
| `fecha_ingreso` | DATE | | |
| `costo_unitario` | DECIMAL(12,2) | | |
| `valor_total` | VIRTUAL | | `cantidad * costo_unitario` |
| `estado` | ENUM | disponible, reservado, dañado, cuarentena, vencido | |
| `codigo_wms` | STRING(50) | | Código en WMS Copérnico |
| `ultima_sincronizacion_wms` | DATE | | |
| `notas` | TEXT | | |
| `alertas_silenciadas` | JSON | | `{ "agotado": "2026-03-11", ... }` |

**Índice UNIQUE:** (`cliente_id`, `sku`) - Una referencia por SKU por cliente

**Concepto clave:** Inventario = Referencia. Es el registro maestro del producto, NO por lote. Las cajas individuales con lote están en `CajaInventario`.

---

### 5. CajaInventario (Cajas Físicas)

**Tabla:** `caja_inventario`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `inventario_id` | INTEGER | FK → Inventario | Referencia de producto |
| `operacion_id` | INTEGER | FK → Operacion | Operación que creó la caja |
| `operacion_detalle_id` | INTEGER | FK → OperacionDetalle | Línea de detalle |
| `numero_caja` | STRING(20) | | Auto-generado: CJ-000001 |
| `lote` | STRING(50) | | Número de lote |
| `ubicacion` | STRING(50) | | Ubicación actual en bodega |
| `cantidad` | DECIMAL(12,2) | | Cantidad en la caja |
| `peso` | DECIMAL(10,2) | | Peso en kg |
| `unidad_medida` | STRING(20) | | |
| `tipo` | ENUM | entrada, salida, kardex | Origen de la caja |
| `estado` | ENUM | disponible, despachada, en_transito, dañada, devuelta, **inactiva** | |
| `documento_asociado` | STRING(50) | | Documento WMS (ej: KDC9059) |
| `lote_externo` | STRING(50) | | |
| `fecha_vencimiento` | DATE | | |
| `fecha_movimiento` | DATE | | |
| `observaciones` | TEXT | | |

**Índices:** inventario_id, operacion_id, operacion_detalle_id, numero_caja, lote, tipo, estado, ubicacion, (inventario_id + tipo + estado)

**Estados y transiciones:**
```
entrada → disponible (recepción normal)
disponible → despachada (picking/despacho)
disponible → inactiva (resta total en kardex, cantidad=0)
inactiva → disponible (suma en kardex, reactivación)
despachada → disponible (suma en kardex, reactivación/devolución)
```

---

### 6. MovimientoInventario (Historial de Transacciones)

**Tabla:** `movimientos_inventario`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `inventario_id` | INTEGER | FK → Inventario | |
| `usuario_id` | INTEGER | FK → Usuario | |
| `operacion_id` | INTEGER | FK → Operacion | |
| `tipo` | ENUM | entrada, salida, ajuste, reserva, liberacion, transferencia | |
| `motivo` | STRING(200) | | |
| `cantidad` | DECIMAL(12,2) | | Cantidad movida (siempre positivo) |
| `stock_anterior` | INTEGER | | Stock antes del movimiento |
| `stock_resultante` | INTEGER | | Stock después del movimiento |
| `documento_referencia` | STRING(100) | | Factura, PO, etc. |
| `observaciones` | TEXT | | |
| `ubicacion_origen` | STRING(50) | | |
| `ubicacion_destino` | STRING(50) | | |
| `costo_unitario` | DECIMAL(12,2) | | |
| `fecha_movimiento` | DATE | | Timestamp del movimiento |
| `ip_address` | STRING(50) | | IP del usuario |

**Sin timestamps automáticos** - Usa `fecha_movimiento`

**Métodos estáticos:**
- `registrar(data, options)` - Crear movimiento
- `getHistorial(inventario_id, options)` - Historial paginado
- `getEstadisticas(inventario_id, meses)` - Stats mensuales para gráficos
- `getResumen(inventario_id, desde)` - Resumen por tipo
- `getUltimos(options)` - Últimos movimientos (dashboard)

---

### 7. Operacion (Operaciones de Bodega)

**Tabla:** `operaciones` (soft delete habilitado)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `numero_operacion` | STRING(20) | UNIQUE | Auto: OP-2026-0001 |
| `tipo` | ENUM | ingreso, salida, **kardex** | |
| `documento_wms` | STRING(50) | | Documento WMS (nullable para manual) |
| `tipo_documento_wms` | ENUM | CO, PK, **CR** | CO=entrada, PK=salida, CR=kardex |
| `cliente_id` | INTEGER | FK → Cliente | |
| `fecha_documento` | DATE | | Fecha del documento WMS |
| `fecha_operacion` | DATE | | Fecha de la operación |
| `fecha_cierre` | DATE | | Fecha/hora de cierre |
| `origen` | STRING(200) | | Origen de la mercancía |
| `destino` | STRING(200) | | Destino |
| `vehiculo_placa` | STRING(20) | | Placa del vehículo |
| `vehiculo_tipo` | STRING(50) | | Tipo de vehículo |
| `conductor_nombre` | STRING(100) | | |
| `conductor_cedula` | STRING(20) | | |
| `conductor_telefono` | STRING(20) | | |
| `total_referencias` | INTEGER | DEFAULT 0 | |
| `total_unidades` | INTEGER | DEFAULT 0 | |
| `total_averias` | INTEGER | DEFAULT 0 | |
| `prioridad` | ENUM | baja, normal, alta, urgente | |
| `estado` | ENUM | pendiente, en_proceso, cerrado, anulado | |
| `correo_enviado` | BOOLEAN | DEFAULT false | |
| `fecha_correo_enviado` | DATE | | |
| `correos_destino` | STRING(500) | | CSV de emails |
| `observaciones` | TEXT | | |
| `observaciones_cierre` | TEXT | | |
| `creado_por` | INTEGER | FK → Usuario | |
| `cerrado_por` | INTEGER | FK → Usuario | |
| `numero_picking` | STRING(50) | | Número de picking WMS |
| `motivo_kardex` | STRING(200) | | Motivo del ajuste (solo kardex) |
| `sucursal_entrega` | STRING(100) | | Solo salidas |
| `ciudad_destino` | STRING(100) | | Solo salidas |

**Paranoid:** Soft delete habilitado (campo `deletedAt`)

---

### 8. OperacionDetalle (Líneas de Operación)

**Tabla:** `operacion_detalle` (soft delete habilitado)

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `operacion_id` | INTEGER | FK → Operacion | |
| `inventario_id` | INTEGER | FK → Inventario | |
| `sku` | STRING(50) | NOT NULL | |
| `producto` | STRING(200) | | |
| `cantidad` | DECIMAL(12,2) | | |
| `unidad_medida` | STRING(20) | | |
| `lote` | STRING(50) | | |
| `fecha_vencimiento` | DATE | | |
| `cantidad_averia` | DECIMAL(12,2) | DEFAULT 0 | |
| `cantidad_buena` | VIRTUAL | | `cantidad - cantidad_averia` |
| `tipo_averia` | STRING(100) | | |
| `observaciones_averia` | TEXT | | |
| `numero_caja` | STRING(20) | | Referencia a CajaInventario |
| `lote_externo` | STRING(50) | | |
| `documento_asociado` | STRING(50) | | |
| `peso` | DECIMAL(10,2) | | |
| `verificado` | BOOLEAN | DEFAULT false | Verificado en auditoría |

---

### 9. OperacionAveria (Evidencia de Averías)

**Tabla:** `operacion_averias`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `operacion_id` | INTEGER | FK → Operacion | |
| `detalle_id` | INTEGER | FK → OperacionDetalle | |
| `sku` | STRING(50) | | |
| `cantidad` | DECIMAL(12,2) | | |
| `tipo_averia` | STRING(100) | | |
| `descripcion` | TEXT | | |
| `foto_url` | STRING(500) | | Ruta a la foto |
| `foto_nombre` | STRING(200) | | |
| `foto_tipo` | STRING(50) | | MIME type |
| `foto_tamanio` | INTEGER | | Bytes |
| `registrado_por` | INTEGER | FK → Usuario | |

---

### 10. OperacionDocumento (Documentos de Soporte)

**Tabla:** `operacion_documentos`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `operacion_id` | INTEGER | FK → Operacion | |
| `archivo_url` | STRING(500) | | Ruta al archivo |
| `archivo_nombre` | STRING(200) | | |
| `archivo_tipo` | STRING(50) | | MIME type |
| `archivo_tamanio` | INTEGER | | Bytes |
| `descripcion` | TEXT | | |
| `subido_por` | INTEGER | FK → Usuario | |

---

### 11. PlantillaEmail (Plantillas de Email)

**Tabla:** `plantillas_email`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `nombre` | STRING(100) | NOT NULL | |
| `tipo` | ENUM | operacion_cierre, alerta_inventario, bienvenida, general | |
| `subtipo` | STRING(50) | | ingreso, salida, kardex |
| `asunto_template` | STRING(200) | | Template Handlebars para asunto |
| `cuerpo_html` | TEXT | | HTML con variables Handlebars |
| `firma_habilitada` | BOOLEAN | DEFAULT true | |
| `firma_html` | TEXT | | HTML de firma personalizada |
| `campos_disponibles` | JSON | | Variables disponibles |
| `es_predeterminada` | BOOLEAN | DEFAULT false | |
| `activo` | BOOLEAN | DEFAULT true | |
| `creado_por` | INTEGER | FK → Usuario | |
| `actualizado_por` | INTEGER | FK → Usuario | |

**Variables Handlebars por tipo:**

| Tipo | Variables |
|------|----------|
| `operacion_cierre` | tipoOperacion, numeroOperacion, documentoWms, fecha, clienteNombre, totalReferencias, totalUnidades, totalAverias, origen, destino, placa, vehiculoTipo, conductor, conductorCedula, conductorTelefono, motivoKardex, averias[], productos[] |
| `alerta_inventario` | totalAlertas, alertasAgotado, alertasStockBajo, urlInventario |
| `bienvenida` | nombre, username, email, passwordTemporal, cliente, urlLogin |
| `general` | titulo, mensaje, urlAccion, labelAccion |

---

### 12. Auditoria (Log de Acciones)

**Tabla:** `auditoria`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `tabla` | STRING(50) | | Tabla afectada |
| `registro_id` | INTEGER | | ID del registro afectado |
| `accion` | ENUM | crear, actualizar, eliminar, login, logout | |
| `usuario_id` | INTEGER | FK → Usuario | |
| `usuario_nombre` | STRING(100) | | Snapshot del nombre (no FK) |
| `datos_anteriores` | JSON | | Estado antes del cambio |
| `datos_nuevos` | JSON | | Estado después del cambio |
| `ip_address` | STRING(50) | | IP real del usuario |
| `user_agent` | STRING(500) | | Navegador/cliente |
| `descripcion` | STRING(500) | | Descripción legible |
| `created_at` | DATE | | Solo created_at (registros inmutables) |

**Sin updated_at** - Los registros de auditoría son inmutables

**Métodos estáticos:**
- `registrar(data)` - Registrar acción
- `getHistorial(tabla, registroId)` - Historial de un registro

---

### 13. Rol

**Tabla:** `roles`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `nombre` | STRING(50) | UNIQUE, NOT NULL | Nombre visible |
| `codigo` | STRING(50) | UNIQUE, NOT NULL | Código interno (snake_case) |
| `descripcion` | STRING(200) | | |
| `nivel_jerarquia` | INTEGER | 1-100 | Mayor = más permisos |
| `es_sistema` | BOOLEAN | DEFAULT false | No se puede eliminar/modificar |
| `es_cliente` | BOOLEAN | DEFAULT false | Para usuarios portal |
| `color` | STRING(7) | | Color hex para badges (#FF0000) |
| `activo` | BOOLEAN | DEFAULT true | |

**Roles base del sistema:**

| Nombre | Código | Nivel | Sistema | Cliente |
|--------|--------|-------|---------|---------|
| Administrador | admin | 100 | Si | No |
| Supervisor | supervisor | 75 | Si | No |
| Operador | operador | 50 | Si | No |
| Cliente | cliente | 10 | Si | Si |

---

### 14. Permiso

**Tabla:** `permisos`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `modulo` | STRING(50) | NOT NULL | Módulo del sistema |
| `accion` | STRING(50) | NOT NULL | Acción permitida |
| `descripcion` | STRING(200) | | |
| `grupo` | STRING(50) | | General, Gestión, Operaciones, Sistema |

**Índice UNIQUE:** (`modulo`, `accion`)

**Catálogo de permisos (42+):**

| Módulo | Acciones | Grupo |
|--------|----------|-------|
| dashboard | ver, exportar | General |
| clientes | ver, crear, editar, eliminar, exportar | Gestión |
| inventario | ver, crear, editar, eliminar, ajustar, exportar | Operaciones |
| operaciones | ver, crear, editar, cerrar, anular, exportar | Operaciones |
| reportes | ver, exportar | General |
| usuarios | ver, crear, editar, eliminar | Sistema |
| roles | ver, crear, editar, eliminar | Sistema |
| auditoria | ver, exportar, reenviar_correo | Sistema |
| kardex | ver, exportar | Operaciones |
| configuracion | ver, editar | Sistema |
| notificaciones | ver, crear, editar, eliminar | General |
| despachos | ver, crear, editar, eliminar, exportar | Operaciones |

---

### 15. RolPermiso (Tabla Pivote)

**Tabla:** `rol_permisos`

| Campo | Tipo | Restricciones |
|-------|------|--------------|
| `id` | INTEGER | PK, AUTO_INCREMENT |
| `rol_id` | INTEGER | FK → Rol |
| `permiso_id` | INTEGER | FK → Permiso |

**Índice UNIQUE:** (`rol_id`, `permiso_id`)

---

### 16. Notificacion

**Tabla:** `notificaciones`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|--------------|-------------|
| `id` | INTEGER | PK, AUTO_INCREMENT | |
| `usuario_id` | INTEGER | FK → Usuario | |
| `tipo` | ENUM | despacho, alerta, cliente, reporte, sistema, inventario | |
| `titulo` | STRING(200) | NOT NULL | |
| `mensaje` | TEXT | | |
| `prioridad` | ENUM | baja, normal, alta, urgente | |
| `leida` | BOOLEAN | DEFAULT false | |
| `fecha_lectura` | DATE | | |
| `accion_url` | STRING(500) | | URL de acción |
| `accion_label` | STRING(100) | | Texto del botón |
| `metadata` | JSON | | Datos adicionales |

**Métodos estáticos:**
- `crear(data)` - Crear notificación
- `getByUsuario(usuario_id, options)` - Listar paginadas
- `contarNoLeidas(usuario_id)` - Contador badge
- `marcarLeida(id, usuario_id)` - Marcar como leída
- `marcarTodasLeidas(usuario_id)` - Marcar todas
- `notificarMultiple(usuarios_ids, data)` - Bulk create

---

## Asociaciones Completas

```javascript
// Usuario
Usuario.belongsTo(Rol, { as: 'rolInfo', foreignKey: 'rol_id' });
Usuario.belongsTo(Cliente, { as: 'clienteInfo', foreignKey: 'cliente_id' });
Usuario.belongsTo(Usuario, { as: 'usuarioInvitador', foreignKey: 'invitado_por' });
Usuario.hasMany(Operacion, { as: 'operaciones_creadas', foreignKey: 'creado_por' });
Usuario.hasMany(Operacion, { as: 'operaciones_cerradas', foreignKey: 'cerrado_por' });
Usuario.hasMany(OperacionAveria, { as: 'averias_registradas', foreignKey: 'registrado_por' });
Usuario.hasMany(OperacionDocumento, { as: 'documentos_subidos', foreignKey: 'subido_por' });
Usuario.hasMany(Auditoria, { as: 'acciones', foreignKey: 'usuario_id' });
Usuario.hasMany(MovimientoInventario, { foreignKey: 'usuario_id' });
Usuario.hasMany(Notificacion, { foreignKey: 'usuario_id' });

// Cliente
Cliente.hasMany(Contacto, { as: 'contactos', foreignKey: 'cliente_id' });
Cliente.hasMany(Inventario, { as: 'inventario', foreignKey: 'cliente_id' });
Cliente.hasMany(Operacion, { as: 'operaciones', foreignKey: 'cliente_id' });

// Inventario
Inventario.belongsTo(Cliente, { as: 'cliente', foreignKey: 'cliente_id' });
Inventario.hasMany(MovimientoInventario, { as: 'movimientos', foreignKey: 'inventario_id' });
Inventario.hasMany(CajaInventario, { as: 'cajas', foreignKey: 'inventario_id' });

// Operacion
Operacion.belongsTo(Cliente, { as: 'cliente', foreignKey: 'cliente_id' });
Operacion.belongsTo(Usuario, { as: 'creador', foreignKey: 'creado_por' });
Operacion.belongsTo(Usuario, { as: 'cerrador', foreignKey: 'cerrado_por' });
Operacion.hasMany(OperacionDetalle, { as: 'detalles', foreignKey: 'operacion_id' });
Operacion.hasMany(OperacionAveria, { as: 'averias', foreignKey: 'operacion_id' });
Operacion.hasMany(OperacionDocumento, { as: 'documentos', foreignKey: 'operacion_id' });
Operacion.hasMany(CajaInventario, { as: 'cajas', foreignKey: 'operacion_id' });
Operacion.hasMany(MovimientoInventario, { foreignKey: 'operacion_id' });

// OperacionDetalle
OperacionDetalle.belongsTo(Operacion, { as: 'operacion', foreignKey: 'operacion_id' });
OperacionDetalle.hasOne(CajaInventario, { as: 'caja', foreignKey: 'operacion_detalle_id' });
OperacionDetalle.hasMany(OperacionAveria, { as: 'evidencias_averia', foreignKey: 'detalle_id' });

// CajaInventario
CajaInventario.belongsTo(Inventario, { as: 'inventario', foreignKey: 'inventario_id' });
CajaInventario.belongsTo(Operacion, { as: 'operacion', foreignKey: 'operacion_id' });
CajaInventario.belongsTo(OperacionDetalle, { as: 'detalle', foreignKey: 'operacion_detalle_id' });

// Rol ↔ Permiso (N:M)
Rol.belongsToMany(Permiso, { through: RolPermiso, as: 'permisos', foreignKey: 'rol_id' });
Permiso.belongsToMany(Rol, { through: RolPermiso, as: 'roles', foreignKey: 'permiso_id' });
Rol.hasMany(Usuario, { as: 'usuarios', foreignKey: 'rol_id' });
```
