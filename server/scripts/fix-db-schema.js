/**
 * Script para forzar sincronización de modelos (alter true)
 */
const { sequelize } = require('../src/models');
const logger = require('../src/utils/logger');

async function forceSync() {
  try {
    logger.info('Iniciando sincronización forzada (alter: true)...');
    await sequelize.sync({ alter: true });
    logger.info('✅ Sincronización completada exitosamente. Las columnas nuevas deberían estar en la BD.');
    process.exit(0);
  } catch (err) {
    logger.error('❌ Error en sincronización:', err.message);
    process.exit(1);
  }
}

forceSync();

