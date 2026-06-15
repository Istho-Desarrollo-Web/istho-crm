# Directorio de Contactos M:N — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactorizar el sistema de contactos de 1:N a M:N y crear el módulo `/contactos` para que el admin gestione un directorio global de contactos (ISTHO/externos) asignables a múltiples clientes.

**Architecture:** Se migra la tabla `contactos` (elimina `cliente_id`/`es_principal`, agrega `tipo`/`usuario_id`) y se crea la pivot `contacto_clientes` con `es_principal` por-asignación con hook afterSave. El backend expone nuevas rutas `/contactos` (CRUD directorio, solo admin) y actualiza `/clientes/:id/contactos` (asignar/desasignar). El frontend agrega `ContactosList` con drawer de detalle y actualiza el tab Contactos en `ClienteDetail`.

**Tech Stack:** Express · Sequelize 6 · MySQL 8 · Umzug (migraciones) · React 19 · Tailwind 4 · React Hook Form · lucide-react · express-validator

---

## Mapa de Archivos

### Crear
- `server/src/migrations/20260615000001-refactor-contactos-mn.js`
- `server/src/models/ContactoCliente.js`
- `server/src/validators/contactoValidator.js`
- `server/src/controllers/contactoController.js`
- `server/src/routes/contacto.routes.js`
- `frontend/src/api/contactos.service.js`
- `frontend/src/pages/Contactos/ContactosList.jsx`
- `frontend/src/pages/Contactos/components/ContactoForm.jsx`
- `frontend/src/pages/Contactos/components/ContactoDrawer.jsx`

### Modificar
- `server/src/models/Contacto.js` — eliminar `cliente_id`/`es_principal`, agregar `tipo`/`usuario_id`, actualizar hook e índices
- `server/src/models/index.js` — importar `ContactoCliente`, cambiar asociaciones 1:N → M:N
- `server/src/routes/index.js` — registrar `contacto.routes.js`
- `server/src/controllers/clienteController.js` — actualizar `listarContactos` (pivot), agregar `asignarContactoDesdeCliente`/`desasignarContactoDesdeCliente`, eliminar `crearContacto`/`actualizarContacto`/`eliminarContacto`
- `server/src/routes/cliente.routes.js` — reemplazar rutas contacto inline por asignar/desasignar
- `server/src/scripts/seedRolesPermisos.js` — agregar módulo `contactos`
- `frontend/src/api/endpoints.js` — agregar `CONTACTOS_ENDPOINTS`
- `frontend/src/context/AuthContext.jsx` — agregar `contactos` en `PERMISOS_POR_ROL.admin`
- `frontend/src/pages/Clientes/ClienteDetail.jsx` — reemplazar tab Contactos con vista de asignación
- `frontend/src/components/layout/FloatingHeader.jsx` — agregar entrada menú Directorio
- `frontend/src/App.jsx` — agregar lazy import y ruta `/contactos`

---

## Tarea 1: Migración DB — pivot contacto_clientes + refactor tabla contactos

**Files:**
- Create: `server/src/migrations/20260615000001-refactor-contactos-mn.js`

- [ ] **Paso 1: Crear archivo de migración**

```bash
cd server && npm run migration:create -- 20260615000001-refactor-contactos-mn
```

Luego reemplazar el contenido generado con:

```js
// server/src/migrations/20260615000001-refactor-contactos-mn.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Crear tabla pivot contacto_clientes
    await queryInterface.createTable('contacto_clientes', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      contacto_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'contactos', key: 'id' },
        onDelete: 'CASCADE',
      },
      cliente_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'clientes', key: 'id' },
        onDelete: 'CASCADE',
      },
      es_principal: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    // Unique constraint en (contacto_id, cliente_id)
    await queryInterface.addIndex('contacto_clientes', ['contacto_id', 'cliente_id'], {
      unique: true,
      name: 'uq_contacto_cliente',
    });
    await queryInterface.addIndex('contacto_clientes', ['cliente_id'], {
      name: 'idx_contacto_clientes_cliente_id',
    });

    // 2. Migrar relaciones existentes a la pivot
    await queryInterface.sequelize.query(`
      INSERT INTO contacto_clientes (contacto_id, cliente_id, es_principal, created_at, updated_at)
      SELECT id, cliente_id, es_principal, NOW(), NOW()
      FROM contactos
      WHERE cliente_id IS NOT NULL
    `);

    // 3. Agregar columnas nuevas a contactos
    await queryInterface.addColumn('contactos', 'tipo', {
      type: Sequelize.ENUM('istho', 'externo'),
      allowNull: false,
      defaultValue: 'externo',
      after: 'id',
    });
    await queryInterface.addColumn('contactos', 'usuario_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' },
      onDelete: 'SET NULL',
      after: 'tipo',
    });
    await queryInterface.addIndex('contactos', ['usuario_id'], {
      unique: true,
      name: 'uq_contacto_usuario_id',
    });

    // 4. Eliminar columnas viejas de contactos
    // Obtener nombre de FK de cliente_id dinámicamente
    const [fkRows] = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contactos'
        AND COLUMN_NAME = 'cliente_id'
        AND REFERENCED_TABLE_NAME IS NOT NULL
      LIMIT 1
    `);
    if (fkRows.length > 0) {
      await queryInterface.sequelize.query(
        `ALTER TABLE contactos DROP FOREIGN KEY ${fkRows[0].CONSTRAINT_NAME}`
      );
    }
    await queryInterface.removeColumn('contactos', 'cliente_id');
    await queryInterface.removeColumn('contactos', 'es_principal');
  },

  async down(queryInterface, Sequelize) {
    // Revertir en orden inverso (best-effort, no recupera datos migrados)
    // 1. Restaurar columnas en contactos
    await queryInterface.addColumn('contactos', 'cliente_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'clientes', key: 'id' },
    });
    await queryInterface.addColumn('contactos', 'es_principal', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });

    // 2. Restaurar datos desde pivot (primera asignación por contacto)
    await queryInterface.sequelize.query(`
      UPDATE contactos c
      JOIN (
        SELECT contacto_id, MIN(cliente_id) AS cliente_id, MAX(es_principal) AS es_principal
        FROM contacto_clientes
        GROUP BY contacto_id
      ) cc ON c.id = cc.contacto_id
      SET c.cliente_id = cc.cliente_id, c.es_principal = cc.es_principal
    `);

    // 3. Eliminar columnas nuevas
    await queryInterface.removeIndex('contactos', 'uq_contacto_usuario_id');
    await queryInterface.removeColumn('contactos', 'usuario_id');
    await queryInterface.removeColumn('contactos', 'tipo');

    // 4. Eliminar tabla pivot
    await queryInterface.dropTable('contacto_clientes');
  },
};
```

- [ ] **Paso 2: Verificar que el archivo existe correctamente**

```bash
ls server/src/migrations/ | grep refactor-contactos
```

Esperado: `20260615000001-refactor-contactos-mn.js`

- [ ] **Paso 3: Iniciar servidor para que Umzug corra la migración automáticamente**

```bash
cd server && npm run dev
```

Verificar en consola que aparezca algo como:
```
[Umzug] Ejecutando migración: 20260615000001-refactor-contactos-mn.js
```

Si Umzug no la aplica (puede pasar si el timestamp ya existe en SequelizeMeta):

```bash
cd server && npm run migration:status
```

Si aparece como pendiente pero no corre, ejecutar:
```bash
cd server && npm run migration:up
```

- [ ] **Paso 4: Verificar estructura en BD**

```bash
cd server && node -e "
const { sequelize } = require('./src/config/database');
(async () => {
  const [cols] = await sequelize.query('DESCRIBE contactos');
  console.log('contactos:', cols.map(c => c.Field));
  const [cols2] = await sequelize.query('DESCRIBE contacto_clientes');
  console.log('contacto_clientes:', cols2.map(c => c.Field));
  process.exit(0);
})();
"
```

Esperado:
- `contactos` NO tiene `cliente_id` ni `es_principal`, SÍ tiene `tipo` y `usuario_id`
- `contacto_clientes` tiene `id`, `contacto_id`, `cliente_id`, `es_principal`, `created_at`, `updated_at`

- [ ] **Paso 5: Commit**

```bash
git add server/src/migrations/20260615000001-refactor-contactos-mn.js
git commit -m "feat: migración refactor contactos 1:N → M:N (pivot contacto_clientes)"
```

---

## Tarea 2: Modelo ContactoCliente + actualizar Contacto.js

**Files:**
- Create: `server/src/models/ContactoCliente.js`
- Modify: `server/src/models/Contacto.js`

- [ ] **Paso 1: Crear ContactoCliente.js**

```js
// server/src/models/ContactoCliente.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ContactoCliente extends Model {}

  ContactoCliente.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      contacto_id: { type: DataTypes.INTEGER, allowNull: false },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false },
      es_principal: { type: DataTypes.BOOLEAN, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'ContactoCliente',
      tableName: 'contacto_clientes',
      underscored: true,
      indexes: [
        { unique: true, fields: ['contacto_id', 'cliente_id'] },
        { fields: ['cliente_id'] },
      ],
      hooks: {
        afterSave: async (pivot, options) => {
          if (pivot.es_principal) {
            await ContactoCliente.update(
              { es_principal: false },
              {
                where: {
                  cliente_id: pivot.cliente_id,
                  id: { [sequelize.Sequelize.Op.ne]: pivot.id },
                },
                transaction: options.transaction,
                hooks: false,
              }
            );
          }
        },
      },
    }
  );

  return ContactoCliente;
};
```

- [ ] **Paso 2: Reemplazar Contacto.js completo**

```js
// server/src/models/Contacto.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contacto = sequelize.define(
    'Contacto',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      tipo: {
        type: DataTypes.ENUM('istho', 'externo'),
        allowNull: false,
        defaultValue: 'externo',
      },

      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },

      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'El nombre es requerido' },
          len: { args: [2, 150], msg: 'El nombre debe tener entre 2 y 150 caracteres' },
        },
      },

      cargo: { type: DataTypes.STRING(100), allowNull: true },
      telefono: { type: DataTypes.STRING(50), allowNull: true },
      celular: { type: DataTypes.STRING(50), allowNull: true },

      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
        validate: { isEmail: { msg: 'Debe ser un email válido' } },
      },

      recibe_notificaciones: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      tipos_notificacion: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: ['todas'],
      },

      notas: { type: DataTypes.TEXT, allowNull: true },
      activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'contactos',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['email'] },
        { fields: ['tipo'] },
        { fields: ['activo'] },
        { fields: ['usuario_id'] },
      ],
    }
  );

  Contacto.prototype.getNombreConCargo = function () {
    return this.cargo ? `${this.nombre} (${this.cargo})` : this.nombre;
  };

  return Contacto;
};
```

- [ ] **Paso 3: Verificar que el servidor inicia sin errores de modelo**

```bash
cd server && npm run dev
```

Esperar a ver: `Servidor escuchando en puerto 5000` (o similar). No debe haber errores de Sequelize sobre columnas inexistentes.

- [ ] **Paso 4: Commit**

```bash
git add server/src/models/ContactoCliente.js server/src/models/Contacto.js
git commit -m "feat: modelo ContactoCliente pivot + Contacto refactorizado (tipo, usuario_id)"
```

---

## Tarea 3: Actualizar index.js — asociaciones M:N

**Files:**
- Modify: `server/src/models/index.js`

- [ ] **Paso 1: Importar ContactoCliente después de los otros imports**

En `server/src/models/index.js`, después de la línea:
```js
const ClienteResponsableModel = require('./ClienteResponsable');
```

Agregar:
```js
const ContactoClienteModel = require('./ContactoCliente');
```

- [ ] **Paso 2: Inicializar el modelo después de los otros**

Después de la línea:
```js
const ClienteResponsable = ClienteResponsableModel(sequelize);
```

Agregar:
```js
const ContactoCliente = ContactoClienteModel(sequelize);
```

- [ ] **Paso 3: Reemplazar las asociaciones 1:N por M:N**

Buscar y ELIMINAR este bloque en index.js (líneas ~83-92):
```js
// Cliente <-> Contacto (1:N)
Cliente.hasMany(Contacto, {
  foreignKey: 'cliente_id',
  as: 'contactos',
  onDelete: 'CASCADE',
});
Contacto.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente',
});
```

En su lugar, agregar estas asociaciones M:N (justo donde estaba el bloque eliminado):
```js
// Cliente <-> Contacto (M:N via ContactoCliente)
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

