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
  const { ReporteProgramado, Operacion, Inventario, CajaInventario, Cliente, Contacto, Viaje, Vehiculo, CajaMenor, MovimientoCajaMenor, Usuario, sequelize } = require('../models');
  const path = require('path');
  const fs = require('fs');

  const hoy = new Date();
  const fechaStr = hoy.toISOString().split('T')[0];
  const tmpDir = path.join(__dirname, '../../uploads/temp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  // Marcar como ejecutando antes de empezar
  await ReporteProgramado.update(
    { estado_ultima_ejecucion: 'ejecutando', ultimo_error: null },
    { where: { id: reporte.id } }
  ).catch(() => {});

  const tmpFiles = [];

  try {
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
      case 'viajes':
        datos = await Viaje.findAll({
          where,
          include: [
            { model: Usuario, as: 'conductor', attributes: ['nombre', 'apellido', 'nombre_completo'] },
            { model: Vehiculo, as: 'vehiculo', attributes: ['placa', 'tipo_vehiculo'] },
            { model: CajaMenor, as: 'cajaMenor', attributes: ['numero', 'estado'] }
          ],
          order: [['created_at', 'DESC']]
        });
        break;
      case 'cajas_menores':
        datos = await CajaMenor.findAll({
          where,
          include: [
            { model: Usuario, as: 'asignado', attributes: ['nombre', 'apellido', 'nombre_completo'] },
            { model: Usuario, as: 'creador', attributes: ['nombre', 'apellido', 'nombre_completo'] }
          ],
          order: [['created_at', 'DESC']]
        });
        break;
      case 'gastos': {
        const movWhere = {};
        if (reporte.filtros?.estado === 'aprobado') { movWhere.aprobado = true; movWhere.rechazado = false; }
        else if (reporte.filtros?.estado === 'rechazado') { movWhere.rechazado = true; }
        else if (reporte.filtros?.estado === 'pendiente') { movWhere.aprobado = false; movWhere.rechazado = false; }
        datos = await MovimientoCajaMenor.findAll({
          where: movWhere,
          include: [
            { model: CajaMenor, as: 'cajaMenor', attributes: ['numero', 'estado'] },
            { model: Usuario, as: 'usuario', attributes: ['nombre', 'apellido', 'nombre_completo'] },
            { model: Viaje, as: 'viaje', attributes: ['id', 'destino', 'estado'] }
          ],
          order: [['created_at', 'DESC']]
        });
        break;
      }
      case 'inventario_ubicacion':
        datos = await CajaInventario.findAll({
          where: { estado: 'disponible' },
          include: [{
            model: Inventario, as: 'inventario',
            attributes: ['id', 'producto', 'sku', 'unidad_medida', 'cliente_id'],
            where: reporte.cliente_id ? { cliente_id: reporte.cliente_id } : undefined,
            required: true,
            include: [{ model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'] }]
          }],
          order: [['ubicacion', 'ASC'], ['numero_caja', 'ASC']],
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
      inventario_ubicacion: { excel: () => excelService.exportarInventarioUbicacion(datos), pdf: () => pdfService.generarPDFInventarioUbicacion(datos) },
      clientes: { excel: () => excelService.exportarClientes(datos), pdf: () => pdfService.generarPDFClientes(datos) },
      viajes: { excel: () => excelService.exportarViajes(datos), pdf: () => pdfService.generarPDFOperaciones(datos) },
      cajas_menores: { excel: () => excelService.exportarCajasMenores(datos), pdf: () => pdfService.generarPDFOperaciones(datos) },
      gastos: { excel: () => excelService.exportarMovimientos(datos), pdf: () => pdfService.generarPDFOperaciones(datos) },
    };

    // Generar adjuntos
    const adjuntos = [];

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
      await ReporteProgramado.update(
        { estado_ultima_ejecucion: 'fallido', ultimo_error: 'Sin destinatarios configurados' },
        { where: { id: reporte.id } }
      ).catch(() => {});
      return;
    }

    const formatoLabel = formatosAGenerar.map(f => f.toUpperCase()).join(' + ');

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

    await ReporteProgramado.update(
      { ultima_ejecucion: hoy, estado_ultima_ejecucion: 'exitoso', ultimo_error: null },
      { where: { id: reporte.id } }
    );
    logger.info(`[SCHEDULER] Reporte "${reporte.nombre}" (${formatoLabel}) enviado a ${destinatarios.join(', ')}`);

  } catch (error) {
    await ReporteProgramado.update(
      { estado_ultima_ejecucion: 'fallido', ultimo_error: (error.message || 'Error desconocido').substring(0, 500) },
      { where: { id: reporte.id } }
    ).catch(() => {});
    throw error;
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
