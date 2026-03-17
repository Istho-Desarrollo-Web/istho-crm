/**
 * ISTHO CRM - Modelo Rol
 *
 * Roles dinámicos del sistema. Los roles base (admin, supervisor, operador, cliente)
 * se marcan como es_sistema y no pueden eliminarse.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Rol = sequelize.define('Rol', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    nombre: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: { msg: 'Ya existe un rol con este nombre' },
      validate: {
        notEmpty: { msg: 'El nombre del rol es requerido' },
        len: { args: [2, 50], msg: 'El nombre debe tener entre 2 y 50 caracteres' }
      }
    },

    codigo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El código del rol es requerido' },
        is: { args: /^[a-z_]+$/, msg: 'El código solo puede contener minúsculas y guiones bajos' }
      }
    },

    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true
    },

    nivel_jerarquia: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      validate: {
        min: { args: [1], msg: 'El nivel mínimo es 1' },
        max: { args: [100], msg: 'El nivel máximo es 100' }
      },
      comment: 'Mayor número = más permisos. Usado para requiereRolMinimo()'
    },

    es_sistema: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Roles del sistema no se pueden eliminar ni cambiar su código'
    },

    es_cliente: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indica si es un rol de portal cliente'
    },

    color: {
      type: DataTypes.STRING(7),
      allowNull: true,
      defaultValue: '#6B7280',
      comment: 'Color hex para badges en la UI'
    },

    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    tableName: 'roles',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['codigo'], unique: true },
      { fields: ['activo'] },
      { fields: ['nivel_jerarquia'] }
    ]
  });

  return Rol;
};
