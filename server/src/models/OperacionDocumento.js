/**
 * ISTHO CRM - Modelo OperacionDocumento
 * 
 * Documentos de cumplido de cada operación.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OperacionDocumento = sequelize.define('OperacionDocumento', {
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
    
    tipo_documento: {
      type: DataTypes.ENUM(
        'cumplido',
        'factura',
        'remision',
        'acta_entrega',
        'documento_importacion',
        'otro'
      ),
      defaultValue: 'cumplido'
    },
    
    nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre descriptivo del documento'
    },
    
    archivo_url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Ruta del archivo'
    },
    
    archivo_nombre: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nombre original del archivo'
    },
    
    archivo_tipo: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'MIME type'
    },
    
    archivo_tamanio: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tamaño en bytes'
    },
    
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Usuario que subió
    subido_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    }
  }, {
    tableName: 'operacion_documentos',
    timestamps: true,
    underscored: true,
    
    indexes: [
      { fields: ['operacion_id'] },
      { fields: ['tipo_documento'] }
    ]
  });

  return OperacionDocumento;
};