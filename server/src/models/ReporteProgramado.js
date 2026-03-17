/**
 * ISTHO CRM - Modelo ReporteProgramado
 *
 * Almacena configuraciones de reportes automáticos con cron.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReporteProgramado = sequelize.define('ReporteProgramado', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    nombre: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nombre descriptivo del reporte'
    },

    tipo_reporte: {
      type: DataTypes.ENUM('operaciones', 'inventario', 'clientes'),
      allowNull: false
    },

    formato: {
      type: DataTypes.ENUM('excel', 'pdf', 'ambos'),
      defaultValue: 'excel'
    },

    // Expresión cron (ej: '0 8 * * 1' = lunes a las 8am)
    cron_expresion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: 'Expresión cron para programación'
    },

    // Descripción legible de la frecuencia
    frecuencia_label: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: 'Descripción legible (ej: Cada lunes a las 8:00 AM)'
    },

    // Destinatarios (CSV de emails)
    destinatarios: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'Emails separados por coma'
    },

    // Filtros opcionales
    cliente_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'clientes', key: 'id' }
    },

    filtros: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Filtros adicionales (estado, tipo, etc.)'
    },

    activo: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },

    creado_por: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'usuarios', key: 'id' }
    },

    ultima_ejecucion: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'reportes_programados',
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['activo'] },
      { fields: ['tipo_reporte'] },
      { fields: ['creado_por'] }
    ]
  });

  return ReporteProgramado;
};
