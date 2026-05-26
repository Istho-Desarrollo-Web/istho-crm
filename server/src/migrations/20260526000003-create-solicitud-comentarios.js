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
    await queryInterface.addIndex('solicitud_comentarios', ['solicitud_id'], { name: 'idx_solicitud_comentarios_solicitud_id' });
  },
  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('solicitud_comentarios')) return;
    await queryInterface.dropTable('solicitud_comentarios');
  },
};
