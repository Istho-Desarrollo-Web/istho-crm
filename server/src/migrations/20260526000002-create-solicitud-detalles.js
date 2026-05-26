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
