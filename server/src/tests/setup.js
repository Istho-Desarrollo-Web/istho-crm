/**
 * Setup global de Jest — prepara la app para tests de integración.
 * Registra el health check y los error handlers que normalmente
 * se agregan en server.js después de que DB está lista.
 */

const app = require('../../src/app');

// Health check mínimo para tests
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'test ok' });
});

// Registrar error handlers (404, Sequelize, etc.)
app.registerErrorHandlers();
