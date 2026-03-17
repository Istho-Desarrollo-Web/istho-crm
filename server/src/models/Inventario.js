/**
 * ISTHO CRM - Modelo Inventario
 * 
 * Gestiona el inventario de productos almacenados por cliente.
 * Incluye control de stock, ubicaciones y alertas.
 * Preparado para sincronización con WMS Copérnico.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Inventario = sequelize.define('Inventario', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    
    sku: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Código único del producto'
    },
    
    codigo_barras: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código de barras EAN/UPC'
    },
    
    producto: {
      type: DataTypes.STRING(200),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'El nombre del producto es requerido' }
      }
    },
    
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    categoria: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Categoría del producto'
    },
    
    unidad_medida: {
      type: DataTypes.STRING(20),
      defaultValue: 'UND',
      comment: 'UND, KG, LT, CAJ, PAQ, etc.'
    },
    
    cantidad: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'La cantidad no puede ser negativa' }
      }
    },
    
    cantidad_reservada: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
      comment: 'Cantidad reservada para despachos pendientes'
    },
    
    cantidad_disponible: {
      type: DataTypes.VIRTUAL,
      get() {
        const cantidad = parseFloat(this.getDataValue('cantidad')) || 0;
        const reservada = parseFloat(this.getDataValue('cantidad_reservada')) || 0;
        return cantidad - reservada;
      }
    },
    
    stock_minimo: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
      comment: 'Cantidad mínima para alertas de stock bajo'
    },
    
    stock_maximo: {
      type: DataTypes.DECIMAL(15, 3),
      allowNull: true,
      comment: 'Cantidad máxima recomendada'
    },
    
    ubicacion: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Ubicación física en bodega (ej: A-01-02)'
    },
    
    zona: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Zona de la bodega (ej: Refrigerado, Seco, etc.)'
    },
    
    lote: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número de lote'
    },
    
    fecha_vencimiento: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    
    fecha_ingreso: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: DataTypes.NOW
    },
    
    costo_unitario: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      comment: 'Costo unitario en COP'
    },
    
    valor_total: {
      type: DataTypes.VIRTUAL,
      get() {
        const cantidad = parseFloat(this.getDataValue('cantidad')) || 0;
        const costo = parseFloat(this.getDataValue('costo_unitario')) || 0;
        return cantidad * costo;
      }
    },
    
    estado: {
      type: DataTypes.ENUM('disponible', 'reservado', 'dañado', 'cuarentena', 'vencido'),
      defaultValue: 'disponible'
    },
    
    // Campos para integración WMS
    codigo_wms: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Código del producto en WMS Copérnico'
    },
    
    ultima_sincronizacion_wms: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    notas: {
      type: DataTypes.TEXT,
      allowNull: true
    },

    // Control de alertas silenciadas/descartadas
    alertas_silenciadas: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: null,
      comment: 'Tipos de alerta silenciados: { "agotado": "2026-03-11", "bajo_stock": "2026-03-11" }'
    }
  }, {
    tableName: 'inventario',
    timestamps: true,
    underscored: true,
    
    indexes: [
      { fields: ['cliente_id'] },
      { fields: ['sku'] },
      { fields: ['codigo_barras'] },
      { fields: ['producto'] },
      { fields: ['ubicacion'] },
      { fields: ['estado'] },
      { fields: ['lote'] },
      { fields: ['fecha_vencimiento'] },
      // Índice compuesto para SKU único por cliente (referencia)
      {
        unique: true,
        fields: ['cliente_id', 'sku'],
        name: 'idx_cliente_sku'
      }
    ]
  });

  // ============================================
  // MÉTODOS DE INSTANCIA
  // ============================================

  /**
   * Verificar si el stock está bajo
   */
  Inventario.prototype.tieneStockBajo = function() {
    const cantidad = parseFloat(this.cantidad) || 0;
    const minimo = parseFloat(this.stock_minimo) || 0;
    return minimo > 0 && cantidad <= minimo;
  };

  /**
   * Verificar si está próximo a vencer (30 días)
   */
  Inventario.prototype.proximoAVencer = function(dias = 30) {
    if (!this.fecha_vencimiento) return false;
    const hoy = new Date();
    const vencimiento = new Date(this.fecha_vencimiento);
    const diferencia = (vencimiento - hoy) / (1000 * 60 * 60 * 24);
    return diferencia <= dias && diferencia >= 0;
  };

  /**
   * Verificar si está vencido
   */
  Inventario.prototype.estaVencido = function() {
    if (!this.fecha_vencimiento) return false;
    return new Date(this.fecha_vencimiento) < new Date();
  };

  // ============================================
  // SCOPES
  // ============================================

  Inventario.addScope('disponible', {
    where: { estado: 'disponible' }
  });

  Inventario.addScope('stockBajo', {
    where: sequelize.literal('cantidad <= stock_minimo AND stock_minimo > 0')
  });

  Inventario.addScope('porVencer', (dias = 30) => ({
    where: {
      fecha_vencimiento: {
        [require('sequelize').Op.between]: [
          new Date(),
          new Date(Date.now() + dias * 24 * 60 * 60 * 1000)
        ]
      }
    }
  }));

  return Inventario;
};