/**
 * ISTHO CRM - Modelo NotificacionEmail
 * 
 * Cola de correos para seguimiento y reintentos.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const NotificacionEmail = sequelize.define('NotificacionEmail', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Destinatarios
    para: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Correos destinatarios separados por coma'
    },
    
    cc: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    cco: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    
    // Contenido
    asunto: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    
    cuerpo_html: {
      type: DataTypes.TEXT('long'),
      allowNull: false
    },
    
    cuerpo_texto: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Versión texto plano'
    },
    
    // Adjuntos (JSON array)
    adjuntos: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const val = this.getDataValue('adjuntos');
        return val ? JSON.parse(val) : [];
      },
      set(val) {
        this.setDataValue('adjuntos', val ? JSON.stringify(val) : null);
      }
    },
    
    // Tipo de notificación
    tipo: {
      type: DataTypes.ENUM(
        'operacion_cierre',
        'alerta_inventario',
        'bienvenida',
        'recuperacion_password',
        'general'
      ),
      defaultValue: 'general'
    },
    
    // Referencia a la entidad relacionada
    referencia_tipo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: 'Ej: operacion, cliente, usuario'
    },
    
    referencia_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    
    // Estado
    estado: {
      type: DataTypes.ENUM('pendiente', 'enviado', 'fallido', 'cancelado'),
      defaultValue: 'pendiente'
    },
    
    intentos: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    
    max_intentos: {
      type: DataTypes.INTEGER,
      defaultValue: 3
    },
    
    // Fechas
    fecha_programada: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Para envíos programados'
    },
    
    fecha_envio: {
      type: DataTypes.DATE,
      allowNull: true
    },
    
    // Respuesta del servidor
    mensaje_id: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Message-ID del servidor SMTP'
    },
    
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensaje de error si falló'
    },
    
    // Metadata
    metadata: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const val = this.getDataValue('metadata');
        return val ? JSON.parse(val) : {};
      },
      set(val) {
        this.setDataValue('metadata', val ? JSON.stringify(val) : null);
      }
    },
    
    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'notificaciones_email',
    timestamps: true,
    underscored: true,
    
    indexes: [
      { fields: ['estado'] },
      { fields: ['tipo'] },
      { fields: ['referencia_tipo', 'referencia_id'] },
      { fields: ['fecha_programada'] }
    ]
  });

  /**
   * Verificar si se puede reintentar
   */
  NotificacionEmail.prototype.puedeReintentar = function() {
    return this.estado === 'fallido' && this.intentos < this.max_intentos;
  };

  return NotificacionEmail;
};