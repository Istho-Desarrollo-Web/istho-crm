/**
 * ISTHO CRM - Modelo RolPermiso (tabla pivote)
 *
 * Relación many-to-many entre Rol y Permiso.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolPermiso = sequelize.define('RolPermiso', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    rol_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'roles', key: 'id' }
    },

    permiso_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'permisos', key: 'id' }
    }
  }, {
    tableName: 'rol_permisos',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['rol_id', 'permiso_id'], unique: true },
      { fields: ['rol_id'] },
      { fields: ['permiso_id'] }
    ]
  });

  return RolPermiso;
};
