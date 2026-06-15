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
      INSERT IGNORE INTO contacto_clientes (contacto_id, cliente_id, es_principal, created_at, updated_at)
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

    // Eliminar índice sobre cliente_id si existe (MySQL retiene el índice tras DROP FOREIGN KEY)
    const [idxRows] = await queryInterface.sequelize.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'contactos'
        AND COLUMN_NAME = 'cliente_id'
        AND INDEX_NAME != 'PRIMARY'
      LIMIT 1
    `);
    if (idxRows.length > 0) {
      await queryInterface.sequelize.query(
        `ALTER TABLE contactos DROP INDEX ${idxRows[0].INDEX_NAME}`
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