// Contacto -> ContactoCliente (para acceso directo a la pivot)
Contacto.hasMany(ContactoCliente, {
  foreignKey: 'contacto_id',
  as: 'asignaciones',
});
ContactoCliente.belongsTo(Contacto, {
  foreignKey: 'contacto_id',
  as: 'contacto',
});
ContactoCliente.belongsTo(Cliente, {
  foreignKey: 'cliente_id',
  as: 'cliente',
});

// Contacto -> Usuario CRM (vínculo opcional)
Contacto.belongsTo(sequelize.models.Usuario || Usuario, {
  foreignKey: 'usuario_id',
  as: 'usuarioCrm',
  constraints: false,
});
```

- [ ] **Paso 4: Exportar ContactoCliente en module.exports**

Al final del archivo, en el objeto `module.exports`, agregar `ContactoCliente`:
```js
module.exports = {
  sequelize,
  // ... todos los modelos existentes ...
  ContactoCliente,
};
```

Nota: buscar el `module.exports = {` existente y agregar `ContactoCliente` a la lista.

- [ ] **Paso 5: Verificar servidor inicia sin errores**

```bash
cd server && npm run dev
```

No debe haber errores de asociación ni de FK. El server debe llegar a `Listening on port 5000`.

- [ ] **Paso 6: Commit**

```bash
git add server/src/models/index.js
git commit -m "feat: asociaciones M:N Contacto<->Cliente via ContactoCliente en index.js"
```

---

## Tarea 4: Validadores para directorio de contactos

**Files:**
- Create: `server/src/validators/contactoValidator.js`

- [ ] **Paso 1: Crear el archivo de validadores**

```js
// server/src/validators/contactoValidator.js
const { body, param, query, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

const validar = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const erroresFormateados = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
    return errorResponse(res, 'Error de validación', 400, erroresFormateados, 'VALIDATION_ERROR');
  }
  next();
};

const crearContactoDirectorioValidator = [
  body('nombre')
    .trim()
    .notEmpty().withMessage('El nombre es requerido')
    .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('tipo')
    .optional()
    .isIn(['istho', 'externo']).withMessage('tipo debe ser "istho" o "externo"'),

  body('usuario_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error('usuario_id debe ser un entero positivo');
      }
      return true;
    }),

  body('cargo')
    .optional().trim()
    .isLength({ max: 100 }).withMessage('El cargo no puede exceder 100 caracteres'),

  body('telefono')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),

  body('celular')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El celular no puede exceder 50 caracteres'),

  body('email')
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (!value || value === '') return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) throw new Error('Debe ser un email válido');
      return true;
    }),

  body('recibe_notificaciones')
    .optional().isBoolean().withMessage('recibe_notificaciones debe ser booleano'),

  body('tipos_notificacion')
    .optional()
    .isArray().withMessage('tipos_notificacion debe ser un array'),

  body('notas')
    .optional().trim()
    .isLength({ max: 1000 }).withMessage('Las notas no pueden exceder 1000 caracteres'),

  validar,
];

const actualizarContactoDirectorioValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),

  body('nombre')
    .optional().trim()
    .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

  body('tipo')
    .optional()
    .isIn(['istho', 'externo']).withMessage('tipo debe ser "istho" o "externo"'),

  body('usuario_id')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === null || value === '' || value === undefined) return true;
      if (!Number.isInteger(Number(value)) || Number(value) < 1) {
        throw new Error('usuario_id debe ser un entero positivo');
      }
      return true;
    }),

  body('cargo')
    .optional().trim()
    .isLength({ max: 100 }).withMessage('El cargo no puede exceder 100 caracteres'),

  body('telefono')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),

  body('celular')
    .optional().trim()
    .isLength({ max: 50 }).withMessage('El celular no puede exceder 50 caracteres'),

  body('email')
    .optional({ nullable: true })
    .trim()
    .custom((value) => {
      if (value === null || value === '') return true;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) throw new Error('Debe ser un email válido');
      return true;
    }),

  body('recibe_notificaciones')
    .optional().isBoolean().withMessage('recibe_notificaciones debe ser booleano'),

  body('tipos_notificacion')
    .optional()
    .isArray().withMessage('tipos_notificacion debe ser un array'),

  body('notas')
    .optional().trim()
    .isLength({ max: 1000 }).withMessage('Las notas no pueden exceder 1000 caracteres'),

  body('activo')
    .optional().isBoolean().withMessage('activo debe ser booleano'),

  validar,
];

const asignarClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),

  body('cliente_id')
    .notEmpty().withMessage('cliente_id es requerido')
    .isInt({ min: 1 }).withMessage('cliente_id debe ser un entero positivo'),

  body('es_principal')
    .optional().isBoolean().withMessage('es_principal debe ser booleano'),

  validar,
];

const desasignarClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  param('clienteId').isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  validar,
];

const idContactoValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  validar,
];

const asignarContactoDesdeClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de cliente inválido'),

  body('contacto_id')
    .notEmpty().withMessage('contacto_id es requerido')
    .isInt({ min: 1 }).withMessage('contacto_id debe ser un entero positivo'),

  body('es_principal')
    .optional().isBoolean().withMessage('es_principal debe ser booleano'),

  validar,
];

const desasignarContactoDesdeClienteValidator = [
  param('id').isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  param('contactoId').isInt({ min: 1 }).withMessage('ID de contacto inválido'),
  validar,
];

module.exports = {
  validar,
  crearContactoDirectorioValidator,
  actualizarContactoDirectorioValidator,
  asignarClienteValidator,
  desasignarClienteValidator,
  idContactoValidator,
  asignarContactoDesdeClienteValidator,
  desasignarContactoDesdeClienteValidator,
};
```

- [ ] **Paso 2: Verificar que el archivo tiene sintaxis válida**

```bash
cd server && node -e "require('./src/validators/contactoValidator'); console.log('OK');"
```

Esperado: `OK`

- [ ] **Paso 3: Commit**

```bash
git add server/src/validators/contactoValidator.js
git commit -m "feat: validadores express-validator para directorio de contactos"
```

---

## Tarea 5: Controlador contactoController.js

**Files:**
- Create: `server/src/controllers/contactoController.js`

- [ ] **Paso 1: Crear el controlador completo**

```js
// server/src/controllers/contactoController.js
const { Op } = require('sequelize');
const { sequelize, Contacto, ContactoCliente, Cliente, Usuario, Auditoria } = require('../models');
const { success, paginated, error: errorResponse, notFound } = require('../utils/responses');
const logger = require('../utils/logger');

// ─── DIRECTORIO ───────────────────────────────────────────────────────────────

const listar = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      tipo,
      activo,
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { cargo: { [Op.like]: `%${search}%` } },
      ];
    }
    if (tipo && tipo !== 'todos') where.tipo = tipo;
    if (activo !== undefined && activo !== 'todos') where.activo = activo === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Contacto.findAndCountAll({
      where,
      include: [
        {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'] },
          attributes: ['id', 'razon_social', 'codigo_cliente'],
          required: false,
        },
        {
          model: Usuario,
          as: 'usuarioCrm',
          attributes: ['id', 'nombre_completo', 'rol', 'email'],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['nombre', 'ASC']],
      distinct: true,
    });

    return paginated(res, rows, count, parseInt(page), parseInt(limit));
  } catch (err) {
    logger.error('Error al listar contactos directorio:', { message: err.message });
    return errorResponse(res, 'Error al obtener los contactos', 500);
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const contacto = await Contacto.findByPk(req.params.id, {
      include: [
        {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['id', 'es_principal'] },
          attributes: ['id', 'razon_social', 'codigo_cliente', 'estado'],
        },
        {
          model: Usuario,
          as: 'usuarioCrm',
          attributes: ['id', 'nombre_completo', 'rol', 'email', 'avatar_url'],
          required: false,
        },
      ],
    });

    if (!contacto) return notFound(res, 'Contacto no encontrado');

    return success(res, contacto);
  } catch (err) {
    logger.error('Error al obtener contacto:', { message: err.message, id: req.params.id });
    return errorResponse(res, 'Error al obtener el contacto', 500);
  }
};

