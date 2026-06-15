// server/src/models/Contacto.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Contacto = sequelize.define(
    'Contacto',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      tipo: {
        type: DataTypes.ENUM('istho', 'externo'),
        allowNull: false,
        defaultValue: 'externo',
      },

      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
      },

      nombre: {
        type: DataTypes.STRING(150),
        allowNull: false,
        validate: {
          notEmpty: { msg: 'El nombre es requerido' },
          len: { args: [2, 150], msg: 'El nombre debe tener entre 2 y 150 caracteres' },
        },
      },

      cargo: { type: DataTypes.STRING(100), allowNull: true },
      telefono: { type: DataTypes.STRING(50), allowNull: true },
      celular: { type: DataTypes.STRING(50), allowNull: true },

      email: {
        type: DataTypes.STRING(150),
        allowNull: true,
        validate: { isEmail: { msg: 'Debe ser un email válido' } },
      },

      recibe_notificaciones: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },

      tipos_notificacion: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: ['todas'],
      },

      notas: { type: DataTypes.TEXT, allowNull: true },
      activo: { type: DataTypes.BOOLEAN, defaultValue: true },
    },
    {
      tableName: 'contactos',
      timestamps: true,
      underscored: true,
      indexes: [
        { fields: ['email'] },
        { fields: ['tipo'] },
        { fields: ['activo'] },
        { fields: ['usuario_id'] },
      ],
    }
  );

  Contacto.prototype.getNombreConCargo = function () {
    return this.cargo ? `${this.nombre} (${this.cargo})` : this.nombre;
  };

  return Contacto;
};
