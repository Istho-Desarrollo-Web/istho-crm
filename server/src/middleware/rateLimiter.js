const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const ventana = parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10);
const maxGeneral = parseInt(process.env.RATE_LIMIT_MAX || '500', 10);

const mensajeError = (limite) => ({
  success: false,
  message: `Demasiadas solicitudes. Intente de nuevo en ${ventana} minutos.`,
  code: 'RATE_LIMIT_EXCEEDED',
  limite,
});

// Clave por usuario autenticado (JWT decode sin verificar firma — solo para rate limit key).
// Si no hay JWT válido, cae a IP. Esto evita que 15 usuarios en la misma red
// compartan un único contador de rate limit.
const keyGeneratorAutenticado = (req) => {
  try {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith('Bearer ')) {
      const payload = JSON.parse(
        Buffer.from(auth.slice(7).split('.')[1], 'base64url').toString()
      );
      if (payload?.id) return `user:${payload.id}`;
    }
  } catch {
    // No hace nada — cae a IP
  }
  return ipKeyGenerator(req);
};

// API general: 500 req / 15 min por usuario (o por IP si no está autenticado)
const limiterGeneral = rateLimit({
  windowMs: ventana * 60 * 1000,
  max: maxGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGeneratorAutenticado,
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

// Exportación de reportes: 20 req / 15 min por usuario
const limiterExport = rateLimit({
  windowMs: ventana * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: keyGeneratorAutenticado,
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