const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      nombre, tipo = 'externo', usuario_id,
      cargo, telefono, celular, email,
      recibe_notificaciones, tipos_notificacion, notas,
    } = req.body;

    // Validar email único si se provee
    if (email) {
      const existente = await Contacto.findOne({ where: { email } });
      if (existente) {
        await transaction.rollback();
        return errorResponse(res, 'Ya existe un contacto con ese email', 400, null, 'EMAIL_DUPLICADO');
      }
    }

    // Validar usuario_id si se provee
    if (usuario_id) {
      const usuarioExiste = await Usuario.findByPk(usuario_id);
      if (!usuarioExiste) {
        await transaction.rollback();
        return notFound(res, 'Usuario CRM no encontrado');
      }
      const contactoConUsuario = await Contacto.findOne({ where: { usuario_id } });
      if (contactoConUsuario) {
        await transaction.rollback();
        return errorResponse(res, 'Ese usuario ya está vinculado a otro contacto', 400, null, 'USUARIO_DUPLICADO');
      }
    }

    const contacto = await Contacto.create(
      { nombre, tipo, usuario_id: usuario_id || null, cargo, telefono, celular, email,
        recibe_notificaciones, tipos_notificacion, notas },
      { transaction }
    );

    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { nombre, tipo, email, cargo },
      ip_address: req.ip,
      descripcion: `Contacto creado: ${nombre}`,
      transaction,
    });

    await transaction.commit();
    return success(res, contacto, 201);
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al crear contacto:', { message: err.message });
    return errorResponse(res, 'Error al crear el contacto', 500);
  }
};

const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contacto = await Contacto.findByPk(req.params.id);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    const { email, usuario_id } = req.body;

    if (email && email !== contacto.email) {
      const existente = await Contacto.findOne({
        where: { email, id: { [Op.ne]: contacto.id } },
      });
      if (existente) {
        await transaction.rollback();
        return errorResponse(res, 'Ya existe un contacto con ese email', 400, null, 'EMAIL_DUPLICADO');
      }
    }

    if (usuario_id !== undefined && usuario_id !== null && usuario_id !== contacto.usuario_id) {
      const usuarioExiste = await Usuario.findByPk(usuario_id);
      if (!usuarioExiste) {
        await transaction.rollback();
        return notFound(res, 'Usuario CRM no encontrado');
      }
      const contactoConUsuario = await Contacto.findOne({
        where: { usuario_id, id: { [Op.ne]: contacto.id } },
      });
      if (contactoConUsuario) {
        await transaction.rollback();
        return errorResponse(res, 'Ese usuario ya está vinculado a otro contacto', 400, null, 'USUARIO_DUPLICADO');
      }
    }

    const datosPrevios = contacto.toJSON();
    await contacto.update(req.body, { transaction });

    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'editar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosPrevios,
      datos_nuevos: req.body,
      ip_address: req.ip,
      descripcion: `Contacto editado: ${contacto.nombre}`,
      transaction,
    });

    await transaction.commit();
    return success(res, await Contacto.findByPk(contacto.id));
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al actualizar contacto:', { message: err.message, id: req.params.id });
    return errorResponse(res, 'Error al actualizar el contacto', 500);
  }
};

const desactivar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contacto = await Contacto.findByPk(req.params.id);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    await contacto.update({ activo: false }, { transaction });

    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'desactivar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      ip_address: req.ip,
      descripcion: `Contacto desactivado: ${contacto.nombre}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: 'Contacto desactivado correctamente' });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al desactivar contacto:', { message: err.message, id: req.params.id });
    return errorResponse(res, 'Error al desactivar el contacto', 500);
  }
};

// ─── ASIGNACIONES ─────────────────────────────────────────────────────────────

const asignarCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contactoId = parseInt(req.params.id);
    const { cliente_id, es_principal = false } = req.body;

    const contacto = await Contacto.findByPk(contactoId);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    const cliente = await Cliente.findByPk(cliente_id);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }

    const [pivot, creado] = await ContactoCliente.upsert(
      { contacto_id: contactoId, cliente_id: parseInt(cliente_id), es_principal },
      { transaction, returning: true }
    );

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: pivot.id || contactoId,
      accion: creado ? 'asignar_cliente' : 'actualizar_asignacion',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { contacto_id: contactoId, cliente_id, es_principal },
      ip_address: req.ip,
      descripcion: `Contacto ${contacto.nombre} ${creado ? 'asignado a' : 'actualizado en'} cliente ${cliente.razon_social}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: `Contacto ${creado ? 'asignado' : 'actualizado'}`, pivot }, creado ? 201 : 200);
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al asignar cliente a contacto:', { message: err.message });
    return errorResponse(res, 'Error al asignar el cliente', 500);
  }
};

const desasignarCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contactoId = parseInt(req.params.id);
    const clienteId = parseInt(req.params.clienteId);

    const pivot = await ContactoCliente.findOne({
      where: { contacto_id: contactoId, cliente_id: clienteId },
    });

    if (!pivot) {
      await transaction.rollback();
      return notFound(res, 'El contacto no está asignado a ese cliente');
    }

    await pivot.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: contactoId,
      accion: 'desasignar_cliente',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: pivot.toJSON(),
      ip_address: req.ip,
      descripcion: `Contacto desasignado del cliente ${clienteId}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: 'Contacto desasignado correctamente' });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al desasignar cliente:', { message: err.message });
    return errorResponse(res, 'Error al desasignar el cliente', 500);
  }
};

// ─── DESDE CLIENTE DETAIL ─────────────────────────────────────────────────────

const listarContactosCliente = async (req, res) => {
  try {
    const clienteId = parseInt(req.params.id);
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    const contactos = await Contacto.findAll({
      include: [
        {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'], where: { cliente_id: clienteId } },
          attributes: [],
          required: true,
        },
        {
          model: Usuario,
          as: 'usuarioCrm',
          attributes: ['id', 'nombre_completo', 'rol'],
          required: false,
        },
      ],
      order: [['nombre', 'ASC']],
    });

    return success(res, contactos);
  } catch (err) {
    logger.error('Error al listar contactos del cliente:', { message: err.message, clienteId: req.params.id });
    return errorResponse(res, 'Error al obtener los contactos', 500);
  }
};

const asignarContactoDesdeCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const clienteId = parseInt(req.params.id);
    const { contacto_id, es_principal = false } = req.body;

    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }

    const contacto = await Contacto.findByPk(contacto_id);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    const [pivot, creado] = await ContactoCliente.upsert(
      { contacto_id: parseInt(contacto_id), cliente_id: clienteId, es_principal },
      { transaction, returning: true }
    );

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: pivot.id || clienteId,
      accion: creado ? 'asignar_contacto' : 'actualizar_asignacion',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { contacto_id, cliente_id: clienteId, es_principal },
      ip_address: req.ip,
      descripcion: `Contacto ${contacto.nombre} asignado al cliente ${cliente.razon_social}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: `Contacto ${creado ? 'asignado' : 'actualizado'}`, pivot }, creado ? 201 : 200);
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al asignar contacto desde cliente:', { message: err.message });
    return errorResponse(res, 'Error al asignar el contacto', 500);
  }
};

const desasignarContactoDesdeCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const clienteId = parseInt(req.params.id);
    const contactoId = parseInt(req.params.contactoId);

    const pivot = await ContactoCliente.findOne({
      where: { contacto_id: contactoId, cliente_id: clienteId },
    });

    if (!pivot) {
      await transaction.rollback();
      return notFound(res, 'El contacto no está asignado a este cliente');
    }

    await pivot.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: contactoId,
      accion: 'desasignar_contacto',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: pivot.toJSON(),
      ip_address: req.ip,
      descripcion: `Contacto ${contactoId} desasignado del cliente ${clienteId}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: 'Contacto desasignado correctamente' });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al desasignar contacto desde cliente:', { message: err.message });
    return errorResponse(res, 'Error al desasignar el contacto', 500);
  }
};

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  asignarCliente,
  desasignarCliente,
  listarContactosCliente,
  asignarContactoDesdeCliente,
  desasignarContactoDesdeCliente,
};
```

- [ ] **Paso 2: Verificar sintaxis**

```bash
cd server && node -e "require('./src/controllers/contactoController'); console.log('OK');"
```

Esperado: `OK`

- [ ] **Paso 3: Commit**

```bash
git add server/src/controllers/contactoController.js
git commit -m "feat: contactoController — CRUD directorio, asignar/desasignar clientes"
```

---

## Tarea 6: Rutas contacto.routes.js + registrar en index

**Files:**
- Create: `server/src/routes/contacto.routes.js`
- Modify: `server/src/routes/index.js`

- [ ] **Paso 1: Crear contacto.routes.js**

```js
// server/src/routes/contacto.routes.js
const express = require('express');
const router = express.Router();

const { verifyToken, cargarCachePermisos, requierePermiso, requiereRolMinimo } = require('../middleware/auth');
const contactoController = require('../controllers/contactoController');
const {
  crearContactoDirectorioValidator,
  actualizarContactoDirectorioValidator,
  asignarClienteValidator,
  desasignarClienteValidator,
  idContactoValidator,
} = require('../validators/contactoValidator');

// Todas las rutas requieren auth + rol admin
router.use(verifyToken, cargarCachePermisos);

/**
 * GET /contactos — Listar directorio
 */
router.get(
  '/',
  requierePermiso('contactos', 'ver'),
  requiereRolMinimo('admin'),
  contactoController.listar
);

/**
 * POST /contactos — Crear contacto
 */
router.post(
  '/',
  requierePermiso('contactos', 'crear'),
  requiereRolMinimo('admin'),
  crearContactoDirectorioValidator,
  contactoController.crear
);

/**
 * GET /contactos/:id — Detalle con clientes asignados
 */
router.get(
  '/:id',
  requierePermiso('contactos', 'ver'),
  requiereRolMinimo('admin'),
  idContactoValidator,
  contactoController.obtenerPorId
);

/**
 * PUT /contactos/:id — Editar contacto
 */
router.put(
  '/:id',
  requierePermiso('contactos', 'editar'),
  requiereRolMinimo('admin'),
  actualizarContactoDirectorioValidator,
  contactoController.actualizar
);

/**
 * DELETE /contactos/:id — Desactivar contacto (activo=false)
 */
router.delete(
  '/:id',
  requierePermiso('contactos', 'eliminar'),
  requiereRolMinimo('admin'),
  idContactoValidator,
  contactoController.desactivar
);

/**
 * POST /contactos/:id/clientes — Asignar a cliente
 */
router.post(
  '/:id/clientes',
  requierePermiso('contactos', 'editar'),
  requiereRolMinimo('admin'),
  asignarClienteValidator,
  contactoController.asignarCliente
);

/**
 * DELETE /contactos/:id/clientes/:clienteId — Desasignar de cliente
 */
router.delete(
  '/:id/clientes/:clienteId',
  requierePermiso('contactos', 'editar'),
  requiereRolMinimo('admin'),
  desasignarClienteValidator,
  contactoController.desasignarCliente
);

module.exports = router;
```

