const { sequelize } = require('./src/config/database');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a MySQL\n');

    // 1. Verificar si la columna ya existe
    const [cols] = await sequelize.query("SHOW COLUMNS FROM operaciones LIKE 'editado_admin'");
    if (cols.length > 0) {
      console.log('✅ La columna editado_admin ya existe — no hace falta agregarla.');
    } else {
      console.log('Agregando columna editado_admin...');
      await sequelize.query(
        "ALTER TABLE operaciones ADD COLUMN editado_admin TINYINT(1) NOT NULL DEFAULT 0 AFTER wms_order_id"
      );
      console.log('✅ Columna editado_admin agregada correctamente.');
    }

    // 2. Registrar ambas migraciones en SequelizeMeta si no están
    const migraciones = [
      '20260511000000-add-editado-admin-to-operaciones.js',
      '20260511100000-add-editado-admin-to-operaciones-fix.js',
    ];

    for (const nombre of migraciones) {
      const [rows] = await sequelize.query(
        'SELECT name FROM SequelizeMeta WHERE name = ?',
        { replacements: [nombre] }
      );
      if (rows.length === 0) {
        await sequelize.query('INSERT INTO SequelizeMeta (name) VALUES (?)', {
          replacements: [nombre],
        });
        console.log(`✅ Migración registrada: ${nombre}`);
      } else {
        console.log(`   Ya registrada: ${nombre}`);
      }
    }

    // 3. Verificar resultado final
    const [check] = await sequelize.query("SHOW COLUMNS FROM operaciones LIKE 'editado_admin'");
    console.log('\n=== Estado final ===');
    console.log('Columna editado_admin:', check.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE');

  } catch (e) {
    console.error('❌ Error:', e.message);
  } finally {
    await sequelize.close();
  }
})();
