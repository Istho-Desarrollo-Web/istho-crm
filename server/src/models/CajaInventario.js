/**
 * ISTHO CRM - Modelo CajaInventario
 *
 * Representa una caja individual dentro del inventario.
 * Un producto (Inventario/Referencia) puede tener N cajas.
 * Cada caja se origina de una operación de entrada o salida.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CajaInventario = sequelize.define('CajaInventario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    // Referencia al producto maestro
    inventario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'inventario',
        key: 'id'
      },
      comment: 'Referencia al producto maestro (Inventario)'
    },

    // Referencia a la operación que originó esta caja
    operacion_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'operaciones',
        key: 'id'
      },
      comment: 'Operación de entrada o salida'
    },

    // Referencia al detalle de operación
    operacion_detalle_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'operacion_detalle',
        key: 'id'
      },
      comment: 'Línea específica de la operación'
    },

    // Identificación de la caja
    numero_caja: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número de caja del WMS (ej: 12345)'
    },

    lote: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número de lote (ej: 20260309)'
    },

    ubicacion: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Ubicación física en bodega (ej: A1-B2-C3)'
    },

    // Cantidades
    cantidad: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
      defaultValue: 0,
      comment: 'Cantidad de unidades en esta caja'
    },

    peso: {
      type: DataTypes.DECIMAL(15, 4),
      allowNull: true,
      comment: 'Peso en KG'
    },

    unidad_medida: {
      type: DataTypes.STRING(20),
      defaultValue: 'UND',
      comment: 'UND, KG, LT, CAJ, etc.'
    },

    // Tipo de movimiento
    tipo: {
      type: DataTypes.ENUM('entrada', 'salida', 'kardex'),
      allowNull: false,
      comment: 'Si la caja ingresó, salió o fue ajustada por kardex'
    },

    // Estado de la caja
    estado: {
      type: DataTypes.ENUM('disponible', 'despachada', 'en_transito', 'dañada', 'devuelta', 'inactiva'),
      defaultValue: 'disponible',
      comment: 'Estado actual de la caja'
    },

    // Documentación
    documento_asociado: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Documento/pedido asociado (ej: KDC9059)'
    },

    lote_externo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Lote externo del WMS'
    },

    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },

    fecha_movimiento: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha en que se registró el movimiento'
    },

    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'caja_inventario',
    timestamps: true,
    underscored: true,

    indexes: [
      { fields: ['inventario_id'] },
      { fields: ['operacion_id'] },
      { fields: ['operacion_detalle_id'] },
      { fields: ['numero_caja'] },
      { fields: ['lote'] },
      { fields: ['tipo'] },
      { fields: ['estado'] },
      { fields: ['ubicacion'] },
      // Para buscar cajas disponibles de un producto
      {
        fields: ['inventario_id', 'tipo', 'estado'],
        name: 'idx_caja_inv_tipo_estado'
      }
    ]
  });

  return CajaInventario;
};

