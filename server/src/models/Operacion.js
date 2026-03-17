/**
 * ISTHO CRM - Modelo Operación
 *
 * Gestiona las operaciones de ingreso y salida de mercancía.
 * Vinculado a documentos del WMS (opcional para modo manual).
 *
 * MODIFICACIÓN v1.2.0:
 * - Campos WMS: numero_picking, tipo_documento_wms, sucursal_entrega, ciudad_destino
 *
 * MODIFICACIÓN v1.1.0:
 * - documento_wms ahora es opcional (allowNull: true)
 * - Agregado campo vehiculo_tipo
 * - Agregado campo prioridad
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.2.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Operacion = sequelize.define('Operacion', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Número interno del CRM
    numero_operacion: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: 'Número interno CRM (ej: OP-2026-0001)'
    },
    
    // Tipo de operación
    tipo: {
      type: DataTypes.ENUM('ingreso', 'salida', 'kardex'),
      allowNull: false
    },
    
    // ✅ MODIFICADO: Referencia al documento del WMS (ahora opcional)
    documento_wms: {
      type: DataTypes.STRING(50),
      allowNull: true,  // ← CAMBIADO de false a true
      comment: 'Número de documento en el WMS (opcional para modo manual)'
    },
    
    // Cliente
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'clientes',
        key: 'id'
      }
    },
    
    // Fechas
    fecha_documento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Fecha del documento WMS'
    },
    
    fecha_operacion: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      comment: 'Fecha de la operación en CRM'
    },
    
    fecha_cierre: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Fecha y hora de cierre de la operación'
    },
    
    // Información de transporte
    origen: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    
    destino: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    
    vehiculo_placa: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    
    // ✅ AGREGADO: Tipo de vehículo
    vehiculo_tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Tipo de vehículo (Furgón, Turbo, Tractomula, etc.)'
    },
    
    conductor_nombre: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    
    conductor_cedula: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    
    conductor_telefono: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    
    // Totales
    total_referencias: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de SKUs/referencias'
    },
    
    total_unidades: {
      type: DataTypes.DECIMAL(15, 3),
      defaultValue: 0,
      comment: 'Total de unidades'
    },
    
    total_averias: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Total de unidades con avería'
    },
    
    // ✅ AGREGADO: Prioridad de la operación
    prioridad: {
      type: DataTypes.ENUM('baja', 'normal', 'alta', 'urgente'),
      defaultValue: 'normal',
      comment: 'Prioridad de la operación'
    },
    
    // Estado
    estado: {
      type: DataTypes.ENUM('pendiente', 'en_proceso', 'cerrado', 'anulado'),
      defaultValue: 'pendiente'
    },
    
    // Notificación
    correo_enviado: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    
    fecha_correo_enviado: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    correos_destino: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Lista de correos separados por coma'
    },
    
    // Observaciones
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    observaciones_cierre: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Usuario
    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    
    cerrado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },

    // ═══════════════════════════════════════════════
    // CAMPOS WMS v1.2.0
    // ═══════════════════════════════════════════════

    numero_picking: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Número de picking del WMS (para salidas)'
    },

    tipo_documento_wms: {
      type: DataTypes.ENUM('CO', 'PK', 'CR'),
      allowNull: true,
      comment: 'Tipo de documento WMS: CO=Recepción, PK=Picking, CR=Kardex'
    },

    // Motivo del Kardex (solo para tipo='kardex')
    motivo_kardex: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Motivo del ajuste Kardex (lista predefinida o texto libre)'
    },

    sucursal_entrega: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: 'Sucursal de entrega del WMS'
    },

    ciudad_destino: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Ciudad de destino del WMS'
    }
  }, {
    tableName: 'operaciones',
    timestamps: true,
    underscored: true,
    paranoid: true,
    
    indexes: [
      { fields: ['numero_operacion'], unique: true },
      { fields: ['documento_wms'] },
      { fields: ['cliente_id'] },
      { fields: ['tipo'] },
      { fields: ['estado'] },
      { fields: ['fecha_operacion'] },
      { fields: ['prioridad'] },
      { fields: ['tipo_documento_wms'] }
    ]
  });

  // ============================================
  // MÉTODOS DE INSTANCIA
  // ============================================
  
  /**
   * Verificar si se puede editar
   */
  Operacion.prototype.esEditable = function() {
    return ['pendiente', 'en_proceso'].includes(this.estado);
  };
  
  /**
   * Verificar si se puede cerrar
   */
  Operacion.prototype.puedeCerrarse = function() {
    return this.estado === 'en_proceso';
  };
  
  /**
   * Obtener resumen para correo
   */
  Operacion.prototype.getResumenCorreo = function() {
    return {
      numero_operacion: this.numero_operacion,
      tipo: this.tipo === 'ingreso' ? 'INGRESO DE MERCANCÍA' : this.tipo === 'kardex' ? 'KARDEX (AJUSTE)' : 'SALIDA DE MERCANCÍA',
      documento_wms: this.documento_wms || 'N/A (Manual)',
      fecha: this.fecha_operacion,
      total_referencias: this.total_referencias,
      total_unidades: this.total_unidades,
      total_averias: this.total_averias,
      origen: this.origen,
      destino: this.destino,
      placa: this.vehiculo_placa,
      conductor: this.conductor_nombre,
      prioridad: this.prioridad
    };
  };
  
  /**
   * Verificar si es operación manual (sin WMS)
   */
  Operacion.prototype.esManual = function() {
    return !this.documento_wms;
  };

  return Operacion;
};