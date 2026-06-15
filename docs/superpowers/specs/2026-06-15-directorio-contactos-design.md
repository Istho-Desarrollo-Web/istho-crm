# Directorio de Contactos — Diseño

> **Para agentes de implementación:** usar superpowers:subagent-driven-development o superpowers:executing-plans para ejecutar el plan de implementación tarea por tarea.

**Meta:** Crear un módulo de Directorio de Contactos donde el admin gestiona contactos globales (internos ISTHO y externos) asignables a múltiples clientes, con vista de detalle que muestra a cuántos y cuáles clientes está asignado cada contacto.

**Arquitectura:** Relación M:N entre `contactos` y `clientes` mediante tabla pivot `contacto_clientes`. Se migra el sistema actual (1:N con `cliente_id`) a este nuevo esquema. El tab "Contactos" en ClienteDetail pasa a ser una vista de asignación desde el directorio global.

**Stack:** Express + Sequelize + MySQL (backend) · React 19 + Vite + Tailwind 4 + MUI 7 (frontend) · Umzug para migración de schema.

---

## Modelo de Datos

### Tabla `contactos` — cambios

Se eliminan las columnas `cliente_id` y `es_principal` (migran a la pivot). Se agregan `tipo` y `usuario_id`.

| Campo | Tipo Sequelize | Notas |
|---|---|---|
| `id` | INTEGER PK AutoIncrement | |
| `tipo` | ENUM('istho','externo') | default 'externo' |
| `usuario_id` | INTEGER FK → usuarios, nullable | vínculo opcional a usuario CRM; unique |
| `nombre` | STRING(150) | required, 2–150 chars |
| `cargo` | STRING(100) | nullable |
| `telefono` | STRING(50) | nullable |
| `celular` | STRING(50) | nullable |
| `email` | STRING(150) | nullable, único en directorio |
| `recibe_notificaciones` | BOOLEAN | default true |
| `tipos_notificacion` | JSON | default ['todas'] |
| `notas` | TEXT | nullable |
| `activo` | BOOLEAN | default true |
| `created_at` | DATE | underscored |
| `updated_at` | DATE | underscored |

### Tabla `contacto_clientes` (pivot nueva)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK AutoIncrement | |
| `contacto_id` | INTEGER FK → contactos, NOT NULL | onDelete CASCADE |
| `cliente_id` | INTEGER FK → clientes, NOT NULL | onDelete CASCADE |
| `es_principal` | BOOLEAN | default false |
| `created_at` | DATE | |
| `updated_at` | DATE | |

- Unique constraint: `(contacto_id, cliente_id)`
- Índice en `cliente_id`
- Hook `afterSave` en modelo `ContactoCliente`: si `es_principal=true`, hace UPDATE SET `es_principal=false` WHERE `cliente_id=X AND id != Y` dentro de una transacción

### Asociaciones Sequelize

```js
// models/index.js
Contacto.belongsToMany(Cliente, {
  through: ContactoCliente,
  as: 'clientes',
  foreignKey: 'contacto_id',
  otherKey: 'cliente_id',
});
Cliente.belongsToMany(Contacto, {
  through: ContactoCliente,
  as: 'contactos',
  foreignKey: 'cliente_id',
  otherKey: 'contacto_id',
});
Contacto.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuarioCrm' });
```

Se elimina la asociación `Cliente.hasMany(Contacto)` y `Contacto.belongsTo(Cliente)` del index.js.

### Migración Umzug

Archivo: `server/src/migrations/20260615000001-refactor-contactos-mn.js`

Pasos en `up`:
1. Crear tabla `contacto_clientes`
2. `INSERT INTO contacto_clientes (contacto_id, cliente_id, es_principal, created_at, updated_at) SELECT id, cliente_id, es_principal, NOW(), NOW() FROM contactos WHERE cliente_id IS NOT NULL`
3. `ALTER TABLE contactos ADD COLUMN tipo ENUM('istho','externo') NOT NULL DEFAULT 'externo'`
4. `ALTER TABLE contactos ADD COLUMN usuario_id INT NULL, ADD UNIQUE KEY uq_contacto_usuario (usuario_id)`
5. `ALTER TABLE contactos DROP FOREIGN KEY <fk_cliente_id>, DROP COLUMN cliente_id, DROP COLUMN es_principal`

Pasos en `down`: revertir en orden inverso.

---

## Backend

### Modelo nuevo: `ContactoCliente.js`

```
server/src/models/ContactoCliente.js
```

Campos: `id`, `contacto_id`, `cliente_id`, `es_principal`. Hook `afterSave` para unicidad de `es_principal` por cliente.

