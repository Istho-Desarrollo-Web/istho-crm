/**
 * Script standalone para gestionar migraciones con Umzug.
 * Usa el mismo setup que server.js para garantizar consistencia.
 *
 * Uso:
 *   node src/scripts/runMigrations.js [up|status|undo]
 *   npm run migration:up
 *   npm run migration:status
 *   npm run migration:undo
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Sequelize } = require('sequelize');
const { Umzug, SequelizeStorage } = require('umzug');
const { sequelize } = require('../config/database');

const umzug = new Umzug({
  migrations: {
    glob: path.join(__dirname, '../migrations/*.js').replace(/\\/g, '/'),
    resolve: ({ name, path: migPath, context }) => {
      const migration = require(migPath);
      return {
        name,
        up: async () => migration.up(context, Sequelize),
        down: async () => migration.down(context, Sequelize),
      };
    },
  },
  context: sequelize.getQueryInterface(),
  storage: new SequelizeStorage({ sequelize }),
  logger: console,
});

const command = process.argv[2] || 'up';

(async () => {
  try {
    await sequelize.authenticate();

    if (command === 'up') {
      const pending = await umzug.pending();
      if (pending.length === 0) {
        console.log('✅ No hay migraciones pendientes.');
        return;
      }
      console.log(`📋 Aplicando ${pending.length} migración(es) pendiente(s)...`);
      const executed = await umzug.up();
      console.log(`✅ ${executed.length} migración(es) aplicada(s):`);
      executed.forEach(m => console.log('   -', m.name));

    } else if (command === 'status') {
      const [executed, pending] = await Promise.all([umzug.executed(), umzug.pending()]);
      console.log('\n=== Migraciones aplicadas ===');
      executed.forEach(m => console.log('  ✅', m.name));
      console.log('\n=== Migraciones pendientes ===');
      if (pending.length === 0) console.log('  (ninguna)');
      else pending.forEach(m => console.log('  ⏳', m.name));

    } else if (command === 'undo') {
      const reverted = await umzug.down();
      if (reverted.length > 0) console.log(`✅ Revertida: ${reverted[0].name}`);
      else console.log('No hay migraciones para revertir.');

    } else {
      console.error(`❌ Comando desconocido: "${command}". Usa: up | status | undo`);
      process.exit(1);
    }
  } catch (e) {
    console.error('❌ Error en migraciones:', e.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
})();
