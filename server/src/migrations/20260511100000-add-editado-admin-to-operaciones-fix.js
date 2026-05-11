'use strict';

const { DataTypes } = require('sequelize');

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
