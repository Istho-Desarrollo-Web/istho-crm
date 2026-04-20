const { DataTypes } = require('sequelize');

const MAX_HISTORICO = 5;

module.exports = (sequelize) => {
  const PasswordHistorico = sequelize.define('PasswordHistorico', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    tableName: 'password_historico',
    underscored: true,
    timestamps: true,
    updatedAt: false
  });

  PasswordHistorico.MAX_HISTORICO = MAX_HISTORICO;

  return PasswordHistorico;
};
