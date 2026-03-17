/**
 * ISTHO CRM - Controlador de Operaciones
 * 
 * Maneja las operaciones de ingreso/salida de mercancía.
 * 
 * MODIFICACIÓN v1.3.0:
 * - Registro de movimientos en historial de inventario
 * - Movimientos tipo: reserva, salida, entrada, liberacion
 * - Integración completa con MovimientoInventario
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.3.0
 */

const { Op } = require('sequelize');
const {
  Operacion,
  OperacionDetalle,
  OperacionAveria,
  OperacionDocumento,
  Cliente,
  Contacto,
  Usuario,
  Inventario,
  MovimientoInventario,  // ✅ AGREGADO
  Auditoria,
  sequelize
} = require('../models');
const wmsService = require('../services/wmsService');
const notificacionService = require('../services/notificacionService');
const {
  success,
  successMessage,
  created,
  paginated,
  error: errorResponse,
  notFound,
  conflict,
  serverError
} = require('../utils/responses');
const {
  parsePaginacion,
  buildPaginacion,
  parseOrdenamiento,
  limpiarObjeto,
  getClientIP
} = require('../utils/helpers');
const logger = require('../utils/logger');

const CAMPOS_ORDENAMIENTO = ['numero_operacion', 'fecha_operacion', 'tipo', 'estado', 'created_at'];

/**
 * Generar número de operación
 */
const generarNumeroOperacion = async () => {
  const año = new Date().getFullYear();
  const ultima = await Operacion.findOne({
    where: { numero_operacion: { [Op.like]: `OP-${año}-%` } },
    order: [['id', 'DESC']],
    paranoid: false
  });
  
  let siguiente = 1;
  if (ultima) {
    const partes = ultima.numero_operacion.split('-');
    siguiente = parseInt(partes[2]) + 1;
  }
  
  return `OP-${año}-${String(siguiente).padStart(4, '0')}`;
};

// =============================================
// FUNCIONES DE GESTIÓN DE STOCK CON MOVIMIENTOS
// =============================================

/**
 * Reservar stock para una operación de salida
 * - Incrementa cantidad_reservada en el inventario
 * - ✅ REGISTRA MOVIMIENTO TIPO 'reserva'
 * 
 * @param {Array} detalles - Detalles de la operación
 * @param {number} clienteId - ID del cliente
 * @param {string} numeroOperacion - Número de operación para referencia
 * @param {number} usuarioId - ID del usuario que realiza la operación
 * @param {string} ipAddress - IP del cliente
 * @param {Transaction} transaction - Transacción de Sequelize
 * @returns {Object} { success: boolean, errors: Array }
 */
