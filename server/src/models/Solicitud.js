// server/src/models/Solicitud.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Solicitud extends Model {}

  Solicitud.init(
    {
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      numero_solicitud: { type: DataTypes.STRING(20), allowNull: false, unique: true },
      tipo: { type: DataTypes.ENUM('ingreso', 'despacho'), allowNull: false },
      cliente_id: { type: DataTypes.INTEGER, allowNull: false },
      creado_por: { type: DataTypes.INTEGER, allowNull: true },
      estado: {
        type: DataTypes.ENUM('recibida', 'en_proceso', 'completada', 'rechazada'),
        allowNull: false,
        defaultValue: 'recibida',
      },
      prioridad: {
        type: DataTypes.ENUM('normal', 'urgente'),
        allowNull: false,
        defaultValue: 'normal',
      },
      fecha_estimada: { type: DataTypes.DATEONLY, allowNull: true },
      numero_documento: { type: DataTypes.STRING(100), allowNull: true },
      transportista: { type: DataTypes.STRING(150), allowNull: true },
      direccion_entrega: { type: DataTypes.STRING(300), allowNull: true },
      contacto_destino: { type: DataTypes.STRING(200), allowNull: true },
      notas: { type: DataTypes.TEXT, allowNull: true },
      documento_url: { type: DataTypes.STRING(500), allowNull: true },
      operacion_id: { type: DataTypes.INTEGER, allowNull: true },
    },
    {
      sequelize,
      modelName: 'Solicitud',
      tableName: 'solicitudes',
      underscored: true,
      paranoid: true,
    }
  );

  return Solicitud;
};
