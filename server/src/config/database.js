/**
 * ISTHO CRM - Configuración de Base de Datos
 * 
 * Este archivo configura la conexión a MySQL usando Sequelize ORM.
 * Soporta conexión local (XAMPP) y Railway (producción).
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Configuración de la conexión
const sequelize = new Sequelize(
  process.env.DB_NAME || 'istho_crm',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',

    // Logging: true en desarrollo, false en producción
    logging: process.env.DB_LOGGING === 'true'
      ? (msg) => console.log(`[DB] ${msg}`)
      : false,

    // Pool de conexiones
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 0,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000
    },

    // Timezone Colombia
    timezone: '-05:00',

    // Opciones de dialecto
    dialectOptions: {
      // SSL para producción (Railway)
      ...(process.env.NODE_ENV === 'production' && {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }),
      // Formato de fechas
      dateStrings: true,
      typeCast: true
    },

    // Definiciones globales
    define: {
      timestamps: true,
      underscored: true,  // snake_case en BD
      freezeTableName: true
    }
  }
);

/**
 * Probar conexión a la base de datos
 * @returns {Promise<boolean>}
 */
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL establecida correctamente.');
    console.log(`   📍 Host: ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    console.log(`   📁 Base de datos: ${process.env.DB_NAME}`);
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };