/**
 * ISTHO CRM - Configuración JWT
 * 
 * Configuración para autenticación con JSON Web Tokens.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 */

require('dotenv').config();

module.exports = {
  // Secreto para firmar tokens (CAMBIAR EN PRODUCCIÓN)
  secret: process.env.JWT_SECRET || 'istho_default_secret_cambiar',
  
  // Tiempo de expiración del token de acceso
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Tiempo de expiración del refresh token
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Algoritmo de firma
  algorithm: 'HS256',
  
  // Issuer (emisor del token)
  issuer: 'istho-crm-api',
  
  // Audience (audiencia del token)
  audience: 'istho-crm-client'
};