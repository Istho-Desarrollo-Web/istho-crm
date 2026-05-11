/**
 * ISTHO CRM - Controlador de Email Manual
 *
 * Permite a admin y supervisor enviar emails ad-hoc desde cualquier módulo.
 *
 * @author Coordinación TI ISTHO
 */

const emailService = require('../services/emailService');
const { Auditoria } = require('../models');
const { success, error: errorResponse } = require('../utils/responses');
const logger = require('../utils/logger');

const enviarManual = async (req, res) => {
  const { para, cc = [], plantilla_id, variables = {}, asunto, cuerpo_html } = req.body;

  if (!para || !para.length) {
    return errorResponse(res, 'Se requiere al menos un destinatario', 400);
  }

  setImmediate(async () => {
    try {
      await emailService.enviarManual({
        para,
        cc,
        plantillaId: plantilla_id || null,
        variables,
        asunto,
        cuerpoHtml: cuerpo_html,
      });

      await Auditoria.registrar({
        tabla: 'emails_manuales',
        registro_id: null,
        accion: 'envio_manual',
        usuario_id: req.user.id,
        datos_nuevos: { para, cc, plantilla_id, asunto },
      });
    } catch (err) {
      logger.error('Error enviando email manual:', { message: err.message });
    }
  });

  return success(res, null, 'Email enviado');
};

module.exports = { enviarManual };
