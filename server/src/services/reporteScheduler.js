/**
 * ISTHO CRM - Servicio de Reportes Programados
 *
 * Gestiona el envío automático de reportes por email usando node-cron.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const cron = require('node-cron');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

let scheduledJobs = {};

/**
 * Inicializar trabajos programados desde la BD
 */
const inicializar = async () => {
  try {
    const { ReporteProgramado } = require('../models');
    if (!ReporteProgramado) {
      logger.warn('[SCHEDULER] Modelo ReporteProgramado no disponible aún');
      return;
    }

    const reportes = await ReporteProgramado.findAll({ where: { activo: true } });

    reportes.forEach(reporte => {
      programar(reporte);
    });

    logger.info(`[SCHEDULER] ${reportes.length} reportes programados cargados`);
  } catch (error) {
    logger.warn('[SCHEDULER] Error al inicializar:', error.message);
  }
};

/**
 * Programar un reporte
 */
const programar = (reporte) => {
  // Cancelar si ya existía
  if (scheduledJobs[reporte.id]) {
    scheduledJobs[reporte.id].stop();
  }

  if (!cron.validate(reporte.cron_expresion)) {
    logger.error(`[SCHEDULER] Expresión cron inválida para reporte ${reporte.id}: ${reporte.cron_expresion}`);
    return;
  }

  const job = cron.schedule(reporte.cron_expresion, async () => {
    logger.info(`[SCHEDULER] Ejecutando reporte programado: ${reporte.nombre} (ID: ${reporte.id})`);
    try {
      await ejecutarReporte(reporte);
    } catch (error) {
      logger.error(`[SCHEDULER] Error ejecutando reporte ${reporte.id}:`, error.message);
    }
  }, {
    timezone: 'America/Bogota'
  });

  scheduledJobs[reporte.id] = job;
  logger.info(`[SCHEDULER] Reporte programado: "${reporte.nombre}" - ${reporte.cron_expresion}`);
};

/**
 * Ejecutar un reporte y enviarlo por email
 * Soporta formato: 'excel', 'pdf' o 'ambos'
 */
const ejecutarReporte = async (reporte) => {
  const excelService = require('./excelService');
  const pdfService = require('./pdfService');
  const emailService = require('./emailService');
  const { Operacion, Inventario, Cliente, Contacto, sequelize } = require('../models');
  const path = require('path');
  const fs = require('fs');

  const hoy = new Date();
  const fechaStr = hoy.toISOString().split('T')[0];
  const tmpDir = path.join(__dirname, '../../uploads/temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Determinar formatos
  const formatosAGenerar = reporte.formato === 'ambos' ? ['excel', 'pdf'] : [reporte.formato || 'excel'];

  // Consultar datos una sola vez
  let datos;
  const where = {};
  if (reporte.cliente_id) where.cliente_id = reporte.cliente_id;
  if (reporte.filtros?.estado) where.estado = reporte.filtros.estado;

  switch (reporte.tipo_reporte) {
    case 'operaciones':
      datos = await Operacion.findAll({ where, include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }], order: [['created_at', 'DESC']] });
      break;
    case 'inventario':
      datos = await Inventario.findAll({ where, include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }], order: [['producto', 'ASC']] });
      break;
    case 'clientes':
      datos = await Cliente.findAll({
        attributes: { include: [[sequelize.literal('(SELECT COUNT(*) FROM inventario WHERE inventario.cliente_id = Cliente.id)'), 'total_productos']] },
        include: [{ model: Contacto, as: 'contactos', where: { activo: true }, required: false }],
        order: [['razon_social', 'ASC']]
      });
      break;
    default:
      logger.warn(`[SCHEDULER] Tipo desconocido: ${reporte.tipo_reporte}`);
      return;
  }

  // Generadores por tipo
  const generadores = {
    operaciones: { excel: () => excelService.exportarOperaciones(datos), pdf: () => pdfService.generarPDFOperaciones(datos) },
    inventario: { excel: () => excelService.exportarInventario(datos), pdf: () => pdfService.generarPDFInventario(datos) },
    clientes: { excel: () => excelService.exportarClientes(datos), pdf: () => pdfService.generarPDFClientes(datos) },
  };

  // Generar adjuntos
  const adjuntos = [];
  const tmpFiles = [];

  for (const fmt of formatosAGenerar) {
    const gen = generadores[reporte.tipo_reporte]?.[fmt];
    if (!gen) continue;
    const buffer = await gen();
    const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
    const mime = fmt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fname = `${reporte.tipo_reporte}_${fechaStr}.${ext}`;
    const tmpPath = path.join(tmpDir, `${Date.now()}_${fname}`);
    fs.writeFileSync(tmpPath, buffer);
    adjuntos.push({ nombre: fname, path: tmpPath, tipo: mime });
    tmpFiles.push(tmpPath);
  }

  // Enviar
  const destinatarios = reporte.destinatarios.split(',').map(e => e.trim()).filter(Boolean);
  if (destinatarios.length === 0) {
    logger.warn(`[SCHEDULER] Sin destinatarios para reporte ${reporte.id}`);
    tmpFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    return;
  }

  const formatoLabel = formatosAGenerar.map(f => f.toUpperCase()).join(' + ');

  try {
    await emailService.enviarCorreo({
      para: destinatarios,
      asunto: `[ISTHO CRM] Reporte Programado: ${reporte.nombre}`,
      templateName: 'general',
      datos: {
        titulo: `Reporte: ${reporte.nombre}`,
        mensaje: `Se adjunta el reporte "${reporte.nombre}" en formato ${formatoLabel}, generado automáticamente el ${hoy.toLocaleDateString('es-CO')}.`,
        asunto: `Reporte Programado: ${reporte.nombre}`
      },
      adjuntos
    });

    const { ReporteProgramado } = require('../models');
    await ReporteProgramado.update({ ultima_ejecucion: hoy }, { where: { id: reporte.id } });
    logger.info(`[SCHEDULER] Reporte "${reporte.nombre}" (${formatoLabel}) enviado a ${destinatarios.join(', ')}`);
  } finally {
    tmpFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
  }
};

/**
 * Cancelar un reporte programado
 */
const cancelar = (reporteId) => {
  if (scheduledJobs[reporteId]) {
    scheduledJobs[reporteId].stop();
    delete scheduledJobs[reporteId];
    logger.info(`[SCHEDULER] Reporte ${reporteId} cancelado`);
  }
};

/**
 * Obtener estado de todos los jobs
 */
const getEstado = () => {
  return Object.keys(scheduledJobs).map(id => ({
    id: parseInt(id),
    running: true
  }));
};

module.exports = {
  inicializar,
  programar,
  ejecutarReporte,
  cancelar,
  getEstado
};
