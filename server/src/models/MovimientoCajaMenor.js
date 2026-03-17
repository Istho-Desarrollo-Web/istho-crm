/**
 * ISTHO CRM - Modelo Movimiento Caja Menor
 *
 * Registra ingresos y egresos asociados a una caja menor.
 * Puede estar vinculado a un viaje o ser un movimiento directo.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

// Conceptos de egreso
const CONCEPTOS_EGRESO = [
  'cuadre_de_caja', 'descargues', 'acpm', 'administracion', 'alimentacion',
  'comisiones', 'desencarpe', 'encarpe', 'hospedaje', 'otros',
  'seguros', 'repuestos', 'tecnicomecanica', 'peajes', 'ligas',
  'parqueadero', 'urea'
];

// Conceptos de ingreso
const CONCEPTOS_INGRESO = [
  'ingreso_adicional', 'cuadre_de_caja', 'peajes_ingreso',
  'ligas_ingresos', 'parqueadero_ingresos', 'urea_ingresos'
];

const TODOS_CONCEPTOS = [...new Set([...CONCEPTOS_EGRESO, ...CONCEPTOS_INGRESO])];

module.exports = (sequelize) => {
  const MovimientoCajaMenor = sequelize.define('MovimientoCajaMenor', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    consecutivo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Consecutivo global de movimientos'
    },

    caja_menor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    viaje_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Viaje asociado (null si es movimiento directo)'
    },

    tipo_movimiento: {
      type: DataTypes.ENUM('ingreso', 'egreso'),
      allowNull: false
    },

    concepto: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El concepto es requerido' }
      }
    },

    concepto_otro: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Descripción cuando concepto = otros'
    },

    valor: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        min: { args: [0], msg: 'El valor no puede ser negativo' }
      }
    },

    aprobado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    valor_aprobado: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: true,
      comment: 'Valor aprobado por financiera (puede diferir del valor original)'
    },

    aprobado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Usuario que aprobó/rechazó el movimiento'
    },

    fecha_aprobacion: {
      type: DataTypes.DATE,
      allowNull: true
    },

    rechazado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },

    observaciones_aprobacion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    soporte_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta del archivo de soporte (factura, recibo, foto)'
    },

    soporte_nombre: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nombre original del archivo de soporte'
    },

    conductor_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Conductor que registró el movimiento'
    }
  }, {
    tableName: 'movimientos_caja_menor',
    timestamps: true,
    underscored: true,
    paranoid: true,
    indexes: [
      { fields: ['consecutivo'], unique: true },
      { fields: ['caja_menor_id'] },
      { fields: ['viaje_id'] },
      { fields: ['tipo_movimiento'] },
      { fields: ['concepto'] },
      { fields: ['aprobado'] },
      { fields: ['conductor_id'] },
      { fields: ['caja_menor_id', 'tipo_movimiento'] }
    ]
  });

  /**
   * Generar siguiente consecutivo
   */
  MovimientoCajaMenor.generarConsecutivo = async function() {
    const ultimo = await this.findOne({
      order: [['consecutivo', 'DESC']],
      paranoid: false
    });
    return ultimo ? ultimo.consecutivo + 1 : 1;
  };

  /**
   * Obtener label legible del concepto
   */
  MovimientoCajaMenor.prototype.getConceptoLabel = function() {
    const labels = {
      cuadre_de_caja: 'Cuadre de Caja',
      descargues: 'Descargues',
      acpm: 'ACPM',
      administracion: 'Administración',
      alimentacion: 'Alimentación',
      comisiones: 'Comisiones',
      desencarpe: 'Desencarpe',
      encarpe: 'Encarpe',
      hospedaje: 'Hospedaje',
      otros: 'Otros',
      seguros: 'Seguros',
      repuestos: 'Repuestos',
      tecnicomecanica: 'Tecnomecánica',
      peajes: 'Peajes',
      ligas: 'Ligas',
      parqueadero: 'Parqueadero',
      urea: 'UREA',
      ingreso_adicional: 'Ingreso Adicional',
      peajes_ingreso: 'Peajes Ingreso',
      ligas_ingresos: 'Ligas Ingresos',
      parqueadero_ingresos: 'Parqueadero Ingresos',
      urea_ingresos: 'UREA Ingresos'
    };
    return labels[this.concepto] || this.concepto;
  };

  // Exportar constantes útiles
  MovimientoCajaMenor.CONCEPTOS_EGRESO = CONCEPTOS_EGRESO;
  MovimientoCajaMenor.CONCEPTOS_INGRESO = CONCEPTOS_INGRESO;
  MovimientoCajaMenor.TODOS_CONCEPTOS = TODOS_CONCEPTOS;

  return MovimientoCajaMenor;
};
