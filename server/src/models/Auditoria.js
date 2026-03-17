/**
 * ISTHO CRM - Modelo Auditoría
 * 
 * Registra todas las acciones realizadas en el sistema.
 * Cumple con requisitos ISO 9001 de trazabilidad.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Auditoria = sequelize.define('Auditoria', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    tabla: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Nombre de la tabla afectada'
    },
    
    registro_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'ID del registro afectado'
    },
    
    accion: {
      type: DataTypes.ENUM('crear', 'actualizar', 'eliminar', 'login', 'logout'),
      allowNull: false
    },
    
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'usuarios',
        key: 'id'
      }
    },
    
    usuario_nombre: {
      type: DataTypes.STRING(150),
      allowNull: true,
      comment: 'Nombre del usuario (snapshot)'
    },
    
    datos_anteriores: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Estado antes del cambio'
    },
    
    datos_nuevos: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Estado después del cambio'
    },
    
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    
    descripcion: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Descripción legible de la acción'
    }
  }, {
    tableName: 'auditoria',
    timestamps: true,
    underscored: true,
    updatedAt: false, // Solo created_at, los registros no se modifican
    
    indexes: [
      { fields: ['tabla', 'registro_id'] },
      { fields: ['usuario_id'] },
      { fields: ['accion'] },
      { fields: ['created_at'] }
    ]
  });

  // ============================================
  // MÉTODOS ESTÁTICOS
  // ============================================

  /**
   * Registrar acción en auditoría
   * @param {Object} params - Parámetros de la auditoría
   */
  Auditoria.registrar = async function({
    tabla,
    registro_id,
    accion,
    usuario_id = null,
    usuario_nombre = null,
    datos_anteriores = null,
    datos_nuevos = null,
    ip_address = null,
    user_agent = null,
    descripcion = null
  }) {
    try {
      return await this.create({
        tabla,
        registro_id,
        accion,
        usuario_id,
        usuario_nombre,
        datos_anteriores,
        datos_nuevos,
        ip_address,
        user_agent,
        descripcion
      });
    } catch (error) {
      console.error('[AUDITORIA] Error al registrar:', error.message);
      // No lanzamos error para no interrumpir operación principal
    }
  };

  /**
   * Obtener historial de un registro
   * @param {string} tabla - Nombre de la tabla
   * @param {number} registroId - ID del registro
   */
  Auditoria.getHistorial = async function(tabla, registroId) {
    return await this.findAll({
      where: { tabla, registro_id: registroId },
      order: [['created_at', 'DESC']],
      include: [{
        model: sequelize.models.Usuario,
        as: 'usuario',
        attributes: ['id', 'username', 'nombre_completo']
      }]
    });
  };

  return Auditoria;
};