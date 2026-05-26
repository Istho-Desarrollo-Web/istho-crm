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
    await queryInterface.addIndex('solicitudes', ['cliente_id'], { name: 'idx_solicitudes_cliente_id' });
    await queryInterface.addIndex('solicitudes', ['estado'], { name: 'idx_solicitudes_estado' });
    await queryInterface.addIndex('solicitudes', ['operacion_id'], { name: 'idx_solicitudes_operacion_id' });
  },
  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('solicitudes')) return;
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
    await queryInterface.dropTable('solicitudes');
    await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  },
};
