/**
 * ISTHO CRM - Controlador de Caja Menor
 *
 * CRUD + cierre + cuadre de cajas menores con auditoría.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const { CajaMenor, MovimientoCajaMenor, Viaje, Usuario, Vehiculo, Auditoria, sequelize } = require('../models');
const notificacionService = require('../services/notificacionService');
const { success, created, paginated, notFound, conflict, serverError, error: errorResponse } = require('../utils/responses');
const { parsePaginacion, buildPaginacion, parseOrdenamiento, limpiarObjeto, getClientIP, sanitizarBusqueda } = require('../utils/helpers');
const logger = require('../utils/logger');

const CAMPOS_ORDENAMIENTO = ['numero', 'saldo_inicial', 'saldo_actual', 'estado', 'fecha_apertura', 'fecha_cierre', 'created_at'];

/**
 * GET /cajas-menores
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

    // Conductor solo ve sus cajas
    if (req.user.esConductor) {
      where.conductor_id = req.user.id;
    }

    if (req.query.search) {
      const s = sanitizarBusqueda(req.query.search);
      where[Op.or] = [
        { numero: { [Op.like]: `%${s}%` } },
        { observaciones: { [Op.like]: `%${s}%` } }
      ];
    }

    const { count, rows } = await CajaMenor.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre_completo'] },
        { model: CajaMenor, as: 'cajaAnterior', attributes: ['id', 'numero'] }
      ]
    });

    return paginated(res, rows, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('Error al listar cajas menores:', { message: error.message });
    return serverError(res, 'Error al obtener cajas menores', error);
  }
};

/**
 * GET /cajas-menores/:id
 */
const obtenerPorId = async (req, res) => {
  try {
    const caja = await CajaMenor.findByPk(req.params.id, {
      include: [
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre_completo'] },
        { model: Usuario, as: 'cerrador', attributes: ['id', 'nombre_completo'] },
        { model: CajaMenor, as: 'cajaAnterior', attributes: ['id', 'numero', 'saldo_actual'] },
        { model: CajaMenor, as: 'cajaSiguiente', attributes: ['id', 'numero'] },
        {
          model: Viaje, as: 'viajes',
          attributes: ['id', 'numero', 'fecha', 'destino', 'cliente_nombre', 'valor_viaje', 'estado'],
          include: [{ model: Vehiculo, as: 'vehiculo', attributes: ['id', 'placa', 'tipo_vehiculo'] }]
        },
        {
          model: MovimientoCajaMenor, as: 'movimientos',
          order: [['consecutivo', 'DESC']],
          include: [
            { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] },
            { model: Usuario, as: 'aprobador', attributes: ['id', 'nombre_completo'] },
            { model: Viaje, as: 'viaje', attributes: ['id', 'numero', 'destino'] }
          ]
        }
      ]
    });

    if (!caja) return notFound(res, 'Caja menor no encontrada');

    // Conductor solo ve sus cajas
    if (req.user.esConductor && caja.conductor_id !== req.user.id) {
      return notFound(res, 'Caja menor no encontrada');
    }

    return success(res, caja);
  } catch (error) {
    logger.error('Error al obtener caja menor:', { message: error.message });
    return serverError(res, 'Error al obtener caja menor', error);
  }
};

/**
 * POST /cajas-menores
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const datos = limpiarObjeto(req.body);

    // Verificar que el conductor existe
    const conductor = await Usuario.findByPk(datos.conductor_id);
    if (!conductor) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Conductor no encontrado');
    }

    // Generar número
    datos.numero = await CajaMenor.generarNumero();
    datos.creado_por = req.user.id;
    datos.fecha_apertura = datos.fecha_apertura || new Date();

    // Si viene de caja anterior, cargar sobrante
    if (datos.caja_anterior_id) {
      const cajaAnterior = await CajaMenor.findByPk(datos.caja_anterior_id, { transaction });
      if (cajaAnterior && cajaAnterior.estado === 'cerrada') {
        datos.saldo_trasladado = parseFloat(cajaAnterior.saldo_actual) || 0;
      }
    }

    datos.saldo_actual = parseFloat(datos.saldo_inicial || 0) + parseFloat(datos.saldo_trasladado || 0);

    const caja = await CajaMenor.create(datos, { transaction });

    await Auditoria.registrar({
      tabla: 'cajas_menores',
      registro_id: caja.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Caja menor ${caja.numero} creada para ${conductor.nombre_completo}`
    });

    await transaction.commit();

    // Notificar al conductor
    notificacionService.notificar({
      usuario_id: datos.conductor_id,
      titulo: 'Nueva caja menor asignada',
      cuerpo: `Se te ha asignado la caja menor ${caja.numero} con saldo de $${Number(caja.saldo_actual).toLocaleString('es-CO')}`,
      tipo: 'sistema',
      prioridad: 'alta',
      datos: { caja_menor_id: caja.id }
    }).catch(() => {});

    logger.info('Caja menor creada:', { id: caja.id, numero: caja.numero });

    const resultado = await CajaMenor.findByPk(caja.id, {
      include: [
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre_completo'] }
      ]
    });

    return created(res, resultado, 'Caja menor creada exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al crear caja menor:', { message: error.message });
    return serverError(res, 'Error al crear caja menor', error);
  }
};

/**
 * PUT /cajas-menores/:id
 */
