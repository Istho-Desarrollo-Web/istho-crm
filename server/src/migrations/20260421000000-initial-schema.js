const fs = require('fs');
const path = require('path');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    let currentTables;
    try {
      currentTables = await queryInterface.showAllTables();
    } catch (err) {
      currentTables = [];
    }

    // DB completamente inicializada → saltar
    if (currentTables.includes('usuarios') && currentTables.includes('permisos')) {
      console.log('[MIGRACIÓN INITIAL] BD ya inicializada. Omitiendo baseline.');
      return;
    }

    // Estado parcial (arranque anterior falló a mitad) → limpiar antes de reconstruir
    const TABLAS_SISTEMA = ['SequelizeMeta'];
    const tablasAEliminar = currentTables.filter(t => !TABLAS_SISTEMA.includes(t));
    if (tablasAEliminar.length > 0) {
      console.log(`[MIGRACIÓN INITIAL] Estado parcial detectado — eliminando ${tablasAEliminar.length} tabla(s) para reconstruir desde baseline.`);
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
      for (const tabla of tablasAEliminar) {
        await queryInterface.dropTable(tabla);
      }
      await queryInterface.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    }

    // BD vacía → cargar schema baseline
    const sqlPath = path.join(__dirname, 'schema_baseline.sql');
    if (!fs.existsSync(sqlPath)) return;

    const sqlFile = fs.readFileSync(sqlPath, 'utf8').replace(/\r\n/g, '\n');

    const db = require('../models');

    // Separar los comandos por ';\n\n'
    const statements = sqlFile
      .split(';\n\n')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    // Desactivar FK checks porque el dump SQL puede estar en orden alfabético
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    for (const stmt of statements) {
      try {
        await db.sequelize.query(stmt + ';');
      } catch (err) {
        console.error('Error al ejecutar statement:', err.message);
        throw err;
      }
    }

    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
  },

  down: async (queryInterface, Sequelize) => {
    // Para simplificar, en "down" de baseline solo se vacía todo (Peligroso, tener cuidado!)
    // await queryInterface.dropAllTables();
    console.log('Down de baseline deshabilitado por seguridad de datos.');
  },
};
