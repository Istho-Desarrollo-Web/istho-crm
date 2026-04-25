'use strict';

/**
 * setupFilesAfterEnv — corre en cada worker de test, antes de cada suite.
 * Registra rutas auxiliares y cierra la conexión al terminar.
 */

const app = require('../../src/app');
const { sequelize } = require('../../src/models');

// Health check mínimo para tests
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'test ok' });
});

// Registrar error handlers (404, Sequelize, etc.)
app.registerErrorHandlers();

// Cerrar pool de conexiones al finalizar para que Jest pueda salir limpio
afterAll(async () => {
  await sequelize.close();
});
