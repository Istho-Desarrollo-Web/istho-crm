/**
 * ISTHO CRM - Controlador de Movimientos de Caja Menor
 *
 * CRUD + aprobación de gastos/ingresos con soporte de archivos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const { MovimientoCajaMenor, CajaMenor, Viaje, Usuario, Auditoria, sequelize } = require('../models');
const notificacionService = require('../services/notificacionService');
const { success, created, paginated, notFound, conflict, serverError, error: errorResponse } = require('../utils/responses');
const { parsePaginacion, buildPaginacion, parseOrdenamiento, limpiarObjeto, getClientIP, sanitizarBusqueda } = require('../utils/helpers');
const logger = require('../utils/logger');

const CAMPOS_ORDENAMIENTO = ['consecutivo', 'concepto', 'tipo_movimiento', 'valor', 'valor_aprobado', 'aprobado', 'created_at'];

/**
 * GET /movimientos-caja-menor
 */
const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const order = parseOrdenamiento(req.query, CAMPOS_ORDENAMIENTO);

    const where = {};

    if (req.query.caja_menor_id) {
      where.caja_menor_id = req.query.caja_menor_id;
    }

    if (req.query.viaje_id) {
      where.viaje_id = req.query.viaje_id;
    }

    if (req.query.tipo_movimiento && req.query.tipo_movimiento !== 'todos') {
      where.tipo_movimiento = req.query.tipo_movimiento;
    }

    if (req.query.concepto && req.query.concepto !== 'todos') {
      where.concepto = req.query.concepto;
    }

    if (req.query.aprobado !== undefined && req.query.aprobado !== 'todos') {
      if (req.query.aprobado === 'pendiente') {
        where.aprobado = false;
        where.rechazado = false;
      } else if (req.query.aprobado === 'true') {
        where.aprobado = true;
      } else if (req.query.aprobado === 'rechazado') {
        where.rechazado = true;
      }
    }

    if (req.query.conductor_id) {
      where.conductor_id = req.query.conductor_id;
    }

    // Conductor solo ve sus movimientos
    if (req.user.esConductor) {
      where.conductor_id = req.user.id;
    }

    if (req.query.search) {
      const s = sanitizarBusqueda(req.query.search);
      where[Op.or] = [
        { descripcion: { [Op.like]: `%${s}%` } },
        { concepto_otro: { [Op.like]: `%${s}%` } },
        { observaciones_aprobacion: { [Op.like]: `%${s}%` } }
      ];
    }

    const { count, rows } = await MovimientoCajaMenor.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        { model: CajaMenor, as: 'cajaMenor', attributes: ['id', 'numero', 'estado'] },
        { model: Viaje, as: 'viaje', attributes: ['id', 'numero', 'destino'] },
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] },
        { model: Usuario, as: 'aprobador', attributes: ['id', 'nombre_completo'] }
      ]
    });

    return paginated(res, rows, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('Error al listar movimientos:', { message: error.message });
    return serverError(res, 'Error al obtener movimientos', error);
  }
};

/**
 * GET /movimientos-caja-menor/:id
 */
const obtenerPorId = async (req, res) => {
  try {
    const movimiento = await MovimientoCajaMenor.findByPk(req.params.id, {
      include: [
        { model: CajaMenor, as: 'cajaMenor', attributes: ['id', 'numero', 'estado', 'conductor_id'] },
        { model: Viaje, as: 'viaje', attributes: ['id', 'numero', 'destino', 'fecha'] },
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre', 'apellido', 'nombre_completo'] },
        { model: Usuario, as: 'aprobador', attributes: ['id', 'nombre_completo'] }
      ]
    });

    if (!movimiento) return notFound(res, 'Movimiento no encontrado');

    if (req.user.esConductor && movimiento.conductor_id !== req.user.id) {
      return notFound(res, 'Movimiento no encontrado');
    }

    return success(res, movimiento);
  } catch (error) {
    logger.error('Error al obtener movimiento:', { message: error.message });
    return serverError(res, 'Error al obtener movimiento', error);
  }
};