- [ ] **Paso 2: Registrar en server/src/routes/index.js**

Después de la línea:
```js
const solicitudRoutes = require('./solicitud.routes');
```

Agregar:
```js
const contactoRoutes = require('./contacto.routes');
```

Y después de:
```js
router.use('/solicitudes', solicitudRoutes);
```

Agregar:
```js
router.use('/contactos', contactoRoutes);
```

- [ ] **Paso 3: Verificar que el servidor inicia y el endpoint responde**

Iniciar servidor:
```bash
cd server && npm run dev
```

Probar con curl (reemplazar TOKEN con un token admin válido):
```bash
curl -s -H "Authorization: Bearer TOKEN" http://localhost:5000/api/v1/contactos | head -c 200
```

Esperado: `{"success":true,"data":{"rows":[...],"count":...}}`

- [ ] **Paso 4: Commit**

```bash
git add server/src/routes/contacto.routes.js server/src/routes/index.js
git commit -m "feat: rutas /contactos y registro en router principal"
```

---

## Tarea 7: Actualizar clienteController.js + cliente.routes.js

**Files:**
- Modify: `server/src/controllers/clienteController.js`
- Modify: `server/src/routes/cliente.routes.js`

- [ ] **Paso 1: Actualizar listarContactos en clienteController.js**

Buscar la función `listarContactos` (línea ~495) y reemplazarla completamente:

```js
const listarContactos = async (req, res) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    // Importar desde contactoController reutilizando la lógica
    const contactoController = require('./contactoController');
    return contactoController.listarContactosCliente(req, res);
  } catch (error) {
    logger.error('Error al listar contactos:', { message: error.message, clienteId: req.params.id });
    return serverError(res, 'Error al obtener los contactos', error);
  }
};
```

Nota: Si `serverError` no está importado en el archivo, usar `errorResponse` o el helper equivalente. Revisar qué helpers de `../utils/responses` usa ese controlador.

Alternativa más directa — reemplazar el body de `listarContactos` así:

```js
const listarContactos = async (req, res) => {
  const { listarContactosCliente } = require('./contactoController');
  return listarContactosCliente(req, res);
};
```

- [ ] **Paso 2: Agregar las funciones de asignación al exports de clienteController.js**

Al final del archivo, en el `module.exports`, agregar:
```js
asignarContactoDesdeCliente: require('./contactoController').asignarContactoDesdeCliente,
desasignarContactoDesdeCliente: require('./contactoController').desasignarContactoDesdeCliente,
```

O mejor: agregar funciones wrapper locales antes del module.exports:

```js
const asignarContactoDesdeCliente = async (req, res) => {
  const { asignarContactoDesdeCliente: fn } = require('./contactoController');
  return fn(req, res);
};
const desasignarContactoDesdeCliente = async (req, res) => {
  const { desasignarContactoDesdeCliente: fn } = require('./contactoController');
  return fn(req, res);
};
```

Y agregar al `module.exports`:
```js
asignarContactoDesdeCliente,
desasignarContactoDesdeCliente,
```

- [ ] **Paso 3: Actualizar cliente.routes.js — sección de contactos**

Reemplazar el bloque completo `// RUTAS DE CONTACTOS` (líneas 152-207) con:

```js
// =============================================
// RUTAS DE CONTACTOS (ahora usa pivot M:N)
// =============================================

const {
  asignarContactoDesdeClienteValidator,
  desasignarContactoDesdeClienteValidator,
} = require('../validators/contactoValidator');

/**
 * GET /clientes/:id/contactos — Listar contactos asignados
 */
router.get('/:id/contactos', idParamValidator, clienteController.listarContactos);

/**
 * POST /clientes/:id/contactos/asignar — Asignar contacto existente
 */
router.post(
  '/:id/contactos/asignar',
  noClientes,
  requiereRolMinimo('admin'),
  asignarContactoDesdeClienteValidator,
  clienteController.asignarContactoDesdeCliente
);

/**
 * DELETE /clientes/:id/contactos/:contactoId — Desasignar contacto (no elimina)
 */
router.delete(
  '/:id/contactos/:contactoId',
  noClientes,
  requiereRolMinimo('admin'),
  desasignarContactoDesdeClienteValidator,
  clienteController.desasignarContactoDesdeCliente
);
```

Importante: también eliminar del import de `clienteValidator` los validadores de contacto que ya no se usan: `crearContactoValidator`, `actualizarContactoValidator`, `contactoParamsValidator`.

- [ ] **Paso 4: Verificar endpoint del cliente**

Curl (reemplazar TOKEN y CLIENTE_ID):
```bash
curl -s -H "Authorization: Bearer TOKEN" http://localhost:5000/api/v1/clientes/CLIENTE_ID/contactos
```

Esperado: `{"success":true,"data":[...]}` (lista de contactos asignados, puede ser vacía `[]`)

- [ ] **Paso 5: Commit**

```bash
git add server/src/controllers/clienteController.js server/src/routes/cliente.routes.js
git commit -m "feat: clienteController y cliente.routes adaptados para contactos M:N"
```

---

## Tarea 8: Seeds de permisos + PERMISOS_POR_ROL en AuthContext

**Files:**
- Modify: `server/src/scripts/seedRolesPermisos.js`
- Modify: `frontend/src/context/AuthContext.jsx`

- [ ] **Paso 1: Agregar permisos contactos al PERMISOS_CATALOGO en seedRolesPermisos.js**

Después del bloque de permisos de `solicitudes` (líneas ~436-440), agregar:

```js
  // Contactos (directorio global)
  { modulo: 'contactos', accion: 'ver', descripcion: 'Ver directorio de contactos', grupo: 'Gestión' },
  { modulo: 'contactos', accion: 'crear', descripcion: 'Crear contactos en el directorio', grupo: 'Gestión' },
  { modulo: 'contactos', accion: 'editar', descripcion: 'Editar contactos y asignaciones', grupo: 'Gestión' },
  { modulo: 'contactos', accion: 'eliminar', descripcion: 'Desactivar contactos del directorio', grupo: 'Gestión' },
```

Actualizar el comentario del catálogo (línea ~80):
```js
// CATÁLOGO DE PERMISOS (11 módulos, 46 permisos)
```

- [ ] **Paso 2: El rol admin ya usa `'*'` — no necesita cambio**

Verificar que `PERMISOS_POR_ROL.admin = '*'` sigue igual. Los demás roles (supervisor, financiera, operador, conductor, cliente) NO reciben permisos de `contactos` — correctamente no aparecen.

- [ ] **Paso 3: Correr el seed para registrar los nuevos permisos**

```bash
cd server && node src/scripts/seedRolesPermisos.js
```

Esperado al final: `✅ Seed completado exitosamente` (o similar)

- [ ] **Paso 4: Agregar contactos al PERMISOS_POR_ROL del AuthContext (fallback frontend)**

En `frontend/src/context/AuthContext.jsx`, en `PERMISOS_POR_ROL.admin` (línea ~52), agregar `contactos`:

```js
const PERMISOS_POR_ROL = {
  admin: {
    dashboard: ['ver', 'exportar'],
    clientes: ['ver', 'crear', 'editar', 'eliminar', 'exportar', 'importar'],
    contactos: ['ver', 'crear', 'editar', 'eliminar'],   // ← AGREGAR esta línea
    inventario: ['ver', 'crear', 'editar', 'eliminar', 'ajustar', 'exportar', 'alertas'],
    // ... resto sin cambios
  },
  // supervisor, financiera, operador, conductor, cliente sin contactos (sin cambio)
};
```

- [ ] **Paso 5: Verificar seed corrió correctamente**

```bash
cd server && node -e "
const { sequelize, Permiso } = require('./src/models');
(async () => {
  const perms = await Permiso.findAll({ where: { modulo: 'contactos' } });
  console.log('Permisos contactos:', perms.map(p => p.accion));
  process.exit(0);
})();
"
```

Esperado: `['ver', 'crear', 'editar', 'eliminar']`

- [ ] **Paso 6: Commit**

```bash
git add server/src/scripts/seedRolesPermisos.js frontend/src/context/AuthContext.jsx
git commit -m "feat: permisos módulo contactos en seed + AuthContext fallback"
```

---

## Tarea 9: Frontend — endpoints.js + contactos.service.js

**Files:**
- Modify: `frontend/src/api/endpoints.js`
- Create: `frontend/src/api/contactos.service.js`

- [ ] **Paso 1: Agregar CONTACTOS_ENDPOINTS en endpoints.js**

Al final de `frontend/src/api/endpoints.js`, agregar:

```js
// ════════════════════════════════════════════════════════════════════════════
// CONTACTOS (Directorio)
// ════════════════════════════════════════════════════════════════════════════

export const CONTACTOS_ENDPOINTS = {
  BASE: '/contactos',
  BY_ID: (id) => `/contactos/${id}`,
  CLIENTES_DE_CONTACTO: (id) => `/contactos/${id}/clientes`,
  CLIENTE_DE_CONTACTO: (contactoId, clienteId) => `/contactos/${contactoId}/clientes/${clienteId}`,
  // Desde ClienteDetail
  CONTACTOS_DE_CLIENTE: (clienteId) => `/clientes/${clienteId}/contactos`,
  ASIGNAR_A_CLIENTE: (clienteId) => `/clientes/${clienteId}/contactos/asignar`,
  DESASIGNAR_DE_CLIENTE: (clienteId, contactoId) => `/clientes/${clienteId}/contactos/${contactoId}`,
};
```

