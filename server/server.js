/**
 * ISTHO CRM - Entry Point del Servidor
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

require('dotenv').config();
const http = require('http');
const app = require('./src/app');
const db = require('./src/models');
const logger = require('./src/utils/logger');
const socketService = require('./src/services/socketService');

const PORT = process.env.PORT || 5000;

// Estado global de inicialización
let dbReady = false;
let initError = null;

// ══════════════════════════════════════════════════════════════════════════
// HEALTH CHECK DINÁMICO
// ══════════════════════════════════════════════════════════════════════════
// Responde 200 siempre para que Railway no mate el deploy.
// Incluye el estado real de la DB para monitoreo.
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ISTHO CRM API está funcionando',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: dbReady ? 'connected' : (initError ? 'error' : 'connecting'),
    ...(initError && { dbError: initError })
  });
});

// ══════════════════════════════════════════════════════════════════════════
// INICIAR SERVIDOR INMEDIATAMENTE (antes de DB)
// ══════════════════════════════════════════════════════════════════════════
const server = http.createServer(app);
socketService.inicializar(server);

server.listen(PORT, () => {
  // Banner
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                                                          ║');
  console.log('║      🚛  ISTHO CRM - Backend API Server  🚛              ║');
  console.log('║                                                          ║');
  console.log('║      Transporte, Logística y Almacenamiento              ║');
  console.log('║      Girardota, Antioquia - Colombia                     ║');
  console.log('║                                                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('\n');

  logger.info(`🚀 Servidor HTTP iniciado`);
  logger.info(`   📍 Puerto: ${PORT}`);
  logger.info(`   🌍 Ambiente: ${process.env.NODE_ENV}`);
  logger.info(`   📡 API URL: http://localhost:${PORT}${process.env.API_PREFIX || '/api/v1'}`);
  logger.info(`   🔌 WebSocket: ws://localhost:${PORT}`);
  logger.info(`   ❤️  Health: http://localhost:${PORT}/health`);

  // Inicializar DB en background
  initializeDatabase();
});

// ══════════════════════════════════════════════════════════════════════════
// INICIALIZACIÓN DE BASE DE DATOS (async, después de listen)
// ══════════════════════════════════════════════════════════════════════════
async function initializeDatabase() {
  try {
    logger.info('Conectando a la base de datos...');
    await db.sequelize.authenticate();
    logger.info('✅ Conexión a MySQL establecida correctamente');

    // Sincronizar modelos
    logger.info('Sincronizando modelos...');
    await db.syncModels({ alter: process.env.NODE_ENV === 'development' });

    // Crear usuarios por defecto
    await crearAdminPorDefecto();
    await crearSupervisorPorDefecto();
    await crearOperadorPorDefecto();

    // Inicializar reportes programados
    const reporteScheduler = require('./src/services/reporteScheduler');
    await reporteScheduler.inicializar();

    dbReady = true;
    logger.info('✅ Base de datos inicializada correctamente');
    console.log('\n   Servidor listo para recibir peticiones\n');

  } catch (error) {
    initError = error.message;
    logger.error('❌ Error al inicializar base de datos:', { message: error.message });
    console.error(error);
    // NO hacer process.exit - el servidor sigue corriendo para healthcheck
  }
}

// ══════════════════════════════════════════════════════════════════════════
// USUARIOS POR DEFECTO
// ══════════════════════════════════════════════════════════════════════════

const crearAdminPorDefecto = async () => {
  try {
    const { Usuario } = db;
    const adminExiste = await Usuario.findOne({ where: { rol: 'admin' } });
    if (!adminExiste) {
      await Usuario.crearConPassword({
        username: 'admin',
        email: 'admin@istho.com.co',
        password: 'Admin2026*',
        nombre_completo: 'Administrador ISTHO',
        rol: 'admin'
      });
      logger.info('✅ Usuario admin creado por defecto');
      logger.warn('⚠️  IMPORTANTE: Cambiar contraseña del admin en producción!');
    }
  } catch (error) {
    logger.error('Error al crear admin por defecto:', { message: error.message });
  }
};

const crearSupervisorPorDefecto = async () => {
  try {
    const { Usuario } = db;
    const supervisorExiste = await Usuario.findOne({ where: { rol: 'supervisor' } });
    if (!supervisorExiste) {
      await Usuario.crearConPassword({
        username: 'supervisor',
        email: 'supervisor@istho.com.co',
        password: 'Supervisor2026*',
        nombre_completo: 'Supervisor ISTHO',
        rol: 'supervisor'
      });
      logger.info('✅ Usuario supervisor creado por defecto');
    }
  } catch (error) {
    logger.error('Error al crear supervisor por defecto:', { message: error.message });
  }
};

const crearOperadorPorDefecto = async () => {
  try {
    const { Usuario } = db;
    const operadorExiste = await Usuario.findOne({ where: { rol: 'operador' } });
    if (!operadorExiste) {
      await Usuario.crearConPassword({
        username: 'operador',
        email: 'operador@istho.com.co',
        password: 'Operador2026*',
        nombre_completo: 'Operador ISTHO',
        rol: 'operador'
      });
      logger.info('✅ Usuario operador creado por defecto');
    }
  } catch (error) {
    logger.error('Error al crear operador por defecto:', { message: error.message });
  }
};

// ══════════════════════════════════════════════════════════════════════════
// MANEJO DE SEÑALES Y ERRORES
// ══════════════════════════════════════════════════════════════════════════

process.on('SIGTERM', async () => {
  logger.info('🛑 Cerrando servidor (SIGTERM)...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('🛑 Cerrando servidor (Ctrl+C)...');
  await db.sequelize.close();
  process.exit(0);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', { reason: reason?.message || reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { message: error.message });
  process.exit(1);
});
