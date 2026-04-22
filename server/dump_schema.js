const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const db = require('./src/models');

async function dump() {
  await db.sequelize.authenticate();
  const [tables] = await db.sequelize.query('SHOW TABLES');
  const tableKey = Object.keys(tables[0])[0];
  
  let sql = '';
  for(const tableObj of tables) {
    const tableName = tableObj[tableKey];
    const [createTable] = await db.sequelize.query(`SHOW CREATE TABLE \`${tableName}\``);
    sql += createTable[0]['Create Table'] + ';\n\n';
  }
  
  const migrationsDir = path.join(__dirname, 'src', 'migrations');
  if(!fs.existsSync(migrationsDir)) fs.mkdirSync(migrationsDir, { recursive: true });
  
  fs.writeFileSync(path.join(migrationsDir, 'schema_baseline.sql'), sql);
  console.log('Schema dumped to src/migrations/schema_baseline.sql');
  process.exit(0);
}

dump().catch(console.error);
