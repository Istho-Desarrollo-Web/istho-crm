// server/src/models/ClienteResponsable.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class ClienteResponsable extends Model {}

  ClienteResponsable.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false },
      usuario_id: { type: DataTypes.INTEGER, allowNull: false },
    },
    {
      sequelize,
      modelName: 'ClienteResponsable',
      tableName: 'cliente_responsables',
      underscored: true,
      paranoid: false,
      indexes: [
        { unique: true, fields: ['cliente_id', 'usuario_id'] },
      ],
    }
  );

  return ClienteResponsable;
};
