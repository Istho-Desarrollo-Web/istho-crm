/**
 * ISTHO CRM - Configuración de Express
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { error: errorResponse, notFound } = require('./utils/responses');
const { 
  handleSequelizeError, 
  handleValidationError, 
  handleGenericError 
} = require('./middleware/errorHandler');

// Importar rutas
const routes = require('./routes');

// Crear aplicación Express
const app = express();

// ==============================================
// MIDDLEWARES DE SEGURIDAD
// ==============================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS dinámico: soporta múltiples orígenes separados por coma
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (mobile apps, Postman, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`Origen no permitido por CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-WMS-API-Key'],
  credentials: true,
  maxAge: 86400
};
app.use(cors(corsOptions));

// ==============================================
// MIDDLEWARES DE PARSING
// ==============================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==============================================
// LOGGING
// ==============================================

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev', {
    stream: {
      write: (message) => logger.http(message.trim())
    }
  }));
}

// ==============================================
// ARCHIVOS ESTÁTICOS
// ==============================================

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ==============================================
// RUTAS
// ==============================================

// Healthcheck se define en server.js (con estado de DB dinámico)

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Bienvenido a ISTHO CRM API',
    version: '1.0.0',
    documentation: '/api/v1/docs',
    health: '/health'
  });
});

// Montar rutas de la API
app.use(process.env.API_PREFIX || '/api/v1', routes);

// ==============================================
// MANEJO DE ERRORES
// ==============================================

// Ruta no encontrada (404)
app.use((req, res, next) => {
  logger.warn(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  return notFound(res, `Ruta no encontrada: ${req.method} ${req.originalUrl}`);
});

// Errores de Sequelize
app.use(handleSequelizeError);

// Errores de validación
app.use(handleValidationError);

// Error genérico (último recurso)
app.use(handleGenericError);

module.exports = app;