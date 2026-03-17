/**
 * ISTHO CRM - Modelo Viaje
 *
 * Registro de viajes realizados por conductores.
 * Vinculado a caja menor, vehículo y gastos asociados.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Viaje = sequelize.define('Viaje', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Número consecutivo del viaje'
    },

    fecha: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    vehiculo_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    conductor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    caja_menor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Caja menor asociada (puede ser null si no aplica)'
    },

    cliente_nombre: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Nombre del cliente destino'
    },

    documento_cliente: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Documento o remisión del cliente'
    },

    origen: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: 'GIRARDOTA',
      validate: {
        notEmpty: { msg: 'El origen es requerido' }
      }
    },

    destino: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El destino es requerido' }
      }
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Información adicional
    peso: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Peso en kg'
    },

    valor_descargue: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    },

    num_personas: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Número de personas en el viaje'
    },

    // Datos de facturación
    no_factura: {
      type: DataTypes.STRING(50),
      allowNull: true
    },

    facturado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    valor_viaje: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    },

    estado: {
      type: DataTypes.ENUM('activo', 'completado', 'anulado'),
      defaultValue: 'activo'
    }
  }, {
    tableName: 'viajes',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['numero'], unique: true },
      { fields: ['vehiculo_id'] },
      { fields: ['conductor_id'] },
      { fields: ['caja_menor_id'] },
      { fields: ['fecha'] },
      { fields: ['estado'] },
      { fields: ['documento_cliente'] }
    ]
  });

  /**
   * Generar siguiente número de viaje
   */
  Viaje.generarNumero = async function() {
    const ultimo = await this.findOne({
      order: [['id', 'DESC']],
      paranoid: false
    });
    const siguiente = ultimo ? ultimo.id + 1 : 1;
    return String(siguiente);
  };

  return Viaje;
};