const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);

    const caja = await CajaMenor.findByPk(id, { transaction });
    if (!caja) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Caja menor no encontrada');
    }

    if (caja.estado === 'cerrada') {
      try { await transaction.rollback(); } catch (_) {}
      return errorResponse(res, 'No se puede modificar una caja cerrada', 400);
    }

    const datosAnteriores = caja.toJSON();
    await caja.update(datos, { transaction });

    await Auditoria.registrar({
      tabla: 'cajas_menores',
      registro_id: caja.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Caja menor ${caja.numero} actualizada`
    });

    await transaction.commit();
    return success(res, caja, 'Caja menor actualizada exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al actualizar caja menor:', { message: error.message });
    return serverError(res, 'Error al actualizar caja menor', error);
  }
};

/**
 * PUT /cajas-menores/:id/cerrar
 * Cerrar/cuadrar caja menor
 */
const cerrar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { observaciones_cierre, accion_sobrante } = req.body;

    const caja = await CajaMenor.findByPk(id, { transaction });
    if (!caja) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Caja menor no encontrada');
    }

    if (caja.estado === 'cerrada') {
      try { await transaction.rollback(); } catch (_) {}
      return errorResponse(res, 'La caja ya está cerrada', 400);
    }

    // Recalcular saldo antes de cerrar
    await caja.recalcularSaldo(transaction);
    await caja.reload({ transaction });

    const datosAnteriores = caja.toJSON();

    await caja.update({
      estado: 'cerrada',
      fecha_cierre: new Date(),
      cerrada_por: req.user.id,
      observaciones_cierre: observaciones_cierre || null
    }, { transaction });

    await Auditoria.registrar({
      tabla: 'cajas_menores',
      registro_id: caja.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: { estado: 'cerrada', saldo_actual: caja.saldo_actual },
      ip_address: getClientIP(req),
      descripcion: `Caja menor ${caja.numero} cerrada. Saldo final: $${Number(caja.saldo_actual).toLocaleString('es-CO')}`
    });

    await transaction.commit();

    // Notificar al conductor
    notificacionService.notificar({
      usuario_id: caja.conductor_id,
      titulo: 'Caja menor cerrada',
      cuerpo: `La caja ${caja.numero} ha sido cerrada. Saldo final: $${Number(caja.saldo_actual).toLocaleString('es-CO')}`,
      tipo: 'sistema',
      prioridad: 'alta',
      datos: { caja_menor_id: caja.id }
    }).catch(() => {});

    logger.info('Caja menor cerrada:', { id: caja.id, numero: caja.numero, saldo: caja.saldo_actual });
    return success(res, caja, 'Caja menor cerrada exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al cerrar caja menor:', { message: error.message });
    return serverError(res, 'Error al cerrar caja menor', error);
  }
};

/**
 * DELETE /cajas-menores/:id
 */
const eliminar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const caja = await CajaMenor.findByPk(id, { transaction });
    if (!caja) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Caja menor no encontrada');
    }

    const movimientos = await MovimientoCajaMenor.count({ where: { caja_menor_id: id } });
    if (movimientos > 0) {
      try { await transaction.rollback(); } catch (_) {}
      return conflict(res, `No se puede eliminar: tiene ${movimientos} movimiento(s) asociado(s)`);
    }

    const datosAnteriores = caja.toJSON();
    await caja.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'cajas_menores',
      registro_id: id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      ip_address: getClientIP(req),
      descripcion: `Caja menor ${caja.numero} eliminada`
    });

    await transaction.commit();
    return success(res, { id }, 'Caja menor eliminada exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al eliminar caja menor:', { message: error.message });
    return serverError(res, 'Error al eliminar caja menor', error);
  }
};

/**
 * GET /cajas-menores/stats
 * Estadísticas para dashboard financiero
 */
const estadisticas = async (req, res) => {
  try {
    const where = {};
    if (req.user.esConductor) {
      where.conductor_id = req.user.id;
    }

    const [abiertas, enRevision, cerradas, totalEgresos, totalIngresos] = await Promise.all([
      CajaMenor.count({ where: { ...where, estado: 'abierta' } }),
      CajaMenor.count({ where: { ...where, estado: 'en_revision' } }),
      CajaMenor.count({ where: { ...where, estado: 'cerrada' } }),
      CajaMenor.sum('total_egresos', { where: { ...where, estado: { [Op.ne]: 'cerrada' } } }),
      CajaMenor.sum('total_ingresos', { where: { ...where, estado: { [Op.ne]: 'cerrada' } } })
    ]);

    return success(res, {
      abiertas: abiertas || 0,
      en_revision: enRevision || 0,
      cerradas: cerradas || 0,
      total_egresos_activos: totalEgresos || 0,
      total_ingresos_activos: totalIngresos || 0
    });
  } catch (error) {
    logger.error('Error al obtener estadísticas:', { message: error.message });
    return serverError(res, 'Error al obtener estadísticas', error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, cerrar, eliminar, estadisticas };
