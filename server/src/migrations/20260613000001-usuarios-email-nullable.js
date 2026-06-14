'use strict';

module.exports = {
  async up(queryInterface) {
    // Cambiar email a nullable manteniendo el índice UNIQUE existente.
    // MySQL permite múltiples NULL en columnas UNIQUE (cada NULL es distinto).
    await queryInterface.sequelize.query(
      'ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(100) NULL'
    );
  },

  async down(queryInterface) {
    // Restaurar NOT NULL — fallará si hay filas con email NULL
    await queryInterface.sequelize.query(
      'ALTER TABLE usuarios MODIFY COLUMN email VARCHAR(100) NOT NULL'
    );
  },
};
