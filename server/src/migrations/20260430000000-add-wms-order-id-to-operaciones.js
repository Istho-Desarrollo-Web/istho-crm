'use strict';

const { DataTypes } = require('sequelize');

/** Agrega wms_order_id a operaciones para deduplicación con el modelo PULL */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('operaciones')) return;

    const cols = await queryInterface.describeTable('operaciones');
    if (!cols.wms_order_id) {
      await queryInterface.addColumn('operaciones', 'wms_order_id', {
        type: DataTypes.STRING(36),
        allowNull: true,
        defaultValue: null,
        after: 'documento_wms',
      });
    }

    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM operaciones WHERE Key_name = 'idx_operaciones_wms_order_id'"
    );
    if (indexes.length === 0) {
      await queryInterface.addIndex('operaciones', ['wms_order_id'], {
        name: 'idx_operaciones_wms_order_id',
        unique: true,
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('operaciones')) return;

    const [indexes] = await queryInterface.sequelize.query(
      "SHOW INDEX FROM operaciones WHERE Key_name = 'idx_operaciones_wms_order_id'"
    );
    if (indexes.length > 0) {
      await queryInterface.removeIndex('operaciones', 'idx_operaciones_wms_order_id');
    }

    const cols = await queryInterface.describeTable('operaciones');
    if (cols.wms_order_id) {
      await queryInterface.removeColumn('operaciones', 'wms_order_id');
    }
  },
};
