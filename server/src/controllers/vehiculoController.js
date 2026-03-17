/**
 * ISTHO CRM - Controlador de Vehículos
 *
 * CRUD de vehículos con auditoría y notificaciones.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const { Vehiculo, Usuario, Viaje, Auditoria, sequelize } = require('../models');
const { success, created, paginated, notFound, conflict, serverError } = require('../utils/responses');
const { parsePaginacion, buildPaginacion, parseOrdenamiento, limpiarObjeto, getClientIP, sanitizarBusqueda } = require('../utils/helpers');
const logger = require('../utils/logger');

const CAMPOS_ORDENAMIENTO = ['placa', 'tipo_vehiculo', 'capacidad_ton', 'vencimiento_soat', 'vencimiento_tecnicomecanica', 'estado', 'created_at'];

/**
 * GET /vehiculos
 */
const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const order = parseOrdenamiento(req.query, CAMPOS_ORDENAMIENTO);

    const where = {};

    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }

    if (req.query.tipo_vehiculo && req.query.tipo_vehiculo !== 'todos') {
      where.tipo_vehiculo = req.query.tipo_vehiculo;
    }

    if (req.query.conductor_id) {
      where.conductor_id = req.query.conductor_id;
    }

    if (req.query.search) {
      const s = sanitizarBusqueda(req.query.search);
      where[Op.or] = [
        { placa: { [Op.like]: `%${s}%` } },
        { marca: { [Op.like]: `%${s}%` } },
        { poliza_responsabilidad: { [Op.like]: `%${s}%` } }
      ];
    }

    const { count, rows } = await Vehiculo.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] }
      ]
    });

    // Agregar alertas de vencimiento
    const data = rows.map(v => {
      const json = v.toJSON();
      json.alerta_soat = v.alertaSOAT();
      json.alerta_tecnicomecanica = v.alertaTecnicomecanica();
      return json;
    });

    return paginated(res, data, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('Error al listar vehículos:', { message: error.message });
    return serverError(res, 'Error al obtener vehículos', error);
  }
};

/**
 * GET /vehiculos/:id
 */
const obtenerPorId = async (req, res) => {
  try {
    const vehiculo = await Vehiculo.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: Viaje, as: 'viajes', limit: 10, order: [['fecha', 'DESC']], attributes: ['id', 'numero', 'fecha', 'destino', 'estado'] }
      ]
    });

    if (!vehiculo) return notFound(res, 'Vehículo no encontrado');

    const data = vehiculo.toJSON();
    data.alerta_soat = vehiculo.alertaSOAT();
    data.alerta_tecnicomecanica = vehiculo.alertaTecnicomecanica();

    return success(res, data);
  } catch (error) {
    logger.error('Error al obtener vehículo:', { message: error.message });
    return serverError(res, 'Error al obtener vehículo', error);
  }
};

/**
 * POST /vehiculos
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const datos = limpiarObjeto(req.body);

    const existe = await Vehiculo.findOne({ where: { placa: datos.placa }, transaction });
    if (existe) {
      try { await transaction.rollback(); } catch (_) {}
      return conflict(res, 'Ya existe un vehículo con esta placa');
    }

    const vehiculo = await Vehiculo.create(datos, { transaction });

    await Auditoria.registrar({
      tabla: 'vehiculos',
      registro_id: vehiculo.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Vehículo registrado: ${vehiculo.placa}`
    });

    await transaction.commit();
    logger.info('Vehículo creado:', { id: vehiculo.id, placa: vehiculo.placa });

    const resultado = await Vehiculo.findByPk(vehiculo.id, {
      include: [{ model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] }]
    });

    return created(res, resultado, 'Vehículo registrado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al crear vehículo:', { message: error.message });
    return serverError(res, 'Error al crear vehículo', error);
  }
};

/**
 * PUT /vehiculos/:id
 */
const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);

    const vehiculo = await Vehiculo.findByPk(id, { transaction });
    if (!vehiculo) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Vehículo no encontrado');
    }

    if (datos.placa && datos.placa !== vehiculo.placa) {
      const existe = await Vehiculo.findOne({ where: { placa: datos.placa, id: { [Op.ne]: id } }, transaction });
      if (existe) {
        try { await transaction.rollback(); } catch (_) {}
        return conflict(res, 'Ya existe otro vehículo con esta placa');
      }
    }

    const datosAnteriores = vehiculo.toJSON();
    await vehiculo.update(datos, { transaction });

    await Auditoria.registrar({
      tabla: 'vehiculos',
      registro_id: vehiculo.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Vehículo actualizado: ${vehiculo.placa}`
    });

    await transaction.commit();

    const resultado = await Vehiculo.findByPk(id, {
      include: [{ model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] }]
    });

    return success(res, resultado, 'Vehículo actualizado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al actualizar vehículo:', { message: error.message });
    return serverError(res, 'Error al actualizar vehículo', error);
  }
};

/**
 * DELETE /vehiculos/:id
 */
const eliminar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const vehiculo = await Vehiculo.findByPk(id, { transaction });
    if (!vehiculo) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Vehículo no encontrado');
    }

    const viajesActivos = await Viaje.count({ where: { vehiculo_id: id, estado: 'activo' } });
    if (viajesActivos > 0) {
      try { await transaction.rollback(); } catch (_) {}
      return conflict(res, `No se puede eliminar: tiene ${viajesActivos} viaje(s) activo(s)`);
    }

    const datosAnteriores = vehiculo.toJSON();
    await vehiculo.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'vehiculos',
      registro_id: id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      ip_address: getClientIP(req),
      descripcion: `Vehículo eliminado: ${vehiculo.placa}`
    });

    await transaction.commit();
    return success(res, { id }, 'Vehículo eliminado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al eliminar vehículo:', { message: error.message });
    return serverError(res, 'Error al eliminar vehículo', error);
  }
};

/**
 * GET /vehiculos/conductores
 * Lista usuarios con rol conductor para selects
 */
const listarConductores = async (req, res) => {
  try {
    const conductores = await Usuario.findAll({
      where: { rol: 'conductor', activo: true },
      attributes: ['id', 'nombre', 'apellido', 'nombre_completo', 'username'],
      order: [['nombre', 'ASC']]
    });
    return success(res, conductores);
  } catch (error) {
    logger.error('Error al listar conductores:', { message: error.message });
    return serverError(res, 'Error al obtener conductores', error);
  }
};

/**
 * GET /vehiculos/alertas-vencimiento
 * Vehículos con documentos vencidos o por vencer
 */
const alertasVencimiento = async (req, res) => {
  try {
    const hoy = new Date();
    const en30dias = new Date();
    en30dias.setDate(en30dias.getDate() + 30);

    const vehiculos = await Vehiculo.findAll({
      where: {
        estado: 'activo',
        [Op.or]: [
          { vencimiento_soat: { [Op.lte]: en30dias } },
          { vencimiento_tecnicomecanica: { [Op.lte]: en30dias } }
        ]
      },
      include: [
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] }
      ],
      order: [['vencimiento_soat', 'ASC']]
    });

    const alertas = vehiculos.map(v => ({
      ...v.toJSON(),
      alerta_soat: v.alertaSOAT(),
      alerta_tecnicomecanica: v.alertaTecnicomecanica()
    }));

    return success(res, alertas);
  } catch (error) {
    logger.error('Error al obtener alertas:', { message: error.message });
    return serverError(res, 'Error al obtener alertas de vencimiento', error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar, listarConductores, alertasVencimiento };
