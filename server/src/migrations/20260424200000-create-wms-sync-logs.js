module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await queryInterface.showAllTables();
    if (tables.includes('wms_sync_logs')) return;

    await queryInterface.createTable('wms_sync_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      tipo: {
        type: Sequelize.ENUM('productos', 'entrada', 'salida', 'kardex'),
        allowNull: false,
      },
      documento_origen: {
        type: Sequelize.STRING(150),
        allowNull: true,
        comment: 'Documento o número de picking del WMS',
      },
      nit: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'NIT del cliente sincronizado',
      },
      estado: {
        type: Sequelize.ENUM('exitoso', 'fallido'),
        allowNull: false,
        defaultValue: 'exitoso',
      },
      error_mensaje: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      detalles: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Estadísticas del resultado: total_lineas, total_unidades, etc.',
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Body original del request para permitir re-ejecución',
      },
      ip_origen: {
        type: Sequelize.STRING(45),
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('wms_sync_logs', ['tipo'], { name: 'idx_wms_logs_tipo' });
    await queryInterface.addIndex('wms_sync_logs', ['estado'], { name: 'idx_wms_logs_estado' });
    await queryInterface.addIndex('wms_sync_logs', ['created_at'], {
      name: 'idx_wms_logs_created',
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('wms_sync_logs').catch(() => {});
  },
};