const reservarStock = async (detalles, clienteId, numeroOperacion, usuarioId, ipAddress, transaction) => {
  const errores = [];
  const reservasRealizadas = [];
  
  for (const detalle of detalles) {
    try {
      // Buscar producto en inventario (por producto_id o por sku+cliente)
      let inventario = null;
      
      if (detalle.producto_id) {
        inventario = await Inventario.findOne({
          where: { 
            id: detalle.producto_id,
            cliente_id: clienteId
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
      }
      
      // Si no encontró por ID, buscar por SKU
      if (!inventario && detalle.sku) {
        inventario = await Inventario.findOne({
          where: { 
            sku: detalle.sku,
            cliente_id: clienteId
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
      }
      
      if (!inventario) {
        errores.push({
          sku: detalle.sku || 'N/A',
          producto: detalle.producto || 'Desconocido',
          mensaje: 'Producto no encontrado en inventario'
        });
        continue;
      }
      
      // Calcular disponibilidad
      const cantidadActual = parseFloat(inventario.cantidad) || 0;
      const cantidadReservada = parseFloat(inventario.cantidad_reservada) || 0;
      const disponible = cantidadActual - cantidadReservada;
      const cantidadSolicitada = parseFloat(detalle.cantidad) || 0;
      
      if (cantidadSolicitada > disponible) {
        errores.push({
          sku: inventario.sku,
          producto: inventario.producto,
          mensaje: `Stock insuficiente. Disponible: ${disponible}, Solicitado: ${cantidadSolicitada}`
        });
        continue;
      }
      
      const nuevaReserva = cantidadReservada + cantidadSolicitada;
      
      // Reservar stock
      await inventario.update({
        cantidad_reservada: nuevaReserva
      }, { transaction });
      
      // ════════════════════════════════════════════════════════════════════
      // ✅ REGISTRAR MOVIMIENTO DE RESERVA
      // ════════════════════════════════════════════════════════════════════
      await MovimientoInventario.registrar({
        inventario_id: inventario.id,
        usuario_id: usuarioId,
        tipo: 'reserva',
        motivo: `Reserva para despacho ${numeroOperacion}`,
        cantidad: cantidadSolicitada,  // Positivo para reserva
        stock_anterior: cantidadActual,
        stock_resultante: cantidadActual,  // Stock no cambia, solo reserva
        documento_referencia: numeroOperacion,
        observaciones: `Cantidad reservada: ${cantidadReservada} → ${nuevaReserva}`,
        ip_address: ipAddress
      }, { transaction });
      
      reservasRealizadas.push({
        inventario_id: inventario.id,
        sku: inventario.sku,
        cantidad: cantidadSolicitada
      });
      
      // Guardar referencia del inventario en el detalle
      detalle.inventario_id = inventario.id;
      
      logger.info('Stock reservado:', {
        inventario_id: inventario.id,
        sku: inventario.sku,
        cantidad_reservada: cantidadSolicitada,
        disponible_anterior: disponible,
        disponible_nuevo: disponible - cantidadSolicitada
      });
      
    } catch (error) {
      logger.error('Error reservando stock:', { 
        detalle, 
        error: error.message 
      });
      errores.push({
        sku: detalle.sku || 'N/A',
        mensaje: `Error interno: ${error.message}`
      });
    }
  }
  
  return {
    success: errores.length === 0,
    errors: errores,
    reservas: reservasRealizadas
  };
};

/**
 * Liberar stock reservado (al anular operación)
 * - Decrementa cantidad_reservada en el inventario
 * - ✅ REGISTRA MOVIMIENTO TIPO 'liberacion'
 * 
 * @param {number} operacionId - ID de la operación
 * @param {string} numeroOperacion - Número de operación para referencia
 * @param {number} usuarioId - ID del usuario
 * @param {string} ipAddress - IP del cliente
 * @param {Transaction} transaction - Transacción de Sequelize
 */
const liberarStockReservado = async (operacionId, numeroOperacion, usuarioId, ipAddress, transaction) => {
  const detalles = await OperacionDetalle.findAll({
    where: { operacion_id: operacionId },
    transaction
  });
  
  const operacion = await Operacion.findByPk(operacionId, { transaction });
  
  for (const detalle of detalles) {
    try {
      let inventario = null;
      
      if (detalle.inventario_id) {
        inventario = await Inventario.findByPk(detalle.inventario_id, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
      } else if (detalle.sku && operacion) {
        inventario = await Inventario.findOne({
          where: { 
            sku: detalle.sku,
            cliente_id: operacion.cliente_id
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
      }
      
      if (inventario) {
        const cantidadActual = parseFloat(inventario.cantidad) || 0;
        const cantidadReservada = parseFloat(inventario.cantidad_reservada) || 0;
        const cantidadLiberar = parseFloat(detalle.cantidad) || 0;
        const nuevaReserva = Math.max(0, cantidadReservada - cantidadLiberar);
        
        await inventario.update({
          cantidad_reservada: nuevaReserva
        }, { transaction });
        
        // ════════════════════════════════════════════════════════════════════
        // ✅ REGISTRAR MOVIMIENTO DE LIBERACIÓN
        // ════════════════════════════════════════════════════════════════════
        await MovimientoInventario.registrar({
          inventario_id: inventario.id,
          usuario_id: usuarioId,
          operacion_id: operacionId,
          tipo: 'liberacion',
          motivo: `Liberación por anulación de ${numeroOperacion}`,
          cantidad: cantidadLiberar,  // Positivo para liberación
          stock_anterior: cantidadActual,
          stock_resultante: cantidadActual,  // Stock no cambia, solo reserva
          documento_referencia: numeroOperacion,
          observaciones: `Reserva liberada: ${cantidadReservada} → ${nuevaReserva}`,
          ip_address: ipAddress
        }, { transaction });
        
        logger.info('Stock liberado:', {
          inventario_id: inventario.id,
          sku: inventario.sku,
          cantidad_liberada: cantidadLiberar
        });
      }
    } catch (error) {
      logger.error('Error liberando stock:', { 
        detalle_id: detalle.id, 
        error: error.message 
      });
    }
  }
};

/**
 * Confirmar movimiento de stock al cerrar operación
 * - Salida: Reduce cantidad y cantidad_reservada
 * - Ingreso: Incrementa cantidad
 * - ✅ REGISTRA MOVIMIENTO TIPO 'salida' o 'entrada'
 * 
 * @param {Object} operacion - Operación a confirmar
 * @param {number} usuarioId - ID del usuario
 * @param {string} ipAddress - IP del cliente
 * @param {Transaction} transaction - Transacción de Sequelize
 */
const confirmarMovimientoStock = async (operacion, usuarioId, ipAddress, transaction) => {
  const detalles = await OperacionDetalle.findAll({
    where: { operacion_id: operacion.id },
    transaction
  });
  
  for (const detalle of detalles) {
    try {
      let inventario = null;
      
      // Buscar inventario
      if (detalle.inventario_id) {
        inventario = await Inventario.findByPk(detalle.inventario_id, {
          transaction,
          lock: transaction.LOCK.UPDATE
        });
      } else if (detalle.sku) {
        inventario = await Inventario.findOne({
          where: { 
            sku: detalle.sku,
            cliente_id: operacion.cliente_id
          },
          transaction,
          lock: transaction.LOCK.UPDATE
        });
      }
      
      if (!inventario) {
        // Para ingresos, crear el producto si no existe
        if (operacion.tipo === 'ingreso') {
          inventario = await Inventario.create({
            cliente_id: operacion.cliente_id,
            sku: detalle.sku,
            producto: detalle.producto,
            cantidad: 0,
            cantidad_reservada: 0,
            unidad_medida: detalle.unidad_medida || 'UND',
            lote: detalle.lote,
            fecha_vencimiento: detalle.fecha_vencimiento,
            estado: 'disponible'
          }, { transaction });
          
          logger.info('Producto creado en inventario:', {
            inventario_id: inventario.id,
            sku: inventario.sku
          });
        } else {
          logger.warn('Inventario no encontrado para confirmar:', {
            detalle_id: detalle.id,
            sku: detalle.sku
          });
          continue;
        }
      }
      
      const cantidadAnterior = parseFloat(inventario.cantidad) || 0;
      const cantidadReservada = parseFloat(inventario.cantidad_reservada) || 0;
      const cantidadMovimiento = parseFloat(detalle.cantidad) || 0;
      const cantidadAveria = parseFloat(detalle.cantidad_averia) || 0;
      const cantidadEfectiva = cantidadMovimiento - cantidadAveria;
      
      let cantidadNueva;
      let tipoMovimiento;
      let motivoMovimiento;
      
      if (operacion.tipo === 'salida') {
        // ════════════════════════════════════════════════════════════════════
        // SALIDA: Reducir cantidad y liberar reserva
        // ════════════════════════════════════════════════════════════════════
        cantidadNueva = Math.max(0, cantidadAnterior - cantidadEfectiva);
        const nuevaReserva = Math.max(0, cantidadReservada - cantidadMovimiento);
        
        await inventario.update({
          cantidad: cantidadNueva,
          cantidad_reservada: nuevaReserva
        }, { transaction });
        
        tipoMovimiento = 'salida';
        motivoMovimiento = `Despacho ${operacion.numero_operacion}`;
        
        logger.info('Salida confirmada:', {
          inventario_id: inventario.id,
          sku: inventario.sku,
          cantidad_anterior: cantidadAnterior,
          cantidad_nueva: cantidadNueva,
          averia: cantidadAveria
        });
        
      } else if (operacion.tipo === 'ingreso') {
        // ════════════════════════════════════════════════════════════════════
        // INGRESO: Incrementar cantidad
        // ════════════════════════════════════════════════════════════════════
        cantidadNueva = cantidadAnterior + cantidadEfectiva;
        
        await inventario.update({
          cantidad: cantidadNueva
        }, { transaction });
        
        tipoMovimiento = 'entrada';
        motivoMovimiento = `Ingreso ${operacion.numero_operacion}`;
        
        logger.info('Ingreso confirmado:', {
          inventario_id: inventario.id,
          sku: inventario.sku,
          cantidad_anterior: cantidadAnterior,
          cantidad_nueva: cantidadNueva,
          averia: cantidadAveria
        });
      }
      
      // ════════════════════════════════════════════════════════════════════
      // ✅ REGISTRAR MOVIMIENTO EN HISTORIAL
      // ════════════════════════════════════════════════════════════════════
      const cantidadRegistro = operacion.tipo === 'salida' 
        ? -cantidadEfectiva  // Negativo para salidas
        : cantidadEfectiva;   // Positivo para entradas
      
      await MovimientoInventario.registrar({
        inventario_id: inventario.id,
        usuario_id: usuarioId,
        operacion_id: operacion.id,
        tipo: tipoMovimiento,
        motivo: motivoMovimiento,
        cantidad: cantidadRegistro,
        stock_anterior: cantidadAnterior,
        stock_resultante: cantidadNueva,
        documento_referencia: operacion.numero_operacion,
        observaciones: cantidadAveria > 0 
          ? `Cantidad despachada: ${cantidadMovimiento}, Avería: ${cantidadAveria}, Efectivo: ${cantidadEfectiva}`
          : null,
        costo_unitario: inventario.costo_unitario,
        ip_address: ipAddress
      }, { transaction });
      
    } catch (error) {
      logger.error('Error confirmando movimiento:', { 
        detalle_id: detalle.id, 
        error: error.message 
      });
    }
  }
};

// =============================================
// OPERACIONES CRUD
// =============================================

/**
 * GET /operaciones/wms/documentos
 * Listar documentos disponibles en WMS
 */
const listarDocumentosWMS = async (req, res) => {
  try {
    const { tipo, cliente_codigo } = req.query;
    
    const documentos = await wmsService.listarDocumentosPendientes(
      tipo || 'ingreso',
      cliente_codigo
    );
    
    return success(res, documentos);
    
  } catch (error) {
    logger.error('Error al listar documentos WMS:', { message: error.message });
    return serverError(res, 'Error al consultar documentos del WMS', error);
  }
};

/**
 * GET /operaciones/wms/documento/:numero
 * Buscar documento específico en WMS
 */
const buscarDocumentoWMS = async (req, res) => {
  try {
    const { numero } = req.params;
    
    const documento = await wmsService.buscarDocumento(numero);
    
    if (!documento) {
      return notFound(res, `Documento ${numero} no encontrado en el WMS`);
    }
    
    return success(res, documento);
    
  } catch (error) {
    logger.error('Error al buscar documento WMS:', { message: error.message });
    return serverError(res, 'Error al consultar el WMS', error);
  }
};

/**
 * GET /operaciones
 * Listar operaciones
 */
const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const order = parseOrdenamiento(req.query, CAMPOS_ORDENAMIENTO, 'created_at', 'DESC');
    
    const where = {};
    
    if (req.query.tipo && req.query.tipo !== 'todos') {
      where.tipo = req.query.tipo;
    }
    
    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }
    
    if (req.query.cliente_id) {
      where.cliente_id = req.query.cliente_id;
    }
    
    if (req.query.fecha_desde || req.query.fecha_hasta) {
      where.fecha_operacion = {};
      if (req.query.fecha_desde) where.fecha_operacion[Op.gte] = req.query.fecha_desde;
      if (req.query.fecha_hasta) where.fecha_operacion[Op.lte] = req.query.fecha_hasta;
    }
    
    if (req.query.search) {
      const term = `%${req.query.search}%`;
      where[Op.or] = [
        { numero_operacion: { [Op.like]: term } },
        { documento_wms: { [Op.like]: term } }
      ];
    }
    
    const { count, rows } = await Operacion.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre_completo'] }
      ]
    });
    
    return paginated(res, rows, buildPaginacion(count, page, limit));
    
  } catch (error) {
    logger.error('Error al listar operaciones:', { message: error.message });
    return serverError(res, 'Error al obtener operaciones', error);
  }
};

/**
 * GET /operaciones/stats
 * Estadísticas de operaciones
 */
const estadisticas = async (req, res) => {
  try {
    const whereCliente = req.query.cliente_id ? { cliente_id: req.query.cliente_id } : {};
    
    const porTipo = await Operacion.findAll({
      where: whereCliente,
      attributes: ['tipo', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
      group: ['tipo'],
      raw: true
    });
    
    const porEstado = await Operacion.findAll({
      where: whereCliente,
      attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
      group: ['estado'],
      raw: true
    });
    
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    
    const esteMes = await Operacion.count({
      where: { ...whereCliente, created_at: { [Op.gte]: inicioMes } }
    });
    
    const totalAverias = await Operacion.sum('total_averias', { where: whereCliente }) || 0;
    
    return success(res, {
      resumen: {
        total: porTipo.reduce((sum, t) => sum + parseInt(t.cantidad), 0),
        este_mes: esteMes,
        total_averias: totalAverias
      },
      porTipo: porTipo.map(t => ({ tipo: t.tipo, cantidad: parseInt(t.cantidad) })),
      porEstado: porEstado.map(e => ({ estado: e.estado, cantidad: parseInt(e.cantidad) }))
    });
    
  } catch (error) {
    logger.error('Error al obtener estadísticas:', { message: error.message });
    return serverError(res, 'Error al obtener estadísticas', error);
  }
};

/**
 * GET /operaciones/:id
 * Obtener operación por ID
 */
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const operacion = await Operacion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social', 'nit'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre_completo'] },
        { model: Usuario, as: 'cerrador', attributes: ['id', 'nombre_completo'] },
        { 
          model: OperacionDetalle, 
          as: 'detalles',
          include: [{ model: OperacionAveria, as: 'evidencias_averia' }]
        },
        { model: OperacionAveria, as: 'averias' },
        { 
          model: OperacionDocumento, 
          as: 'documentos',
          include: [{ model: Usuario, as: 'usuario_subio', attributes: ['id', 'nombre_completo'] }]
        }
      ]
    });
    
    if (!operacion) {
      return notFound(res, 'Operación no encontrada');
    }
    
    return success(res, operacion);
    
  } catch (error) {
    logger.error('Error al obtener operación:', { message: error.message });
    return serverError(res, 'Error al obtener la operación', error);
  }
};

