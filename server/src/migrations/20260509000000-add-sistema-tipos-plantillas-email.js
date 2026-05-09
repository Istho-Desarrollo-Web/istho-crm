'use strict';

const { DataTypes } = require('sequelize');

/** Agrega 'reseteo_password' y 'recuperacion_password' al ENUM tipo de plantillas_email */
module.exports = {
  async up(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('plantillas_email')) return;

    await queryInterface.changeColumn('plantillas_email', 'tipo', {
      type: DataTypes.ENUM(
        'operacion_cierre',
        'alerta_inventario',
        'bienvenida',
        'general',
        'reseteo_password',
        'recuperacion_password'
      ),
      allowNull: false,
      defaultValue: 'general',
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('plantillas_email')) return;

    await queryInterface.changeColumn('plantillas_email', 'tipo', {
      type: DataTypes.ENUM('operacion_cierre', 'alerta_inventario', 'bienvenida', 'general'),
      allowNull: false,
      defaultValue: 'general',
    });
  },
};
