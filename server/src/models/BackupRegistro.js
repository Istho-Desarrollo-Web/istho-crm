/**
 * ISTHO CRM - Modelo BackupRegistro
 *
 * Registra el historial de backups automáticos y manuales
 * de la base de datos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BackupRegistro = sequelize.define(
    'BackupRegistro',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      fecha: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },

      archivo: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Nombre del archivo generado (ej: istho_crm_backup_2026-04-01.sql.gz)',
      },

      tamano_bytes: {
        type: DataTypes.BIGINT,
        allowNull: true,
        comment: 'Tamaño del archivo comprimido en bytes',
      },

      estado: {
        type: DataTypes.ENUM('exitoso', 'fallido'),
        allowNull: false,
        defaultValue: 'exitoso',
      },

      duracion_segundos: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Tiempo que tardó el proceso de backup',
      },

      error_mensaje: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Mensaje de error si el backup falló',
      },

      origen: {
        type: DataTypes.ENUM('automatico', 'manual'),
        allowNull: false,
        defaultValue: 'automatico',
        comment: 'Automático (cron diario) o Manual (disparado por admin)',
      },
    },
    {
      tableName: 'backup_registros',
      timestamps: true,
      underscored: true,
      indexes: [{ fields: ['fecha'] }, { fields: ['estado'] }, { fields: ['origen'] }],
    }
  );

  return BackupRegistro;
};
