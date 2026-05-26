// server/src/models/SolicitudComentario.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class SolicitudComentario extends Model {}

  SolicitudComentario.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      solicitud_id: { type: DataTypes.INTEGER, allowNull: false },
      usuario_id: { type: DataTypes.INTEGER, allowNull: true },
      mensaje: { type: DataTypes.TEXT, allowNull: false },
      archivo_url: { type: DataTypes.STRING(500), allowNull: true },
      es_interno: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    },
    {
      sequelize,
      modelName: 'SolicitudComentario',
      tableName: 'solicitud_comentarios',
      underscored: true,
      paranoid: false,
    }
  );

  return SolicitudComentario;
};