/**
 * POST /operaciones
 * Crear operación - Soporta dos modos:
 * 
 * MODO WMS: Si se envía documento_wms, busca en WMS y usa esos datos
 * MODO MANUAL: Si NO se envía documento_wms, usa los datos del frontend
 * 
 * ✅ INCLUYE GESTIÓN DE STOCK Y REGISTRO DE MOVIMIENTOS
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const datos = limpiarObjeto(req.body);
    const ipAddress = getClientIP(req);
    
    // ════════════════════════════════════════════════════════════════════
    // VALIDACIONES BÁSICAS
    // ════════════════════════════════════════════════════════════════════
    
    if (!datos.tipo || !['ingreso', 'salida'].includes(datos.tipo)) {
      await transaction.rollback();
      return errorResponse(res, 'El tipo de operación es requerido (ingreso/salida)', 400);
    }
    
    if (!datos.cliente_id) {
      await transaction.rollback();
      return errorResponse(res, 'El cliente es requerido', 400);
    }
    
    const cliente = await Cliente.findByPk(datos.cliente_id);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Generar número de operación primero (para referencias)
    const numeroOperacion = await generarNumeroOperacion();
    
    // ════════════════════════════════════════════════════════════════════
    // DETERMINAR MODO: WMS vs MANUAL
    // ════════════════════════════════════════════════════════════════════
    
    let detallesData = [];
    let modoOperacion = 'manual';
    
    if (datos.documento_wms) {
      // ──────────────────────────────────────────────────────────────────
      // MODO WMS
      // ──────────────────────────────────────────────────────────────────
      
      modoOperacion = 'wms';
      
      const docWMS = await wmsService.buscarDocumento(datos.documento_wms);
      
      if (!docWMS) {
        await transaction.rollback();
        return notFound(res, `Documento ${datos.documento_wms} no encontrado en el WMS`);
      }
      
      const existente = await Operacion.findOne({
        where: { documento_wms: datos.documento_wms }
      });
      
      if (existente) {
        await transaction.rollback();
        return conflict(res, `Ya existe una operación para el documento ${datos.documento_wms}`);
      }
      
      datos.fecha_documento = docWMS.fecha_documento;
      datos.total_referencias = docWMS.productos.length;
      datos.total_unidades = docWMS.productos.reduce((sum, p) => sum + p.cantidad, 0);
      
      detallesData = docWMS.productos.map(p => ({
        sku: p.sku,
        producto: p.producto,
        cantidad: p.cantidad,
        unidad_medida: p.unidad_medida,
        lote: p.lote,
        fecha_vencimiento: p.fecha_vencimiento
      }));
      
    } else {
      // ──────────────────────────────────────────────────────────────────
      // MODO MANUAL
      // ──────────────────────────────────────────────────────────────────
      
      modoOperacion = 'manual';
      
      if (!datos.detalles || !Array.isArray(datos.detalles) || datos.detalles.length === 0) {
        await transaction.rollback();
        return errorResponse(res, 'Debe incluir al menos un producto en la operación', 400);
      }
      
      for (let i = 0; i < datos.detalles.length; i++) {
        const det = datos.detalles[i];
        if (!det.cantidad || det.cantidad <= 0) {
          await transaction.rollback();
          return errorResponse(res, `El producto en posición ${i + 1} debe tener cantidad mayor a 0`, 400);
        }
      }
      
      datos.total_referencias = datos.detalles.length;
      datos.total_unidades = datos.detalles.reduce((sum, d) => sum + (parseFloat(d.cantidad) || 0), 0);
      
      detallesData = datos.detalles.map(d => ({
        sku: d.sku || d.codigo || '',
        producto: d.producto || d.nombre || '',
        cantidad: parseFloat(d.cantidad) || 0,
        unidad_medida: d.unidad_medida || 'UND',
        lote: d.lote || null,
        fecha_vencimiento: d.fecha_vencimiento || null,
        producto_id: d.producto_id || null
      }));
    }
    
    // ════════════════════════════════════════════════════════════════════
    // ✅ RESERVAR STOCK PARA SALIDAS (con registro de movimiento)
    // ════════════════════════════════════════════════════════════════════
    
    if (datos.tipo === 'salida') {
      const resultadoReserva = await reservarStock(
        detallesData, 
        datos.cliente_id, 
        numeroOperacion,
        req.user.id,
        ipAddress,
        transaction
      );
      
      if (!resultadoReserva.success) {
        await transaction.rollback();
        return errorResponse(res, 'Error al reservar stock', 400, resultadoReserva.errors, 'STOCK_ERROR');
      }
      
      logger.info('Stock reservado para operación:', {
        numero_operacion: numeroOperacion,
        cliente_id: datos.cliente_id,
        productos: resultadoReserva.reservas.length
      });
    }
    
    // ════════════════════════════════════════════════════════════════════
    // CREAR OPERACIÓN
    // ════════════════════════════════════════════════════════════════════
    
    const operacion = await Operacion.create({
      numero_operacion: numeroOperacion,
      tipo: datos.tipo,
      cliente_id: datos.cliente_id,
      documento_wms: datos.documento_wms || null,
      fecha_operacion: datos.fecha_operacion || new Date().toISOString().split('T')[0],
      fecha_documento: datos.fecha_documento || null,
      origen: datos.origen || null,
      destino: datos.destino || null,
      vehiculo_placa: datos.vehiculo_placa || null,
      vehiculo_tipo: datos.vehiculo_tipo || null,
      conductor_nombre: datos.conductor_nombre || null,
      conductor_cedula: datos.conductor_cedula || null,
      conductor_telefono: datos.conductor_telefono || null,
      total_referencias: datos.total_referencias,
      total_unidades: datos.total_unidades,
      prioridad: datos.prioridad || 'normal',
      observaciones: datos.observaciones || null,
      estado: 'pendiente',
      creado_por: req.user.id
    }, { transaction });
    
    // ════════════════════════════════════════════════════════════════════
    // CREAR DETALLES (con referencia a inventario)
    // ════════════════════════════════════════════════════════════════════
    
    const detallesConOperacion = detallesData.map(d => ({
      operacion_id: operacion.id,
      inventario_id: d.inventario_id || null,
      sku: d.sku,
      producto: d.producto,
      cantidad: d.cantidad,
      unidad_medida: d.unidad_medida,
      lote: d.lote,
      fecha_vencimiento: d.fecha_vencimiento
    }));
    
    await OperacionDetalle.bulkCreate(detallesConOperacion, { transaction });
    
    // ════════════════════════════════════════════════════════════════════
    // AUDITORÍA
    // ════════════════════════════════════════════════════════════════════
    
    await Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: operacion.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: {
        numero_operacion: operacion.numero_operacion,
        tipo: operacion.tipo,
        cliente_id: operacion.cliente_id,
        modo: modoOperacion,
        total_referencias: operacion.total_referencias,
        total_unidades: operacion.total_unidades,
        stock_reservado: datos.tipo === 'salida'
      },
      ip_address: ipAddress,
      descripcion: `Operación creada: ${operacion.numero_operacion} (${operacion.tipo}) - Modo: ${modoOperacion}${datos.tipo === 'salida' ? ' - Stock reservado' : ''}`
    });
    
    await transaction.commit();
    
    // ════════════════════════════════════════════════════════════════════
    // RESPUESTA
    // ════════════════════════════════════════════════════════════════════
    
    await operacion.reload({
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social'] },
        { model: OperacionDetalle, as: 'detalles' }
      ]
    });
    
    logger.info('Operación creada:', { 
      id: operacion.id, 
      numero: operacion.numero_operacion,
      modo: modoOperacion,
      tipo: operacion.tipo,
      stock_reservado: datos.tipo === 'salida'
    });
    
    return created(res, 'Operación creada exitosamente', operacion);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al crear operación:', { message: error.message, stack: error.stack });
    return serverError(res, 'Error al crear la operación', error);
  }
};

/**
 * PUT /operaciones/:id/transporte
 * Actualizar información de transporte
 */
