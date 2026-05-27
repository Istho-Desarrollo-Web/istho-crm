# Módulo de Solicitudes del Cliente — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que usuarios del portal cliente creen avisos de ingreso y solicitudes de despacho, generando borradores de operación que el equipo ISTHO revisa desde la ficha del cliente.

**Architecture:** Módulo independiente con 4 tablas nuevas (`solicitudes`, `solicitud_detalles`, `solicitud_comentarios`, `cliente_responsables`). Al crear una solicitud, el backend notifica vía Socket.IO y email solo a los usuarios ISTHO asignados a ese cliente. Los usuarios internos gestionan solicitudes desde `ClienteDetail` (nuevo tab); el portal cliente tiene su propia página `/solicitudes`.

**Tech Stack:** Express + Sequelize + MySQL (backend) · React 19 + Tailwind 4 (frontend) · S3 (adjuntos) · Socket.IO (notificaciones real-time) · Nodemailer + Handlebars (email)

---

## Mapa de archivos

### Crear (backend)
- `server/src/migrations/20260526000001-create-solicitudes.js`
- `server/src/migrations/20260526000002-create-solicitud-detalles.js`
- `server/src/migrations/20260526000003-create-solicitud-comentarios.js`
- `server/src/migrations/20260526000004-create-cliente-responsables.js`
- `server/src/models/Solicitud.js`
- `server/src/models/SolicitudDetalle.js`
- `server/src/models/SolicitudComentario.js`
- `server/src/models/ClienteResponsable.js`
- `server/src/controllers/solicitudController.js`
- `server/src/routes/solicitud.routes.js`

### Modificar (backend)
- `server/src/models/index.js` — agregar 4 modelos + 8 asociaciones
- `server/src/models/Usuario.js` — agregar `solicitudes` a `PERMISOS_CLIENTE_DEFAULT`
- `server/src/controllers/clienteController.js` — agregar `getResponsables`, `addResponsable`, `removeResponsable`
- `server/src/routes/cliente.routes.js` — agregar 3 rutas de responsables
- `server/src/routes/index.js` — montar `solicitud.routes`
- `server/src/config/multer.js` — agregar `uploadSolicitudDoc`
- `server/src/controllers/reporteController.js` — agregar `reporteSolicitudes`
- `server/src/routes/reporte.routes.js` — agregar `GET /solicitudes`

### Crear (frontend)
- `frontend/src/api/solicitudes.service.js`
- `frontend/src/pages/Solicitudes/SolicitudesList.jsx`
- `frontend/src/pages/Solicitudes/SolicitudForm.jsx`
- `frontend/src/pages/Solicitudes/SolicitudDetail.jsx`
- `frontend/src/pages/Reportes/ReporteSolicitudes.jsx`

### Modificar (frontend)
- `frontend/src/context/AuthContext.jsx` — agregar `solicitudes` a `PERMISOS_POR_ROL.cliente`
- `frontend/src/App.jsx` — agregar rutas `/solicitudes` y `/solicitudes/:id`
- `frontend/src/components/common/FloatingHeader.jsx` — agregar ítem menú + permiso map
- `frontend/src/pages/Clientes/ClienteDetail.jsx` — tab Solicitudes + sección Responsables
- `frontend/src/pages/Reportes/ReportesList.jsx` — agregar card Solicitudes

---

## Task 1: Migraciones de base de datos

**Files:**
- Create: `server/src/migrations/20260526000001-create-solicitudes.js`
- Create: `server/src/migrations/20260526000002-create-solicitud-detalles.js`
- Create: `server/src/migrations/20260526000003-create-solicitud-comentarios.js`
- Create: `server/src/migrations/20260526000004-create-cliente-responsables.js`

- [ ] **Step 1: Crear migración de tabla `solicitudes`**

```js
// server/src/migrations/20260526000001-create-solicitudes.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('solicitudes')) return;
    await queryInterface.createTable('solicitudes', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      numero_solicitud: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      tipo: { type: DataTypes.ENUM('ingreso', 'despacho'), allowNull: false },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'clientes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
      creado_por: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      estado: { type: DataTypes.ENUM('recibida', 'en_proceso', 'completada', 'rechazada'), allowNull: false, defaultValue: 'recibida' },
      prioridad: { type: DataTypes.ENUM('normal', 'urgente'), allowNull: false, defaultValue: 'normal' },
      fecha_estimada: { type: DataTypes.DATEONLY, allowNull: true },
      numero_documento: { type: DataTypes.STRING(100), allowNull: true },
      transportista: { type: DataTypes.STRING(150), allowNull: true },
      direccion_entrega: { type: DataTypes.STRING(300), allowNull: true },
      contacto_destino: { type: DataTypes.STRING(200), allowNull: true },
      notas: { type: DataTypes.TEXT, allowNull: true },
      documento_url: { type: DataTypes.STRING(500), allowNull: true },
      operacion_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'operaciones', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      deleted_at: { type: DataTypes.DATE, allowNull: true },
    });
  },
  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('solicitudes')) return;
    await queryInterface.dropTable('solicitudes');
  },
};
```

- [ ] **Step 2: Crear migración de tabla `solicitud_detalles`**

```js
// server/src/migrations/20260526000002-create-solicitud-detalles.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('solicitud_detalles')) return;
    await queryInterface.createTable('solicitud_detalles', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      solicitud_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'solicitudes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      referencia: { type: DataTypes.STRING(100), allowNull: false },
      descripcion: { type: DataTypes.STRING(300), allowNull: true },
      cantidad: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      unidad: { type: DataTypes.ENUM('caja', 'pallet', 'unidad'), allowNull: false, defaultValue: 'unidad' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
  },
  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('solicitud_detalles')) return;
    await queryInterface.dropTable('solicitud_detalles');
  },
};
```

- [ ] **Step 3: Crear migración de tabla `solicitud_comentarios`**

```js
// server/src/migrations/20260526000003-create-solicitud-comentarios.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('solicitud_comentarios')) return;
    await queryInterface.createTable('solicitud_comentarios', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      solicitud_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'solicitudes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'SET NULL' },
      mensaje: { type: DataTypes.TEXT, allowNull: false },
      archivo_url: { type: DataTypes.STRING(500), allowNull: true },
      es_interno: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
  },
  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('solicitud_comentarios')) return;
    await queryInterface.dropTable('solicitud_comentarios');
  },
};
```

- [ ] **Step 4: Crear migración de tabla `cliente_responsables`**

```js
// server/src/migrations/20260526000004-create-cliente-responsables.js
'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('cliente_responsables')) return;
    await queryInterface.createTable('cliente_responsables', {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'clientes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      usuario_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'usuarios', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('cliente_responsables', ['cliente_id', 'usuario_id'], { unique: true, name: 'unique_cliente_usuario' });
  },
  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('cliente_responsables')) return;
    await queryInterface.dropTable('cliente_responsables');
  },
};
```

- [ ] **Step 5: Verificar que las migraciones corren sin error**

```bash
cd server && npm run dev
```

Esperado: servidor arranca sin errores de Umzug. Verificar en MySQL:
```sql
SHOW TABLES LIKE 'solicitud%';
SHOW TABLES LIKE 'cliente_responsables';
SELECT name FROM SequelizeMeta ORDER BY name DESC LIMIT 6;
```

- [ ] **Step 6: Commit**

```bash
git add server/src/migrations/20260526000001-create-solicitudes.js
git add server/src/migrations/20260526000002-create-solicitud-detalles.js
git add server/src/migrations/20260526000003-create-solicitud-comentarios.js
git add server/src/migrations/20260526000004-create-cliente-responsables.js
git commit -m "feat: migraciones tablas solicitudes, detalles, comentarios y responsables"
```

---

## Task 2: Modelos Sequelize y asociaciones

**Files:**
- Create: `server/src/models/Solicitud.js`
- Create: `server/src/models/SolicitudDetalle.js`
- Create: `server/src/models/SolicitudComentario.js`
- Create: `server/src/models/ClienteResponsable.js`
- Modify: `server/src/models/index.js`
- Modify: `server/src/models/Usuario.js`

- [ ] **Step 1: Crear `Solicitud.js`**

```js
// server/src/models/Solicitud.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Solicitud extends Model {}

  Solicitud.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      numero_solicitud: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      tipo: { type: DataTypes.ENUM('ingreso', 'despacho'), allowNull: false },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false },
      creado_por: { type: DataTypes.INTEGER, allowNull: true },
      estado: {
        type: DataTypes.ENUM('recibida', 'en_proceso', 'completada', 'rechazada'),
        allowNull: false,
        defaultValue: 'recibida',
      },
      prioridad: {
        type: DataTypes.ENUM('normal', 'urgente'),
        allowNull: false,
        defaultValue: 'normal',
      },
      fecha_estimada: { type: DataTypes.DATEONLY, allowNull: true },
      numero_documento: { type: DataTypes.STRING(100), allowNull: true },
      transportista: { type: DataTypes.STRING(150), allowNull: true },
      direccion_entrega: { type: DataTypes.STRING(300), allowNull: true },
      contacto_destino: { type: DataTypes.STRING(200), allowNull: true },
      notas: { type: DataTypes.TEXT, allowNull: true },
      documento_url: { type: DataTypes.STRING(500), allowNull: true },
      operacion_id: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Solicitud',
      tableName: 'solicitudes',
      underscored: true,
      paranoid: true,
    }
  );

  return Solicitud;
};
```

- [ ] **Step 2: Crear `SolicitudDetalle.js`**

```js
// server/src/models/SolicitudDetalle.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class SolicitudDetalle extends Model {}

  SolicitudDetalle.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      solicitud_id: { type: DataTypes.INTEGER, allowNull: false },
      referencia: { type: DataTypes.STRING(100), allowNull: false },
      descripcion: { type: DataTypes.STRING(300), allowNull: true },
      cantidad: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      unidad: {
        type: DataTypes.ENUM('caja', 'pallet', 'unidad'),
        allowNull: false,
        defaultValue: 'unidad',
      },
    },
    {
      sequelize,
      modelName: 'SolicitudDetalle',
      tableName: 'solicitud_detalles',
      underscored: true,
      paranoid: false,
    }
  );

  return SolicitudDetalle;
};
```