- [ ] **Paso 2: Crear contactos.service.js**

```js
// frontend/src/api/contactos.service.js
import apiClient from './client';
import { CONTACTOS_ENDPOINTS } from './endpoints';

const contactosService = {
  // ── Directorio ──────────────────────────────────────────────────────────
  getAll: async (params = {}) => {
    try {
      return await apiClient.get(CONTACTOS_ENDPOINTS.BASE, { params });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al obtener contactos' };
    }
  },

  getById: async (id) => {
    try {
      return await apiClient.get(CONTACTOS_ENDPOINTS.BY_ID(id));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al obtener el contacto' };
    }
  },

  create: async (data) => {
    try {
      return await apiClient.post(CONTACTOS_ENDPOINTS.BASE, data);
    } catch (error) {
      throw { success: false, message: error.message || 'Error al crear el contacto' };
    }
  },

  update: async (id, data) => {
    try {
      return await apiClient.put(CONTACTOS_ENDPOINTS.BY_ID(id), data);
    } catch (error) {
      throw { success: false, message: error.message || 'Error al actualizar el contacto' };
    }
  },

  deactivate: async (id) => {
    try {
      return await apiClient.delete(CONTACTOS_ENDPOINTS.BY_ID(id));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al desactivar el contacto' };
    }
  },

  asignarCliente: async (contactoId, { cliente_id, es_principal = false }) => {
    try {
      return await apiClient.post(CONTACTOS_ENDPOINTS.CLIENTES_DE_CONTACTO(contactoId), {
        cliente_id,
        es_principal,
      });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al asignar cliente' };
    }
  },

  desasignarCliente: async (contactoId, clienteId) => {
    try {
      return await apiClient.delete(CONTACTOS_ENDPOINTS.CLIENTE_DE_CONTACTO(contactoId, clienteId));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al desasignar cliente' };
    }
  },

  // ── Desde ClienteDetail ──────────────────────────────────────────────────
  getContactosCliente: async (clienteId) => {
    try {
      return await apiClient.get(CONTACTOS_ENDPOINTS.CONTACTOS_DE_CLIENTE(clienteId));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al obtener contactos del cliente' };
    }
  },

  asignarACliente: async (clienteId, { contacto_id, es_principal = false }) => {
    try {
      return await apiClient.post(CONTACTOS_ENDPOINTS.ASIGNAR_A_CLIENTE(clienteId), {
        contacto_id,
        es_principal,
      });
    } catch (error) {
      throw { success: false, message: error.message || 'Error al asignar contacto' };
    }
  },

  desasignarDeCliente: async (clienteId, contactoId) => {
    try {
      return await apiClient.delete(CONTACTOS_ENDPOINTS.DESASIGNAR_DE_CLIENTE(clienteId, contactoId));
    } catch (error) {
      throw { success: false, message: error.message || 'Error al desasignar contacto' };
    }
  },
};

export default contactosService;
```

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/api/endpoints.js frontend/src/api/contactos.service.js
git commit -m "feat: CONTACTOS_ENDPOINTS y contactosService frontend"
```

---

## Tarea 10: ContactosList.jsx

**Files:**
- Create: `frontend/src/pages/Contactos/ContactosList.jsx`
- Create: `frontend/src/pages/Contactos/components/` (directorio)

- [ ] **Paso 1: Crear el directorio de componentes**

En Windows PowerShell:
```powershell
New-Item -ItemType Directory -Force "frontend/src/pages/Contactos/components"
```

- [ ] **Paso 2: Crear ContactosList.jsx**

```jsx
// frontend/src/pages/Contactos/ContactosList.jsx
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Users, Building2 } from 'lucide-react';
import { useAuth } from '@context/AuthContext';
import useNotification from '@hooks/useNotification';
import contactosService from '@api/contactos.service';
import { FilterDropdown } from '@components/common';
import ContactoForm from './components/ContactoForm';
import ContactoDrawer from './components/ContactoDrawer';

const TIPO_OPTIONS = [
  { value: '', label: 'Todos los tipos' },
  { value: 'istho', label: 'ISTHO' },
  { value: 'externo', label: 'Externo' },
];

const ACTIVO_OPTIONS = [
  { value: '', label: 'Activos e inactivos' },
  { value: 'true', label: 'Solo activos' },
  { value: 'false', label: 'Solo inactivos' },
];

const TIPO_BADGE = {
  istho: 'bg-blue-500/20 text-blue-400',
  externo: 'bg-slate-500/20 text-slate-400',
};

