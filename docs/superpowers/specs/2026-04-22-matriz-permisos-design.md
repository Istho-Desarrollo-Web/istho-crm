# Rediseño Matriz de Permisos — Diseño

## Objetivo

Reemplazar la tabla cruzada actual de permisos (módulos × roles con checkboxes) por una interfaz de tabs por rol con grid de tarjetas de módulo, manteniendo toda la funcionalidad existente y añadiendo auto-guardado.

## Archivo afectado

- `frontend/src/pages/Administracion/RolesList.jsx` — único archivo a modificar

## Diseño

### Estructura general

```
┌─────────────────────────────────────────────────────┐
│  [Admin] [Supervisor●] [Financiera] [Operador] ...  │  ← tabs de rol
├─────────────────────────────────────────────────────┤
│  • Supervisor   46 de 60 permisos   ✓ Guardado      │  ← cabecera del tab activo
├──────────────────────┬──────────────────────────────┤
│  [Clientes]  4/6  ○  │  [Inventario]  6/7  ○        │
│  Ver  Crear  Editar  │  Ver  Crear  Ajustar  ...    │  ← grid 2 columnas
│  [Eliminar]  Exportar│                              │
├──────────────────────┼──────────────────────────────┤
│  [Operaciones] 3/3 ○ │  [Viajes]  5/5  ○           │
│  ...                 │  ...                         │
└──────────────────────┴──────────────────────────────┘
```

### 1. Tabs de rol

- Un tab por cada rol cargado desde la API (`GET /admin/roles`)
- Cada tab muestra: punto de color del rol · nombre del rol · badge con total de permisos activos
- Tab activo: `border-bottom: 2px solid #E74C3C` + fondo `#1A1B3A`
- El badge del tab activo usa fondo `#E74C3C` y texto blanco
- El badge se actualiza en tiempo real al activar/desactivar permisos
- Los tabs usan scroll horizontal en pantallas pequeñas (`overflow-x: auto`)

### 2. Cabecera del rol activo

Debajo de los tabs, una fila con:
- Badge coloreado con el nombre del rol (color del rol como background en opacity 0.13)
- Texto: `N de 60 permisos activos`
- Toast de guardado: aparece "✓ Guardado automáticamente" durante 2 segundos tras cada operación, luego desaparece. No bloquea la UI.

### 3. Grid de módulos

- Layout `grid-template-columns: 1fr 1fr` con gap de 10px
- Un `ModuloCard` por cada módulo de permisos
- Orden de módulos: igual al orden que retorna `GET /admin/permisos` (campo `agrupados`)

### 4. Tarjeta de módulo (`ModuloCard`)

**Encabezado:**
- Icono Lucide correspondiente al módulo + nombre del módulo (texto bold)
- Contador `N/total` (permisos activos / total del módulo). El numerador es rojo acento.
- Toggle maestro (pill switch a la derecha):
  - Si **todos** los permisos del módulo están activos → toggle ON → al hacer clic desactiva todos
  - Si **alguno** está inactivo → toggle OFF → al hacer clic activa todos
  - Guarda inmediatamente igual que un chip individual

**Cuerpo:**
- Chips de acción en flex-wrap con gap de 6px
- Chip activo: fondo `rgba(231,76,60,0.12)` · texto `#E74C3C` · borde `rgba(231,76,60,0.35)` · punto rojo
- Chip inactivo: fondo `#1A1B3A` · texto `#64748B` · borde `#252748` · punto gris
- Texto del chip: label de la acción (`ACCION_LABELS` existente)

### 5. Auto-guardado

Al hacer clic en un chip o en el toggle maestro:
1. Se actualiza el estado local inmediatamente (optimistic update)
2. Se llama `PUT /admin/roles/:id` con el nuevo set completo de `permisos_ids`
3. Si la respuesta es exitosa: aparece el toast "✓ Guardado automáticamente" por 2 segundos
4. Si hay error: se revierte el estado local y se muestra notificación de error con `useNotification`

### 6. Tab Admin — solo lectura

- El tab Administrador muestra todos los chips activos
- Todos los chips tienen `pointer-events: none` y opacity reducida (`opacity: 0.6`)
- El toggle maestro también está deshabilitado
- Se muestra un icono `Lock` de Lucide junto al nombre del rol en la cabecera

### 7. Guard de permisos de edición

- Si el usuario NO tiene `roles.editar`: todos los chips y toggles maestros quedan deshabilitados visualmente (mismo estilo que Admin pero para todos los tabs)
- Si el usuario NO tiene `roles.ver`: el tab completo no se muestra (comportamiento ya existente)

## Iconos por módulo

| Módulo            | Icono Lucide       |
|-------------------|--------------------|
| dashboard         | `LayoutDashboard`  |
| clientes          | `Users`            |
| inventario        | `Package`          |
| operaciones       | `ClipboardList`    |
| reportes          | `BarChart3`        |
| plantillas_email  | `Mail`             |
| usuarios          | `UserCog`          |
| roles             | `Shield`           |
| auditoria         | `Activity`         |
| configuracion     | `Settings`         |
| configuracion_wms | `Truck`            |
| notificaciones    | `Bell`             |
| vehiculos         | `Car`              |
| viajes            | `MapPin`           |
| caja_menor        | `Wallet`           |
| movimientos       | `Receipt`          |
| perfil            | `User`             |

## Estado React

El componente conserva la misma estructura de estado que existe hoy:

```js
// Estado existente que se conserva
const [roles, setRoles] = useState([]);
const [permisos, setPermisos] = useState([]);
const [permisosAgrupados, setPermisosAgrupados] = useState([]);
const [editPermisos, setEditPermisos] = useState({});  // rolId → Set(permisoIds)

// Estado nuevo
const [rolActivoId, setRolActivoId] = useState(null);  // se asigna a roles[0].id tras la carga inicial
const [guardando, setGuardando] = useState(false);      // mientras true: chips y toggles tienen pointer-events:none
const [toastVisible, setToastVisible] = useState(false); // toast auto-guardado
```

## Flujo de guardado

```
clic en chip
  → actualizar editPermisos[rolId] (Set)
  → setGuardando(true)
  → PUT /admin/roles/:rolId { permisos_ids: [...Set] }
  → setGuardando(false)
  → si ok: setToastVisible(true), setTimeout(() => setToastVisible(false), 2000)
  → si error: revertir Set anterior, notifyError(...)
```

## Lo que NO cambia

- La API: mismos endpoints `GET /admin/roles`, `GET /admin/permisos`, `PUT /admin/roles/:id`
- La lógica de carga y normalización de datos
- Los labels de módulos y acciones (`MODULO_LABELS`, `ACCION_LABELS`)
- El guard de permisos `hasPermission('roles', 'editar')`
- El resto de tabs de `RolesList.jsx` (Lista de roles, Crear rol, etc.)

## Restricciones visuales

- Sin emojis — solo iconos Lucide SVG
- Dark mode tokens: `dark:bg-centhrix-bg` / `dark:bg-centhrix-card` / `dark:bg-centhrix-surface`
- Acento: `#E74C3C` (hover `#C0392B`)
- Fuente: Segoe UI (body), Rajdhani para headings si aplica
