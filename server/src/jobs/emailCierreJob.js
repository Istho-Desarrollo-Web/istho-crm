'use strict';

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

// Importación diferida para evitar circular en startup
const getModels = () => require('../models');

let tarea = null;
let ejecutando = false;

async function _enviarPendientes() {
  if (ejecutando) return;
  ejecutando = true;

  try {
    const { Operacion, Cliente, OperacionDetalle, OperacionDocumento, OperacionAveria, Usuario } =
      getModels();
    const emailService = require('../services/emailService');

    // Operaciones cerradas hace > 180s con correo pendiente (null = en cola)
    // 180s para dar margen a que terminen todos los uploads de fotos/documentos
    const hace90s = new Date(Date.now() - 180 * 1000);
    const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pendientes = await Operacion.findAll({
      where: {
        correo_enviado: null,
        correos_destino: { [Op.ne]: null },
        estado: 'cerrado',
        fecha_cierre: {
          [Op.lt]: hace90s,
          [Op.gt]: hace24h,
        },
      },
      attributes: ['id', 'correos_destino'],
      limit: 10,
    });

    if (pendientes.length === 0) return;

    logger.info(`[EmailCierreJob] ${pendientes.length} correo(s) de cierre pendientes`);

    for (const op of pendientes) {
      // Reclamar atómicamente: evita doble envío en caso de reinicios concurrentes
      const [reclamado] = await Operacion.update(
        { correo_enviado: false },
        { where: { id: op.id, correo_enviado: null } }
      );
      if (reclamado === 0) continue;

      try {
        const operacionCompleta = await Operacion.findByPk(op.id, {
          include: [
            { model: Cliente, as: 'cliente' },
            { model: OperacionDetalle, as: 'detalles' },
            { model: OperacionDocumento, as: 'documentos' },
            { model: OperacionAveria, as: 'averias' },
            { model: Usuario, as: 'cerrador', attributes: ['id', 'nombre_completo'] },
          ],
        });

        if (!operacionCompleta) continue;

        const resultado = await emailService.enviarCierreOperacion(
          operacionCompleta,
          op.correos_destino
        );

        await Operacion.update(
          {
            correo_enviado: resultado.success,
            fecha_correo_enviado: resultado.success ? new Date() : null,
          },
          { where: { id: op.id } }
        );

        logger.info(`[EmailCierreJob] Operacion ${op.id}: correo ${resultado.success ? 'enviado OK' : 'falló'}`);
      } catch (err) {
        logger.error(`[EmailCierreJob] Error enviando correo operacion ${op.id}:`, {
          message: err.message,
        });
        // correo_enviado queda en false → no reintenta (admin usa reenvío manual si falla)
      }
    }
  } finally {
    ejecutando = false;
  }
}

function iniciarEmailCierreJob() {
  tarea = cron.schedule('* * * * *', _enviarPendientes, {
    scheduled: true,
    timezone: 'America/Bogota',
  });
  logger.info('[EmailCierreJob] Job de correos de cierre iniciado (cada 1 min, delay 180s tras cierre)');
}

function detenerEmailCierreJob() {
  if (tarea) {
    tarea.stop();
    tarea = null;
    logger.info('[EmailCierreJob] Job de correos de cierre detenido');
  }
}

module.exports = { iniciarEmailCierreJob, detenerEmailCierreJob };
