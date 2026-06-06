module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableDesc = await queryInterface.describeTable('operacion_averias').catch(() => null);
    if (!tableDesc) return;

    if (!tableDesc.fotos_urls) {
      await queryInterface.addColumn('operacion_averias', 'fotos_urls', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'JSON array de URLs de fotos adicionales de evidencia',
        after: 'foto_tamanio',
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('operacion_averias', 'fotos_urls');
  },
};
