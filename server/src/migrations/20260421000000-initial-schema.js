const fs = require('fs');
const path = require('path');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Si la base de datos ya tiene tablas (como pasa en producción ahora),
    // esta migración debe saltarse inteligentemente.
    // Vamos a chequear si 'usuarios' ya existe para saber si es DB nueva o vieja.
    
    // Obtener las tablas actuales de forma segura según el dialecto
    let currentTables;
    try {
      currentTables = await queryInterface.showAllTables();
    } catch(err) {
      currentTables = [];
    }
    
    if (currentTables.includes('usuarios')) {
      console.log('[MIGRACIÓN INITIAL] La base de datos ya contiene la tabla usuarios. Omitiendo volcado de baseline para evitar duplicados.');
      return;
    }

    // Es DB nueva, cargar el schema
    const sqlPath = path.join(__dirname, 'schema_baseline.sql');
    if (!fs.existsSync(sqlPath)) return;
    
    const sqlFile = fs.readFileSync(sqlPath, 'utf8').replace(/\r\n/g, '\n');

    const db = require('../models');

    // Separar los comandos por ';\n\n'
    const statements = sqlFile.split(';\n\n')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
        
    // Desactivar FK checks porque el dump SQL puede estar en orden alfabético
    await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');

    for(const stmt of statements) {
      try {
        await db.sequelize.query(stmt + ';');
      } catch(err) {
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
  }
};
