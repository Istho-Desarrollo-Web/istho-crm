/**
 * ISTHO CRM - Modelo Caja Menor
 *
 * Gestión de cajas menores asignadas a conductores.
 * Controla saldos, estados y trazabilidad financiera.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes, Op } = require('sequelize');

module.exports = (sequelize) => {
  const CajaMenor = sequelize.define('CajaMenor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    numero: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Número de caja menor (CM-XXXX)'
    },

    conductor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Conductor asignado a la caja'
    },

    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Usuario que creó la caja (financiera/admin)'
    },

    saldo_inicial: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'El saldo inicial no puede ser negativo' }
      }
    },

    saldo_actual: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
      comment: 'Saldo calculado: inicial + ingresos - egresos aprobados'
    },

    total_ingresos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },

    total_egresos: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },

    estado: {
      type: DataTypes.ENUM('abierta', 'en_revision', 'cerrada'),
      defaultValue: 'abierta',
      allowNull: false
    },

    fecha_apertura: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },

    fecha_cierre: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    caja_anterior_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Caja de la cual se trasladó el sobrante'
    },

    saldo_trasladado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0,
      comment: 'Monto heredado de caja anterior'
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    observaciones_cierre: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    cerrada_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que cerró la caja'
    }
  }, {
    tableName: 'cajas_menores',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['numero'], unique: true },
      { fields: ['conductor_id'] },
      { fields: ['estado'] },
      { fields: ['creado_por'] },
      { fields: ['fecha_apertura'] },
      { fields: ['caja_anterior_id'] }
    ]
  });

  /**
   * Generar siguiente número de caja menor
   */
  CajaMenor.generarNumero = async function() {
    const ultima = await this.findOne({
      order: [['id', 'DESC']],
      paranoid: false
    });
    const siguiente = ultima ? ultima.id + 1 : 1;
    return `CM-${String(siguiente).padStart(4, '0')}`;
  };

  /**
   * Recalcular saldo basado en movimientos aprobados
   */
  CajaMenor.prototype.recalcularSaldo = async function(transaction) {
    const MovimientoCajaMenor = sequelize.models.MovimientoCajaMenor;

    const ingresos = await MovimientoCajaMenor.sum('valor_aprobado', {
      where: {
        caja_menor_id: this.id,
        tipo_movimiento: 'ingreso',
        aprobado: true
      },
      transaction
    }) || 0;

    const egresos = await MovimientoCajaMenor.sum('valor_aprobado', {
      where: {
        caja_menor_id: this.id,
        tipo_movimiento: 'egreso',
        aprobado: true
      },
      transaction
    }) || 0;

    const saldoInicial = parseFloat(this.saldo_inicial) + parseFloat(this.saldo_trasladado || 0);

    await this.update({
      total_ingresos: ingresos,
      total_egresos: egresos,
      saldo_actual: saldoInicial + ingresos - egresos
    }, { transaction });
  };

  return CajaMenor;
};
