/**
 * ============================================================================
 * ISTHO CRM - Modelo Notificacion
 * ============================================================================
 * Modelo para gestionar notificaciones del sistema.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

const { DataTypes, Model, Op } = require('sequelize');

module.exports = (sequelize) => {
  class Notificacion extends Model {
    // ════════════════════════════════════════════════════════════════════════
    // MÉTODOS ESTÁTICOS
    // ════════════════════════════════════════════════════════════════════════

    /**
     * Crear una notificación
     */
    static async crear(data) {
      return await this.create({
        usuario_id: data.usuario_id,
        tipo: data.tipo || 'sistema',
        titulo: data.titulo,
        mensaje: data.mensaje,
        prioridad: data.prioridad || 'normal',
        accion_url: data.accion_url || null,
        accion_label: data.accion_label || null,
        metadata: data.metadata || null,
      });
    }

    /**
     * Obtener notificaciones de un usuario
     */
    static async getByUsuario(usuario_id, options = {}) {
      const { 
        page = 1, 
        limit = 50, 
        tipo = null, 
        soloNoLeidas = false 
      } = options;

      const where = { usuario_id };
      
      if (tipo) {
        where.tipo = tipo;
      }
      
      if (soloNoLeidas) {
        where.leida = false;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await this.findAndCountAll({
        where,
        order: [
          ['prioridad', 'DESC'], // Urgentes primero
          ['created_at', 'DESC']
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
      });

      return {
        data: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / limit),
        },
      };
    }

    /**
     * Contar no leídas
     */
    static async contarNoLeidas(usuario_id) {
      return await this.count({
        where: { usuario_id, leida: false }
      });
    }

    /**
     * Marcar como leída
     */
    static async marcarLeida(id, usuario_id) {
      const [updated] = await this.update(
        { leida: true, fecha_lectura: new Date() },
        { where: { id, usuario_id } }
      );
      return updated > 0;
    }

    /**
     * Marcar todas como leídas
     */
    static async marcarTodasLeidas(usuario_id) {
      const [updated] = await this.update(
        { leida: true, fecha_lectura: new Date() },
        { where: { usuario_id, leida: false } }
      );
      return updated;
    }

    /**
     * Eliminar notificación
     */
    static async eliminar(id, usuario_id) {
      const deleted = await this.destroy({
        where: { id, usuario_id }
      });
      return deleted > 0;
    }

    /**
     * Eliminar leídas
     */
    static async eliminarLeidas(usuario_id) {
      const deleted = await this.destroy({
        where: { usuario_id, leida: true }
      });
      return deleted;
    }

    /**
     * Notificar a múltiples usuarios
     */
    static async notificarMultiple(usuarios_ids, data) {
      const notificaciones = usuarios_ids.map(usuario_id => ({
        usuario_id,
        tipo: data.tipo || 'sistema',
        titulo: data.titulo,
        mensaje: data.mensaje,
        prioridad: data.prioridad || 'normal',
        accion_url: data.accion_url || null,
        accion_label: data.accion_label || null,
        metadata: data.metadata || null,
      }));

      return await this.bulkCreate(notificaciones);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // DEFINICIÓN DEL MODELO
  // ════════════════════════════════════════════════════════════════════════════

  Notificacion.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      usuario_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Usuario destinatario',
      },

      tipo: {
        type: DataTypes.ENUM('despacho', 'alerta', 'cliente', 'reporte', 'sistema', 'inventario'),
        allowNull: false,
        defaultValue: 'sistema',
        comment: 'Tipo de notificación',
      },

      titulo: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'Título de la notificación',
      },

      mensaje: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Contenido del mensaje',
      },

      prioridad: {
        type: DataTypes.ENUM('baja', 'normal', 'alta', 'urgente'),
        allowNull: false,
        defaultValue: 'normal',
        comment: 'Nivel de prioridad',
      },

      leida: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Si fue leída',
      },

      fecha_lectura: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Cuándo se leyó',
      },

      accion_url: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'URL de acción relacionada',
      },

      accion_label: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Texto del botón de acción',
      },

      metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Datos adicionales en JSON',
      },

      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      sequelize,
      modelName: 'Notificacion',
      tableName: 'notificaciones',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      indexes: [
        { fields: ['usuario_id'] },
        { fields: ['tipo'] },
        { fields: ['leida'] },
        { fields: ['prioridad'] },
        { fields: ['created_at'] },
        { name: 'idx_usuario_leida', fields: ['usuario_id', 'leida'] },
      ],
      comment: 'Notificaciones del sistema CRM ISTHO',
    }
  );

  return Notificacion;
};