export default function ContactosList() {
  const { hasPermission } = useAuth();
  const { success: notifSuccess, error: notifError } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();

  const [contactos, setContactos] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [firstLoad, setFirstLoad] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [tipo, setTipo] = useState(searchParams.get('tipo') || '');
  const [activo, setActivo] = useState(searchParams.get('activo') || 'true');

  const [drawerContacto, setDrawerContacto] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editando, setEditando] = useState(null);

  const canCreate = hasPermission('contactos', 'crear');

  const fetchContactos = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page: 1, limit: 50 };
      if (search) params.search = search;
      if (tipo) params.tipo = tipo;
      if (activo !== '') params.activo = activo;

      const resp = await contactosService.getAll(params);
      setContactos(resp.data?.rows || resp.data || []);
      const count = resp.data?.count ?? (resp.data?.length ?? 0);
      setPagination({ total: count, page: 1, totalPages: Math.ceil(count / 50) });
    } catch (err) {
      notifError(err.message || 'Error al cargar contactos');
    } finally {
      setLoading(false);
      setFirstLoad(false);
    }
  }, [search, tipo, activo, notifError]);

  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (tipo) params.tipo = tipo;
    if (activo !== '') params.activo = activo;
    setSearchParams(params, { replace: true });
  }, [search, tipo, activo, setSearchParams]);

  useEffect(() => {
    fetchContactos();
  }, [fetchContactos]);

  const handleDesactivar = async (contacto) => {
    if (!confirm(`¿Desactivar el contacto "${contacto.nombre}"?`)) return;
    try {
      await contactosService.deactivate(contacto.id);
      notifSuccess('Contacto desactivado correctamente');
      fetchContactos();
      if (drawerContacto?.id === contacto.id) setDrawerContacto(null);
    } catch (err) {
      notifError(err.message || 'Error al desactivar');
    }
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditando(null);
    fetchContactos();
  };

  if (firstLoad) {
    return (
      <div className="p-6 space-y-4" id="tour-contactos-tabla">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-centhrix-card rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Lista principal */}
      <div className={`flex-1 p-6 space-y-4 transition-all ${drawerContacto ? 'mr-96' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-slate-100">Directorio de Contactos</h1>
            <p className="text-sm text-slate-400 mt-1">{pagination.total} contacto{pagination.total !== 1 ? 's' : ''}</p>
          </div>
          {canCreate && (
            <button
              id="tour-contactos-nuevo"
              onClick={() => { setEditando(null); setFormOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-centhrix-accent hover:bg-centhrix-accent-hover text-white rounded-xl text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nuevo contacto
            </button>
          )}
        </div>

        {/* Filtros */}
        <div id="tour-contactos-filtros" className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Buscar por nombre, email, cargo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 bg-centhrix-card border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-centhrix-accent w-72"
          />
          <FilterDropdown
            options={TIPO_OPTIONS}
            value={tipo}
            onChange={(v) => setTipo(v)}
            compact
          />
          <FilterDropdown
            options={ACTIVO_OPTIONS}
            value={activo}
            onChange={(v) => setActivo(v)}
            compact
          />
        </div>

        {/* Tabla */}
        <div id="tour-contactos-tabla" className="bg-centhrix-card rounded-xl border border-slate-800 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Actualizando...</div>
          ) : contactos.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No se encontraron contactos</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Nombre</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Cargo</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Email</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Teléfono</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Clientes</th>
                  <th className="text-left text-xs text-slate-500 font-medium px-4 py-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {contactos.map((contacto) => (
                  <tr
                    key={contacto.id}
                    onClick={() => setDrawerContacto(contacto)}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-100 font-medium">{contacto.nombre}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_BADGE[contacto.tipo] || TIPO_BADGE.externo}`}>
                          {contacto.tipo === 'istho' ? 'ISTHO' : 'Externo'}
                        </span>
                        {contacto.usuario_id && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400">
                            Usuario CRM
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">{contacto.cargo || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">{contacto.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      {contacto.celular || contacto.telefono || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-sm text-slate-300">
                          {contacto.clientes?.length ?? 0}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        contacto.activo
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-slate-700/50 text-slate-500'
                      }`}>
                        {contacto.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Drawer lateral */}
      {drawerContacto && (
        <ContactoDrawer
          contacto={drawerContacto}
          onClose={() => setDrawerContacto(null)}
          onEditar={(c) => { setEditando(c); setFormOpen(true); }}
          onDesactivar={handleDesactivar}
          onRefresh={fetchContactos}
        />
      )}

      {/* Modal de formulario */}
      {formOpen && (
        <ContactoForm
          contacto={editando}
          onClose={() => { setFormOpen(false); setEditando(null); }}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}
```

- [ ] **Paso 3: Commit (sin los componentes aún, solo la página)**

```bash
git add frontend/src/pages/Contactos/ContactosList.jsx
git commit -m "feat: ContactosList — tabla con filtros, badges tipo, drawer integration"
```

---

## Tarea 11: ContactoForm.jsx

**Files:**
- Create: `frontend/src/pages/Contactos/components/ContactoForm.jsx`

- [ ] **Paso 1: Crear ContactoForm.jsx**

```jsx
// frontend/src/pages/Contactos/components/ContactoForm.jsx
import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { X } from 'lucide-react';
import useNotification from '@hooks/useNotification';
import contactosService from '@api/contactos.service';
import { FilterDropdown } from '@components/common';
import apiClient from '@api/client';

const TIPO_OPTIONS = [
  { value: 'externo', label: 'Externo' },
  { value: 'istho', label: 'ISTHO' },
];

const NOTIFICACION_OPTIONS = [
  { value: 'todas', label: 'Todas' },
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'salida', label: 'Salida' },
  { value: 'kardex', label: 'Kardex' },
];

export default function ContactoForm({ contacto, onClose, onSuccess }) {
  const { success: notifSuccess, error: notifError } = useNotification();
  const [saving, setSaving] = useState(false);
  const [vincularUsuario, setVincularUsuario] = useState(!!contacto?.usuario_id);
  const [usuarios, setUsuarios] = useState([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nombre: contacto?.nombre || '',
      tipo: contacto?.tipo || 'externo',
      usuario_id: contacto?.usuario_id ? String(contacto.usuario_id) : '',
      cargo: contacto?.cargo || '',
      telefono: contacto?.telefono || '',
      celular: contacto?.celular || '',
      email: contacto?.email || '',
      recibe_notificaciones: contacto?.recibe_notificaciones ?? true,
      tipos_notificacion: contacto?.tipos_notificacion || ['todas'],
      notas: contacto?.notas || '',
    },
  });

  const recibeNotif = watch('recibe_notificaciones');

  // Cargar usuarios activos para vínculo
  useEffect(() => {
    if (!vincularUsuario) return;
    setLoadingUsuarios(true);
    apiClient.get('/admin/usuarios', { params: { activo: true, limit: 200 } })
      .then((resp) => {
        const lista = resp.data?.rows || resp.data || [];
        setUsuarios(lista.map((u) => ({
          value: String(u.id),
          label: `${u.nombre_completo} (${u.rol})`,
          usuario: u,
        })));
      })
      .catch(() => {})
      .finally(() => setLoadingUsuarios(false));
  }, [vincularUsuario]);

  const handleUsuarioCrmChange = (usuarioId) => {
    setValue('usuario_id', usuarioId);
    if (!usuarioId) return;
    const opt = usuarios.find((u) => u.value === usuarioId);
    if (!opt) return;
    const u = opt.usuario;
    setValue('nombre', u.nombre_completo || '');
    setValue('email', u.email || '');
    // Sugerir tipo según rol
    const rolesIstho = ['admin', 'supervisor', 'operador', 'conductor', 'financiera'];
    setValue('tipo', rolesIstho.includes(u.rol) ? 'istho' : 'externo');
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const payload = {
        ...data,
        usuario_id: vincularUsuario && data.usuario_id ? parseInt(data.usuario_id) : null,
        recibe_notificaciones: data.recibe_notificaciones === true || data.recibe_notificaciones === 'true',
      };
      if (!vincularUsuario) payload.usuario_id = null;

      if (contacto) {
        await contactosService.update(contacto.id, payload);
        notifSuccess('Contacto actualizado correctamente');
      } else {
        await contactosService.create(payload);
        notifSuccess('Contacto creado correctamente');
      }
      onSuccess();
    } catch (err) {
      notifError(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-centhrix-card border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-slate-100">
            {contacto ? 'Editar contacto' : 'Nuevo contacto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-4">
          {/* Tipo */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Tipo de contacto</label>
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <FilterDropdown
                  options={TIPO_OPTIONS}
                  value={String(field.value || 'externo')}
                  onChange={(v) => field.onChange(v)}
                />
              )}
            />
          </div>

          {/* Toggle vínculo usuario CRM */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl">
            <span className="text-sm text-slate-300">Vincular a usuario CRM</span>
            <button
              type="button"
              onClick={() => {
                setVincularUsuario(!vincularUsuario);
                if (vincularUsuario) setValue('usuario_id', '');
              }}
              className={`w-10 h-5 rounded-full transition-colors ${
                vincularUsuario ? 'bg-centhrix-accent' : 'bg-slate-600'
              } relative`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                vincularUsuario ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Selector usuario CRM */}
          {vincularUsuario && (
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Usuario CRM</label>
              {loadingUsuarios ? (
                <div className="h-9 bg-slate-700 rounded-xl animate-pulse" />
              ) : (
                <Controller
                  name="usuario_id"
                  control={control}
                  render={({ field }) => (
                    <FilterDropdown
                      options={[{ value: '', label: 'Seleccionar usuario...' }, ...usuarios]}
                      value={String(field.value || '')}
                      onChange={(v) => handleUsuarioCrmChange(v)}
                    />
                  )}
                />
              )}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Nombre *</label>
            <input
              {...register('nombre', { required: 'El nombre es requerido' })}
              placeholder="Nombre completo"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-centhrix-accent"
            />
            {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
          </div>

          {/* Cargo */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Cargo</label>
            <input
              {...register('cargo')}
              placeholder="Ej: Jefe de Operaciones"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-centhrix-accent"
            />
          </div>

          {/* Teléfono y Celular */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Teléfono</label>
              <input
                {...register('telefono')}
                placeholder="604 xxx xxxx"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-centhrix-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Celular</label>
              <input
                {...register('celular')}
                placeholder="3xx xxx xxxx"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-centhrix-accent"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Email</label>
            <input
              {...register('email')}
              type="email"
              placeholder="correo@ejemplo.com"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-centhrix-accent"
            />
          </div>

          {/* Notificaciones */}
          <div className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-xl">
            <span className="text-sm text-slate-300">Recibe notificaciones por email</span>
            <Controller
              name="recibe_notificaciones"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`w-10 h-5 rounded-full transition-colors ${
                    field.value ? 'bg-centhrix-accent' : 'bg-slate-600'
                  } relative`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                    field.value ? 'translate-x-5' : 'translate-x-0.5'
                  }`} />
                </button>
              )}
            />
          </div>

          {/* Tipos de notificación */}
          {recibeNotif && (
            <div>
              <label className="block text-xs text-slate-400 mb-2">Tipos de notificación</label>
              <div className="flex flex-wrap gap-2">
                {NOTIFICACION_OPTIONS.map((opt) => (
                  <Controller
                    key={opt.value}
                    name="tipos_notificacion"
                    control={control}
                    render={({ field }) => {
                      const activo = (field.value || []).includes(opt.value);
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const current = field.value || [];
                            field.onChange(
                              activo ? current.filter((v) => v !== opt.value) : [...current, opt.value]
                            );
                          }}
                          className={`px-3 py-1 rounded-full text-xs transition-colors ${
                            activo
                              ? 'bg-centhrix-accent text-white'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Notas</label>
            <textarea
              {...register('notas')}
              rows={3}
              placeholder="Información adicional..."
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-centhrix-accent resize-none"
            />
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-slate-700 text-slate-300 rounded-xl text-sm hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2 bg-centhrix-accent hover:bg-centhrix-accent-hover text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
            >
              {saving ? 'Guardando...' : contacto ? 'Actualizar' : 'Crear contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/src/pages/Contactos/components/ContactoForm.jsx
git commit -m "feat: ContactoForm modal con RHF, vínculo usuario CRM, toggle notificaciones"
```

---

## Tarea 12: ContactoDrawer.jsx

**Files:**
- Create: `frontend/src/pages/Contactos/components/ContactoDrawer.jsx`

- [ ] **Paso 1: Crear ContactoDrawer.jsx**

```jsx
// frontend/src/pages/Contactos/components/ContactoDrawer.jsx
import { useState, useEffect } from 'react';
import { X, Pencil, PowerOff, Building2, Star, Trash2, UserCheck, Mail, Phone } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import useNotification from '@hooks/useNotification';
import contactosService from '@api/contactos.service';
import clientesService from '@api/clientes.service';
import { FilterDropdown } from '@components/common';
import { useAuth } from '@context/AuthContext';

const TIPO_BADGE = {
  istho: 'bg-blue-500/20 text-blue-400',
  externo: 'bg-slate-500/20 text-slate-400',
};

export default function ContactoDrawer({ contacto, onClose, onEditar, onDesactivar, onRefresh }) {
  const { hasPermission } = useAuth();
  const { success: notifSuccess, error: notifError } = useNotification();

  const [detalle, setDetalle] = useState(contacto);
  const [loading, setLoading] = useState(false);
  const [asignandoCliente, setAsignandoCliente] = useState(false);
  const [clientesOpciones, setClientesOpciones] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(false);

  const { control, handleSubmit, reset } = useForm({
    defaultValues: { cliente_id: '', es_principal: false },
  });

  const canEdit = hasPermission('contactos', 'editar');

  // Cargar detalle completo con clientes asignados
  useEffect(() => {
    if (!contacto?.id) return;
    setLoading(true);
    contactosService.getById(contacto.id)
      .then((resp) => setDetalle(resp.data))
      .catch(() => setDetalle(contacto))
      .finally(() => setLoading(false));
  }, [contacto?.id]);

  // Cargar clientes para selector de asignación
  useEffect(() => {
    if (!asignandoCliente) return;
    setLoadingClientes(true);
    clientesService.getAll({ limit: 200, estado: 'activo' })
      .then((resp) => {
        const lista = resp.data?.rows || resp.data || [];
        const asignadosIds = new Set((detalle?.clientes || []).map((c) => c.id));
        setClientesOpciones([
          { value: '', label: 'Seleccionar cliente...' },
          ...lista
            .filter((c) => !asignadosIds.has(c.id))
            .map((c) => ({ value: String(c.id), label: c.razon_social })),
        ]);
      })
      .catch(() => {})
      .finally(() => setLoadingClientes(false));
  }, [asignandoCliente, detalle?.clientes]);

  const handleAsignar = async (data) => {
    if (!data.cliente_id) return;
    try {
      await contactosService.asignarCliente(detalle.id, {
        cliente_id: parseInt(data.cliente_id),
        es_principal: data.es_principal,
      });
      notifSuccess('Cliente asignado correctamente');
      reset({ cliente_id: '', es_principal: false });
      setAsignandoCliente(false);
      // Refrescar detalle
      const resp = await contactosService.getById(detalle.id);
      setDetalle(resp.data);
      onRefresh();
    } catch (err) {
      notifError(err.message || 'Error al asignar cliente');
    }
  };

  const handleDesasignar = async (clienteId) => {
    if (!confirm('¿Desasignar este cliente del contacto?')) return;
    try {
      await contactosService.desasignarCliente(detalle.id, clienteId);
      notifSuccess('Cliente desasignado correctamente');
      const resp = await contactosService.getById(detalle.id);
      setDetalle(resp.data);
      onRefresh();
    } catch (err) {
      notifError(err.message || 'Error al desasignar');
    }
  };

  if (!detalle) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-centhrix-card border-l border-slate-700 shadow-2xl z-40 overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-700">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-semibold text-slate-100 truncate">{detalle.nombre}</h2>
            <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_BADGE[detalle.tipo] || TIPO_BADGE.externo}`}>
              {detalle.tipo === 'istho' ? 'ISTHO' : 'Externo'}
            </span>
          </div>
          {detalle.cargo && <p className="text-sm text-slate-400 mt-0.5">{detalle.cargo}</p>}
          {detalle.usuarioCrm && (
            <div className="flex items-center gap-1.5 mt-1">
              <UserCheck className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs text-purple-400">
                {detalle.usuarioCrm.nombre_completo} · {detalle.usuarioCrm.rol}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-3 shrink-0">
          {canEdit && (
            <button
              onClick={() => onEditar(detalle)}
              className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
              title="Editar"
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
          {canEdit && detalle.activo && (
            <button
              onClick={() => onDesactivar(detalle)}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Desactivar"
            >
              <PowerOff className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Datos de contacto */}
        <div className="space-y-2">
          {detalle.email && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <a href={`mailto:${detalle.email}`} className="hover:text-centhrix-accent transition-colors truncate">
                {detalle.email}
              </a>
            </div>
          )}
          {detalle.celular && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{detalle.celular}</span>
            </div>
          )}
          {detalle.telefono && (
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Phone className="w-4 h-4 text-slate-500 shrink-0" />
              <span>{detalle.telefono}</span>
            </div>
          )}
          {detalle.notas && (
            <p className="text-xs text-slate-500 italic mt-2 bg-slate-800/50 rounded-lg p-3">
              {detalle.notas}
            </p>
          )}
        </div>

        {/* Clientes asignados */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-slate-300 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              Clientes asignados ({detalle.clientes?.length ?? 0})
            </h3>
            {canEdit && (
              <button
                onClick={() => setAsignandoCliente(!asignandoCliente)}
                className="text-xs text-centhrix-accent hover:text-centhrix-accent-hover transition-colors"
              >
                {asignandoCliente ? 'Cancelar' : '+ Asignar'}
              </button>
            )}
          </div>

          {/* Formulario de asignación inline */}
          {asignandoCliente && (
            <form onSubmit={handleSubmit(handleAsignar)} className="mb-3 p-3 bg-slate-800/50 rounded-xl space-y-2">
              {loadingClientes ? (
                <div className="h-8 bg-slate-700 rounded-lg animate-pulse" />
              ) : (
                <Controller
                  name="cliente_id"
                  control={control}
                  render={({ field }) => (
                    <FilterDropdown
                      options={clientesOpciones}
                      value={String(field.value || '')}
                      onChange={(v) => field.onChange(v)}
                      compact
                    />
                  )}
                />
              )}
              <div className="flex items-center gap-2">
                <Controller
                  name="es_principal"
                  control={control}
                  render={({ field }) => (
                    <input
                      type="checkbox"
                      id="es-principal-asignar"
                      checked={!!field.value}
                      onChange={(e) => field.onChange(e.target.checked)}
                      className="w-3.5 h-3.5 rounded accent-centhrix-accent"
                    />
                  )}
                />
                <label htmlFor="es-principal-asignar" className="text-xs text-slate-400">
                  Marcar como principal
                </label>
              </div>
              <button
                type="submit"
                className="w-full py-1.5 bg-centhrix-accent hover:bg-centhrix-accent-hover text-white rounded-lg text-xs font-medium transition-colors"
              >
                Confirmar asignación
              </button>
            </form>
          )}

          {/* Lista de clientes */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (detalle.clientes?.length ?? 0) === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              Sin clientes asignados
            </p>
          ) : (
            <div className="space-y-1.5">
              {detalle.clientes.map((cliente) => {
                const esPrincipal = cliente.ContactoCliente?.es_principal;
                return (
                  <div
                    key={cliente.id}
                    className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {esPrincipal && (
                        <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span className="text-sm text-slate-200 truncate">{cliente.razon_social}</span>
                      {esPrincipal && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 shrink-0">
                          Principal
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => handleDesasignar(cliente.id)}
                        className="ml-2 p-1 text-slate-500 hover:text-red-400 transition-colors shrink-0"
                        title="Desasignar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Paso 2: Commit**

```bash
git add frontend/src/pages/Contactos/components/ContactoDrawer.jsx
git commit -m "feat: ContactoDrawer — panel lateral con clientes asignados, asignar/desasignar inline"
```

---

## Tarea 13: Tab Contactos en ClienteDetail.jsx

**Files:**
- Modify: `frontend/src/pages/Clientes/ClienteDetail.jsx`

- [ ] **Paso 1: Localizar la sección del tab Contactos en ClienteDetail.jsx**

```bash
# Buscar dónde está el tab de contactos
grep -n "contacto\|Contacto" frontend/src/pages/Clientes/ClienteDetail.jsx | head -30
```

Identificar las líneas del componente que renderiza el tab de contactos (probablemente hay un `case 'contactos':` o un componente como `<ContactosTab />` o lógica inline).

- [ ] **Paso 2: Reemplazar el contenido del tab Contactos con la vista de asignación**

Buscar el bloque que renderiza contactos en ClienteDetail.jsx y reemplazarlo con este componente inline. Si hay un import de un tab de contactos anterior, eliminarlo.

El nuevo contenido del tab (agregar como función interna o componente separado en el mismo archivo):

```jsx
// Agregar al principio del archivo junto a los otros imports:
import contactosService from '@api/contactos.service';

// Agregar estos estados en el componente ClienteDetail o en el tab:
// const [contactos, setContactos] = useState([]);
// const [loadingContactos, setLoadingContactos] = useState(false);
// const [filtroTipo, setFiltroTipo] = useState('');
// const [asignandoContacto, setAsignandoContacto] = useState(false);

// Función que carga contactos del cliente (llama al servicio)
// La lógica del tab reemplaza el renderizado anterior con este JSX:
```

Dado que el contenido exacto del tab anterior no está disponible sin leer ClienteDetail.jsx completo, el implementador debe:

1. **Leer** el archivo completo: `Read frontend/src/pages/Clientes/ClienteDetail.jsx`
2. **Localizar** el tab de contactos (buscar `contacto` o la sección que renderizaba `crearContacto`)
3. **Reemplazar** ese bloque con este componente funcional que se coloca en el mismo archivo o en un import:

```jsx
// ContactosTabAsignacion — componente para el tab de contactos en ClienteDetail
// Se puede agregar inline al mismo archivo o importar

function ContactosTabAsignacion({ clienteId }) {
  const { hasPermission } = useAuth(); // ya importado en ClienteDetail
  const { success: notifSuccess, error: notifError } = useNotification();
  const canEdit = hasPermission('clientes', 'editar') || hasPermission('contactos', 'editar');

  const [contactos, setContactos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState('');
  const [asignandoContacto, setAsignandoContacto] = useState(false);
  const [directorio, setDirectorio] = useState([]);
  const [loadingDirectorio, setLoadingDirectorio] = useState(false);
  const [selContactoId, setSelContactoId] = useState('');
  const [selEsPrincipal, setSelEsPrincipal] = useState(false);

  const cargarContactos = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await contactosService.getContactosCliente(clienteId);
      setContactos(resp.data || []);
    } catch {
      notifError('Error al cargar contactos');
    } finally {
      setLoading(false);
    }
  }, [clienteId, notifError]);

  useEffect(() => { cargarContactos(); }, [cargarContactos]);

  const cargarDirectorio = async () => {
    setLoadingDirectorio(true);
    try {
      const resp = await contactosService.getAll({ activo: 'true', limit: 200 });
      const asignadosIds = new Set(contactos.map((c) => c.id));
      const lista = (resp.data?.rows || resp.data || []).filter((c) => !asignadosIds.has(c.id));
      setDirectorio([{ value: '', label: 'Seleccionar contacto...' }, ...lista.map((c) => ({
        value: String(c.id),
        label: `${c.nombre}${c.cargo ? ` — ${c.cargo}` : ''}`,
      }))]);
    } catch {
      setDirectorio([]);
    } finally {
      setLoadingDirectorio(false);
    }
  };

  const handleAsignar = async () => {
    if (!selContactoId) return;
    try {
      await contactosService.asignarACliente(clienteId, {
        contacto_id: parseInt(selContactoId),
        es_principal: selEsPrincipal,
      });
      notifSuccess('Contacto asignado correctamente');
      setAsignandoContacto(false);
      setSelContactoId('');
      setSelEsPrincipal(false);
      cargarContactos();
    } catch (err) {
      notifError(err.message || 'Error al asignar');
    }
  };

  const handleDesasignar = async (contactoId) => {
    if (!confirm('¿Desasignar este contacto del cliente?')) return;
    try {
      await contactosService.desasignarDeCliente(clienteId, contactoId);
      notifSuccess('Contacto desasignado');
      cargarContactos();
    } catch (err) {
      notifError(err.message || 'Error al desasignar');
    }
  };

  const TIPO_BADGE = {
    istho: 'bg-blue-500/20 text-blue-400',
    externo: 'bg-slate-500/20 text-slate-400',
  };

  const filtrados = filtroTipo
    ? contactos.filter((c) => c.tipo === filtroTipo)
    : contactos;

  return (
    <div className="space-y-4">
      {/* Header del tab */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {['', 'istho', 'externo'].map((t) => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${
                filtroTipo === t
                  ? 'bg-centhrix-accent text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {t === '' ? 'Todos' : t === 'istho' ? 'ISTHO' : 'Externo'}
            </button>
          ))}
        </div>
        {canEdit && (
          <button
            onClick={() => {
              setAsignandoContacto(!asignandoContacto);
              if (!asignandoContacto) cargarDirectorio();
            }}
            className="text-xs text-centhrix-accent hover:text-centhrix-accent-hover transition-colors"
          >
            {asignandoContacto ? 'Cancelar' : '+ Asignar contacto'}
          </button>
        )}
      </div>

      {/* Formulario de asignación */}
      {asignandoContacto && (
        <div className="p-4 bg-slate-800/50 rounded-xl space-y-3">
          <p className="text-xs text-slate-400">
            Para crear nuevos contactos, visita el{' '}
            <a href="/contactos" className="text-centhrix-accent hover:underline">Directorio de Contactos</a>.
          </p>
          {loadingDirectorio ? (
            <div className="h-9 bg-slate-700 rounded-xl animate-pulse" />
          ) : (
            <FilterDropdown
              options={directorio}
              value={String(selContactoId || '')}
              onChange={(v) => setSelContactoId(v)}
            />
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="es-principal-tab"
              checked={selEsPrincipal}
              onChange={(e) => setSelEsPrincipal(e.target.checked)}
              className="w-3.5 h-3.5 rounded accent-centhrix-accent"
            />
            <label htmlFor="es-principal-tab" className="text-xs text-slate-400">
              Marcar como contacto principal
            </label>
          </div>
          <button
            onClick={handleAsignar}
            disabled={!selContactoId}
            className="w-full py-2 bg-centhrix-accent hover:bg-centhrix-accent-hover text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
          >
            Confirmar asignación
          </button>
        </div>
      )}

      {/* Lista de contactos */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          Sin contactos asignados{filtroTipo ? ` de tipo ${filtroTipo}` : ''}
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((contacto) => {
            const pivot = contacto.ContactoCliente || contacto.clientes?.find(c => c.id === parseInt(clienteId))?.ContactoCliente;
            const esPrincipal = pivot?.es_principal;
            return (
              <div key={contacto.id} className="flex items-center justify-between px-4 py-3 bg-centhrix-surface rounded-xl">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {esPrincipal && <Star className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                    <span className="text-sm text-slate-100 font-medium">{contacto.nombre}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${TIPO_BADGE[contacto.tipo]}`}>
                      {contacto.tipo === 'istho' ? 'ISTHO' : 'Externo'}
                    </span>
                    {esPrincipal && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Principal</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {[contacto.cargo, contacto.email].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {canEdit && (
                  <button
                    onClick={() => handleDesasignar(contacto.id)}
                    className="ml-3 p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                    title="Desasignar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

Asegurarse de:
- Importar `Star, Trash2` de lucide-react (agregar al import existente en ClienteDetail.jsx)
- Importar `contactosService` de `@api/contactos.service`
- Importar `useCallback` si no está en el import de React
- Reemplazar el lugar donde se renderizan los contactos con `<ContactosTabAsignacion clienteId={cliente.id} />`

- [ ] **Paso 3: Commit**

```bash
git add frontend/src/pages/Clientes/ClienteDetail.jsx
git commit -m "feat: tab Contactos en ClienteDetail usa pivot M:N (asignar/desasignar)"
```

---

## Tarea 14: FloatingHeader.jsx + App.jsx — navegación y ruta

**Files:**
- Modify: `frontend/src/components/layout/FloatingHeader.jsx`
- Modify: `frontend/src/App.jsx`

- [ ] **Paso 1: Agregar BookUser al import de lucide-react en FloatingHeader.jsx**

En la línea de imports de lucide-react (línea ~16-53), agregar `BookUser`:
```js
import {
  // ... iconos existentes ...
  BookUser,
} from 'lucide-react';
```

- [ ] **Paso 2: Agregar entrada "Directorio de Contactos" en el menú clientes**

En `allMenuConfig`, en el objeto con `id: 'clientes'` (línea ~96-106), agregar la nueva entrada en `items`:

```js
{
  id: 'clientes',
  label: 'Clientes',
  icon: Users,
  basePath: '/clientes',
  shortcut: 'C',
  soloInternos: true,
  items: [
    { icon: Users, label: 'Lista de Clientes', href: '/clientes', shortcut: 'G C' },
    { icon: BookUser, label: 'Directorio de Contactos', href: '/contactos', shortcut: 'G B' },
    { icon: Mail, label: 'Plantillas de Email', href: '/plantillas-email', shortcut: 'G P' },
  ],
},
```

- [ ] **Paso 3: Agregar contactos en MENU_PERMISSION_MAP**

En `MENU_PERMISSION_MAP` (línea ~190-198), el menú `clientes` controla si se muestra el grupo. La entrada `/contactos` es un sub-ítem — agregar visibilidad condicional agregando `contactos.ver` al array del menú clientes:

```js
const MENU_PERMISSION_MAP = {
  dashboard: ['dashboard.ver'],
  clientes: ['clientes.ver', 'contactos.ver'],  // ← agregar 'contactos.ver'
  inventario: ['inventario.ver', 'inventario.alertas'],
  operaciones: ['operaciones.ver'],
  viajes: ['vehiculos.ver', 'viajes.ver', 'caja_menor.ver', 'movimientos.ver'],
  solicitudes: ['solicitudes.ver'],
  admin: ['usuarios.ver', 'roles.ver', 'configuracion_wms.ver'],
};
```

Nota: con este cambio, el grupo "Clientes" aparece si el usuario tiene `clientes.ver` O `contactos.ver`. Roles sin `contactos.ver` pero con `clientes.ver` siguen viendo el grupo (correcto).

Para que el ítem `/contactos` sea visible solo para quienes tienen `contactos.ver`, buscar en FloatingHeader la función que filtra los `items` del menú y agregar un check para ese href específico. Si no existe ese filtro, agregar la propiedad `requierePermiso` al item y manejarla:

```js
// En la sección items de clientes:
{
  icon: BookUser,
  label: 'Directorio de Contactos',
  href: '/contactos',
  shortcut: 'G B',
  // la visibilidad se controla donde se renderizan los items del menú
},
```

Buscar en FloatingHeader donde se hace `item.href` para renderizar cada sub-item y agregar el guard:
```jsx
if (item.href === '/contactos') return hasPermission('contactos', 'ver');
```

Seguir el mismo patrón que otros items con visibilidad condicional en ese archivo.

- [ ] **Paso 4: Agregar lazy import en App.jsx**

Después de la línea:
```js
const ClienteDetail = lazy(() => import('./pages/Clientes/ClienteDetail'));
```

Agregar:
```js
const ContactosList = lazy(() => import('./pages/Contactos/ContactosList'));
```

- [ ] **Paso 5: Agregar ruta en App.jsx**

Después del bloque de rutas de clientes (después de `/clientes/:id`):

```jsx
{/* ────────────────────────────────────────────────────────── */}
{/* CONTACTOS - Directorio global (solo admin) */}
{/* ────────────────────────────────────────────────────────── */}
<Route
  path="/contactos"
  element={
    <PermissionRoute module="contactos" action="ver">
      <ContactosList />
    </PermissionRoute>
  }
/>
```

- [ ] **Paso 6: Verificar en navegador**

```bash
cd frontend && npm run dev
```

1. Iniciar sesión como admin
2. Verificar que aparece "Directorio de Contactos" en el menú Clientes
3. Navegar a `/contactos` — debe mostrar la tabla (vacía o con datos)
4. Crear un contacto nuevo — el formulario debe funcionar
5. Click en una fila — el drawer debe abrirse
6. Navegar a un cliente → tab Contactos — debe mostrar la vista de asignación (no el formulario de creación)

- [ ] **Paso 7: Commit final**

```bash
git add frontend/src/components/layout/FloatingHeader.jsx frontend/src/App.jsx
git commit -m "feat: ruta /contactos + entrada menú Directorio de Contactos"
```

---

## Verificación final integral

- [ ] **Verificar servidor backend sin errores**

```bash
cd server && npm run dev
# Observar logs: sin errores Sequelize, migración aplicada, sin FK errors
```

- [ ] **Verificar endpoints backend con curl (admin token)**

```bash
# Reemplazar TOKEN con JWT real de sesión admin

# Listar directorio
curl -s -H "Authorization: Bearer TOKEN" http://localhost:5000/api/v1/contactos

# Crear contacto
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"nombre":"Ana González","tipo":"istho","cargo":"Supervisora","email":"ana@istho.com"}' \
  http://localhost:5000/api/v1/contactos

# Ver detalle (reemplazar ID)
curl -s -H "Authorization: Bearer TOKEN" http://localhost:5000/api/v1/contactos/ID

# Asignar a cliente (reemplazar ID y CLIENTE_ID)
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"cliente_id":CLIENTE_ID,"es_principal":true}' \
  http://localhost:5000/api/v1/contactos/ID/clientes

# Listar contactos del cliente
curl -s -H "Authorization: Bearer TOKEN" http://localhost:5000/api/v1/clientes/CLIENTE_ID/contactos
```

- [ ] **Verificar frontend**

1. Login admin → menú muestra "Directorio de Contactos"
2. `/contactos` carga con tabla
3. Crear contacto → aparece en tabla
4. Clic en fila → drawer muestra datos y botón "Asignar a cliente"
5. Asignar a un cliente → aparece en lista del drawer
6. Ir a ese cliente → tab Contactos → muestra el contacto asignado con badge tipo
7. Login supervisor → `/contactos` devuelve 403 (no tiene permiso)
8. Login supervisor → tab Contactos en cliente → ve la lista (solo lectura)

---

## Auto-review del plan vs spec

| Requisito spec | Tarea |
|---|---|
| Pivot `contacto_clientes` con `es_principal` | Tarea 1 |
| Hook afterSave en pivot | Tarea 2 (ContactoCliente.js) |
| `tipo` ENUM('istho','externo') en contactos | Tarea 1 + Tarea 2 (Contacto.js) |
| `usuario_id` FK nullable unique | Tarea 1 + Tarea 2 |
| Migración datos existentes | Tarea 1 (INSERT SELECT) |
| Asociaciones M:N Sequelize | Tarea 3 |
| Validadores express-validator | Tarea 4 |
| CRUD directorio admin | Tarea 5 |
| Rutas `/contactos` | Tarea 6 |
| Rutas `/clientes/:id/contactos` actualizadas | Tarea 7 |
| Seeds `contactos` permisos | Tarea 8 |
| `PERMISOS_POR_ROL.admin.contactos` | Tarea 8 |
| `contactosService` frontend | Tarea 9 |
| `ContactosList` con filtros y badges | Tarea 10 |
| `ContactoForm` con React Hook Form | Tarea 11 |
| `ContactoDrawer` con asignación inline | Tarea 12 |
| Tab Contactos en ClienteDetail (asignación) | Tarea 13 |
| Menú "Directorio" + ruta lazy | Tarea 14 |
| Auditoría en todo write | Tareas 5, 7 |
| `PermissionRoute module="contactos"` | Tarea 14 |
| `soloInternos: true` en menú | Heredado del grupo clientes |