- [ ] **Step 3: Crear `SolicitudComentario.js`**

```js
// server/src/models/SolicitudComentario.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class SolicitudComentario extends Model {}

  SolicitudComentario.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      solicitud_id: { type: DataTypes.INTEGER, allowNull: false },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true },
      mensaje: { type: DataTypes.TEXT, allowNull: false },
      archivo_url: { type: DataTypes.STRING(500), allowNull: true },
      es_interno: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'SolicitudComentario',
      tableName: 'solicitud_comentarios',
      underscored: true,
      paranoid: false,
    }
  );

  return SolicitudComentario;
};
```

- [ ] **Step 4: Crear `ClienteResponsable.js`**

```js
// server/src/models/ClienteResponsable.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ClienteResponsable extends Model {}

  ClienteResponsable.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false },
      usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: 'ClienteResponsable',
      tableName: 'cliente_responsables',
      underscored: true,
      paranoid: false,
    }
  );

  return ClienteResponsable;
};
```

- [ ] **Step 5: Registrar modelos y asociaciones en `server/src/models/index.js`**

Busca la sección donde se importan los modelos (hay un bloque de `require` o definición de modelos) y agrega los cuatro nuevos. Luego busca la sección de asociaciones y agrega al final:

```js
// En la sección de imports/definición de modelos, agregar junto a los demás:
const Solicitud = require('./Solicitud')(sequelize);
const SolicitudDetalle = require('./SolicitudDetalle')(sequelize);
const SolicitudComentario = require('./SolicitudComentario')(sequelize);
const ClienteResponsable = require('./ClienteResponsable')(sequelize);

// En el objeto de exports, agregar:
// Solicitud, SolicitudDetalle, SolicitudComentario, ClienteResponsable

// En la sección de asociaciones, agregar al final:

// Solicitud <-> Cliente
Cliente.hasMany(Solicitud, { foreignKey: 'cliente_id', as: 'solicitudes', onDelete: 'RESTRICT' });
Solicitud.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });

// Solicitud <-> Usuario (creador)
Usuario.hasMany(Solicitud, { foreignKey: 'creado_por', as: 'solicitudes_creadas' });
Solicitud.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });

// Solicitud <-> Operacion (vinculación)
Solicitud.belongsTo(Operacion, { foreignKey: 'operacion_id', as: 'operacion' });

// Solicitud <-> SolicitudDetalle
Solicitud.hasMany(SolicitudDetalle, { foreignKey: 'solicitud_id', as: 'detalles', onDelete: 'CASCADE' });
SolicitudDetalle.belongsTo(Solicitud, { foreignKey: 'solicitud_id', as: 'solicitud' });

// Solicitud <-> SolicitudComentario
Solicitud.hasMany(SolicitudComentario, { foreignKey: 'solicitud_id', as: 'comentarios', onDelete: 'CASCADE' });
SolicitudComentario.belongsTo(Solicitud, { foreignKey: 'solicitud_id', as: 'solicitud' });
SolicitudComentario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'autor' });

// Cliente <-> ClienteResponsable
Cliente.hasMany(ClienteResponsable, { foreignKey: 'cliente_id', as: 'responsables', onDelete: 'CASCADE' });
ClienteResponsable.belongsTo(Cliente, { foreignKey: 'cliente_id', as: 'cliente' });
ClienteResponsable.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'usuario' });
```

- [ ] **Step 6: Agregar `solicitudes` a `PERMISOS_CLIENTE_DEFAULT` en `server/src/models/Usuario.js`**

Busca el objeto `PERMISOS_CLIENTE_DEFAULT` en `Usuario.js` (tiene campos como `inventario`, `despachos`, `reportes`) y agrega:

```js
// Dentro de PERMISOS_CLIENTE_DEFAULT, agregar junto a los demás módulos:
solicitudes: ['ver', 'crear', 'comentar'],
```

- [ ] **Step 7: Verificar que el servidor arranca con los nuevos modelos**

```bash
cd server && npm run dev
```

Esperado: sin errores de Sequelize. Si hay error de asociación con `Operacion`, verificar que `Operacion` esté definido antes de la asociación en `index.js`.

- [ ] **Step 8: Commit**

```bash
git add server/src/models/Solicitud.js server/src/models/SolicitudDetalle.js
git add server/src/models/SolicitudComentario.js server/src/models/ClienteResponsable.js
git add server/src/models/index.js server/src/models/Usuario.js
git commit -m "feat: modelos Solicitud, SolicitudDetalle, SolicitudComentario, ClienteResponsable y asociaciones"
```

---

## Task 3: Backend — Responsables de cliente

**Files:**
- Modify: `server/src/controllers/clienteController.js`
- Modify: `server/src/routes/cliente.routes.js`

- [ ] **Step 1: Agregar métodos en `clienteController.js`**

Al final del archivo, antes del `module.exports`, agregar:

```js
// ─── RESPONSABLES DE CLIENTE ─────────────────────────────────────────────────

const getResponsables = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    const { ClienteResponsable, Usuario } = require('../models');
    const responsables = await ClienteResponsable.findAll({
      where: { cliente_id: id },
      include: [{ model: Usuario, as: 'usuario', attributes: ['id', 'nombre', 'apellido', 'email', 'rol', 'avatar_url'] }],
      order: [['created_at', 'ASC']],
    });

    return success(res, responsables.map((r) => ({
      id: r.id,
      usuario_id: r.usuario_id,
      nombre: r.usuario?.nombre,
      apellido: r.usuario?.apellido,
      email: r.usuario?.email,
      rol: r.usuario?.rol,
      avatar_url: r.usuario?.avatar_url,
    })));
  } catch (err) {
    return serverError(res, 'Error al obtener responsables', err);
  }
};

const addResponsable = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) return error(res, 'usuario_id es requerido', 400);

    const { ClienteResponsable, Usuario } = require('../models');

    const usuario = await Usuario.findByPk(usuario_id);
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    const rolesPermitidos = ['admin', 'supervisor', 'operador'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      return error(res, 'Solo se pueden asignar usuarios con rol admin, supervisor u operador', 422);
    }

    const [responsable, creado] = await ClienteResponsable.findOrCreate({
      where: { cliente_id: id, usuario_id },
      defaults: { cliente_id: id, usuario_id },
    });

    if (!creado) return conflict(res, 'Este usuario ya está asignado a este cliente');

    return created(res, 'Responsable asignado correctamente', {
      id: responsable.id,
      usuario_id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
    });
  } catch (err) {
    return serverError(res, 'Error al agregar responsable', err);
  }
};

const removeResponsable = async (req, res) => {
  try {
    const { id, uid } = req.params;
    const { ClienteResponsable } = require('../models');

    const responsable = await ClienteResponsable.findOne({ where: { cliente_id: id, usuario_id: uid } });
    if (!responsable) return notFound(res, 'Responsable no encontrado');

    await responsable.destroy();
    return successMessage(res, 'Responsable removido correctamente');
  } catch (err) {
    return serverError(res, 'Error al remover responsable', err);
  }
};
```

En `module.exports` del controlador, agregar `getResponsables`, `addResponsable`, `removeResponsable`.

- [ ] **Step 2: Agregar rutas de responsables en `cliente.routes.js`**

Al final del router, antes del `module.exports = router`, agregar:

```js
// ─── RESPONSABLES ────────────────────────────────────────────────────────────
router.get('/:id/responsables', requiereRolMinimo('supervisor'), clienteController.getResponsables);
router.post('/:id/responsables', requiereRolMinimo('admin'), clienteController.addResponsable);
router.delete('/:id/responsables/:uid', requiereRolMinimo('admin'), clienteController.removeResponsable);
```

- [ ] **Step 3: Verificar endpoints con curl**

```bash
# Asegúrate de tener un token admin en $TOKEN
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/v1/clientes/1/responsables
# Esperado: { success: true, data: [] }

curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"usuario_id": 2}' http://localhost:5000/api/v1/clientes/1/responsables
# Esperado: 201 con datos del responsable (si usuario_id 2 es admin/supervisor/operador)
```

- [ ] **Step 4: Commit**

```bash
git add server/src/controllers/clienteController.js server/src/routes/cliente.routes.js
git commit -m "feat: endpoints CRUD de responsables por cliente"
```

---

## Task 4: Backend — Controller y rutas de solicitudes

**Files:**
- Create: `server/src/controllers/solicitudController.js`
- Create: `server/src/routes/solicitud.routes.js`
- Modify: `server/src/routes/index.js`
- Modify: `server/src/config/multer.js`

- [ ] **Step 1: Agregar `uploadSolicitudDoc` en `multer.js`**

Al final de `multer.js`, antes de `module.exports`, agregar:

```js
const uploadSolicitudDoc = multer({
  storage: storageMemory,
  fileFilter: documentFilter,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});
```

En `module.exports`, agregar `uploadSolicitudDoc`.

- [ ] **Step 2: Crear `solicitudController.js`**

```js
// server/src/controllers/solicitudController.js
'use strict';

const { Op } = require('sequelize');
const {
  Solicitud, SolicitudDetalle, SolicitudComentario, ClienteResponsable,
  Cliente, Usuario, Operacion, Notificacion, Auditoria, sequelize,
} = require('../models');
const s3Service = require('../services/s3Service');
const emailService = require('../services/emailService');
const socketService = require('../services/socketService');
const { getUsuariosPorRol } = require('../services/notificacionService');
const {
  success, created, paginated, error: errorResponse, notFound, serverError, successMessage,
} = require('../utils/responses');
const { parsePaginacion, buildPaginacion } = require('../utils/helpers');
const logger = require('../utils/logger');

const TIPO_LABEL = { ingreso: 'Aviso de Ingreso', despacho: 'Solicitud de Despacho' };

// ─── GENERAR NÚMERO CORRELATIVO ───────────────────────────────────────────────

const generarNumeroSolicitud = async (t) => {
  const year = new Date().getFullYear();
  const [row] = await sequelize.query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(numero_solicitud, '-', -1) AS UNSIGNED)) AS ultimo
     FROM solicitudes WHERE numero_solicitud LIKE :patron`,
    { replacements: { patron: `SOL-${year}-%` }, type: sequelize.QueryTypes.SELECT, transaction: t }
  );
  const siguiente = ((row?.ultimo || 0) + 1).toString().padStart(4, '0');
  return `SOL-${year}-${siguiente}`;
};

