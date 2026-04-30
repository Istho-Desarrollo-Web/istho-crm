const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const WmsSyncLog = sequelize.define(
    'WmsSyncLog',
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      tipo: {
        type: DataTypes.ENUM(
          'productos',
          'entrada',
          'salida',
          'kardex',
          'batch',
          'polling_entrada',
          'polling_salida'
        ),
        allowNull: false,
      },
      documento_origen: { type: DataTypes.STRING(150), allowNull: true },
      nit: { type: DataTypes.STRING(20), allowNull: true },
      estado: {
        type: DataTypes.ENUM('exitoso', 'fallido'),
        allowNull: false,
        defaultValue: 'exitoso',
      },
      error_mensaje: { type: DataTypes.TEXT, allowNull: true },
      detalles: { type: DataTypes.JSON, allowNull: true },
      payload: { type: DataTypes.JSON, allowNull: true },
      ip_origen: { type: DataTypes.STRING(45), allowNull: true },
    },
    {
      tableName: 'wms_sync_logs',
      underscored: true,
      timestamps: true,
      paranoid: false,
    }
  );

  return WmsSyncLog;
};
