/**
 * ISTHO CRM - Modelo Vehículo
 *
 * Registro de vehículos de la empresa con datos de documentación
 * y asignación de conductor.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Vehiculo = sequelize.define('Vehiculo', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    placa: {
      type: DataTypes.STRING(10),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'La placa es requerida' },
        len: { args: [4, 10], msg: 'La placa debe tener entre 4 y 10 caracteres' }
      }
    },

    tipo_vehiculo: {
      type: DataTypes.ENUM('sencillo', 'tractomula', 'turbo', 'dobletroque', 'minimula', 'otro'),
      allowNull: false,
      defaultValue: 'sencillo'
    },

    capacidad_ton: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Capacidad en toneladas'
    },

    marca: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    modelo: {
      type: DataTypes.STRING(10),
      allowNull: true,
      comment: 'Año del modelo'
    },

    color: {
      type: DataTypes.STRING(30),
      allowNull: true
    },

    vencimiento_soat: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    vencimiento_tecnicomecanica: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    poliza_responsabilidad: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    numero_motor: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    numero_chasis: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    conductor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Conductor asignado por defecto'
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    estado: {
      type: DataTypes.ENUM('activo', 'inactivo', 'mantenimiento'),
      defaultValue: 'activo'
    }
  }, {
    tableName: 'vehiculos',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['placa'], unique: true },
      { fields: ['conductor_id'] },
      { fields: ['estado'] },
      { fields: ['tipo_vehiculo'] },
      { fields: ['vencimiento_soat'] },
      { fields: ['vencimiento_tecnicomecanica'] }
    ]
  });

  /**
   * Verificar si SOAT está vencido o por vencer (30 días)
   */
  Vehiculo.prototype.alertaSOAT = function() {
    if (!this.vencimiento_soat) return null;
    const hoy = new Date();
    const venc = new Date(this.vencimiento_soat);
    const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'por_vencer';
    return 'vigente';
  };

  /**
   * Verificar si tecnomecánica está vencida o por vencer (30 días)
   */
  Vehiculo.prototype.alertaTecnicomecanica = function() {
    if (!this.vencimiento_tecnicomecanica) return null;
    const hoy = new Date();
    const venc = new Date(this.vencimiento_tecnicomecanica);
    const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
    if (dias < 0) return 'vencido';
    if (dias <= 30) return 'por_vencer';
    return 'vigente';
  };

  return Vehiculo;
};
