/**
 * Crea un archivo de migración con timestamp y nombre descriptivo.
 * Uso: npm run migration:create -- <nombre>
 * Ejemplo: npm run migration:create -- add-estado-a-reportes-programados
 */

const fs = require('fs');
const path = require('path');

const nombre = process.argv[2];
if (!nombre) {
  console.error('\n❌ Falta el nombre de la migración');
  console.error('   Uso: npm run migration:create -- <nombre>');
  console.error('   Ejemplo: npm run migration:create -- add-estado-a-reportes-programados\n');
  process.exit(1);
}

const timestamp = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const filename = `${timestamp}-${nombre}.js`;
const filepath = path.join(__dirname, '../migrations', filename);

const template = `module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Verificar que la tabla exista antes de modificarla
    const tableDesc = await queryInterface.describeTable('nombre_tabla').catch(() => null);
    if (!tableDesc) return;

    // Ejemplo: agregar columna
    // if (!tableDesc.nueva_columna) {
    //   await queryInterface.addColumn('nombre_tabla', 'nueva_columna', {
    //     type: Sequelize.STRING(100),
    //     allowNull: true,
    //     after: 'columna_anterior'
    //   });
    // }
  },

  down: async (queryInterface, Sequelize) => {
    // Revertir los cambios del up
    // await queryInterface.removeColumn('nombre_tabla', 'nueva_columna');
  }
};
`;

fs.writeFileSync(filepath, template);
console.log(`\n✅ Migración creada: src/migrations/${filename}\n`);
