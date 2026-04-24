'use strict';

const { DataTypes } = require('sequelize');

/** Agrega 'batch' al ENUM tipo de wms_sync_logs */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('wms_sync_logs')) return;

    await queryInterface.changeColumn('wms_sync_logs', 'tipo', {
      type: DataTypes.ENUM('productos', 'entrada', 'salida', 'kardex', 'batch'),
      allowNull: false,
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('wms_sync_logs')) return;

    await queryInterface.changeColumn('wms_sync_logs', 'tipo', {
      type: DataTypes.ENUM('productos', 'entrada', 'salida', 'kardex'),
      allowNull: false,
    });
  },
};
