'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('api_keys', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      nombre: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Nombre descriptivo (ej: PowerBI Producción)',
      },
      descripcion: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      key_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'SHA-256 del token raw (nunca se almacena el token en claro)',
      },
      activa: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      ultimo_uso: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      creado_por: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'usuarios', key: 'id' },
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('api_keys', ['key_hash'], { unique: true, name: 'api_keys_key_hash_unique' });
    await queryInterface.addIndex('api_keys', ['activa'], { name: 'api_keys_activa' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('api_keys');
  },
};
