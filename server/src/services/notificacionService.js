/**
 * ============================================================================
 * ISTHO CRM - Servicio de Notificaciones
 * ============================================================================
 * Servicio centralizado para crear notificaciones automáticas del sistema.
 * Se usa desde cualquier controller que necesite notificar a usuarios.
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Marzo 2026
 */

const { Notificacion, Usuario } = require('../models');
const { Op } = require('sequelize');
const socketService = require('./socketService');

const logger = console;

/**
 * Obtener IDs de usuarios con roles específicos
 */
const getUsuariosPorRol = async (roles = ['admin', 'supervisor']) => {
  const usuarios = await Usuario.findAll({
    where: { rol: { [Op.in]: roles }, activo: true },
    attributes: ['id'],
  });
  return usuarios.map(u => u.id);
};

/**
 * Obtener IDs de usuarios vinculados a un cliente específico
 * Incluye usuarios con rol 'cliente' de ese cliente + admins/supervisores
 */
const getUsuariosPorCliente = async (clienteId, { incluirAdmins = true } = {}) => {
  const where = { activo: true };

  if (incluirAdmins) {
    // Usuarios del cliente + admins/supervisores
    where[Op.or] = [
      { cliente_id: clienteId },
      { rol: { [Op.in]: ['admin', 'supervisor'] } },
    ];
  } else {
    // Solo usuarios del cliente
    where.cliente_id = clienteId;
  }

  const usuarios = await Usuario.findAll({ where, attributes: ['id'] });
  return usuarios.map(u => u.id);
};

/**
 * Crear notificación para un usuario específico
 */
const notificar = async ({ usuario_id, tipo, titulo, mensaje, prioridad = 'normal', accion_url, accion_label, metadata }) => {
  try {
    const notif = await Notificacion.crear({
      usuario_id,
      tipo,
      titulo,
      mensaje,
      prioridad,
      accion_url,
      accion_label,
      metadata,
    });

    // Emitir por WebSocket en tiempo real
    if (notif) {
      socketService.emitToUser(usuario_id, 'notificacion:nueva', {
        id: notif.id,
        tipo,
        titulo,
        mensaje,
        prioridad,
        accion_url,
        accion_label,
        created_at: notif.created_at,
      });
    }

    return notif;
  } catch (err) {
    logger.error('[NotificacionService] Error al crear notificación:', err.message);
    return null;
  }
};

/**
 * Notificar a usuarios vinculados a un cliente específico (+ admins/supervisores)
 */
const notificarPorCliente = async (clienteId, { tipo, titulo, mensaje, prioridad = 'normal', accion_url, accion_label, metadata, incluirAdmins = true }) => {
  try {
    if (!clienteId) {
      logger.warn('[NotificacionService] notificarPorCliente: clienteId no proporcionado, enviando a admins');
      return notificarAdmins({ tipo, titulo, mensaje, prioridad, accion_url, accion_label, metadata });
    }
    const ids = await getUsuariosPorCliente(clienteId, { incluirAdmins });
    logger.info('[NotificacionService] notificarPorCliente:', { clienteId, usuariosEncontrados: ids.length, ids });
    if (ids.length === 0) return [];
    const result = await Notificacion.notificarMultiple(ids, {
      tipo, titulo, mensaje, prioridad, accion_url, accion_label, metadata,
    });
    // Emitir por WebSocket a cada usuario
    socketService.emitToUsers(ids, 'notificacion:nueva', {
      tipo, titulo, mensaje, prioridad, accion_url, accion_label,
      created_at: new Date(),
    });
    logger.info('[NotificacionService] Notificaciones creadas:', { cantidad: result.length });
    return result;
  } catch (err) {
    logger.error('[NotificacionService] Error al notificar por cliente:', err.message);
    return [];
  }
};

/**
 * Notificar a todos los admins y supervisores
 */
