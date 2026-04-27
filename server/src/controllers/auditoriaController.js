/**
 * ISTHO CRM - Controlador de Auditoría de Acciones
 *
 * Consulta y exportación del log de auditoría del sistema.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const { Op } = require('sequelize');
const { Auditoria, Usuario, sequelize } = require('../models');
const { success, serverError } = require('../utils/responses');
const logger = require('../utils/logger');
const excelService = require('../services/excelService');
const pdfService = require('../services/pdfService');

const MAX_EXPORT_ROWS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS PRIVADOS
// ─────────────────────────────────────────────────────────────────────────────

const construirWhere = (query) => {
  const { search, accion, tabla, usuario_id, fecha_desde, fecha_hasta } = query;
  const where = {};

  if (accion) where.accion = accion;
  if (tabla) where.tabla = tabla;
  if (usuario_id) where.usuario_id = usuario_id;

  if (search) {
    where[Op.or] = [
      { descripcion: { [Op.like]: `%${search}%` } },
      { usuario_nombre: { [Op.like]: `%${search}%` } },
      { tabla: { [Op.like]: `%${search}%` } },
    ];
  }

  if (fecha_desde || fecha_hasta) {
    where.created_at = {};
    if (fecha_desde) where.created_at[Op.gte] = new Date(fecha_desde);
    if (fecha_hasta) {
      const hasta = new Date(fecha_hasta);
      hasta.setHours(23, 59, 59, 999);
      where.created_at[Op.lte] = hasta;
    }
  }

  return where;
};

const includeUsuario = {
  model: Usuario,
  as: 'usuario',
  attributes: ['id', 'username', 'nombre_completo', 'rol', 'avatar_url'],
  required: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROLADORES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /auditoria-acciones
 * Listar registros de auditoría con filtros y paginación
 */
const listar = async (req, res) => {
  try {
    const { page = 1, limit = 30, sort = 'created_at', order = 'DESC' } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const where = construirWhere(req.query);

    const { rows, count } = await Auditoria.findAndCountAll({
      where,
      include: [includeUsuario],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset,
    });

    const registros = rows.map((r) => {
      const json = r.toJSON();
      if (!json.created_at && json.createdAt) json.created_at = json.createdAt;
      return json;
    });

    return success(res, {
      registros,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Error al listar auditoría:', { message: error.message });
    return serverError(res, 'Error al listar registros de auditoría', error);
  }
};

/**
 * GET /auditoria-acciones/stats
 * Estadísticas de auditoría
 */
const stats = async (req, res) => {
  try {
    const { dias = 7 } = req.query;
    const desde = new Date();
    desde.setDate(desde.getDate() - parseInt(dias));

    const [totalRegistros, porAccion, porTabla, usuariosMasActivos] = await Promise.all([
      Auditoria.count({ where: { created_at: { [Op.gte]: desde } } }),

      Auditoria.findAll({
        attributes: ['accion', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        where: { created_at: { [Op.gte]: desde } },
        group: ['accion'],
        raw: true,
      }),

      Auditoria.findAll({
        attributes: ['tabla', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        where: { created_at: { [Op.gte]: desde } },
        group: ['tabla'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true,
      }),

      Auditoria.findAll({
        attributes: [
          'usuario_id',
          'usuario_nombre',
          [sequelize.fn('COUNT', sequelize.col('id')), 'total'],
        ],
        where: { created_at: { [Op.gte]: desde }, usuario_id: { [Op.ne]: null } },
        group: ['usuario_id', 'usuario_nombre'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 5,
        raw: true,
      }),
    ]);

    return success(res, {
      dias: parseInt(dias),
      total: totalRegistros,
      por_accion: porAccion,
      por_tabla: porTabla,
      usuarios_activos: usuariosMasActivos,
    });
  } catch (error) {
    logger.error('Error al obtener stats de auditoría:', { message: error.message });
    return serverError(res, 'Error al obtener estadísticas', error);
  }
};

/**
 * GET /auditoria-acciones/tablas
 * Listar tablas únicas para filtros
 */
const tablas = async (req, res) => {
  try {
    const result = await Auditoria.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('tabla')), 'tabla']],
      order: [['tabla', 'ASC']],
      raw: true,
    });
    return success(
      res,
      result.map((r) => r.tabla)
    );
  } catch (error) {
    return serverError(res, 'Error al obtener tablas', error);
  }
};

/**
 * GET /auditoria-acciones/excel
 * Exportar log de auditoría a Excel (respeta los mismos filtros que listar)
 */
const exportarExcel = async (req, res) => {
  try {
    const where = construirWhere(req.query);

    const registros = await Auditoria.findAll({
      where,
      include: [includeUsuario],
      order: [['created_at', 'DESC']],
      limit: MAX_EXPORT_ROWS,
    });

    const buffer = await excelService.exportarAuditoriaAcciones(
      registros.map((r) => r.toJSON()),
      req.query
    );

    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="auditoria_${fecha}.xlsx"`);
    res.send(buffer);
  } catch (error) {
    logger.error('Error al exportar auditoría Excel:', { message: error.message });
    return serverError(res, 'Error al generar el reporte Excel', error);
  }
};

/**
 * GET /auditoria-acciones/pdf
 * Exportar log de auditoría a PDF (respeta los mismos filtros que listar)
 */
const exportarPDF = async (req, res) => {
  try {
    const where = construirWhere(req.query);

    const registros = await Auditoria.findAll({
      where,
      include: [includeUsuario],
      order: [['created_at', 'DESC']],
      limit: MAX_EXPORT_ROWS,
    });

    const buffer = await pdfService.generarPDFAuditoriaAcciones(
      registros.map((r) => r.toJSON()),
      req.query
    );

    const fecha = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="auditoria_${fecha}.pdf"`);
    res.send(buffer);
  } catch (error) {
    logger.error('Error al exportar auditoría PDF:', { message: error.message });
    return serverError(res, 'Error al generar el reporte PDF', error);
  }
};

module.exports = {
  listar,
  stats,
  tablas,
  exportarExcel,
  exportarPDF,
};
