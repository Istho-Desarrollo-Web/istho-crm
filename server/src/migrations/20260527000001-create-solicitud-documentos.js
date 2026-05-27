'use strict';
const { DataTypes } = require('sequelize');

module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('solicitud_documentos')) return;
    await queryInterface.createTable('solicitud_documentos', {
      id:           { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
      solicitud_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'solicitudes', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
      nombre_original: { type: DataTypes.STRING(255), allowNull: false },
      s3_key:       { type: DataTypes.STRING(500), allowNull: false },
      created_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
      updated_at:   { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    });
    await queryInterface.addIndex('solicitud_documentos', ['solicitud_id'], { name: 'idx_sol_docs_solicitud' });
  },
  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('solicitud_documentos')) return;
    await queryInterface.dropTable('solicitud_documentos');
  },
};
