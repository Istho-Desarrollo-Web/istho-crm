/**
 * ISTHO CRM - Modelo Permiso
 *
 * Catálogo de permisos del sistema (módulo + acción).
 * Cada permiso representa una acción específica en un módulo.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Permiso = sequelize.define('Permiso', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    modulo: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El módulo es requerido' }
      },
      comment: 'Nombre del módulo (dashboard, clientes, inventario, etc.)'
    },

    accion: {
      type: DataTypes.STRING(30),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'La acción es requerida' }
      },
      comment: 'Acción dentro del módulo (ver, crear, editar, eliminar, etc.)'
    },

    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Descripción legible del permiso'
    },

    grupo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Grupo para organizar en la UI (ej: Operaciones, Gestión, Sistema)'
    }
  }, {
    tableName: 'permisos',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['modulo', 'accion'], unique: true },
      { fields: ['modulo'] },
      { fields: ['grupo'] }
    ]
  });

  return Permiso;
};