const actualizarTransporte = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);
    
    const operacion = await Operacion.findByPk(id);
    
    if (!operacion) {
      await transaction.rollback();
      return notFound(res, 'Operación no encontrada');
    }
    
    if (!operacion.esEditable()) {
      await transaction.rollback();
      return errorResponse(res, 'Esta operación ya no se puede modificar', 400);
    }
    
    const datosAnteriores = {
      origen: operacion.origen,
      destino: operacion.destino,
      vehiculo_placa: operacion.vehiculo_placa,
      conductor_nombre: operacion.conductor_nombre,
      conductor_cedula: operacion.conductor_cedula,
      conductor_telefono: operacion.conductor_telefono
    };
    
    await operacion.update(datos, { transaction });
    
    await Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: operacion.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Información de transporte actualizada: ${operacion.numero_operacion}`
    });
    
    await transaction.commit();
    
    logger.info('Transporte actualizado:', { operacionId: id });
    
    return successMessage(res, 'Información de transporte actualizada', operacion);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar transporte:', { message: error.message });
    return serverError(res, 'Error al actualizar', error);
  }
};

/**
 * POST /operaciones/:id/averias
 * Registrar avería con evidencia
 */
const registrarAveria = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);
    
    const operacion = await Operacion.findByPk(id);
    
    if (!operacion) {
      await transaction.rollback();
      return notFound(res, 'Operación no encontrada');
    }
    
    if (!operacion.esEditable()) {
      await transaction.rollback();
      return errorResponse(res, 'Esta operación ya no se puede modificar', 400);
    }
    
    let fotoData = {};
    if (req.file) {
      fotoData = {
        foto_url: `/uploads/averias/${req.file.filename}`,
        foto_nombre: req.file.originalname,
        foto_tipo: req.file.mimetype,
        foto_tamanio: req.file.size
      };
    }
    
    const averia = await OperacionAveria.create({
      operacion_id: id,
      detalle_id: datos.detalle_id,
      sku: datos.sku,
      cantidad: datos.cantidad,
      tipo_averia: datos.tipo_averia,
      descripcion: datos.descripcion,
      ...fotoData,
      registrado_por: req.user.id
    }, { transaction });
    
    if (datos.detalle_id) {
      const detalle = await OperacionDetalle.findByPk(datos.detalle_id);
      if (detalle) {
        const nuevaCantidadAveria = parseFloat(detalle.cantidad_averia) + parseFloat(datos.cantidad);
        await detalle.update({
          cantidad_averia: nuevaCantidadAveria,
          tipo_averia: datos.tipo_averia,
          observaciones_averia: datos.descripcion
        }, { transaction });
      }
    }
    
    const totalAverias = await OperacionAveria.sum('cantidad', {
      where: { operacion_id: id },
      transaction
    });
    
    await operacion.update({ total_averias: totalAverias || 0 }, { transaction });
    
    await transaction.commit();
    
    logger.info('Avería registrada:', { operacionId: id, averiaId: averia.id });
    
    return created(res, 'Avería registrada exitosamente', averia);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al registrar avería:', { message: error.message });
    return serverError(res, 'Error al registrar la avería', error);
  }
};

/**
 * POST /operaciones/:id/documentos
 * Subir documento de cumplido
 */
const subirDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo_documento, nombre, descripcion } = req.body;
    
    const operacion = await Operacion.findByPk(id);
    
    if (!operacion) {
      return notFound(res, 'Operación no encontrada');
    }
    
    if (!operacion.esEditable()) {
      return errorResponse(res, 'Esta operación ya no se puede modificar', 400);
    }
    
    if (!req.file) {
      return errorResponse(res, 'Debe adjuntar un archivo', 400);
    }
    
    const documento = await OperacionDocumento.create({
      operacion_id: id,
      tipo_documento: tipo_documento || 'cumplido',
      nombre: nombre || req.file.originalname,
      archivo_url: `/uploads/cumplidos/${req.file.filename}`,
      archivo_nombre: req.file.originalname,
      archivo_tipo: req.file.mimetype,
      archivo_tamanio: req.file.size,
      descripcion,
      subido_por: req.user.id
    });
    
    logger.info('Documento subido:', { operacionId: id, documentoId: documento.id });
    
    return created(res, 'Documento subido exitosamente', documento);
    
  } catch (error) {
    logger.error('Error al subir documento:', { message: error.message });
    return serverError(res, 'Error al subir el documento', error);
  }
};

/**
 * POST /operaciones/:id/cerrar
 * Cerrar operación y enviar correo
 * 
 * ✅ CONFIRMA MOVIMIENTO DE STOCK Y REGISTRA EN HISTORIAL
 */
const emailService = require('../services/emailService');

const cerrar = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { observaciones_cierre, enviar_correo, correos_destino } = req.body;
    const ipAddress = getClientIP(req);
    
    const operacion = await Operacion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: OperacionDetalle, as: 'detalles' },
        { model: OperacionDocumento, as: 'documentos' }
      ],
      transaction
    });
    
    if (!operacion) {
      await transaction.rollback();
      return notFound(res, 'Operación no encontrada');
    }
    
    if (operacion.estado === 'cerrado') {
      await transaction.rollback();
      return errorResponse(res, 'Esta operación ya está cerrada', 400);
    }
    
    if (operacion.estado === 'anulado') {
      await transaction.rollback();
      return errorResponse(res, 'No se puede cerrar una operación anulada', 400);
    }
    
    // ════════════════════════════════════════════════════════════════════
    // ✅ CONFIRMAR MOVIMIENTO DE STOCK (con registro en historial)
    // ════════════════════════════════════════════════════════════════════
    
    await confirmarMovimientoStock(operacion, req.user.id, ipAddress, transaction);
    
    logger.info('Movimiento de stock confirmado:', {
      operacion_id: operacion.id,
      tipo: operacion.tipo,
      numero: operacion.numero_operacion
    });
    
    // ════════════════════════════════════════════════════════════════════
    // OBTENER CORREOS DE DESTINO
    // ════════════════════════════════════════════════════════════════════
    
    let correosEnvio = correos_destino;
    if (!correosEnvio && enviar_correo !== false) {
      const contactos = await Contacto.findAll({
        where: { 
          cliente_id: operacion.cliente_id, 
          recibe_notificaciones: true,
          activo: true,
          email: { [Op.ne]: null }
        }
      });
      correosEnvio = contactos.map(c => c.email).join(', ');
    }
    
    // ════════════════════════════════════════════════════════════════════
    // ACTUALIZAR OPERACIÓN
    // ════════════════════════════════════════════════════════════════════
    
    await operacion.update({
      estado: 'cerrado',
      fecha_cierre: new Date(),
      cerrado_por: req.user.id,
      observaciones_cierre,
      correos_destino: correosEnvio
    }, { transaction });
    
    // Auditoría
    await Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: operacion.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: { estado: 'en_proceso' },
      datos_nuevos: { estado: 'cerrado', stock_actualizado: true },
      ip_address: ipAddress,
      descripcion: `Operación cerrada: ${operacion.numero_operacion} - Stock ${operacion.tipo === 'salida' ? 'descontado' : 'incrementado'}`
    });
    
    await transaction.commit();

    // Notificar in-app a usuarios del cliente + admins
    notificacionService.notificarOperacionCerrada(operacion, req.user.nombre_completo).catch(err => {
      logger.error('Error al enviar notificación de cierre:', { message: err.message, operacion_id: operacion.id, cliente_id: operacion.cliente_id });
    });

    // Enviar correo en background (NO bloquea la respuesta)
    if (enviar_correo !== false && correosEnvio) {
      const opId = operacion.id;
      setImmediate(async () => {
        try {
          await operacion.reload({
            include: [
              { model: Cliente, as: 'cliente' },
              { model: OperacionDetalle, as: 'detalles' },
              { model: OperacionDocumento, as: 'documentos' },
              { model: OperacionAveria, as: 'averias' },
              { model: Usuario, as: 'cerrador', attributes: ['id', 'nombre_completo'] }
            ]
          });
          const resultado = await emailService.enviarCierreOperacion(operacion, correosEnvio);
          await operacion.update({
            correo_enviado: resultado.success,
            fecha_correo_enviado: resultado.success ? new Date() : null
          });
          logger.info('Correo de cierre enviado en background:', { operacion_id: opId, success: resultado.success });
        } catch (emailErr) {
          logger.error('Error al enviar correo de cierre en background:', { operacion_id: opId, message: emailErr.message });
          await Operacion.update({ correo_enviado: false }, { where: { id: opId } }).catch(() => {});
        }
      });
    }

    logger.info('Operación cerrada:', {
      operacionId: id,
      tipo: operacion.tipo,
      stockActualizado: true,
      correoEnBackground: !!(enviar_correo !== false && correosEnvio)
    });

    return successMessage(res, 'Operación cerrada exitosamente', {
      numero_operacion: operacion.numero_operacion,
      estado: 'cerrado',
      stock_actualizado: true,
      correo_enviado: !!(enviar_correo !== false && correosEnvio) ? 'enviando' : false,
      correos_destino: correosEnvio,
    });
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al cerrar operación:', { message: error.message });
    return serverError(res, 'Error al cerrar la operación', error);
  }
};

/**
 * DELETE /operaciones/:id
 * Anular operación
 * 
 * ✅ LIBERA STOCK RESERVADO Y REGISTRA EN HISTORIAL
 */
const anular = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { motivo } = req.body;
    const ipAddress = getClientIP(req);
    
    const operacion = await Operacion.findByPk(id, { transaction });
    
    if (!operacion) {
      await transaction.rollback();
      return notFound(res, 'Operación no encontrada');
    }
    
    if (operacion.estado === 'cerrado') {
      await transaction.rollback();
      return errorResponse(res, 'No se puede anular una operación cerrada', 400);
    }
    
    if (operacion.estado === 'anulado') {
      await transaction.rollback();
      return errorResponse(res, 'Esta operación ya está anulada', 400);
    }
    
    const estadoAnterior = operacion.estado;
    
    // ════════════════════════════════════════════════════════════════════
    // ✅ LIBERAR STOCK RESERVADO (con registro en historial)
    // ════════════════════════════════════════════════════════════════════
    
    if (operacion.tipo === 'salida') {
      await liberarStockReservado(
        id, 
        operacion.numero_operacion, 
        req.user.id, 
        ipAddress, 
        transaction
      );
      
      logger.info('Stock liberado por anulación:', {
        operacion_id: operacion.id,
        numero: operacion.numero_operacion
      });
    }
    
    // ════════════════════════════════════════════════════════════════════
    // ACTUALIZAR OPERACIÓN
    // ════════════════════════════════════════════════════════════════════
    
    await operacion.update({
      estado: 'anulado',
      observaciones: `${operacion.observaciones || ''}\n[ANULADO] ${motivo || 'Sin motivo especificado'}`
    }, { transaction });
    
    await Auditoria.registrar({
      tabla: 'operaciones',
      registro_id: operacion.id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: { estado: estadoAnterior },
      datos_nuevos: { 
        estado: 'anulado',
        stock_liberado: operacion.tipo === 'salida'
      },
      ip_address: ipAddress,
      descripcion: `Operación anulada: ${operacion.numero_operacion}. Motivo: ${motivo || 'No especificado'}${operacion.tipo === 'salida' ? ' - Stock liberado' : ''}`
    });
    
    await transaction.commit();
    
    logger.info('Operación anulada:', { 
      operacionId: id,
      stockLiberado: operacion.tipo === 'salida'
    });
    
    return successMessage(res, 'Operación anulada exitosamente', {
      numero_operacion: operacion.numero_operacion,
      stock_liberado: operacion.tipo === 'salida'
    });
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al anular operación:', { message: error.message });
    return serverError(res, 'Error al anular la operación', error);
  }
};

/**
 * GET /operaciones/:id/averias
 * Listar averías de una operación
 */
const listarAverias = async (req, res) => {
  try {
    const { id } = req.params;

    const operacion = await Operacion.findByPk(id);
    if (!operacion) {
      return notFound(res, 'Operación no encontrada');
    }

    const averias = await OperacionAveria.findAll({
      where: { operacion_id: id },
      order: [['created_at', 'DESC']],
    });

    return success(res, averias);
  } catch (error) {
    logger.error('Error al listar averías:', { message: error.message });
    return serverError(res, 'Error al obtener las averías', error);
  }
};

/**
 * POST /operaciones/:id/reenviar-correo
 * Reenviar correo de cierre de operación
 */
const reenviarCorreo = async (req, res) => {
  try {
    const { id } = req.params;
    const { correos_destino } = req.body;

    const operacion = await Operacion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: OperacionDetalle, as: 'detalles' },
        { model: OperacionDocumento, as: 'documentos' },
        { model: OperacionAveria, as: 'averias' },
        { model: Usuario, as: 'cerrador', attributes: ['id', 'nombre_completo'] }
      ]
    });

    if (!operacion) {
      return notFound(res, 'Operación no encontrada');
    }

    if (operacion.estado !== 'cerrado') {
      return errorResponse(res, 'Solo se puede reenviar correo de operaciones cerradas', 400);
    }

    // Determinar destinatarios
    let correosEnvio = correos_destino;
    if (!correosEnvio) {
      // Usar los correos del cierre original, o buscar en contactos
      if (operacion.correos_destino) {
        correosEnvio = operacion.correos_destino;
      } else {
        const contactos = await Contacto.findAll({
          where: {
            cliente_id: operacion.cliente_id,
            recibe_notificaciones: true,
            activo: true,
            email: { [Op.ne]: null }
          }
        });
        correosEnvio = contactos.map(c => c.email).join(', ');
      }
    }

    if (!correosEnvio) {
      return errorResponse(res, 'No hay destinatarios configurados. Verifique los contactos del cliente.', 400);
    }

    const resultado = await emailService.enviarCierreOperacion(operacion, correosEnvio);

    if (resultado.success) {
      await operacion.update({
        correo_enviado: true,
        fecha_correo_enviado: new Date(),
        correos_destino: correosEnvio
      });
    }

    logger.info('Reenvío de correo:', {
      operacion_id: id,
      destinatarios: correosEnvio,
      success: resultado.success
    });

    return successMessage(res, resultado.success ? 'Correo reenviado exitosamente' : 'Error al reenviar correo', {
      correo_enviado: resultado.success,
      correos_destino: correosEnvio,
    });
  } catch (error) {
    logger.error('Error al reenviar correo:', { message: error.message });
    return serverError(res, 'Error al reenviar el correo', error);
  }
};

module.exports = {
  listarDocumentosWMS,
  buscarDocumentoWMS,
  listar,
  estadisticas,
  obtenerPorId,
  crear,
  actualizarTransporte,
  registrarAveria,
  listarAverias,
  subirDocumento,
  cerrar,
  reenviarCorreo,
  anular
};