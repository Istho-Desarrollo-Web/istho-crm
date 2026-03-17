/**
 * ISTHO CRM - Controlador de Viajes
 *
 * CRUD de viajes con auditoría y asociación a caja menor.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const { Viaje, Vehiculo, CajaMenor, MovimientoCajaMenor, Usuario, Auditoria, sequelize } = require('../models');
const { success, created, paginated, notFound, conflict, serverError, error: errorResponse } = require('../utils/responses');
const { parsePaginacion, buildPaginacion, parseOrdenamiento, limpiarObjeto, getClientIP, sanitizarBusqueda } = require('../utils/helpers');
const logger = require('../utils/logger');

const CAMPOS_ORDENAMIENTO = ['numero', 'fecha', 'destino', 'cliente_nombre', 'valor_viaje', 'estado', 'created_at'];

/**
 * GET /viajes
 */
const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const order = parseOrdenamiento(req.query, CAMPOS_ORDENAMIENTO);

    const where = {};

    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }

    if (req.query.conductor_id) {
      where.conductor_id = req.query.conductor_id;
    }

    if (req.query.vehiculo_id) {
      where.vehiculo_id = req.query.vehiculo_id;
    }

    if (req.query.caja_menor_id) {
      where.caja_menor_id = req.query.caja_menor_id;
    }

    // Filtro por rango de fechas
    if (req.query.fecha_desde || req.query.fecha_hasta) {
      where.fecha = {};
      if (req.query.fecha_desde) where.fecha[Op.gte] = req.query.fecha_desde;
      if (req.query.fecha_hasta) where.fecha[Op.lte] = req.query.fecha_hasta;
    }

    // Conductor solo ve sus viajes
    if (req.user.esConductor) {
      where.conductor_id = req.user.id;
    }

    if (req.query.search) {
      const s = sanitizarBusqueda(req.query.search);
      where[Op.or] = [
        { numero: { [Op.like]: `%${s}%` } },
        { destino: { [Op.like]: `%${s}%` } },
        { origen: { [Op.like]: `%${s}%` } },
        { cliente_nombre: { [Op.like]: `%${s}%` } },
        { documento_cliente: { [Op.like]: `%${s}%` } },
        { no_factura: { [Op.like]: `%${s}%` } }
      ];
    }

    const { count, rows } = await Viaje.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        { model: Vehiculo, as: 'vehiculo', attributes: ['id', 'placa', 'tipo_vehiculo'] },
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: CajaMenor, as: 'cajaMenor', attributes: ['id', 'numero', 'estado'] }
      ]
    });

    return paginated(res, rows, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('Error al listar viajes:', { message: error.message });
    return serverError(res, 'Error al obtener viajes', error);
  }
};

/**
 * GET /viajes/:id
 */
const obtenerPorId = async (req, res) => {
  try {
    const viaje = await Viaje.findByPk(req.params.id, {
      include: [
        { model: Vehiculo, as: 'vehiculo', attributes: ['id', 'placa', 'tipo_vehiculo', 'capacidad_ton'] },
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: CajaMenor, as: 'cajaMenor', attributes: ['id', 'numero', 'estado', 'saldo_actual'] },
        {
          model: MovimientoCajaMenor, as: 'gastos',
          include: [
            { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] },
            { model: Usuario, as: 'aprobador', attributes: ['id', 'nombre_completo'] }
          ]
        }
      ]
    });

    if (!viaje) return notFound(res, 'Viaje no encontrado');

    if (req.user.esConductor && viaje.conductor_id !== req.user.id) {
      return notFound(res, 'Viaje no encontrado');
    }

    return success(res, viaje);
  } catch (error) {
    logger.error('Error al obtener viaje:', { message: error.message });
    return serverError(res, 'Error al obtener viaje', error);
  }
};

/**
 * POST /viajes
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const datos = limpiarObjeto(req.body);

    // Conductor solo crea viajes para sí mismo
    if (req.user.esConductor) {
      datos.conductor_id = req.user.id;
    }

    // Verificar vehículo
    const vehiculo = await Vehiculo.findByPk(datos.vehiculo_id, { transaction });
    if (!vehiculo) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Vehículo no encontrado');
    }

    // Verificar caja menor si se especifica
    if (datos.caja_menor_id) {
      const caja = await CajaMenor.findByPk(datos.caja_menor_id, { transaction });
      if (!caja) {
        try { await transaction.rollback(); } catch (_) {}
        return notFound(res, 'Caja menor no encontrada');
      }
      if (caja.estado === 'cerrada') {
        try { await transaction.rollback(); } catch (_) {}
        return errorResponse(res, 'La caja menor está cerrada', 400);
      }
    }

    datos.numero = await Viaje.generarNumero();

    const viaje = await Viaje.create(datos, { transaction });

    await Auditoria.registrar({
      tabla: 'viajes',
      registro_id: viaje.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Viaje #${viaje.numero} creado: ${viaje.origen} → ${viaje.destino}`
    });

    await transaction.commit();
    logger.info('Viaje creado:', { id: viaje.id, numero: viaje.numero });

    const resultado = await Viaje.findByPk(viaje.id, {
      include: [
        { model: Vehiculo, as: 'vehiculo', attributes: ['id', 'placa', 'tipo_vehiculo'] },
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: CajaMenor, as: 'cajaMenor', attributes: ['id', 'numero'] }
      ]
    });

    return created(res, resultado, 'Viaje registrado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al crear viaje:', { message: error.message });
    return serverError(res, 'Error al crear viaje', error);
  }
};

/**
 * PUT /viajes/:id
 */
const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);

    const viaje = await Viaje.findByPk(id, { transaction });
    if (!viaje) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Viaje no encontrado');
    }

    if (viaje.estado === 'anulado') {
      try { await transaction.rollback(); } catch (_) {}
      return errorResponse(res, 'No se puede modificar un viaje anulado', 400);
    }

    if (req.user.esConductor && viaje.conductor_id !== req.user.id) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Viaje no encontrado');
    }

    const datosAnteriores = viaje.toJSON();
    await viaje.update(datos, { transaction });

    await Auditoria.registrar({
      tabla: 'viajes',
      registro_id: viaje.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Viaje #${viaje.numero} actualizado`
    });

    await transaction.commit();
    return success(res, viaje, 'Viaje actualizado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al actualizar viaje:', { message: error.message });
    return serverError(res, 'Error al actualizar viaje', error);
  }
};

/**
 * DELETE /viajes/:id
 */
const eliminar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const viaje = await Viaje.findByPk(id, { transaction });
    if (!viaje) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Viaje no encontrado');
    }

    const gastos = await MovimientoCajaMenor.count({ where: { viaje_id: id } });
    if (gastos > 0) {
      try { await transaction.rollback(); } catch (_) {}
      return conflict(res, `No se puede eliminar: tiene ${gastos} gasto(s) asociado(s)`);
    }

    const datosAnteriores = viaje.toJSON();
    await viaje.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'viajes',
      registro_id: id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      ip_address: getClientIP(req),
      descripcion: `Viaje #${viaje.numero} eliminado`
    });

    await transaction.commit();
    return success(res, { id }, 'Viaje eliminado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al eliminar viaje:', { message: error.message });
    return serverError(res, 'Error al eliminar viaje', error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
