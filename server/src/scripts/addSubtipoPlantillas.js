/**
 * Agrega columna subtipo a plantillas_email y configura valores
 * Uso: node server/src/scripts/addSubtipoPlantillas.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../models');

(async () => {
  try {
    await db.sequelize.authenticate();
    console.log('✅ Conexión a BD establecida');

    // 1. Agregar columna subtipo
    await db.sequelize.getQueryInterface().addColumn('plantillas_email', 'subtipo', {
      type: db.Sequelize.STRING(50),
      allowNull: true,
      defaultValue: null,
      comment: 'Subtipo para diferenciar plantillas del mismo tipo (ej: ingreso, salida)'
    }).catch(e => {
      if (e.message.includes('Duplicate') || e.message.includes('already exists')) {
        console.log('ℹ️  Columna subtipo ya existe');
      } else throw e;
    });
    console.log('✅ Columna subtipo agregada');

    // 2. Asignar subtipos a las plantillas existentes
    const { PlantillaEmail } = db;

    await PlantillaEmail.update(
      { subtipo: 'ingreso', es_predeterminada: true },
      { where: { nombre: 'Cierre de Entrada de Inventario' } }
    );
    console.log('✅ Entrada → subtipo: ingreso, predeterminada: true');

    await PlantillaEmail.update(
      { subtipo: 'salida', es_predeterminada: true },
      { where: { nombre: 'Cierre de Salida con Picking' } }
    );
    console.log('✅ Salida → subtipo: salida, predeterminada: true');

    console.log('\n🎉 Completado');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
})();