### Modelo actualizado: `Contacto.js`

Reemplazar campo `cliente_id` y `es_principal` con `tipo` y `usuario_id`. Scope `conClientes` que incluye la pivot con `Cliente`.

### Rutas nuevas: `server/src/routes/contacto.routes.js`

```
GET    /contactos              listar directorio (paginado)    contactos.ver
POST   /contactos              crear contacto                  contactos.crear
GET    /contactos/:id          detalle + clientes asignados    contactos.ver
PUT    /contactos/:id          editar contacto                 contactos.editar
DELETE /contactos/:id          desactivar (activo=false)       contactos.eliminar
POST   /contactos/:id/clientes asignar a cliente              contactos.editar
DELETE /contactos/:id/clientes/:clienteId  desasignar         contactos.editar
```

Todas requieren `requiereRolMinimo('admin')` además del permiso.

### Rutas actualizadas: `cliente.routes.js`

```
GET    /clientes/:id/contactos              listar asignados (sin cambio de URL)
POST   /clientes/:id/contactos/asignar     asignar contacto existente { contacto_id, es_principal }
DELETE /clientes/:id/contactos/:contactoId desasignar (no elimina contacto)
```

Se elimina `POST /clientes/:id/contactos` (creación inline).

### Controlador: `server/src/controllers/contactoController.js`

Funciones:
- `listar()` — paginación, search (nombre/email/cargo), filtro tipo/activo
- `obtenerPorId()` — include clientes pivot con `es_principal`
- `crear()` — valida email único si se provee; si `usuario_id` presente, valida que exista el usuario
- `actualizar()` — misma validación email/usuario_id
- `desactivar()` — set `activo=false`, auditoría
- `asignarCliente()` — upsert en `ContactoCliente`, hook maneja `es_principal`
- `desasignarCliente()` — destroy en pivot; auditoría
- `listarContactosCliente()` — contactos asignados a un cliente (movido desde clienteController)
- `asignarContactoDesdeCliente()` — alias de `asignarCliente` desde la ruta del cliente
- `desasignarContactoDesdeCliente()` — alias de `desasignarCliente`

Toda operación de escritura registra `Auditoria.registrar({ tabla: 'contactos'|'contacto_clientes', ... })`.

### Validadores: `server/src/validators/contactoValidator.js`

- `crearContactoValidator`: nombre (2–150), tipo (enum), email (regex), usuario_id (int opcional)
- `actualizarContactoValidator`: mismos campos opcionales + param id
- `asignarClienteValidator`: cliente_id (int required), es_principal (bool opcional)
- `idParamValidator`: param id

### Permisos: `seedRolesPermisos.js`

Nuevo módulo `contactos`:
- **admin**: `['ver', 'crear', 'editar', 'eliminar']`
- **supervisor, financiera, operador, conductor, cliente**: sin acceso al módulo directorio

El tab "Contactos" en ClienteDetail usa `clientes.ver` (sin cambio).

---

## Frontend

### Archivos nuevos

```
frontend/src/pages/Contactos/
├── ContactosList.jsx
└── components/
    ├── ContactoForm.jsx
    └── ContactoDrawer.jsx

frontend/src/api/contactos.service.js
frontend/src/hooks/useContactos.js
```

### contactos.service.js

```js
contactosService = {
  getAll(params)                         // GET /contactos
  getById(id)                            // GET /contactos/:id
  create(data)                           // POST /contactos
  update(id, data)                       // PUT /contactos/:id
  deactivate(id)                         // DELETE /contactos/:id
  asignarCliente(id, { cliente_id, es_principal })   // POST /contactos/:id/clientes
  desasignarCliente(id, clienteId)       // DELETE /contactos/:id/clientes/:clienteId

  // Desde ClienteDetail
  getContactosCliente(clienteId)         // GET /clientes/:id/contactos
  asignarACliente(clienteId, { contacto_id, es_principal })  // POST /clientes/:id/contactos/asignar
  desasignarDeCliente(clienteId, contactoId)                 // DELETE /clientes/:id/contactos/:contactoId
}
```

### useContactos.js

Estados: `listState` (data, pagination, loading), `detailState` (data, loading), `filters`.  
Funciones: `fetchContactos`, `fetchById`, `createContacto`, `updateContacto`, `deactivateContacto`, `asignarCliente`, `desasignarCliente`.

### ContactosList.jsx

