const { sequelize } = require('./src/config/database');

(async () => {
  try {
    await sequelize.authenticate();
    const [rows] = await sequelize.query('SELECT name FROM SequelizeMeta ORDER BY name');
    console.log('\n=== SequelizeMeta ===');
    rows.forEach(r => console.log(' ', r.name));

    const [cols] = await sequelize.query("SHOW COLUMNS FROM operaciones LIKE 'editado_admin'").catch(() => [[]]);
    console.log('\n=== Columna editado_admin en operaciones ===');
    console.log(cols.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE');
  } catch (e) {
    console.error(e.message);
  } finally {
    await sequelize.close();
  }
})();
