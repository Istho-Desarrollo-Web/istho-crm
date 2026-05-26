// server/src/models/SolicitudDetalle.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class SolicitudDetalle extends Model {}

  SolicitudDetalle.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      solicitud_id: { type: DataTypes.INTEGER, allowNull: false },
      referencia: { type: DataTypes.STRING(100), allowNull: false },
      descripcion: { type: DataTypes.STRING(300), allowNull: true },
      cantidad: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
      unidad: {
        type: DataTypes.ENUM('caja', 'pallet', 'unidad'),
        allowNull: false,
        defaultValue: 'unidad',
      },
    },
    {
      sequelize,
      modelName: 'SolicitudDetalle',
      tableName: 'solicitud_detalles',
      underscored: true,
      paranoid: false,
    }
  );

  return SolicitudDetalle;
};