// ─── OBTENER IDs DE USUARIOS A NOTIFICAR ─────────────────────────────────────

const getResponsablesIds = async (cliente_id) => {
  const registros = await ClienteResponsable.findAll({ where: { cliente_id }, attributes: ['usuario_id'] });
  if (registros.length > 0) return registros.map((r) => r.usuario_id);
  return await getUsuariosPorRol(['admin']);
};

// ─── CREAR SOLICITUD ──────────────────────────────────────────────────────────

const crear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { tipo, prioridad, fecha_estimada, numero_documento, transportista,
      direccion_entrega, contacto_destino, notas, detalles, cliente_id } = req.body;

    if (!tipo || !['ingreso', 'despacho'].includes(tipo))
      return errorResponse(res, 'tipo debe ser ingreso o despacho', 400);
    if (!Array.isArray(detalles) || detalles.length === 0)
      return errorResponse(res, 'Debe incluir al menos un producto en detalles', 400);

    const numero_solicitud = await generarNumeroSolicitud(t);

    const solicitud = await Solicitud.create({
      numero_solicitud,
      tipo,
      cliente_id,
      creado_por: req.user.id,
      estado: 'recibida',
      prioridad: prioridad || 'normal',
      fecha_estimada: fecha_estimada || null,
      numero_documento: numero_documento || null,
      transportista: transportista || null,
      direccion_entrega: direccion_entrega || null,
      contacto_destino: contacto_destino || null,
      notas: notas || null,
    }, { transaction: t });

    const lineas = detalles.map((d) => ({
      solicitud_id: solicitud.id,
      referencia: d.referencia,
      descripcion: d.descripcion || null,
      cantidad: Number(d.cantidad),
      unidad: d.unidad || 'unidad',
    }));
    await SolicitudDetalle.bulkCreate(lineas, { transaction: t });

    await t.commit();

    // Acciones post-commit (no bloquean la respuesta)
    setImmediate(async () => {
      try {
        const accion_url = `/clientes/${cliente_id}?tab=solicitudes&id=${solicitud.id}`;
        const titulo = `Nueva ${TIPO_LABEL[tipo]}: ${numero_solicitud}`;
        const cliente = await Cliente.findByPk(cliente_id, { attributes: ['razon_social'] });
        const mensaje = `El cliente ${cliente?.razon_social || ''} creó ${TIPO_LABEL[tipo].toLowerCase()} ${numero_solicitud}.`;

        const responsablesIds = await getResponsablesIds(cliente_id);
        await Notificacion.notificarMultiple(responsablesIds, {
          tipo: 'cliente', titulo, mensaje, prioridad: prioridad || 'normal',
          accion_url, accion_label: 'Ver solicitud',
          metadata: { solicitud_id: solicitud.id, tipo, cliente_id },
        });
        socketService.emitToUsers(responsablesIds, 'notificacion:nueva', {
          tipo: 'cliente', titulo, mensaje, prioridad: prioridad || 'normal', accion_url, accion_label: 'Ver solicitud',
          created_at: new Date(),
        });

        const responsablesUsuarios = await Usuario.findAll({
          where: { id: { [Op.in]: responsablesIds } }, attributes: ['email', 'nombre'],
        });
        const emails = responsablesUsuarios.map((u) => u.email).filter(Boolean);
        if (emails.length > 0) {
          const tipoLabel = TIPO_LABEL[tipo];
          await emailService.enviarManual({
            para: emails,
            asunto: `Nueva ${tipoLabel}: ${numero_solicitud} — ${cliente?.razon_social || ''}`,
            cuerpoHtml: `
              <h2 style="color:#E74C3C">${tipoLabel} recibida</h2>
              <p><strong>N° Solicitud:</strong> ${numero_solicitud}</p>
              <p><strong>Cliente:</strong> ${cliente?.razon_social || ''}</p>
              <p><strong>Prioridad:</strong> ${prioridad || 'normal'}</p>
              ${fecha_estimada ? `<p><strong>Fecha estimada:</strong> ${fecha_estimada}</p>` : ''}
              ${notas ? `<p><strong>Notas:</strong> ${notas}</p>` : ''}
              <p style="margin-top:20px">
                <a href="${process.env.APP_URL || 'http://localhost:5173'}${accion_url}"
                   style="background:#E74C3C;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
                  Ver Solicitud
                </a>
              </p>
            `,
          });
        }

        await Auditoria.registrar({
          tabla: 'solicitudes', registro_id: solicitud.id,
          accion: 'crear', usuario_id: req.user.id,
          valores_nuevos: { numero_solicitud, tipo, estado: 'recibida' },
        });
      } catch (err) {
        logger.error('[SolicitudController] Error en post-commit:', err.message);
      }
    });

    return created(res, 'Solicitud creada correctamente', { id: solicitud.id, numero_solicitud });
  } catch (err) {
    await t.rollback();
    return serverError(res, 'Error al crear solicitud', err);
  }
};

// ─── LISTAR SOLICITUDES ───────────────────────────────────────────────────────

const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const { tipo, estado, desde, hasta, cliente_id } = req.query;

    const where = {};
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (cliente_id) where.cliente_id = cliente_id; // filtrarPorCliente lo inyecta automáticamente para rol cliente
    if (desde || hasta) {
      where.created_at = {};
      if (desde) where.created_at[Op.gte] = new Date(desde + 'T00:00:00');
      if (hasta) where.created_at[Op.lte] = new Date(hasta + 'T23:59:59');
    }

    const { count, rows } = await Solicitud.findAndCountAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social', 'codigo_cliente'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido'] },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return paginated(res, rows, buildPaginacion(count, page, limit));
  } catch (err) {
    return serverError(res, 'Error al listar solicitudes', err);
  }
};

// ─── OBTENER DETALLE ──────────────────────────────────────────────────────────

const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const esCliente = req.user?.rol === 'cliente';

    const comentariosWhere = esCliente ? { es_interno: false } : {};

    const solicitud = await Solicitud.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social', 'codigo_cliente'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido'] },
        { model: SolicitudDetalle, as: 'detalles' },
        {
          model: SolicitudComentario, as: 'comentarios', where: comentariosWhere, required: false,
          include: [{ model: Usuario, as: 'autor', attributes: ['id', 'nombre', 'apellido', 'rol', 'avatar_url'] }],
          order: [['created_at', 'ASC']],
        },
        { model: Operacion, as: 'operacion', attributes: ['id', 'numero_operacion', 'estado'], required: false },
      ],
    });

    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    // Si es cliente, verificar que la solicitud sea suya
    if (esCliente && solicitud.cliente_id !== req.user.cliente_id) {
      return errorResponse(res, 'No tiene acceso a esta solicitud', 403);
    }

    // Resolver URLs de documentos
    let documento_url = solicitud.documento_url;
    if (documento_url && s3Service.isS3Key(documento_url)) {
      documento_url = await s3Service.getUrl(documento_url, 900);
    }

    return success(res, { ...solicitud.toJSON(), documento_url });
  } catch (err) {
    return serverError(res, 'Error al obtener solicitud', err);
  }
};

// ─── CAMBIAR ESTADO ───────────────────────────────────────────────────────────

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo } = req.body;

    const estadosValidos = ['en_proceso', 'completada', 'rechazada'];
    if (!estadosValidos.includes(estado))
      return errorResponse(res, `estado debe ser uno de: ${estadosValidos.join(', ')}`, 400);

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (['completada', 'rechazada'].includes(solicitud.estado))
      return errorResponse(res, 'La solicitud ya está en estado final', 422);

    if (estado === 'completada' && !solicitud.operacion_id)
      return errorResponse(res, 'Debe vincular una operación antes de marcar como completada', 422);

    if (estado === 'rechazada') {
      if (!motivo || motivo.trim().length < 5)
        return errorResponse(res, 'El motivo de rechazo es requerido (mínimo 5 caracteres)', 400);
      await SolicitudComentario.create({
        solicitud_id: id,
        usuario_id: req.user.id,
        mensaje: `Solicitud rechazada: ${motivo.trim()}`,
        es_interno: false,
      });
    }

    await solicitud.update({ estado });

    await Auditoria.registrar({
      tabla: 'solicitudes', registro_id: id,
      accion: 'cambiar_estado', usuario_id: req.user.id,
      valores_anteriores: { estado: solicitud.estado },
      valores_nuevos: { estado },
    });

    return successMessage(res, `Solicitud marcada como ${estado}`, { id, estado });
  } catch (err) {
    return serverError(res, 'Error al cambiar estado', err);
  }
};

// ─── VINCULAR A OPERACIÓN ─────────────────────────────────────────────────────

const vincular = async (req, res) => {
  try {
    const { id } = req.params;
    const { operacion_id } = req.body;

    if (!operacion_id) return errorResponse(res, 'operacion_id es requerido', 400);

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    const operacion = await Operacion.findByPk(operacion_id);
    if (!operacion) return notFound(res, 'Operación no encontrada');

    await solicitud.update({ operacion_id, estado: solicitud.estado === 'recibida' ? 'en_proceso' : solicitud.estado });

    await Auditoria.registrar({
      tabla: 'solicitudes', registro_id: id,
      accion: 'vincular_operacion', usuario_id: req.user.id,
      valores_nuevos: { operacion_id },
    });

    return successMessage(res, 'Operación vinculada correctamente', { id, operacion_id });
  } catch (err) {
    return serverError(res, 'Error al vincular operación', err);
  }
};

