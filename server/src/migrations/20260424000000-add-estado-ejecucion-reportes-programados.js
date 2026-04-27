module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('reportes_programados').catch(() => null);
    if (!tableDesc) return;

    if (!tableDesc.estado_ultima_ejecucion) {
      await queryInterface.addColumn('reportes_programados', 'estado_ultima_ejecucion', {
        type: Sequelize.ENUM('ejecutando', 'exitoso', 'fallido'),
        allowNull: true,
        comment: 'Resultado de la última ejecución',
        after: 'ultima_ejecucion',
      });
    }

    if (!tableDesc.ultimo_error) {
      await queryInterface.addColumn('reportes_programados', 'ultimo_error', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Mensaje del último error al ejecutar',
        after: 'estado_ultima_ejecucion',
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('reportes_programados', 'ultimo_error').catch(() => {});
    await queryInterface
      .removeColumn('reportes_programados', 'estado_ultima_ejecucion')
      .catch(() => {});
  },
};