- Tabla con columnas: Nombre · Badge tipo (azul "ISTHO" / gris "Externo") · Cargo · Email · Teléfono · Clientes (badge numérico) · Estado chip
- Badge "Usuario CRM" adicional si tiene `usuario_id`
- Filtros: búsqueda libre, `FilterDropdown` tipo (Todos/ISTHO/Externo), toggle activo/inactivo
- Clic en fila → abre `ContactoDrawer`
- Botón "Nuevo contacto" → abre `ContactoForm` (modal)
- Acción por fila: editar (lápiz → ContactoForm), desactivar (con ConfirmDialog)
- URL persistence con `useSearchParams`
- Skeleton firstLoad, overlay loading en refetch

### ContactoForm.jsx (modal)

Campos en orden:
1. `tipo` — `FilterDropdown` (ISTHO / Externo)
2. Toggle "Vincular a usuario CRM" — si activo: `FilterDropdown` que busca usuarios activos del sistema; al seleccionar, auto-rellena nombre/email/teléfono y sugiere tipo según rol (`supervisor`/`operador` → istho, `cliente` → externo)
3. `nombre` (input texto, required)
4. `cargo` (input texto)
5. `telefono` / `celular` (inputs)
6. `email` (input email)
7. `recibe_notificaciones` (toggle)
8. `tipos_notificacion` (checkboxes: Ingreso / Salida / Kardex, visible si `recibe_notificaciones=true`)
9. `notas` (textarea)

Usa React Hook Form + Controller para FilterDropdown y DatePicker si aplica.

### ContactoDrawer.jsx

Panel lateral derecho (drawer deslizable):
- **Header**: nombre, cargo, badge tipo, badge "Usuario CRM + rol" si tiene `usuario_id`
- **Datos**: email, teléfono, celular, notas
- **Sección "Clientes asignados"**: tabla compacta con razón social + badge "Principal" si `es_principal=true` + ícono desasignar por fila (con ConfirmDialog)
- **Botón "Asignar a cliente"**: abre mini-form inline con `FilterDropdown` de clientes activos + checkbox "Marcar como principal" → llama `asignarCliente()`
- Botón editar (ícono lápiz en header) → abre `ContactoForm` con datos precargados

### Tab "Contactos" en ClienteDetail.jsx

Reemplaza la implementación actual (que creaba contactos inline):
- Lista de contactos asignados desde pivot. Columnas: nombre, badge tipo, cargo, email, teléfono, badge "Principal"
- Filtro rápido por tipo (botones chip: Todos / ISTHO / Externo)
- Botón "Asignar contacto" → modal con:
  - `FilterDropdown` que busca contactos en el directorio (por nombre/email)
  - Checkbox "Marcar como principal"
  - Botón confirmar → llama `asignarACliente()`
- Acción por fila: toggle principal (estrella) · desasignar (ícono × con ConfirmDialog)
- Sin botón "Crear contacto" — dirección al usuario: "Para crear contactos ve al Directorio de Contactos"

### Navegación (FloatingHeader.jsx)

Nueva entrada en el sidebar bajo la sección de Clientes:
```jsx
{ label: 'Directorio', href: '/contactos', icon: BookUser }
// visible solo si hasPermission('contactos', 'ver')
```

Ruta lazy en App.jsx:
```jsx
const ContactosList = lazy(() => import('@pages/Contactos/ContactosList'));
// <PermissionRoute module="contactos" action="ver"><ContactosList /></PermissionRoute>
```

---

## Identidad Visual

Badges tipo siguiendo tokens del sistema:
- **ISTHO**: `bg-blue-500/20 text-blue-400` (color informativo)
- **Externo**: `bg-slate-500/20 text-slate-400`
- **Principal**: `bg-amber-500/20 text-amber-400` (igual que otros badges de estado especial)
- **Usuario CRM**: `bg-purple-500/20 text-purple-400`

---

## Restricciones y Reglas de Negocio

1. Un contacto con `activo=false` no aparece en los `FilterDropdown` de asignación
2. Un contacto puede estar asignado a 0 o más clientes
3. Solo puede haber un `es_principal=true` por cliente (forzado por hook `afterSave`)
4. `email` es único en el directorio si se provee (no required)
5. `usuario_id` es único — un usuario CRM solo puede ser un contacto del directorio
6. Desasignar un contacto de un cliente NO elimina el contacto del directorio
7. Desactivar un contacto (`activo=false`) NO lo desasigna de los clientes actuales — solo lo oculta en búsquedas futuras
8. Solo admin puede acceder al módulo `/contactos` (crear, editar, desactivar, asignar)
9. Roles con `clientes.ver` pueden ver la lista de contactos asignados en ClienteDetail (sin gestión)
