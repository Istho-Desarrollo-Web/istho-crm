'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('caja_inventario', 'wms_pallet_id', {
      type: Sequelize.STRING(36),
      allowNull: true,
      defaultValue: null,
      after: 'observaciones',
    });

    await queryInterface.addColumn('caja_inventario', 'wms_kardex_ultima_sync', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
      after: 'wms_pallet_id',
    });

    await queryInterface.addIndex('caja_inventario', ['wms_pallet_id'], {
      name: 'idx_caja_inventario_wms_pallet_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('caja_inventario', 'idx_caja_inventario_wms_pallet_id');
    await queryInterface.removeColumn('caja_inventario', 'wms_kardex_ultima_sync');
    await queryInterface.removeColumn('caja_inventario', 'wms_pallet_id');
  },
};
