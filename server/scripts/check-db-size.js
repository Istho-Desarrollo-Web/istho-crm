process.env.MYSQL_URL = process.env.MYSQL_URL || 'mysql://root:NRHKeuFAJUNPUWcLdUrjvmIMIMcGhaaI@shuttle.proxy.rlwy.net:49722/railway';
const db = require('../src/models');

(async () => {
  try {
    await db.sequelize.authenticate();
    const [rows] = await db.sequelize.query(
      `SELECT TABLE_NAME,
        ROUND(DATA_LENGTH/1024/1024, 2) AS data_mb,
        ROUND(INDEX_LENGTH/1024/1024, 2) AS index_mb,
        ROUND((DATA_LENGTH + INDEX_LENGTH)/1024/1024, 2) AS total_mb
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
       ORDER BY total_mb DESC`
    );
    console.table(rows);

    // Ver avatares
    const [avatars] = await db.sequelize.query(
      `SELECT id, username, ROUND(LENGTH(avatar_url)/1024, 1) AS kb FROM usuarios WHERE avatar_url IS NOT NULL`
    );
    if (avatars.length) { console.log('\nAvatares:'); console.table(avatars); }

    // Ver soportes
    const [soportes] = await db.sequelize.query(
      `SELECT id, consecutivo, ROUND(LENGTH(soporte_url)/1024, 1) AS kb FROM movimientos_caja_menor WHERE soporte_url IS NOT NULL`
    );
    if (soportes.length) { console.log('\nSoportes:'); console.table(soportes); }

    // Total BD
    const [total] = await db.sequelize.query(
      `SELECT ROUND(SUM(DATA_LENGTH + INDEX_LENGTH)/1024/1024, 2) AS total_mb FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`
    );
    console.log('\nTotal BD:', total[0].total_mb, 'MB');

  } catch (err) {
    console.error('Error:', err.message);
  }
  process.exit(0);
})();