const notificarAdmins = async ({ tipo, titulo, mensaje, prioridad = 'normal', accion_url, accion_label, metadata }) => {
  try {
    const ids = await getUsuariosPorRol(['admin', 'supervisor']);
    if (ids.length === 0) return [];
    const result = await Notificacion.notificarMultiple(ids, {
      tipo, titulo, mensaje, prioridad, accion_url, accion_label, metadata,
    });
    // Emitir por WebSocket
    socketService.emitToUsers(ids, 'notificacion:nueva', {
      tipo, titulo, mensaje, prioridad, accion_url, accion_label,
      created_at: new Date(),
    });
    return result;
  } catch (err) {
    logger.error('[NotificacionService] Error al notificar admins:', err.message);
    return [];
  }
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES DE INVENTARIO
// ════════════════════════════════════════════════════════════════════════════

/**
 * Notificar stock bajo de un producto
 */
const notificarStockBajo = async (producto) => {
  const nombre = producto.producto || producto.nombre;
  const sku = producto.sku || producto.codigo;
  const cantidad = parseFloat(producto.cantidad) || 0;
  const minimo = parseFloat(producto.stock_minimo) || 0;

  return notificarAdmins({
    tipo: 'inventario',
    titulo: `Stock bajo: ${nombre}`,
    mensaje: `El producto ${sku} tiene ${cantidad} unidades, por debajo del mínimo de ${minimo}.`,
    prioridad: 'alta',
    accion_url: `/inventario/${producto.id}`,
    accion_label: 'Ver producto',
    metadata: { producto_id: producto.id, sku, cantidad, stock_minimo: minimo },
  });
};

/**
 * Notificar producto agotado
 */
const notificarProductoAgotado = async (producto) => {
  const nombre = producto.producto || producto.nombre;
  const sku = producto.sku || producto.codigo;

  return notificarAdmins({
    tipo: 'inventario',
    titulo: `Producto agotado: ${nombre}`,
    mensaje: `El producto ${sku} se ha quedado sin stock (0 unidades).`,
    prioridad: 'urgente',
    accion_url: `/inventario/${producto.id}`,
    accion_label: 'Ver producto',
    metadata: { producto_id: producto.id, sku },
  });
};

/**
 * Notificar stock sobre máximo
 */
const notificarStockSobreMaximo = async (producto) => {
  const nombre = producto.producto || producto.nombre;
  const sku = producto.sku || producto.codigo;
  const cantidad = parseFloat(producto.cantidad) || 0;
  const maximo = parseFloat(producto.stock_maximo) || 0;

  return notificarAdmins({
    tipo: 'inventario',
    titulo: `Stock sobre máximo: ${nombre}`,
    mensaje: `El producto ${sku} tiene ${cantidad} unidades, superando el máximo de ${maximo}.`,
    prioridad: 'normal',
    accion_url: `/inventario/${producto.id}`,
    accion_label: 'Ver producto',
    metadata: { producto_id: producto.id, sku, cantidad, stock_maximo: maximo },
  });
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES DE OPERACIONES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Notificar operación cerrada/verificada
 * Solo notifica a usuarios del cliente de la operación + admins/supervisores
 */
const notificarOperacionCerrada = async (operacion, usuario_nombre) => {
  const tipo_op = operacion.tipo === 'ingreso' ? 'Entrada' : 'Salida';
  const doc = operacion.documento_wms || operacion.numero_operacion;

  logger.info('[NotificacionService] notificarOperacionCerrada:', {
    operacion_id: operacion.id,
    cliente_id: operacion.cliente_id,
    tipo: operacion.tipo,
    documento: doc,
  });

  return notificarPorCliente(operacion.cliente_id, {
    tipo: 'despacho',
    titulo: `${tipo_op} cerrada: ${doc}`,
    mensaje: `La operación ${doc} fue cerrada por ${usuario_nombre}.`,
    prioridad: 'normal',
    accion_url: `/inventario/${operacion.tipo === 'entrada' ? 'entradas' : 'salidas'}/${operacion.id}`,
    accion_label: `Ver ${tipo_op.toLowerCase()}`,
    metadata: { operacion_id: operacion.id, tipo: operacion.tipo, documento: doc, cliente_id: operacion.cliente_id },
  });
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES DE CLIENTES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Notificar nuevo cliente creado
 */
const notificarClienteCreado = async (cliente, usuario_nombre) => {
  return notificarAdmins({
    tipo: 'cliente',
    titulo: `Nuevo cliente: ${cliente.razon_social}`,
    mensaje: `El cliente ${cliente.razon_social} (${cliente.codigo_cliente}) fue creado por ${usuario_nombre}.`,
    prioridad: 'normal',
    accion_url: `/clientes/${cliente.id}`,
    accion_label: 'Ver cliente',
    metadata: { cliente_id: cliente.id, codigo: cliente.codigo_cliente, nit: cliente.nit },
  });
};

/**
 * Notificar cliente eliminado/desactivado
 */
const notificarClienteEliminado = async (cliente, usuario_nombre) => {
  return notificarAdmins({
    tipo: 'cliente',
    titulo: `Cliente eliminado: ${cliente.razon_social}`,
    mensaje: `El cliente ${cliente.razon_social} (${cliente.codigo_cliente}) fue eliminado por ${usuario_nombre}.`,
    prioridad: 'normal',
    metadata: { cliente_id: cliente.id, codigo: cliente.codigo_cliente },
  });
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES DE SISTEMA
// ════════════════════════════════════════════════════════════════════════════

/**
 * Notificar sincronización WMS completada
 */
const notificarSyncWms = async ({ exitosa, mensaje, detalles }) => {
  return notificarAdmins({
    tipo: 'sistema',
    titulo: exitosa ? 'Sincronización WMS completada' : 'Error en sincronización WMS',
    mensaje: mensaje || (exitosa ? 'La sincronización con el WMS se completó correctamente.' : 'Hubo un error durante la sincronización.'),
    prioridad: exitosa ? 'baja' : 'alta',
    metadata: detalles,
  });
};

/**
 * Notificar entrada sincronizada desde WMS
 * Solo notifica a usuarios del cliente + admins
 */
const notificarEntradaWms = async (resultado) => {
  return notificarPorCliente(resultado.cliente_id, {
    tipo: 'despacho',
    titulo: `Entrada WMS: ${resultado.numero_operacion}`,
    mensaje: `Se sincronizó entrada ${resultado.documento_wms} para ${resultado.cliente} (${resultado.total_lineas} líneas, ${resultado.total_unidades} uds).`,
    prioridad: 'normal',
    accion_url: `/inventario/entradas/${resultado.operacion_id}`,
    accion_label: 'Ver entrada',
    metadata: resultado,
  });
};

/**
 * Notificar salida sincronizada desde WMS
 * Solo notifica a usuarios del cliente + admins
 */
const notificarSalidaWms = async (resultado) => {
  return notificarPorCliente(resultado.cliente_id, {
    tipo: 'despacho',
    titulo: `Salida WMS: ${resultado.numero_operacion}`,
    mensaje: `Se sincronizó salida picking ${resultado.numero_picking} para ${resultado.cliente} (${resultado.total_lineas} líneas, ${resultado.total_unidades} uds).`,
    prioridad: 'normal',
    accion_url: `/inventario/salidas/${resultado.operacion_id}`,
    accion_label: 'Ver salida',
    metadata: resultado,
  });
};

module.exports = {
  notificar,
  notificarAdmins,
  notificarPorCliente,
  notificarStockBajo,
  notificarProductoAgotado,
  notificarStockSobreMaximo,
  notificarOperacionCerrada,
  notificarSyncWms,
  notificarEntradaWms,
  notificarSalidaWms,
  notificarClienteCreado,
  notificarClienteEliminado,
  getUsuariosPorRol,
  getUsuariosPorCliente,
};
