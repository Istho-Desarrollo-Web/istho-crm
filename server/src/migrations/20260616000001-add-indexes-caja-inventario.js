'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.addIndex('caja_inventario', ['wms_pallet_id'], {
      name: 'idx_caja_inv_wms_pallet_id',
    });
    await queryInterface.addIndex('caja_inventario', ['numero_caja', 'inventario_id'], {
      name: 'idx_caja_inv_numero_caja_inventario_id',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('caja_inventario', 'idx_caja_inv_wms_pallet_id');
    await queryInterface.removeIndex('caja_inventario', 'idx_caja_inv_numero_caja_inventario_id');
  },
};
