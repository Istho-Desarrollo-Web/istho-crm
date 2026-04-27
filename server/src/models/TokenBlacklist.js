const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TokenBlacklist = sequelize.define(
    'TokenBlacklist',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      expires_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    },
    {
      tableName: 'token_blacklist',
      underscored: true,
      timestamps: true,
      updatedAt: false,
    }
  );

  return TokenBlacklist;
};
