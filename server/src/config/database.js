/**
 * ISTHO CRM - Configuración de Base de Datos
 *
 * Este archivo configura la conexión a MySQL usando Sequelize ORM.
 * Soporta conexión local (XAMPP) y Railway (producción).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const { Sequelize } = require('sequelize');
require('dotenv').config();

// Opciones comunes de Sequelize
const commonOptions = {
  dialect: 'mysql',

  // Logging: true en desarrollo, false en producción
  logging: process.env.DB_LOGGING === 'true' ? (msg) => console.log(`[DB] ${msg}`) : false,

  // Pool de conexiones (optimizado para Railway proxy que cierra conexiones idle)
  pool: {
    max: parseInt(process.env.DB_POOL_MAX) || 5,
    min: 0, // No mantener conexiones idle (Railway las mata)
    acquire: 30000, // 30s para adquirir conexión
    idle: 1000, // Liberar conexiones idle después de 1s
    evict: 1000, // Verificar conexiones muertas cada 1s
  },

  // Reintentar queries fallidas automáticamente
  retry: {
    max: 3,
    match: [
      /PROTOCOL_CONNECTION_LOST/,
      /Connection lost/,
      /ECONNREFUSED/,
      /ECONNRESET/,
      /ETIMEDOUT/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
    ],
  },

  // Timezone Colombia
  timezone: '-05:00',

  // Opciones de dialecto MySQL
  dialectOptions: {
    // SSL solo si explícitamente habilitado
    ...(process.env.DB_SSL === 'true' && {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }),
    // Formato de fechas
    dateStrings: true,
    typeCast: true,
    // Timeouts para detectar conexiones muertas rápido
    connectTimeout: 10000,
    // Keepalive para mantener la conexión viva a través del proxy de Railway
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000, // Ping cada 10s
  },

  // Definiciones globales de modelos
  define: {
    timestamps: true,
    underscored: true, // camelCase → snake_case en BD
    freezeTableName: true,
  },
};

// Railway provee MYSQL_URL automáticamente al vincular un servicio MySQL
const sequelize = process.env.MYSQL_URL
  ? new Sequelize(process.env.MYSQL_URL, commonOptions)
  : new Sequelize(
      process.env.DB_NAME || 'istho_crm',
      process.env.DB_USER || 'root',
      process.env.DB_PASSWORD || '',
      {
        ...commonOptions,
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
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
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con MySQL:', error.message);
    return false;
  }
};

module.exports = { sequelize, testConnection };
