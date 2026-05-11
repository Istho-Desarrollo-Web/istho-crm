'use strict';

const { DataTypes } = require('sequelize');

/** Agrega editado_admin a operaciones para marcar ediciones administrativas */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('operaciones')) return;

    const cols = await queryInterface.describeTable('operaciones');
    if (!cols.editado_admin) {
      await queryInterface.addColumn('operaciones', 'editado_admin', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        after: 'wms_order_id',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('operaciones')) return;

    const cols = await queryInterface.describeTable('operaciones');
    if (cols.editado_admin) {
      await queryInterface.removeColumn('operaciones', 'editado_admin');
    }
  },
};
