'use strict';

const app = require('../../src/app');

// Health check mínimo para tests
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'test ok' });
});

// Registrar error handlers (404, Sequelize, etc.)
app.registerErrorHandlers();
