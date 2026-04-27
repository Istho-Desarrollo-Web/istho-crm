/**
 * ISTHO CRM - Configuración JWT
 *
 * Configuración para autenticación con JSON Web Tokens.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

require('dotenv').config();

// Guard: JWT_SECRET debe estar configurado en startup
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error(
    '[SEGURIDAD] JWT_SECRET no configurado o demasiado corto. ' +
      'Configure la variable de entorno JWT_SECRET con mínimo 32 caracteres.'
  );
}

module.exports = {
  // Secreto para firmar tokens (requerido en configuración de entorno)
  secret: jwtSecret,

  // Tiempo de expiración del token de acceso
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',

  // Tiempo de expiración del refresh token
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // Algoritmo de firma
  algorithm: 'HS256',

  // Issuer (emisor del token)
  issuer: 'istho-crm-api',

  // Audience (audiencia del token)
  audience: 'istho-crm-client',
};