/**
 * POST /movimientos-caja-menor
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const datos = limpiarObjeto(req.body);

    // Verificar caja menor
    const caja = await CajaMenor.findByPk(datos.caja_menor_id, { transaction });
    if (!caja) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Caja menor no encontrada');
    }

    if (caja.estado === 'cerrada') {
      try { await transaction.rollback(); } catch (_) {}
      return errorResponse(res, 'La caja menor está cerrada, no se pueden agregar movimientos', 400);
    }

    // Asignar conductor: si es conductor se asigna a sí mismo, sino usar el de la caja
    if (req.user.esConductor) {
      datos.conductor_id = req.user.id;
    } else if (!datos.conductor_id) {
      datos.conductor_id = caja.conductor_id;
    }

    // Verificar viaje si se especifica
    if (datos.viaje_id) {
      const viaje = await Viaje.findByPk(datos.viaje_id, { transaction });
      if (!viaje) {
        try { await transaction.rollback(); } catch (_) {}
        return notFound(res, 'Viaje no encontrado');
      }
    }

    // Manejar archivo de soporte
    if (req.file) {
      datos.soporte_url = `/uploads/soportes/${req.file.filename}`;
      datos.soporte_nombre = req.file.originalname;
    }

    datos.consecutivo = await MovimientoCajaMenor.generarConsecutivo();

    const movimiento = await MovimientoCajaMenor.create(datos, { transaction });

    // Recalcular saldo si es aprobado automáticamente (financiera crea directamente)
    if (datos.aprobado) {
      movimiento.valor_aprobado = datos.valor_aprobado || datos.valor;
      movimiento.aprobado_por = req.user.id;
      movimiento.fecha_aprobacion = new Date();
      await movimiento.save({ transaction });
      await caja.recalcularSaldo(transaction);
    }

    await Auditoria.registrar({
      tabla: 'movimientos_caja_menor',
      registro_id: movimiento.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Gasto #${movimiento.consecutivo} (${movimiento.concepto}) $${Number(movimiento.valor).toLocaleString('es-CO')} en ${caja.numero}`
    });

    await transaction.commit();
    logger.info('Movimiento creado:', { id: movimiento.id, consecutivo: movimiento.consecutivo });

    const resultado = await MovimientoCajaMenor.findByPk(movimiento.id, {
      include: [
        { model: CajaMenor, as: 'cajaMenor', attributes: ['id', 'numero'] },
        { model: Viaje, as: 'viaje', attributes: ['id', 'numero', 'destino'] },
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] }
      ]
    });

    return created(res, resultado, 'Movimiento registrado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al crear movimiento:', { message: error.message });
    return serverError(res, 'Error al crear movimiento', error);
  }
};

/**
 * PUT /movimientos-caja-menor/:id
 */
const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);

    const movimiento = await MovimientoCajaMenor.findByPk(id, {
      include: [{ model: CajaMenor, as: 'cajaMenor' }],
      transaction
    });

    if (!movimiento) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Movimiento no encontrado');
    }

    if (req.user.esConductor && movimiento.conductor_id !== req.user.id) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Movimiento no encontrado');
    }

    // Conductor no puede editar movimientos ya aprobados
    if (req.user.esConductor && movimiento.aprobado) {
      try { await transaction.rollback(); } catch (_) {}
      return errorResponse(res, 'No puedes modificar un movimiento ya aprobado', 400);
    }

    if (req.file) {
      datos.soporte_url = `/uploads/soportes/${req.file.filename}`;
      datos.soporte_nombre = req.file.originalname;
    }

    const datosAnteriores = movimiento.toJSON();
    await movimiento.update(datos, { transaction });

    await Auditoria.registrar({
      tabla: 'movimientos_caja_menor',
      registro_id: movimiento.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Gasto #${movimiento.consecutivo} actualizado`
    });

    await transaction.commit();
    return success(res, movimiento, 'Movimiento actualizado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al actualizar movimiento:', { message: error.message });
    return serverError(res, 'Error al actualizar movimiento', error);
  }
};

/**
 * PUT /movimientos-caja-menor/:id/aprobar
 * Aprobar o rechazar un movimiento (solo financiera/admin)
 */
const aprobar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { aprobado, valor_aprobado, observaciones_aprobacion } = req.body;

    const movimiento = await MovimientoCajaMenor.findByPk(id, {
      include: [{ model: CajaMenor, as: 'cajaMenor' }],
      transaction
    });

    if (!movimiento) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Movimiento no encontrado');
    }

    const datosAnteriores = movimiento.toJSON();

    if (aprobado) {
      await movimiento.update({
        aprobado: true,
        rechazado: false,
        valor_aprobado: valor_aprobado || movimiento.valor,
        aprobado_por: req.user.id,
        fecha_aprobacion: new Date(),
        observaciones_aprobacion: observaciones_aprobacion || null
      }, { transaction });
    } else {
      await movimiento.update({
        aprobado: false,
        rechazado: true,
        valor_aprobado: 0,
        aprobado_por: req.user.id,
        fecha_aprobacion: new Date(),
        observaciones_aprobacion: observaciones_aprobacion || null
      }, { transaction });
    }

    // Recalcular saldo de la caja
    await movimiento.cajaMenor.recalcularSaldo(transaction);

    await Auditoria.registrar({
      tabla: 'movimientos_caja_menor',
      registro_id: movimiento.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: { aprobado, valor_aprobado, observaciones_aprobacion },
      ip_address: getClientIP(req),
      descripcion: `Gasto #${movimiento.consecutivo} ${aprobado ? 'aprobado' : 'rechazado'} por $${Number(valor_aprobado || movimiento.valor).toLocaleString('es-CO')}`
    });

    await transaction.commit();

    // Notificar al conductor
    notificacionService.notificar({
      usuario_id: movimiento.conductor_id,
      titulo: aprobado ? 'Gasto aprobado' : 'Gasto rechazado',
      cuerpo: aprobado
        ? `Tu gasto #${movimiento.consecutivo} (${movimiento.concepto}) fue aprobado por $${Number(valor_aprobado || movimiento.valor).toLocaleString('es-CO')}`
        : `Tu gasto #${movimiento.consecutivo} (${movimiento.concepto}) fue rechazado. ${observaciones_aprobacion || ''}`,
      tipo: 'sistema',
      prioridad: aprobado ? 'normal' : 'alta',
      datos: { movimiento_id: movimiento.id }
    }).catch(() => {});

    logger.info(`Movimiento ${aprobado ? 'aprobado' : 'rechazado'}:`, { id: movimiento.id });
    return success(res, movimiento, `Movimiento ${aprobado ? 'aprobado' : 'rechazado'} exitosamente`);
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al aprobar movimiento:', { message: error.message });
    return serverError(res, 'Error al procesar aprobación', error);
  }
};

