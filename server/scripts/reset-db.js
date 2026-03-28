/**
 * ISTHO CRM - Reset de Base de Datos
 *
 * Elimina TODOS los datos de la base de datos y deja solo lo que generan los seeds.
 * Los seeds se ejecutan automáticamente en el siguiente deploy.
 *
 * DATOS QUE SE REGENERAN (seeds):
 *   - Roles (6)
 *   - Permisos (78)
 *   - Asignaciones rol-permiso (206)
 *   - Plantillas de email (3)
 *   - Configuración WMS (5)
 *   - Usuario admin (admin@istho.com.co)
 *
 * DATOS QUE SE PIERDEN:
 *   - Usuarios (excepto admin)
 *   - Vehículos, viajes, cajas menores, movimientos
 *   - Operaciones, inventario, auditorías
 *   - Notificaciones
 *
 * DATOS EN CLOUDINARY (NO se pierden):
 *   - Avatares, soportes, evidencias, fotos averías
 *   - Quedan huérfanos (sin referencia en BD) pero no se borran
 *
 * Ejecutar:
 *   node scripts/reset-db.js
 *   node scripts/reset-db.js --confirmar    (sin confirmación interactiva)
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

require('dotenv').config();

const MYSQL_URL = process.env.MYSQL_URL || process.env.MYSQL_PUBLIC_URL;
if (!MYSQL_URL) {
  console.error('❌ Falta MYSQL_URL o MYSQL_PUBLIC_URL en las variables de entorno');
  console.log('   Ejecuta con: MYSQL_URL=mysql://... node scripts/reset-db.js');
  process.exit(1);
}

process.env.MYSQL_URL = MYSQL_URL;

const autoConfirm = process.argv.includes('--confirmar');

async function resetDatabase() {
  const { sequelize } = require('../src/config/database');

  try {
    await sequelize.authenticate();
    console.log('✅ Conectado a la base de datos');

    // Mostrar info de la BD
    const [dbInfo] = await sequelize.query("SELECT DATABASE() as db");
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, TABLE_ROWS
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_ROWS DESC
    `);

    console.log(`\n📊 Base de datos: ${dbInfo[0].db}`);
    console.log(`   Tablas: ${tables.length}`);
    console.log(`   Registros totales: ~${tables.reduce((s, t) => s + (parseInt(t.TABLE_ROWS) || 0), 0)}`);

    console.log('\n┌─────────────────────────────┬───────────┐');
    console.log('│ Tabla                       │ Registros │');
    console.log('├─────────────────────────────┼───────────┤');
    tables.forEach(t => {
      const name = t.TABLE_NAME.padEnd(27);
      const rows = String(t.TABLE_ROWS || 0).padStart(9);
      console.log(`│ ${name} │ ${rows} │`);
    });
    console.log('└─────────────────────────────┴───────────┘');

    if (!autoConfirm) {
      console.log('\n⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos.');
      console.log('   Los seeds regenerarán: roles, permisos, plantillas, config WMS, usuario admin.');
      console.log('   Los archivos en Cloudinary NO se eliminan.');
      console.log('\n   Para confirmar, ejecuta con: node scripts/reset-db.js --confirmar\n');
      process.exit(0);
    }

    console.log('\n🔄 Iniciando reset...\n');

    // Desactivar FK checks para poder truncar en cualquier orden
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');

    // Orden de truncado (respetando dependencias lógicas)
    const tablasOrden = [
      // Primero las que dependen de otras
      'auditoria',
      'notificaciones',
      'notificaciones_email',
      'reportes_programados',
      // Operaciones y detalles
      'operacion_averias',
      'operacion_documentos',
      'operacion_detalle',
      'movimientos_inventario',
      'caja_inventario',
      'operaciones',
      // Viajes y cajas
      'movimientos_caja_menor',
      'cajas_menores',
      'viajes',
      'vehiculos',
      // Inventario y clientes
      'inventario',
      'contactos',
      'clientes',
      // Permisos y roles (se regeneran)
      'rol_permisos',
      'permisos',
      // Usuarios (excepto admin se recrea)
      'usuarios',
      'roles',
      // Config
      'plantillas_email',
      'configuracion_wms',
    ];

    for (const tabla of tablasOrden) {
      try {
        await sequelize.query(`TRUNCATE TABLE \`${tabla}\``);
        console.log(`  ✓ ${tabla} — vaciada`);
      } catch (err) {
        // La tabla puede no existir
        console.log(`  ⚠ ${tabla} — ${err.message.includes('exist') ? 'no existe' : err.message}`);
      }
    }

    // Reactivar FK checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅ Base de datos reseteada exitosamente');
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Haz redeploy del backend en Railway');
    console.log('   2. Los seeds crearán automáticamente:');
    console.log('      • 6 roles + 78 permisos + asignaciones');
    console.log('      • 3 plantillas de email');
    console.log('      • 5 configuraciones WMS');
    console.log('      • Usuario admin (admin@istho.com.co / Admin2026*)');
    console.log('   3. Crea los demás usuarios desde el CRM');
    console.log('   4. Ejecuta wms-test.js para datos de prueba WMS\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

resetDatabase();
