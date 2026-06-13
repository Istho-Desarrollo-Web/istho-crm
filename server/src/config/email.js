/**
 * ============================================================================
 * ISTHO CRM - Configuración de Email
 * ============================================================================
 *
 * Soporta dos proveedores:
 * - Resend (recomendado para producción): usa API HTTP, no necesita SMTP
 * - Nodemailer SMTP (desarrollo/fallback): usa Gmail u otro SMTP
 *
 * Si RESEND_API_KEY está configurada, usa Resend automáticamente.
 * Si no, usa Nodemailer SMTP como antes.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 3.0.0
 */

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════════════════

const defaultFrom = {
  name: process.env.SMTP_FROM_NAME || 'ISTHO CRM',
  address:
    process.env.RESEND_FROM ||
    process.env.SMTP_FROM_EMAIL ||
    process.env.SMTP_USER ||
    'noreply@istho.com',
};

const smtpConfig = {
  host: process.env.SMTP_HOST || 'smtp.office365.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: parseInt(process.env.SMTP_PORT) === 465,
  family: 4, // forzar IPv4 — App Runner no enruta IPv6 saliente
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s/g, '') : undefined,
  },
  tls: {
    rejectUnauthorized: false,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 30000,
};

// ════════════════════════════════════════════════════════════════════════════
// RESEND TRANSPORT (wrapper compatible con nodemailer)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Crea un objeto compatible con la interfaz de nodemailer transporter
 * pero que internamente usa la API HTTP de Resend.
 * Así no hay que modificar emailService.js ni ningún consumidor.
 */
const createResendTransport = () => {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  return {
    /**
     * sendMail compatible con nodemailer
     */
    sendMail: async (mailOptions) => {
      const payload = {
        from: mailOptions.from || `${defaultFrom.name} <${defaultFrom.address}>`,
        to: Array.isArray(mailOptions.to)
          ? mailOptions.to
          : mailOptions.to.split(',').map((e) => e.trim()),
        subject: mailOptions.subject,
        html: mailOptions.html,
        text: mailOptions.text,
      };

      if (mailOptions.cc) {
        payload.cc = Array.isArray(mailOptions.cc)
          ? mailOptions.cc
          : mailOptions.cc.split(',').map((e) => e.trim());
      }
      if (mailOptions.bcc) {
        payload.bcc = Array.isArray(mailOptions.bcc)
          ? mailOptions.bcc
          : mailOptions.bcc.split(',').map((e) => e.trim());
      }

      // Adjuntos
      if (mailOptions.attachments && mailOptions.attachments.length > 0) {
        const fs = require('fs');
        payload.attachments = mailOptions.attachments.map((att) => {
          if (att.path) {
            const content = fs.readFileSync(att.path);
            return {
              filename: att.filename,
              content: content,
            };
          }
          return att;
        });
      }

      const { data, error } = await resend.emails.send(payload);

      if (error) {
        throw new Error(error.message || 'Error al enviar con Resend');
      }

      return {
        messageId: data.id,
        accepted: payload.to,
      };
    },

    /**
     * verify compatible con nodemailer
     */
    verify: async () => {
      // Resend no necesita verificación de conexión, solo validar que la API key exista
      if (!process.env.RESEND_API_KEY) {
        throw new Error('RESEND_API_KEY no configurada');
      }
      return true;
    },

    /**
     * close compatible con nodemailer
     */
    close: () => {},
  };
};

// ════════════════════════════════════════════════════════════════════════════
// SMTP TRANSPORT (nodemailer original)
// ════════════════════════════════════════════════════════════════════════════

const createProductionTransporter = () => {
  if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
    logger.error('❌ Configuración SMTP incompleta', {
      hasUser: !!smtpConfig.auth.user,
      hasPass: !!smtpConfig.auth.pass,
      host: smtpConfig.host,
    });
    throw new Error('Configuración SMTP incompleta. Verifica SMTP_USER y SMTP_PASS en .env');
  }

  logger.info('📧 Creando transporter SMTP', {
    host: smtpConfig.host,
    port: smtpConfig.port,
    user: smtpConfig.auth.user,
    secure: smtpConfig.secure,
  });

  return nodemailer.createTransport(smtpConfig);
};

const createDevTransporter = async () => {
  try {
    const testAccount = await nodemailer.createTestAccount();
    logger.info('📧 Cuenta Ethereal creada para desarrollo', { user: testAccount.user });

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
  } catch (error) {
    logger.warn('⚠️ No se pudo crear cuenta Ethereal, usando configuración SMTP', error.message);
    return createProductionTransporter();
  }
};

// ════════════════════════════════════════════════════════════════════════════
// TRANSPORTER SINGLETON
// ════════════════════════════════════════════════════════════════════════════

let transporter = null;
let transporterVerified = false;

const getTransporter = async () => {
  if (transporter && transporterVerified) {
    return transporter;
  }

  try {
    // Prioridad: Resend > SMTP > Ethereal
    if (process.env.RESEND_API_KEY) {
      logger.info('📧 Usando Resend (API HTTP) como proveedor de email');
      transporter = createResendTransport();
    } else {
      const useEthereal =
        process.env.NODE_ENV === 'development' &&
        process.env.USE_ETHEREAL === 'true' &&
        !process.env.SMTP_PASS;

      if (useEthereal) {
        transporter = await createDevTransporter();
      } else {
        transporter = createProductionTransporter();
      }
    }

    await transporter.verify();
    transporterVerified = true;
    logger.info('✅ Proveedor de email verificado exitosamente');

    return transporter;
  } catch (error) {
    logger.error('❌ Error al configurar proveedor de email:', {
      message: error.message,
      code: error.code,
    });

    if (error.message.includes('Invalid login') || error.message.includes('authentication')) {
      logger.error('💡 SOLUCIÓN: Verifica que SMTP AUTH esté habilitado en el tenant de Microsoft 365 y que la contraseña sea correcta');
    }

    throw error;
  }
};

const verificarConexion = async () => {
  try {
    const transport = await getTransporter();
    await transport.verify();
    return true;
  } catch (error) {
    logger.error('❌ Error verificando conexión de email:', error.message);
    return false;
  }
};

const resetTransporter = () => {
  if (transporter && transporter.close) {
    transporter.close();
  }
  transporter = null;
  transporterVerified = false;
  logger.info('🔄 Transporter de email reseteado');
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

// Inyectar transporter de prueba sin hacer conexiones reales (solo para tests)
const _setTransporterForTest = (mockTransporter) => {
  transporter = mockTransporter;
  transporterVerified = true;
};

module.exports = {
  getTransporter,
  verificarConexion,
  resetTransporter,
  defaultFrom,
  smtpConfig,
  _setTransporterForTest,
};