// ─── AGREGAR COMENTARIO ───────────────────────────────────────────────────────

const agregarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje, es_interno } = req.body;
    const esCliente = req.user?.rol === 'cliente';

    if (!mensaje || mensaje.trim().length === 0)
      return errorResponse(res, 'El mensaje es requerido', 400);

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (esCliente && solicitud.cliente_id !== req.user.cliente_id)
      return errorResponse(res, 'No tiene acceso a esta solicitud', 403);

    const comentario = await SolicitudComentario.create({
      solicitud_id: id,
      usuario_id: req.user.id,
      mensaje: mensaje.trim(),
      es_interno: esCliente ? false : !!es_interno,
    });

    const autor = await Usuario.findByPk(req.user.id, { attributes: ['id', 'nombre', 'apellido', 'rol', 'avatar_url'] });

    return created(res, 'Comentario agregado', { ...comentario.toJSON(), autor });
  } catch (err) {
    return serverError(res, 'Error al agregar comentario', err);
  }
};

// ─── SUBIR DOCUMENTO ADJUNTO ──────────────────────────────────────────────────

const subirDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return errorResponse(res, 'No se recibió ningún archivo', 400);

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (req.user?.rol === 'cliente' && solicitud.cliente_id !== req.user.cliente_id)
      return errorResponse(res, 'No tiene acceso a esta solicitud', 403);

    const { key } = await s3Service.subir(req.file, `solicitudes/${id}`);
    await solicitud.update({ documento_url: key });

    const url = await s3Service.getUrl(key, 900);
    return success(res, { documento_url: url });
  } catch (err) {
    return serverError(res, 'Error al subir documento', err);
  }
};

module.exports = { crear, listar, obtener, cambiarEstado, vincular, agregarComentario, subirDocumento };
```

- [ ] **Step 3: Crear `solicitud.routes.js`**

```js
// server/src/routes/solicitud.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const { verificarToken, filtrarPorCliente } = require('../middleware/auth');
const { noClientes } = require('../middleware/roles');
const { uploadSolicitudDoc } = require('../config/multer');

router.use(verificarToken);
router.use(filtrarPorCliente);

router.get('/', solicitudController.listar);
router.get('/:id', solicitudController.obtener);
router.post('/', solicitudController.crear);
router.patch('/:id/estado', noClientes, solicitudController.cambiarEstado);
router.patch('/:id/vincular', noClientes, solicitudController.vincular);
router.post('/:id/comentarios', solicitudController.agregarComentario);
router.post('/:id/documento', uploadSolicitudDoc.single('archivo'), solicitudController.subirDocumento);

module.exports = router;
```

- [ ] **Step 4: Montar rutas en `server/src/routes/index.js`**

Busca la sección de imports y agrega:

```js
const solicitudRoutes = require('./solicitud.routes');
```

Busca la sección de `router.use(...)` y agrega junto a las demás rutas:

```js
router.use('/solicitudes', solicitudRoutes);
```

- [ ] **Step 5: Verificar endpoints con curl**

```bash
# Listar (debe retornar array vacío)
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/v1/solicitudes
# Esperado: { success: true, data: [], pagination: {...} }

# Crear (con usuario rol cliente que tenga cliente_id asignado)
curl -X POST -H "Authorization: Bearer $TOKEN_CLIENTE" -H "Content-Type: application/json" \
  -d '{"tipo":"ingreso","prioridad":"normal","detalles":[{"referencia":"REF-001","cantidad":10,"unidad":"caja"}]}' \
  http://localhost:5000/api/v1/solicitudes
# Esperado: 201 con numero_solicitud SOL-2026-0001
```

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/solicitudController.js server/src/routes/solicitud.routes.js
git add server/src/routes/index.js server/src/config/multer.js
git commit -m "feat: controller y rutas del módulo de solicitudes"
```

---

## Task 5: Frontend — Permisos, rutas, menú y servicio API

**Files:**
- Modify: `frontend/src/context/AuthContext.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/common/FloatingHeader.jsx`
- Create: `frontend/src/api/solicitudes.service.js`

- [ ] **Step 1: Agregar `solicitudes` a `PERMISOS_POR_ROL.cliente` en `AuthContext.jsx`**

Busca el objeto `PERMISOS_POR_ROL` en `AuthContext.jsx` y en la clave `cliente` agrega:

```js
// Dentro de PERMISOS_POR_ROL.cliente, agregar junto a inventario, despachos, etc.:
solicitudes: ['ver', 'crear', 'comentar'],
```

- [ ] **Step 2: Agregar rutas en `App.jsx`**

Busca los imports de páginas al inicio del archivo y agrega:

```jsx
const SolicitudesList = lazy(() => import('./pages/Solicitudes/SolicitudesList'));
const SolicitudDetail = lazy(() => import('./pages/Solicitudes/SolicitudDetail'));
const ReporteSolicitudes = lazy(() => import('./pages/Reportes/ReporteSolicitudes'));
```

Busca el bloque de rutas con `PermissionRoute` y agrega:

```jsx
<Route
  path="/solicitudes"
  element={
    <PermissionRoute module="solicitudes" action="ver">
      <SolicitudesList />
    </PermissionRoute>
  }
/>
<Route
  path="/solicitudes/:id"
  element={
    <PermissionRoute module="solicitudes" action="ver">
      <SolicitudDetail />
    </PermissionRoute>
  }
/>
<Route
  path="/reportes/solicitudes"
  element={
    <PermissionRoute module="reportes" action="ver">
      <ReporteSolicitudes />
    </PermissionRoute>
  }
/>
```

- [ ] **Step 3: Agregar ítem "Solicitudes" en `FloatingHeader.jsx`**

Busca el array `allMenuConfig` y agrega un nuevo ítem (entre operaciones y reportes o al final):

```js
{
  id: 'solicitudes',
  label: 'Solicitudes',
  icon: ClipboardCheck,    // importar de lucide-react
  basePath: '/solicitudes',
  shortcut: 'S',
  items: [
    { icon: ClipboardCheck, label: 'Mis Solicitudes', href: '/solicitudes', shortcut: 'G S' },
  ],
},
```

En `MENU_PERMISSION_MAP`, agregar:

```js
solicitudes: ['solicitudes.ver'],
```

Agregar el import de `ClipboardCheck` de lucide-react (búscalo en la línea donde se importan los demás iconos de lucide y agrega `ClipboardCheck`).

- [ ] **Step 4: Crear `solicitudes.service.js`**

```js
// frontend/src/api/solicitudes.service.js
import apiClient from './client';
import { createUploadClient } from './client';

const BASE = '/solicitudes';

const solicitudesService = {
  getAll: (params = {}) => apiClient.get(BASE, { params }),

  getById: (id) => apiClient.get(`${BASE}/${id}`),

  crear: (data) => apiClient.post(BASE, data),

  cambiarEstado: (id, estado, motivo) =>
    apiClient.patch(`${BASE}/${id}/estado`, { estado, motivo }),

  vincular: (id, operacion_id) =>
    apiClient.patch(`${BASE}/${id}/vincular`, { operacion_id }),

  agregarComentario: (id, mensaje, es_interno = false) =>
    apiClient.post(`${BASE}/${id}/comentarios`, { mensaje, es_interno }),

  subirDocumento: (id, file) => {
    const uploadClient = createUploadClient();
    const formData = new FormData();
    formData.append('archivo', file);
    return uploadClient.post(`${BASE}/${id}/documento`, formData);
  },

  // Para ISTHO: solicitudes de un cliente específico
  getPorCliente: (clienteId, params = {}) =>
    apiClient.get(BASE, { params: { ...params, cliente_id: clienteId } }),
};

export default solicitudesService;
```

- [ ] **Step 5: Verificar en el navegador**

Con un usuario de rol `cliente`, navegar a `/solicitudes` — debe mostrar la página (aunque aún vacía). El ítem "Solicitudes" debe aparecer en el menú lateral.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/context/AuthContext.jsx frontend/src/App.jsx
git add frontend/src/components/common/FloatingHeader.jsx
git add frontend/src/api/solicitudes.service.js
git commit -m "feat: permisos, rutas, menú y servicio API del módulo solicitudes"
```

---

## Task 6: Frontend — SolicitudesList.jsx

**Files:**
- Create: `frontend/src/pages/Solicitudes/SolicitudesList.jsx`

- [ ] **Step 1: Crear el directorio y el componente**

```jsx
// frontend/src/pages/Solicitudes/SolicitudesList.jsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ClipboardCheck, Plus, RefreshCw, Search } from 'lucide-react';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown, DatePicker } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