/**
 * PUT /movimientos-caja-menor/aprobar-masivo
 * Aprobar múltiples movimientos a la vez
 */
const aprobarMasivo = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { ids, observaciones_aprobacion } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      try { await transaction.rollback(); } catch (_) {}
      return errorResponse(res, 'Debe seleccionar al menos un movimiento', 400);
    }

    const movimientos = await MovimientoCajaMenor.findAll({
      where: { id: { [Op.in]: ids }, aprobado: false, rechazado: false },
      include: [{ model: CajaMenor, as: 'cajaMenor' }],
      transaction
    });

    let aprobados = 0;
    const cajasAfectadas = new Set();

    for (const mov of movimientos) {
      await mov.update({
        aprobado: true,
        rechazado: false,
        valor_aprobado: mov.valor,
        aprobado_por: req.user.id,
        fecha_aprobacion: new Date(),
        observaciones_aprobacion: observaciones_aprobacion || 'Aprobación masiva'
      }, { transaction });
      cajasAfectadas.add(mov.caja_menor_id);
      aprobados++;
    }

    // Recalcular saldo de todas las cajas afectadas
    for (const cajaId of cajasAfectadas) {
      const caja = await CajaMenor.findByPk(cajaId, { transaction });
      if (caja) await caja.recalcularSaldo(transaction);
    }

    await Auditoria.registrar({
      tabla: 'movimientos_caja_menor',
      registro_id: null,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { ids, accion: 'aprobacion_masiva' },
      ip_address: getClientIP(req),
      descripcion: `Aprobación masiva: ${aprobados} movimientos aprobados`
    });

    await transaction.commit();
    return success(res, { aprobados }, `${aprobados} movimiento(s) aprobado(s) exitosamente`);
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error en aprobación masiva:', { message: error.message });
    return serverError(res, 'Error en aprobación masiva', error);
  }
};

/**
 * DELETE /movimientos-caja-menor/:id
 */
const eliminar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { id } = req.params;
    const movimiento = await MovimientoCajaMenor.findByPk(id, {
      include: [{ model: CajaMenor, as: 'cajaMenor' }],
      transaction
    });

    if (!movimiento) {
      try { await transaction.rollback(); } catch (_) {}
      return notFound(res, 'Movimiento no encontrado');
    }

    if (movimiento.aprobado) {
      try { await transaction.rollback(); } catch (_) {}
      return conflict(res, 'No se puede eliminar un movimiento aprobado');
    }

    const datosAnteriores = movimiento.toJSON();
    await movimiento.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'movimientos_caja_menor',
      registro_id: id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      ip_address: getClientIP(req),
      descripcion: `Gasto #${movimiento.consecutivo} eliminado`
    });

    await transaction.commit();
    return success(res, { id }, 'Movimiento eliminado exitosamente');
  } catch (error) {
    try { await transaction.rollback(); } catch (_) {}
    logger.error('Error al eliminar movimiento:', { message: error.message });
    return serverError(res, 'Error al eliminar movimiento', error);
  }
};

/**
 * GET /movimientos-caja-menor/conceptos
 * Retorna los conceptos disponibles por tipo de movimiento
 */
const listarConceptos = async (req, res) => {
  try {
    return success(res, {
      egreso: MovimientoCajaMenor.CONCEPTOS_EGRESO,
      ingreso: MovimientoCajaMenor.CONCEPTOS_INGRESO
    });
  } catch (error) {
    return serverError(res, 'Error al obtener conceptos', error);
  }
};

module.exports = { listar, obtenerPorId, crear, actualizar, aprobar, aprobarMasivo, eliminar, listarConceptos };
