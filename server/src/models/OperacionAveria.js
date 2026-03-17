/**
 * ISTHO CRM - Modelo OperacionAveria
 * 
 * Evidencias fotográficas de averías por referencia.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OperacionAveria = sequelize.define('OperacionAveria', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    operacion_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'operaciones',
        key: 'id'
      }
    },
    
    detalle_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'operacion_detalle',
        key: 'id'
      },
      comment: 'Referencia al detalle/producto específico'
    },
    
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'SKU del producto con avería'
    },
    
    cantidad: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
      comment: 'Cantidad de unidades averiadas'
    },
    
    tipo_averia: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Tipo: golpeado, mojado, roto, vencido, etc.'
    },
    
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Evidencia fotográfica
    foto_url: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Ruta de la foto de evidencia'
    },
    
    foto_nombre: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    
    foto_tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'MIME type de la imagen'
    },
    
    foto_tamanio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tamaño en bytes'
    },
    
    // Usuario que registró
    registrado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    }
  }, {
    tableName: 'operacion_averias',
    timestamps: true,
    underscored: true,
    
    indexes: [
      { fields: ['operacion_id'] },
      { fields: ['detalle_id'] },
      { fields: ['sku'] }
    ]
  });

  return OperacionAveria;
};