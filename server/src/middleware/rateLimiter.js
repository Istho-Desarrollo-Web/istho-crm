const rateLimit = require('express-rate-limit');

const ventana = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10);
const maxGeneral = parseInt(process.env.RATE_LIMIT_MAX || '500', 10);

const mensajeError = (limite) => ({
  success: false,
  message: `Demasiadas solicitudes. Intente de nuevo en ${ventana} minutos.`,
  code: 'RATE_LIMIT_EXCEEDED',
  limite,
});

// API general: 100 req / 15 min
const limiterGeneral = rateLimit({
  windowMs: ventana * 60 * 1000,
  max: maxGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(maxGeneral),
});

// Login: 10 intentos / 15 min por IP
const limiterLogin = rateLimit({
  windowMs: ventana * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(10),
});

// Recuperación de contraseña: 5 intentos / 15 min por IP
const limiterForgotPassword = rateLimit({
  windowMs: ventana * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(5),
});

// Exportación de reportes: 20 req / 15 min por IP
const limiterExport = rateLimit({
  windowMs: ventana * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(20),
});

// Verificación TOTP (paso 2 del login): 5 intentos / 15 min por IP
const limiterTotp = rateLimit({
  windowMs: ventana * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: mensajeError(5),
});

module.exports = {
  limiterGeneral,
  limiterLogin,
  limiterForgotPassword,
  limiterExport,
  limiterTotp,
};
