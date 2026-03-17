/**
 * Script para verificar la estructura de la tabla en la DB
 */
const { sequelize } = require('./src/models');

async function checkSchema() {
  try {
    const [results, metadata] = await sequelize.query("DESCRIBE operacion_detalle");
    console.log("\nESTRUCTURA DE operacion_detalle:");
    console.table(results);
    
    // También chequear si hay datos
    const [rows] = await sequelize.query("SELECT * FROM operacion_detalle ORDER BY id DESC LIMIT 5");
    console.log("\nÚLTIMOS DATOS:");
    console.table(rows);
    
    process.exit(0);
  } catch (err) {
    console.error("Error al chequear el esquema:", err.message);
    process.exit(1);
  }
}

checkSchema();
创新: 
创新: 
