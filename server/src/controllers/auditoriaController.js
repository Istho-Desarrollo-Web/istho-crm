/**
 * ISTHO CRM - Controlador de Auditoría de Acciones
 *
 * Consulta del log de auditoría del sistema.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const { Auditoria, Usuario, sequelize } = require('../models');
const { success, serverError } = require('../utils/responses');
const logger = require('../utils/logger');

/**
 * GET /auditoria-acciones
 * Listar registros de auditoría con filtros y paginación
 */
const listar = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 30,
      search,
      accion,
      tabla,
      usuario_id,
      fecha_desde,
      fecha_hasta,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    if (accion) where.accion = accion;
    if (tabla) where.tabla = tabla;
    if (usuario_id) where.usuario_id = usuario_id;

    if (search) {
      where[Op.or] = [
        { descripcion: { [Op.like]: `%${search}%` } },
        { usuario_nombre: { [Op.like]: `%${search}%` } },
        { tabla: { [Op.like]: `%${search}%` } }
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

    const { rows, count } = await Auditoria.findAndCountAll({
      where,
      include: [{
        model: Usuario,
        as: 'usuario',
        attributes: ['id', 'username', 'nombre_completo', 'rol', 'avatar_url'],
        required: false
      }],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    // Normalizar campo de fecha para el frontend
    const registros = rows.map(r => {
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
        totalPages: Math.ceil(count / limit)
      }
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
        raw: true
      }),

      Auditoria.findAll({
        attributes: ['tabla', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        where: { created_at: { [Op.gte]: desde } },
        group: ['tabla'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true
      }),

      Auditoria.findAll({
        attributes: ['usuario_id', 'usuario_nombre', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
        where: { created_at: { [Op.gte]: desde }, usuario_id: { [Op.ne]: null } },
        group: ['usuario_id', 'usuario_nombre'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 5,
        raw: true
      })
    ]);

    return success(res, {
      dias: parseInt(dias),
      total: totalRegistros,
      por_accion: porAccion,
      por_tabla: porTabla,
      usuarios_activos: usuariosMasActivos
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
      raw: true
    });
    return success(res, result.map(r => r.tabla));
  } catch (error) {
    return serverError(res, 'Error al obtener tablas', error);
  }
};

module.exports = {
  listar,
  stats,
  tablas,
};
