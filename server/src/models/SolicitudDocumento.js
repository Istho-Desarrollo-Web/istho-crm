// server/src/models/SolicitudDocumento.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class SolicitudDocumento extends Model {}

  SolicitudDocumento.init(
    {
      id:              { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      solicitud_id:    { type: DataTypes.INTEGER, allowNull: false },
      nombre_original: { type: DataTypes.STRING(255), allowNull: false },
      s3_key:          { type: DataTypes.STRING(500), allowNull: false },
    },
    {
      sequelize,
      modelName: 'SolicitudDocumento',
      tableName: 'solicitud_documentos',
      underscored: true,
      paranoid: false,
    }
  );

  return SolicitudDocumento;
};