const ESTADO_CONFIG = {
  recibida:    { label: 'Recibida',    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  en_proceso:  { label: 'En Proceso',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completada:  { label: 'Completada',  color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rechazada:   { label: 'Rechazada',   color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const SolicitudesList = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isCliente } = useAuth();
  const { error } = useNotification();

  const tabActivo = searchParams.get('tab') || 'ingreso';
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchSolicitudes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await solicitudesService.getAll({
        tipo: tabActivo,
        estado: filtroEstado || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        search: busqueda || undefined,
        page: pagination.page,
        limit: 20,
      });
      setSolicitudes(res.data || []);
      if (res.pagination) setPagination(res.pagination);
    } catch (err) {
      error('Error al cargar solicitudes');
    } finally {
      setLoading(false);
    }
  }, [tabActivo, filtroEstado, filtroDesde, filtroHasta, busqueda, pagination.page]);

  useEffect(() => { fetchSolicitudes(); }, [fetchSolicitudes]);

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
    setPagination((p) => ({ ...p, page: 1 }));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100">Solicitudes</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Avisos de ingreso y solicitudes de despacho</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSolicitudes} className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors">
            <RefreshCw className="w-4 h-4" /> Actualizar
          </button>
          {isCliente() && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" /> Nueva Solicitud
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-centhrix-surface rounded-xl p-1 mb-6 w-fit">
        {[{ key: 'ingreso', label: 'Ingresos' }, { key: 'despacho', label: 'Despachos' }].map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tabActivo === tab.key
                ? 'bg-white dark:bg-centhrix-card text-orange-600 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="N° solicitud, documento..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <FilterDropdown
              compact
              options={[{ value: '', label: 'Todos' }, ...Object.entries(ESTADO_CONFIG).map(([v, c]) => ({ value: v, label: c.label }))]}
              value={filtroEstado}
              onChange={setFiltroEstado}
            />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
            <DatePicker value={filtroDesde} onChange={setFiltroDesde} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
            <DatePicker value={filtroHasta} onChange={setFiltroHasta} />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">Cargando...</div>
        ) : solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <ClipboardCheck className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No hay solicitudes</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['N° Solicitud', 'Cliente', 'Fecha', 'Prioridad', 'Estado'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {solicitudes.map((s) => {
                const estadoConf = ESTADO_CONFIG[s.estado] || ESTADO_CONFIG.recibida;
                return (
                  <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)}
                    className="hover:bg-slate-50 dark:hover:bg-centhrix-surface cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-medium text-slate-700 dark:text-slate-200">{s.numero_solicitud}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{s.cliente?.razon_social || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{s.fecha_estimada || new Date(s.created_at).toLocaleDateString('es-CO')}</td>
                    <td className="px-4 py-3">
                      {s.prioridad === 'urgente' && (
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgente</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${estadoConf.color}`}>{estadoConf.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40">Anterior</button>
          <span className="px-3 py-1.5 text-sm text-slate-500 dark:text-slate-400">{pagination.page} / {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-slate-700 disabled:opacity-40">Siguiente</button>
        </div>
      )}

      {/* Modal de creación — se agrega en Task 7 */}
      {showForm && (
        <SolicitudFormPlaceholder tipo={tabActivo} onClose={() => setShowForm(false)} onSave={() => { setShowForm(false); fetchSolicitudes(); }} />
      )}
    </div>
  );
};

// Placeholder temporal hasta crear SolicitudForm en Task 7
const SolicitudFormPlaceholder = ({ onClose }) => (
  <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
    <div className="bg-white dark:bg-centhrix-card rounded-2xl p-6">
      <p className="text-slate-700 dark:text-slate-200">Formulario pendiente (Task 7)</p>
      <button onClick={onClose} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-xl">Cerrar</button>
    </div>
  </div>
);

export default SolicitudesList;
```

- [ ] **Step 2: Verificar en el navegador**

Navegar como cliente a `/solicitudes`. Verificar que se ven las tabs Ingresos/Despachos, los filtros, el botón "Nueva Solicitud" (solo si es cliente), y la tabla.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Solicitudes/SolicitudesList.jsx
git commit -m "feat: página SolicitudesList con tabs, filtros y tabla"
```

---

## Task 7: Frontend — SolicitudForm.jsx

**Files:**
- Create: `frontend/src/pages/Solicitudes/SolicitudForm.jsx`
- Modify: `frontend/src/pages/Solicitudes/SolicitudesList.jsx` (reemplazar placeholder)

- [ ] **Step 1: Crear `SolicitudForm.jsx`**

```jsx
// frontend/src/pages/Solicitudes/SolicitudForm.jsx
import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown, DatePicker } from '../../components/common';
import useNotification from '../../hooks/useNotification';

const UNIDADES = [
  { value: 'unidad', label: 'Unidad' },
  { value: 'caja', label: 'Caja' },
  { value: 'pallet', label: 'Pallet' },
];

const lineaVacia = () => ({ referencia: '', descripcion: '', cantidad: '', unidad: 'unidad' });

const SolicitudForm = ({ tipo, onClose, onSave }) => {
  const { success, error: notifyError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    prioridad: 'normal',
    fecha_estimada: '',
    numero_documento: '',
    transportista: '',
    direccion_entrega: '',
    contacto_destino: '',
    notas: '',
  });
  const [detalles, setDetalles] = useState([lineaVacia()]);
  const [adjunto, setAdjunto] = useState(null);
  const [formError, setFormError] = useState('');

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleDetalleChange = (idx, field, value) => {
    setDetalles((prev) => prev.map((d, i) => (i === idx ? { ...d, [field]: value } : d)));
  };

  const addLinea = () => setDetalles((prev) => [...prev, lineaVacia()]);
  const removeLinea = (idx) => setDetalles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const lineasValidas = detalles.filter((d) => d.referencia.trim() && Number(d.cantidad) > 0);
    if (lineasValidas.length === 0) {
      setFormError('Agrega al menos un producto con referencia y cantidad válidas');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, tipo, detalles: lineasValidas };
      const res = await solicitudesService.crear(payload);
      const solicitudId = res.data?.id;

      if (adjunto && solicitudId) {
        await solicitudesService.subirDocumento(solicitudId, adjunto);
      }

      success(`Solicitud ${res.data?.numero_solicitud} creada correctamente`);
      onSave();
    } catch (err) {
      const msg = err.message || 'Error al crear la solicitud';
      setFormError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const tipoLabel = tipo === 'ingreso' ? 'Aviso de Ingreso' : 'Solicitud de Despacho';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Nueva {tipoLabel}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-centhrix-surface">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-xl">{formError}</div>
          )}

          {/* Campos comunes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Prioridad</label>
              <FilterDropdown
                options={[{ value: 'normal', label: 'Normal' }, { value: 'urgente', label: 'Urgente' }]}
                value={form.prioridad}
                onChange={(v) => setForm((p) => ({ ...p, prioridad: v }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                {tipo === 'ingreso' ? 'Fecha estimada de llegada' : 'Fecha deseada de despacho'}
              </label>
              <DatePicker value={form.fecha_estimada} onChange={(v) => setForm((p) => ({ ...p, fecha_estimada: v }))} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              {tipo === 'ingreso' ? 'N° Remisión / Factura' : 'N° Orden de Compra'}
            </label>
            <input name="numero_documento" value={form.numero_documento} onChange={handleChange}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              placeholder="Número de documento" />
          </div>

          {/* Campos específicos por tipo */}
          {tipo === 'ingreso' && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Transportista / Vehículo</label>
              <input name="transportista" value={form.transportista} onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                placeholder="Nombre del transportista o placa" />
            </div>
          )}

          {tipo === 'despacho' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Dirección de entrega</label>
                <input name="direccion_entrega" value={form.direccion_entrega} onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                  placeholder="Ciudad, calle, número..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Contacto en destino</label>
                <input name="contacto_destino" value={form.contacto_destino} onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                  placeholder="Nombre y teléfono" />
              </div>
            </div>
          )}

          {/* Tabla de productos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Productos *</label>
              <button type="button" onClick={addLinea}
                className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700">
                <Plus className="w-3 h-3" /> Agregar línea
              </button>
            </div>
            <div className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-centhrix-surface">
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Referencia *</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Descripción</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 w-24">Cantidad *</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400 w-28">Unidad</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {detalles.map((d, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1.5">
                        <input value={d.referencia} onChange={(e) => handleDetalleChange(idx, 'referencia', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                          placeholder="REF-001" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input value={d.descripcion} onChange={(e) => handleDetalleChange(idx, 'descripcion', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                          placeholder="Descripción" />
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" min="0.01" step="0.01" value={d.cantidad}
                          onChange={(e) => handleDetalleChange(idx, 'cantidad', e.target.value)}
                          className="w-full px-2 py-1 text-sm border border-gray-200 dark:border-slate-700 rounded-lg bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200" />
                      </td>
                      <td className="px-2 py-1.5">
                        <FilterDropdown compact options={UNIDADES} value={d.unidad}
                          onChange={(v) => handleDetalleChange(idx, 'unidad', v)} />
                      </td>
                      <td className="px-2 py-1.5">
                        {detalles.length > 1 && (
                          <button type="button" onClick={() => removeLinea(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Notas adicionales</label>
            <textarea name="notas" value={form.notas} onChange={handleChange} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200 resize-none"
              placeholder="Instrucciones especiales, condiciones, observaciones..." />
          </div>

          {/* Adjunto */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Documento soporte (PDF / imagen)</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setAdjunto(e.target.files[0] || null)}
              className="w-full text-sm text-slate-600 dark:text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-orange-50 file:text-orange-600 hover:file:bg-orange-100" />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors">
              {saving ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SolicitudForm;
```

- [ ] **Step 2: Reemplazar placeholder en `SolicitudesList.jsx`**

En `SolicitudesList.jsx`:
1. Agrega el import: `import SolicitudForm from './SolicitudForm';`
2. Elimina el componente `SolicitudFormPlaceholder` al final del archivo.
3. Reemplaza `<SolicitudFormPlaceholder ...>` por:

```jsx
{showForm && (
  <SolicitudForm
    tipo={tabActivo}
    onClose={() => setShowForm(false)}
    onSave={() => { setShowForm(false); fetchSolicitudes(); }}
  />
)}
```

- [ ] **Step 3: Verificar el formulario en el navegador**

Como usuario cliente, ir a `/solicitudes`, clic en "Nueva Solicitud". Verificar que:
- Se muestran los campos correctos según el tab activo (ingreso vs despacho)
- La tabla de productos permite agregar/quitar líneas
- El formulario crea la solicitud y muestra el toast de éxito

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Solicitudes/SolicitudForm.jsx
git add frontend/src/pages/Solicitudes/SolicitudesList.jsx
git commit -m "feat: SolicitudForm — modal de creación con tabla dinámica de productos"
```

---

## Task 8: Frontend — SolicitudDetail.jsx

**Files:**
- Create: `frontend/src/pages/Solicitudes/SolicitudDetail.jsx`

- [ ] **Step 1: Crear `SolicitudDetail.jsx`**

```jsx
// frontend/src/pages/Solicitudes/SolicitudDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Link2, Lock, Send, Paperclip, ExternalLink } from 'lucide-react';
import solicitudesService from '../../api/solicitudes.service';
import { FilterDropdown } from '../../components/common';
import useNotification from '../../hooks/useNotification';
import { useAuth } from '../../context/AuthContext';

const ESTADO_CONFIG = {
  recibida:   { label: 'Recibida',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  en_proceso: { label: 'En Proceso', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  completada: { label: 'Completada', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  rechazada:  { label: 'Rechazada',  color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const SolicitudDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isCliente, isAdmin, isSupervisorOrAbove } = useAuth();
  const { success, error: notifyError } = useNotification();

  const [solicitud, setSolicitud] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comentario, setComentario] = useState('');
  const [esInterno, setEsInterno] = useState(false);
  const [archivoComentario, setArchivoComentario] = useState(null);
  const [enviandoComentario, setEnviandoComentario] = useState(false);
  const [cambioEstado, setCambioEstado] = useState('');
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [operacionIdVincular, setOperacionIdVincular] = useState('');
  const [accionando, setAccionando] = useState(false);
  const comentariosRef = useRef(null);

  const fetchSolicitud = async () => {
    setLoading(true);
    try {
      const res = await solicitudesService.getById(id);
      setSolicitud(res.data);
    } catch {
      notifyError('Error al cargar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSolicitud(); }, [id]);

  useEffect(() => {
    if (comentariosRef.current) {
      comentariosRef.current.scrollTop = comentariosRef.current.scrollHeight;
    }
  }, [solicitud?.comentarios]);

  const handleCambiarEstado = async () => {
    if (!cambioEstado) return;
    if (cambioEstado === 'rechazada' && motivoRechazo.trim().length < 5) {
      notifyError('El motivo de rechazo debe tener al menos 5 caracteres'); return;
    }
    setAccionando(true);
    try {
      await solicitudesService.cambiarEstado(id, cambioEstado, motivoRechazo || undefined);
      success(`Solicitud marcada como ${cambioEstado}`);
      setCambioEstado(''); setMotivoRechazo('');
      fetchSolicitud();
    } catch (err) {
      notifyError(err.message || 'Error al cambiar estado');
    } finally { setAccionando(false); }
  };

  const handleVincular = async () => {
    if (!operacionIdVincular) return;
    setAccionando(true);
    try {
      await solicitudesService.vincular(id, Number(operacionIdVincular));
      success('Operación vinculada correctamente');
      setOperacionIdVincular('');
      fetchSolicitud();
    } catch (err) {
      notifyError(err.message || 'Error al vincular operación');
    } finally { setAccionando(false); }
  };

  const handleEnviarComentario = async () => {
    if (!comentario.trim()) return;
    setEnviandoComentario(true);
    try {
      await solicitudesService.agregarComentario(id, comentario.trim(), esInterno);
      setComentario(''); setEsInterno(false); setArchivoComentario(null);
      fetchSolicitud();
    } catch (err) {
      notifyError(err.message || 'Error al enviar comentario');
    } finally { setEnviandoComentario(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-64 text-slate-400">Cargando...</div>;
  if (!solicitud) return <div className="p-6 text-slate-500">Solicitud no encontrada</div>;

  const estadoConf = ESTADO_CONFIG[solicitud.estado] || ESTADO_CONFIG.recibida;
  const esFinal = ['completada', 'rechazada'].includes(solicitud.estado);
  const puedeGestionar = isSupervisorOrAbove();

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      {/* Header */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold font-mono text-slate-800 dark:text-slate-100">{solicitud.numero_solicitud}</h1>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${estadoConf.color}`}>{estadoConf.label}</span>
              {solicitud.prioridad === 'urgente' && (
                <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Urgente</span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {solicitud.tipo === 'ingreso' ? 'Aviso de Ingreso' : 'Solicitud de Despacho'} · {solicitud.cliente?.razon_social}
            </p>
          </div>
          {solicitud.operacion && (
            <button onClick={() => navigate(`/operaciones/${solicitud.tipo === 'ingreso' ? 'entradas' : 'salidas'}/${solicitud.operacion_id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors">
              <ExternalLink className="w-4 h-4" /> {solicitud.operacion.numero_operacion}
            </button>
          )}
        </div>

        {/* Datos generales */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          {[
            { label: 'Fecha estimada', value: solicitud.fecha_estimada || '—' },
            { label: 'N° Documento', value: solicitud.numero_documento || '—' },
            solicitud.tipo === 'ingreso'
              ? { label: 'Transportista', value: solicitud.transportista || '—' }
              : { label: 'Dirección entrega', value: solicitud.direccion_entrega || '—' },
            solicitud.tipo === 'despacho'
              ? { label: 'Contacto destino', value: solicitud.contacto_destino || '—' }
              : { label: 'Creado por', value: solicitud.creador ? `${solicitud.creador.nombre} ${solicitud.creador.apellido}` : '—' },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{item.label}</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{item.value}</p>
            </div>
          ))}
        </div>

        {solicitud.notas && (
          <div className="mt-4 p-3 bg-slate-50 dark:bg-centhrix-surface rounded-xl text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium">Notas: </span>{solicitud.notas}
          </div>
        )}

        {solicitud.documento_url && (
          <div className="mt-3">
            <a href={solicitud.documento_url} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700">
              <Paperclip className="w-4 h-4" /> Ver documento adjunto
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: detalles + acciones ISTHO */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tabla de líneas */}
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Productos solicitados</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-slate-700">
                  {['Referencia', 'Descripción', 'Cantidad', 'Unidad'].map((h) => (
                    <th key={h} className="pb-2 text-left text-xs font-semibold text-slate-400 dark:text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                {(solicitud.detalles || []).map((d) => (
                  <tr key={d.id}>
                    <td className="py-2.5 pr-4 text-sm font-mono text-slate-700 dark:text-slate-200">{d.referencia}</td>
                    <td className="py-2.5 pr-4 text-sm text-slate-600 dark:text-slate-300">{d.descripcion || '—'}</td>
                    <td className="py-2.5 pr-4 text-sm text-slate-700 dark:text-slate-200">{Number(d.cantidad).toLocaleString('es-CO')}</td>
                    <td className="py-2.5 text-sm text-slate-500 dark:text-slate-400 capitalize">{d.unidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Acciones ISTHO */}
          {puedeGestionar && !esFinal && (
            <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 space-y-4">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Acciones ISTHO</h3>

              {/* Cambiar estado */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">Cambiar estado</label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FilterDropdown
                      options={[
                        { value: '', label: 'Seleccionar estado...' },
                        { value: 'en_proceso', label: 'En Proceso' },
                        { value: 'completada', label: 'Completada' },
                        { value: 'rechazada', label: 'Rechazada' },
                      ]}
                      value={cambioEstado}
                      onChange={setCambioEstado}
                    />
                  </div>
                  <button onClick={handleCambiarEstado} disabled={!cambioEstado || accionando}
                    className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors">
                    Aplicar
                  </button>
                </div>
                {cambioEstado === 'rechazada' && (
                  <textarea value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)}
                    placeholder="Motivo del rechazo (requerido)..." rows={2}
                    className="mt-2 w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200 resize-none" />
                )}
              </div>

              {/* Vincular operación */}
              <div>
                <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                  <Link2 className="inline w-3.5 h-3.5 mr-1" />
                  Vincular a operación existente
                </label>
                <div className="flex gap-2">
                  <input value={operacionIdVincular} onChange={(e) => setOperacionIdVincular(e.target.value)}
                    placeholder="ID de la operación..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200" />
                  <button onClick={handleVincular} disabled={!operacionIdVincular || accionando}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 transition-colors">
                    Vincular
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Columna derecha: comentarios */}
        <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col" style={{ maxHeight: '600px' }}>
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Comentarios</h3>
          </div>

          {/* Lista de comentarios */}
          <div ref={comentariosRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {(solicitud.comentarios || []).length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center mt-4">Sin comentarios aún</p>
            ) : (
              (solicitud.comentarios || []).map((c) => {
                const esMio = c.usuario_id === user?.id;
                return (
                  <div key={c.id} className={`flex gap-2 ${esMio ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600 shrink-0">
                      {(c.autor?.nombre || '?')[0].toUpperCase()}
                    </div>
                    <div className={`flex-1 ${esMio ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`px-3 py-2 rounded-xl text-sm max-w-[85%] ${
                        esMio
                          ? 'bg-orange-500 text-white'
                          : c.es_interno
                          ? 'bg-slate-100 dark:bg-centhrix-surface text-slate-600 dark:text-slate-300 border border-dashed border-slate-300 dark:border-slate-600'
                          : 'bg-slate-100 dark:bg-centhrix-surface text-slate-700 dark:text-slate-200'
                      }`}>
                        {c.es_interno && <div className="flex items-center gap-1 text-xs opacity-60 mb-1"><Lock className="w-3 h-3" /> Solo ISTHO</div>}
                        {c.mensaje}
                      </div>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 px-1">
                        {c.autor?.nombre} · {new Date(c.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Input comentario */}
          <div className="p-3 border-t border-gray-100 dark:border-slate-700">
            {!isCliente() && (
              <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2 cursor-pointer">
                <input type="checkbox" checked={esInterno} onChange={(e) => setEsInterno(e.target.checked)} className="rounded" />
                <Lock className="w-3 h-3" /> Comentario interno (solo ISTHO)
              </label>
            )}
            <div className="flex gap-2">
              <textarea value={comentario} onChange={(e) => setComentario(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviarComentario(); } }}
                placeholder="Escribe un comentario..." rows={2}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200 resize-none" />
              <button onClick={handleEnviarComentario} disabled={!comentario.trim() || enviandoComentario}
                className="px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SolicitudDetail;
```

- [ ] **Step 2: Verificar en el navegador**

Crear una solicitud desde el portal cliente y navegar a su detalle. Verificar:
- Header con estado, prioridad y tipo
- Tabla de líneas de productos
- Hilo de comentarios con envío por Enter
- Con usuario admin/supervisor: se ven las acciones (cambiar estado, vincular)

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Solicitudes/SolicitudDetail.jsx
git commit -m "feat: SolicitudDetail — detalle con comentarios y acciones ISTHO"
```

---

## Task 9: Frontend — ClienteDetail: responsables + tab solicitudes

**Files:**
- Modify: `frontend/src/pages/Clientes/ClienteDetail.jsx`

- [ ] **Step 1: Leer la estructura actual de `ClienteDetail.jsx`**

Identificar:
1. Dónde se definen los tabs actuales (buscar el array de tabs o los botones de tab)
2. El import de servicios y hooks
3. Dónde se renderizan las secciones por tab activo

- [ ] **Step 2: Agregar imports y estado necesario en `ClienteDetail.jsx`**

Al inicio del archivo, agregar:

```jsx
import solicitudesService from '../../api/solicitudes.service';
// clientesService ya está importado; solo agregar si no existe adminService para usuarios internos:
import adminService from '../../api/admin.service';
```

Dentro del componente, agregar estados nuevos:

```jsx
const [solicitudes, setSolicitudes] = useState([]);
const [solicitudesLoading, setSolicitudesLoading] = useState(false);
const [solicitudesPag, setSolicitudesPag] = useState({ total: 0, page: 1, totalPages: 1 });
const [responsables, setResponsables] = useState([]);
const [responsablesLoading, setResponsablesLoading] = useState(false);
const [usuariosInternos, setUsuariosInternos] = useState([]);
const [nuevoResponsableId, setNuevoResponsableId] = useState('');
const [agregandoResponsable, setAgregandoResponsable] = useState(false);
```

- [ ] **Step 3: Agregar funciones de carga en `ClienteDetail.jsx`**

```jsx
const fetchSolicitudesCliente = async () => {
  if (!id) return;
  setSolicitudesLoading(true);
  try {
    const res = await solicitudesService.getPorCliente(id, { limit: 20, page: solicitudesPag.page });
    setSolicitudes(res.data || []);
    if (res.pagination) setSolicitudesPag(res.pagination);
  } catch {
    // silencioso
  } finally {
    setSolicitudesLoading(false);
  }
};

const fetchResponsables = async () => {
  if (!id) return;
  setResponsablesLoading(true);
  try {
    const res = await clientesService.getResponsables(id); // ver Step 4
    setResponsables(res.data || []);
  } catch {
    // silencioso
  } finally {
    setResponsablesLoading(false);
  }
};

const fetchUsuariosInternos = async () => {
  try {
    const res = await adminService.getUsuarios({ limit: 200 });
    const usuarios = Array.isArray(res.data) ? res.data : res.data?.rows || res.data?.usuarios || [];
    setUsuariosInternos(usuarios.filter((u) => ['admin', 'supervisor', 'operador'].includes(u.rol)));
  } catch {
    // silencioso
  }
};
```

Llamar `fetchResponsables` y `fetchUsuariosInternos` cuando el tab activo cambie a `'solicitudes'`, y `fetchSolicitudesCliente` cuando el tab sea `'solicitudes'`. Ajustar según la lógica de tabs existente en el archivo.

- [ ] **Step 4: Agregar `getResponsables` en `clientesService`**

En `frontend/src/api/clientes.service.js`, agregar dentro del objeto `clientesService`:

```js
getResponsables: (clienteId) => apiClient.get(`/clientes/${clienteId}/responsables`),
addResponsable: (clienteId, usuario_id) => apiClient.post(`/clientes/${clienteId}/responsables`, { usuario_id }),
removeResponsable: (clienteId, usuarioId) => apiClient.delete(`/clientes/${clienteId}/responsables/${usuarioId}`),
```

- [ ] **Step 5: Agregar el tab "Solicitudes" en la lista de tabs de `ClienteDetail.jsx`**

Busca donde se definen los tabs (un array o botones como "Información", "Operaciones", "Contactos", etc.) y agrega:

```jsx
// Si los tabs son un array:
{ key: 'solicitudes', label: 'Solicitudes', icon: ClipboardCheck }  // importar ClipboardCheck de lucide-react

// Si son botones directos:
<button onClick={() => setTabActivo('solicitudes')} className={tabClase('solicitudes')}>
  <ClipboardCheck className="w-4 h-4" />
  Solicitudes
</button>
```

- [ ] **Step 6: Agregar el contenido del tab "Solicitudes" en `ClienteDetail.jsx`**

En la sección donde se renderiza el contenido de cada tab (busca el bloque `{tabActivo === 'operaciones' && ...}` o similar), agregar:

```jsx
{tabActivo === 'solicitudes' && (
  <div className="space-y-6">
    {/* Tabla de solicitudes del cliente */}
    <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Solicitudes del Cliente</h3>
        <button onClick={fetchSolicitudesCliente} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-1">
          <RefreshCw className="w-3 h-3" /> Actualizar
        </button>
      </div>
      {solicitudesLoading ? (
        <div className="py-8 text-center text-slate-400 text-sm">Cargando...</div>
      ) : solicitudes.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-sm">Sin solicitudes</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-slate-700">
              {['N° Solicitud', 'Tipo', 'Fecha', 'Estado'].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {solicitudes.map((s) => {
              const ESTADO_COLOR = {
                recibida: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                en_proceso: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
                completada: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                rechazada: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
              };
              return (
                <tr key={s.id} onClick={() => navigate(`/solicitudes/${s.id}`)}
                  className="hover:bg-slate-50 dark:hover:bg-centhrix-surface cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 text-sm font-mono text-slate-700 dark:text-slate-200">{s.numero_solicitud}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600 dark:text-slate-300 capitalize">{s.tipo === 'ingreso' ? 'Ingreso' : 'Despacho'}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-500 dark:text-slate-400">{s.fecha_estimada || new Date(s.created_at).toLocaleDateString('es-CO')}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ESTADO_COLOR[s.estado] || ''}`}>
                      {s.estado}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>

    {/* Sección responsables — solo admin */}
    {isAdmin() && (
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">Equipo ISTHO Asignado</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
          Estos usuarios reciben las notificaciones y emails cuando este cliente envía una solicitud.
        </p>

        {/* Lista de responsables */}
        <div className="space-y-2 mb-4">
          {responsables.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Sin responsables asignados. Las solicitudes se notificarán a todos los administradores.</p>
          ) : (
            responsables.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-centhrix-surface rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-xs font-bold text-orange-600">
                    {(r.nombre || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{r.nombre} {r.apellido}</p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 capitalize">{r.rol} · {r.email}</p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await clientesService.removeResponsable(id, r.usuario_id);
                      fetchResponsables();
                    } catch { notifyError('Error al remover responsable'); }
                  }}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Quitar
                </button>
              </div>
            ))
          )}
        </div>

        {/* Agregar responsable */}
        <div className="flex gap-2">
          <div className="flex-1">
            <FilterDropdown
              options={[
                { value: '', label: 'Seleccionar usuario...' },
                ...usuariosInternos
                  .filter((u) => !responsables.find((r) => r.usuario_id === u.id))
                  .map((u) => ({ value: String(u.id), label: `${u.nombre} ${u.apellido} (${u.rol})` })),
              ]}
              value={nuevoResponsableId}
              onChange={setNuevoResponsableId}
            />
          </div>
          <button
            disabled={!nuevoResponsableId || agregandoResponsable}
            onClick={async () => {
              setAgregandoResponsable(true);
              try {
                await clientesService.addResponsable(id, Number(nuevoResponsableId));
                setNuevoResponsableId('');
                fetchResponsables();
                success('Responsable asignado correctamente');
              } catch (err) {
                notifyError(err.message || 'Error al asignar responsable');
              } finally { setAgregandoResponsable(false); }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors"
          >
            {agregandoResponsable ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    )}
  </div>
)}
```

Asegúrate de importar `navigate` de `useNavigate` si no está ya, e importar `useNotification`, `isAdmin`, y `ClipboardCheck`.

- [ ] **Step 7: Verificar en el navegador**

Como admin, ir a la ficha de un cliente → tab "Solicitudes". Verificar:
- La lista de solicitudes del cliente se carga
- La sección "Equipo ISTHO Asignado" aparece para admin
- Se puede asignar y quitar responsables

- [ ] **Step 8: Commit**

```bash
git add frontend/src/pages/Clientes/ClienteDetail.jsx
git add frontend/src/api/clientes.service.js
git commit -m "feat: tab Solicitudes y sección Responsables en ClienteDetail"
```

---

## Task 10: Reporte de Solicitudes

**Files:**
- Modify: `server/src/controllers/reporteController.js`
- Modify: `server/src/routes/reporte.routes.js`
- Create: `frontend/src/pages/Reportes/ReporteSolicitudes.jsx`
- Modify: `frontend/src/pages/Reportes/ReportesList.jsx`

- [ ] **Step 1: Agregar función `reporteSolicitudes` en `reporteController.js`**

Al final del archivo, antes del `module.exports`, agregar:

```js
const reporteSolicitudes = async (req, res) => {
  try {
    const { desde, hasta, cliente_id, tipo, estado, responsable_id } = req.query;
    const esCliente = req.user?.rol === 'cliente';

    const where = {};
    if (esCliente) where.cliente_id = req.user.cliente_id;
    else if (cliente_id) where.cliente_id = cliente_id;
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (desde || hasta) {
      where.created_at = {};
      if (desde) where.created_at[Op.gte] = new Date(desde + 'T00:00:00');
      if (hasta) where.created_at[Op.lte] = new Date(hasta + 'T23:59:59');
    }

    const { Solicitud, SolicitudDetalle, Cliente, Usuario, ClienteResponsable } = require('../models');

    // Solicitudes base
    let solicitudesQuery = {
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre', 'apellido'] },
      ],
      order: [['created_at', 'DESC']],
    };

    // Si se filtra por responsable, hacer JOIN con cliente_responsables
    if (responsable_id) {
      const clientesDelResponsable = await ClienteResponsable.findAll({
        where: { usuario_id: responsable_id }, attributes: ['cliente_id'],
      });
      const clienteIds = clientesDelResponsable.map((c) => c.cliente_id);
      if (clienteIds.length === 0) {
        return success(res, { kpis: { total: 0, tasa_cumplimiento: 0, tiempo_promedio_dias: 0, rechazadas: 0 }, por_mes: [], por_tipo: [], tabla: [] });
      }
      where.cliente_id = { [Op.in]: clienteIds };
    }

    const solicitudes = await Solicitud.findAll(solicitudesQuery);

    // KPIs
    const total = solicitudes.length;
    const completadas = solicitudes.filter((s) => s.estado === 'completada').length;
    const rechazadas = solicitudes.filter((s) => s.estado === 'rechazada').length;
    const tasa_cumplimiento = total > 0 ? Math.round((completadas / total) * 100) : 0;

    const tiemposDias = solicitudes
      .filter((s) => s.operacion_id && s.updated_at && s.created_at)
      .map((s) => (new Date(s.updated_at) - new Date(s.created_at)) / (1000 * 60 * 60 * 24));
    const tiempo_promedio_dias = tiemposDias.length > 0
      ? Math.round((tiemposDias.reduce((a, b) => a + b, 0) / tiemposDias.length) * 10) / 10
      : 0;

    // Por mes (últimos 6 meses)
    const porMesMap = {};
    solicitudes.forEach((s) => {
      const key = new Date(s.created_at).toISOString().slice(0, 7);
      if (!porMesMap[key]) porMesMap[key] = { mes: key, ingreso: 0, despacho: 0, total: 0 };
      porMesMap[key][s.tipo]++;
      porMesMap[key].total++;
    });
    const por_mes = Object.values(porMesMap).sort((a, b) => a.mes.localeCompare(b.mes)).slice(-6);

    // Por tipo
    const ingresosCount = solicitudes.filter((s) => s.tipo === 'ingreso').length;
    const despachosCount = solicitudes.filter((s) => s.tipo === 'despacho').length;
    const por_tipo = [
      { tipo: 'Ingresos', cantidad: ingresosCount },
      { tipo: 'Despachos', cantidad: despachosCount },
    ];

    // Tabla detalle
    const tabla = solicitudes.map((s) => ({
      id: s.id,
      numero_solicitud: s.numero_solicitud,
      cliente: s.cliente?.razon_social || '',
      tipo: s.tipo,
      fecha_envio: s.created_at,
      estado: s.estado,
      operacion_id: s.operacion_id,
      tiempo_respuesta_dias: s.operacion_id
        ? Math.round(((new Date(s.updated_at) - new Date(s.created_at)) / (1000 * 60 * 60 * 24)) * 10) / 10
        : null,
    }));

    return success(res, {
      kpis: { total, tasa_cumplimiento, tiempo_promedio_dias, rechazadas },
      por_mes,
      por_tipo,
      tabla,
    });
  } catch (err) {
    return serverError(res, 'Error al generar reporte de solicitudes', err);
  }
};
```

Agregar `reporteSolicitudes` al `module.exports` del controlador. Asegurarse de que `Op` esté importado (`const { Op } = require('sequelize');`).

- [ ] **Step 2: Agregar ruta en `reporte.routes.js`**

Busca dónde se definen las rutas GET del reporte y agrega:

```js
router.get('/solicitudes', reporteController.reporteSolicitudes);
```

- [ ] **Step 3: Crear `ReporteSolicitudes.jsx`**

```jsx
// frontend/src/pages/Reportes/ReporteSolicitudes.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, ClipboardCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';
import apiClient from '../../api/client';
import { FilterDropdown, DatePicker } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import useNotification from '../../hooks/useNotification';

const ESTADO_LABEL = { recibida: 'Recibida', en_proceso: 'En Proceso', completada: 'Completada', rechazada: 'Rechazada' };

const ReporteSolicitudes = () => {
  const navigate = useNavigate();
  const { isCliente } = useAuth();
  const { error } = useNotification();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', tipo: '', estado: '' });

  const fetchReporte = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
      const res = await apiClient.get('/reportes/solicitudes', { params });
      setData(res.data);
    } catch {
      error('Error al cargar el reporte');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReporte(); }, []);

  const kpis = data?.kpis;
  const tabla = data?.tabla || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/reportes')} className="p-2 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <ClipboardCheck className="w-5 h-5 text-orange-600 dark:text-orange-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-slate-100">Reporte de Solicitudes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Tiempos de respuesta, cumplimiento y volumen</p>
        </div>
        <button onClick={fetchReporte} className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl transition-colors">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Desde</label>
            <DatePicker value={filtros.desde} onChange={(v) => setFiltros((p) => ({ ...p, desde: v }))} />
          </div>
          <div className="w-40">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Hasta</label>
            <DatePicker value={filtros.hasta} onChange={(v) => setFiltros((p) => ({ ...p, hasta: v }))} />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Tipo</label>
            <FilterDropdown compact
              options={[{ value: '', label: 'Todos' }, { value: 'ingreso', label: 'Ingresos' }, { value: 'despacho', label: 'Despachos' }]}
              value={filtros.tipo} onChange={(v) => setFiltros((p) => ({ ...p, tipo: v }))} />
          </div>
          <div className="w-36">
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Estado</label>
            <FilterDropdown compact
              options={[{ value: '', label: 'Todos' }, ...Object.entries(ESTADO_LABEL).map(([v, l]) => ({ value: v, label: l }))]}
              value={filtros.estado} onChange={(v) => setFiltros((p) => ({ ...p, estado: v }))} />
          </div>
          <button onClick={fetchReporte}
            className="px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors">
            Aplicar
          </button>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Solicitudes', value: kpis.total, icon: ClipboardCheck, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
            { label: 'Tasa Cumplimiento', value: `${kpis.tasa_cumplimiento}%`, icon: CheckCircle2, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
            { label: 'Tiempo Promedio', value: `${kpis.tiempo_promedio_dias}d`, icon: Clock, color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30' },
            { label: 'Rechazadas', value: kpis.rechazadas, icon: XCircle, color: 'text-red-600 bg-red-100 dark:bg-red-900/30' },
          ].map((k) => (
            <div key={k.label} className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${k.color}`}>
                <k.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{k.label}</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{k.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de detalle */}
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Detalle de Solicitudes</h3>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-400">Cargando...</div>
        ) : tabla.length === 0 ? (
          <div className="py-12 text-center text-slate-400">Sin datos para el período seleccionado</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-700">
                {['N° Solicitud', 'Cliente', 'Tipo', 'Fecha envío', 'Estado', 'T. Respuesta (días)', 'Operación'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {tabla.map((row) => (
                <tr key={row.id} onClick={() => navigate(`/solicitudes/${row.id}`)}
                  className="hover:bg-slate-50 dark:hover:bg-centhrix-surface cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-sm font-mono text-slate-700 dark:text-slate-200">{row.numero_solicitud}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{row.cliente}</td>
                  <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 capitalize">{row.tipo === 'ingreso' ? 'Ingreso' : 'Despacho'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{new Date(row.fecha_envio).toLocaleDateString('es-CO')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      row.estado === 'completada' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      row.estado === 'rechazada' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      row.estado === 'en_proceso' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>{ESTADO_LABEL[row.estado] || row.estado}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-200">{row.tiempo_respuesta_dias != null ? `${row.tiempo_respuesta_dias}d` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">{row.operacion_id ? `#${row.operacion_id}` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ReporteSolicitudes;
```

- [ ] **Step 4: Agregar card en `ReportesList.jsx`**

Busca el array de cards de reportes en `ReportesList.jsx` y agrega:

```jsx
{
  titulo: 'Reporte de Solicitudes',
  descripcion: 'Tiempos de respuesta, cumplimiento y volumen por cliente',
  icono: ClipboardCheck,  // importar de lucide-react si no está
  href: '/reportes/solicitudes',
  permiso: { module: 'reportes', action: 'ver' },
  color: 'orange',
}
```

- [ ] **Step 5: Verificar el reporte en el navegador**

Navegar a `/reportes/solicitudes`. Verificar que:
- Los 4 KPIs se muestran correctamente
- La tabla de detalle muestra las solicitudes creadas en los pasos anteriores
- Los filtros funcionan

- [ ] **Step 6: Commit final**

```bash
git add server/src/controllers/reporteController.js server/src/routes/reporte.routes.js
git add frontend/src/pages/Reportes/ReporteSolicitudes.jsx
git add frontend/src/pages/Reportes/ReportesList.jsx
git commit -m "feat: reporte de solicitudes con KPIs, tabla de detalle y filtros"
```

---

## Verificación final

Después de completar todas las tareas, verificar el flujo completo:

1. **Como cliente:** Ir a `/solicitudes` → crear una solicitud de ingreso con 3 productos → verificar que aparece el número `SOL-2026-XXXX`
2. **Verificar email:** El equipo responsable (o admin si no hay responsables) recibe un email con botón "Ver Solicitud"
3. **Verificar notificación:** Los responsables ven la notificación en el CRM con enlace directo
4. **Como admin:** Ir a la ficha del cliente → tab "Solicitudes" → ver la solicitud creada
5. **Cambiar estado:** En `/solicitudes/:id` (como admin/supervisor) → cambiar estado a "En Proceso"
6. **Vincular operación:** Ingresar el ID de una operación existente del mismo cliente → verificar que queda vinculada
7. **Agregar responsable:** En la ficha del cliente → tab "Solicitudes" → sección "Equipo ISTHO" → asignar un supervisor
8. **Nueva solicitud con responsable:** Crear otra solicitud → verificar que el email va solo al supervisor asignado
9. **Reporte:** Ir a `/reportes/solicitudes` → verificar KPIs y tabla
