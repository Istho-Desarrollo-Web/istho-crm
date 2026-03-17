/**
 * ============================================================================
 * ISTHO CRM - Configuración de Email
 * ============================================================================
 * 
 * Configuración del transporter de Nodemailer para envío de correos.
 * 
 * CONFIGURACIÓN REQUERIDA EN .env:
 * - SMTP_HOST=smtp.gmail.com
 * - SMTP_PORT=587
 * - SMTP_USER=tu-email@gmail.com
 * - SMTP_PASS=xxxx xxxx xxxx xxxx (Contraseña de aplicación de Google - 16 caracteres)
 * - SMTP_FROM_NAME=ISTHO CRM
 * - SMTP_FROM_EMAIL=tu-email@gmail.com
 * 
 * IMPORTANTE PARA GMAIL:
 * 1. Activa verificación en 2 pasos en tu cuenta Google
 * 2. Genera una "Contraseña de aplicación" en https://myaccount.google.com/apppasswords
 * 3. Usa esa contraseña de 16 caracteres en SMTP_PASS
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

/**
 * Configuración del remitente por defecto
 */
const defaultFrom = {
  name: process.env.SMTP_FROM_NAME || 'ISTHO CRM',
  address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@istho.com'
};

/**
 * Configuración SMTP
 */
const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465, // true para 465, false para 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : undefined // Eliminar espacios
  },
  tls: {
    rejectUnauthorized: false // Para desarrollo
  },
  // Timeouts
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 30000
};

// ════════════════════════════════════════════════════════════════════════════
// TRANSPORTER
// ════════════════════════════════════════════════════════════════════════════

let transporter = null;
let transporterVerified = false;

/**
 * Crear transporter de producción (Gmail u otro SMTP)
 */
const createProductionTransporter = () => {
  // Validar configuración
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    logger.error('❌ Configuración SMTP incompleta', {
      hasUser: !!smtpConfig.auth.user,
      hasPass: !!smtpConfig.auth.pass,
      host: smtpConfig.host
    });
    throw new Error('Configuración SMTP incompleta. Verifica SMTP_USER y SMTP_PASS en .env');
  }

  logger.info('📧 Creando transporter SMTP', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    user: smtpConfig.auth.user,
    secure: smtpConfig.secure
  });

  return nodemailer.createTransport(smtpConfig);
};

/**
 * Crear transporter de desarrollo (Ethereal - correos de prueba)
 */
const createDevTransporter = async () => {
  try {
    // Crear cuenta de prueba en Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    logger.info('📧 Cuenta Ethereal creada para desarrollo', {
      user: testAccount.user
    });

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass
      }
    });
  } catch (error) {
    logger.warn('⚠️ No se pudo crear cuenta Ethereal, usando configuración SMTP', error.message);
    return createProductionTransporter();
  }
};

/**
 * Obtener transporter (singleton con lazy loading)
 * @returns {Promise<nodemailer.Transporter>}
 */
const getTransporter = async () => {
  // Si ya existe y está verificado, retornarlo
  if (transporter && transporterVerified) {
    return transporter;
  }

  try {
    // Determinar si usar Ethereal (desarrollo sin SMTP configurado) o producción
    const useEthereal = process.env.NODE_ENV === 'development' && 
                        process.env.USE_ETHEREAL === 'true' &&
                        !process.env.SMTP_PASS;

    if (useEthereal) {
      transporter = await createDevTransporter();
    } else {
      transporter = createProductionTransporter();
    }

    // Verificar conexión
    await transporter.verify();
    transporterVerified = true;
    
    logger.info('✅ Conexión SMTP verificada exitosamente');
    
    return transporter;

  } catch (error) {
    logger.error('❌ Error al configurar transporter SMTP:', {
      message: error.message,
      code: error.code
    });

    // Mensajes de ayuda según el error
    if (error.message.includes('Invalid login') || error.message.includes('authentication')) {
      logger.error('💡 SOLUCIÓN: Usa una Contraseña de Aplicación de Google:');
      logger.error('   1. Ve a https://myaccount.google.com/apppasswords');
      logger.error('   2. Genera una nueva contraseña');
      logger.error('   3. Copia los 16 caracteres a SMTP_PASS en .env');
    }

    throw error;
  }
};

/**
 * Verificar conexión SMTP
 * @returns {Promise<boolean>}
 */
const verificarConexion = async () => {
  try {
    const transport = await getTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    logger.error('❌ Error verificando conexión SMTP:', error.message);
    return false;
  }
};

/**
 * Resetear transporter (útil para reconfiguración)
 */
const resetTransporter = () => {
  if (transporter) {
    transporter.close();
  }
  transporter = null;
  transporterVerified = false;
  logger.info('🔄 Transporter SMTP reseteado');
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

module.exports = {
  getTransporter,
  verificarConexion,
  resetTransporter,
  defaultFrom,
  smtpConfig
};