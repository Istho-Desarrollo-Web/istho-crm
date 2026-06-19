'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApiKey = sequelize.define(
    'ApiKey',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      descripcion: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      key_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      activa: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ultimo_uso: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      creado_por: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      tableName: 'api_keys',
      underscored: true,
    }
  );

  return ApiKey;
};
