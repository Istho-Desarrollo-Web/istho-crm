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

const { Notificacion, Usuario, ClienteResponsable } = require('../models');
const { Op } = require('sequelize');
const socketService = require('./socketService');

const logger = console;

// Parsea defensivamente el campo preferencias — resiste string, double-encoding y spreads corruptos
const parsearPrefs = (raw) => {
  if (!raw) return {};
  let val = raw;
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      return {};
    }
  }
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      return {};
    }
  }
  if (!val || typeof val !== 'object' || Array.isArray(val)) return {};
  if ('0' in val) return {};
  return val;
};

// Mapeo tipo de notificación → clave en Usuario.preferencias
const TIPO_A_PREFERENCIA = {
  despacho: 'alertas_despachos',
  inventario: 'alertas_inventario',
  cliente: 'alertas_clientes',
  sistema: 'alertas_viajes', // caja menor, gastos, viajes completados
  reporte: 'alertas_reportes',
  alerta: null, // siempre se entrega
};

/**
 * Verifica si un conjunto de preferencias tiene habilitado el tipo de notificación.
 * Las notificaciones urgentes siempre se entregan.
 */
const prefHabilitada = (preferencias, tipo, prioridad) => {
  if (prioridad === 'urgente') return true;
  const key = TIPO_A_PREFERENCIA[tipo];
  if (!key) return true;
  const prefs = parsearPrefs(preferencias);
  return prefs[key] !== false;
};

/**
 * Filtra una lista de IDs de usuario según sus preferencias para un tipo/prioridad.
 * Hace una sola consulta batch para todos los usuarios.
 */
const filtrarPorPreferencia = async (userIds, tipo, prioridad = 'normal') => {
  if (!userIds.length) return [];
  if (prioridad === 'urgente') return userIds;
  const key = TIPO_A_PREFERENCIA[tipo];
  if (!key) return userIds;

  const usuarios = await Usuario.findAll({
    where: { id: { [Op.in]: userIds } },
    attributes: ['id', 'preferencias'],
  });

  return usuarios.filter((u) => prefHabilitada(u.preferencias, tipo, prioridad)).map((u) => u.id);
};

/**
 * Obtener IDs de usuarios con roles específicos
 */
const getUsuariosPorRol = async (roles = ['admin', 'supervisor']) => {
  const usuarios = await Usuario.findAll({
    where: { rol: { [Op.in]: roles }, activo: true },
    attributes: ['id'],
  });
  return usuarios.map((u) => u.id);
};

/**
 * Obtener IDs de usuarios vinculados a un cliente específico.
 * - Usuarios portal (rol=cliente) con ese cliente_id: siempre incluidos.
 * - Admins (rol=admin): siempre incluidos (visibilidad total).
 * - Supervisores/operadores: incluidos solo si NO tienen clientes asignados en
 *   ClienteResponsable (sin restricción) O si tienen ese clienteId asignado.
 */
const getUsuariosPorCliente = async (clienteId, { incluirAdmins = true } = {}) => {
  // Usuarios portal del cliente
  const usuariosPortal = await Usuario.findAll({
    where: { activo: true, cliente_id: clienteId },
    attributes: ['id'],
  });
  const ids = new Set(usuariosPortal.map((u) => u.id));

  if (!incluirAdmins) return [...ids];

  // Admins: siempre incluidos
  const admins = await Usuario.findAll({
    where: { activo: true, rol: 'admin' },
    attributes: ['id'],
  });
  admins.forEach((u) => ids.add(u.id));

  // Supervisores y operadores activos
  const internos = await Usuario.findAll({
    where: { activo: true, rol: { [Op.in]: ['supervisor', 'operador'] } },
    attributes: ['id'],
  });

  if (internos.length) {
    // Usuarios internos que tienen al menos un cliente asignado
    const conRestricciones = await ClienteResponsable.findAll({
      where: { usuario_id: { [Op.in]: internos.map((u) => u.id) } },
      attributes: ['usuario_id', 'cliente_id'],
    });

    const clientesPorUsuario = new Map();
    for (const r of conRestricciones) {
      if (!clientesPorUsuario.has(r.usuario_id)) clientesPorUsuario.set(r.usuario_id, new Set());
      clientesPorUsuario.get(r.usuario_id).add(r.cliente_id);
    }

    for (const u of internos) {
      const asignados = clientesPorUsuario.get(u.id);
      // Sin restricciones (ningún cliente asignado) → ve todo
      if (!asignados) { ids.add(u.id); continue; }
      // Con restricciones → solo si este cliente está en su lista
      if (asignados.has(clienteId)) ids.add(u.id);
    }
  }

  return [...ids];
};

/**
 * Crear notificación para un usuario específico
 */
const notificar = async ({
  usuario_id,
  tipo,
  titulo,
  mensaje,
  prioridad = 'normal',
  accion_url,
  accion_label,
  metadata,
}) => {
  try {
    // Verificar preferencia del usuario antes de crear (salvo urgente)
    if (prioridad !== 'urgente') {
      const key = TIPO_A_PREFERENCIA[tipo];
      if (key) {
        const u = await Usuario.findByPk(usuario_id, { attributes: ['preferencias'] });
        if (u && u.preferencias?.[key] === false) return null;
      }
    }

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
const notificarPorCliente = async (
  clienteId,
  {
    tipo,
    titulo,
    mensaje,
    prioridad = 'normal',
    accion_url,
    accion_label,
    metadata,
    incluirAdmins = true,
  }
) => {
  try {
    if (!clienteId) {
      logger.warn(
        '[NotificacionService] notificarPorCliente: clienteId no proporcionado, enviando a admins'
      );
      return notificarAdmins({
        tipo,
        titulo,
        mensaje,
        prioridad,
        accion_url,
        accion_label,
        metadata,
      });
    }
    let ids = await getUsuariosPorCliente(clienteId, { incluirAdmins });
    ids = await filtrarPorPreferencia(ids, tipo, prioridad);
    logger.info('[NotificacionService] notificarPorCliente:', {
      clienteId,
      usuariosEncontrados: ids.length,
      ids,
    });
    if (ids.length === 0) return [];
    const result = await Notificacion.notificarMultiple(ids, {
      tipo,
      titulo,
      mensaje,
      prioridad,
      accion_url,
      accion_label,
      metadata,
    });
    // Emitir por WebSocket a cada usuario
    socketService.emitToUsers(ids, 'notificacion:nueva', {
      tipo,
      titulo,
      mensaje,
      prioridad,
      accion_url,
      accion_label,
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
const notificarAdmins = async ({
  tipo,
  titulo,
  mensaje,
  prioridad = 'normal',
  accion_url,
  accion_label,
  metadata,
}) => {
  try {
    let ids = await getUsuariosPorRol(['admin', 'supervisor']);
    ids = await filtrarPorPreferencia(ids, tipo, prioridad);
    if (ids.length === 0) return [];
    const result = await Notificacion.notificarMultiple(ids, {
      tipo,
      titulo,
      mensaje,
      prioridad,
      accion_url,
      accion_label,
      metadata,
    });
    // Emitir por WebSocket
    socketService.emitToUsers(ids, 'notificacion:nueva', {
      tipo,
      titulo,
      mensaje,
      prioridad,
      accion_url,
      accion_label,
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
    accion_url: `/inventario/productos/${producto.id}`,
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
    accion_url: `/inventario/productos/${producto.id}`,
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
    accion_url: `/inventario/productos/${producto.id}`,
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
    accion_url: `/operaciones/${operacion.tipo === 'ingreso' ? 'entradas' : 'salidas'}/${operacion.id}`,
    accion_label: `Ver ${tipo_op.toLowerCase()}`,
    metadata: {
      operacion_id: operacion.id,
      tipo: operacion.tipo,
      documento: doc,
      cliente_id: operacion.cliente_id,
    },
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
    mensaje:
      mensaje ||
      (exitosa
        ? 'La sincronización con el WMS se completó correctamente.'
        : 'Hubo un error durante la sincronización.'),
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
    accion_url: `/operaciones/entradas/${resultado.operacion_id}`,
    accion_label: 'Ver entrada',
    metadata: resultado,
  });
};

/**
 * Notificar ajuste kardex sincronizado desde WMS
 * Solo notifica a usuarios del cliente + admins
 */
const notificarKardexWms = async (resultado) => {
  return notificarPorCliente(resultado.cliente_id, {
    tipo: 'despacho',
    titulo: `Kardex WMS: ${resultado.numero_operacion}`,
    mensaje: `Se sincronizó ajuste kardex ${resultado.documento_wms} para ${resultado.cliente} (${resultado.total_lineas} líneas, ${resultado.total_unidades} uds).`,
    prioridad: 'normal',
    accion_url: `/operaciones/kardex/${resultado.operacion_id}`,
    accion_label: 'Ver kardex',
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
    accion_url: `/operaciones/salidas/${resultado.operacion_id}`,
    accion_label: 'Ver salida',
    metadata: resultado,
  });
};

// ════════════════════════════════════════════════════════════════════════════
// NOTIFICACIONES FINANCIERAS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Notificar a admins, supervisores y financieras
 */
const notificarFinancieros = async ({
  tipo,
  titulo,
  mensaje,
  prioridad = 'normal',
  accion_url,
  accion_label,
  metadata,
}) => {
  try {
    let ids = await getUsuariosPorRol(['admin', 'supervisor', 'financiera']);
    ids = await filtrarPorPreferencia(ids, tipo, prioridad);
    if (ids.length === 0) return [];
    const result = await Notificacion.notificarMultiple(ids, {
      tipo,
      titulo,
      mensaje,
      prioridad,
      accion_url,
      accion_label,
      metadata,
    });
    socketService.emitToUsers(ids, 'notificacion:nueva', {
      tipo,
      titulo,
      mensaje,
      prioridad,
      accion_url,
      accion_label,
      created_at: new Date(),
    });
    return result;
  } catch (err) {
    logger.error('[NotificacionService] Error al notificar financieros:', err.message);
    return [];
  }
};

/**
 * Notificar cuando un conductor registra un gasto (pendiente de aprobación)
 */
const notificarGastoPendiente = async (movimiento) => {
  return notificarFinancieros({
    tipo: 'sistema',
    titulo: `Nuevo gasto pendiente #${movimiento.consecutivo}`,
    mensaje: `${movimiento.usuario_nombre || movimiento.conductor_nombre || 'Un usuario'} registró un gasto de $${Number(movimiento.valor).toLocaleString('es-CO')} (${movimiento.concepto}). Requiere aprobación.`,
    prioridad: 'alta',
    accion_url: '/viajes/movimientos',
    accion_label: 'Ver movimientos',
    metadata: { movimiento_id: movimiento.id, caja_menor_id: movimiento.caja_menor_id },
  });
};

/**
 * Notificar cuando se abre una nueva caja menor
 */
const notificarCajaMenorAbierta = async (caja) => {
  return notificarFinancieros({
    tipo: 'sistema',
    titulo: `Nueva caja menor: ${caja.numero}`,
    mensaje: `Se abrió la caja menor ${caja.numero} para ${caja.usuario_nombre || caja.conductor_nombre || 'un usuario'} con saldo de $${Number(caja.saldo_actual || caja.saldo_inicial || 0).toLocaleString('es-CO')}.`,
    prioridad: 'normal',
    accion_url: `/viajes/cajas-menores/${caja.id}`,
    accion_label: 'Ver caja',
    metadata: { caja_menor_id: caja.id },
  });
};

/**
 * Notificar cuando un viaje se completa
 */
const notificarViajeCompletado = async (viaje) => {
  return notificarFinancieros({
    tipo: 'sistema',
    titulo: `Viaje completado: ${viaje.numero}`,
    mensaje: `El viaje ${viaje.numero} (${viaje.origen} → ${viaje.destino}) fue completado por ${viaje.conductor_nombre || 'un conductor'}. Valor: $${Number(viaje.valor_viaje || 0).toLocaleString('es-CO')}.`,
    prioridad: 'normal',
    accion_url: `/viajes/viajes/${viaje.id}`,
    accion_label: 'Ver viaje',
    metadata: { viaje_id: viaje.id },
  });
};

module.exports = {
  notificar,
  notificarAdmins,
  notificarFinancieros,
  notificarPorCliente,
  notificarStockBajo,
  notificarProductoAgotado,
  notificarStockSobreMaximo,
  notificarOperacionCerrada,
  notificarSyncWms,
  notificarEntradaWms,
  notificarKardexWms,
  notificarSalidaWms,
  notificarClienteCreado,
  notificarClienteEliminado,
  notificarGastoPendiente,
  notificarCajaMenorAbierta,
  notificarViajeCompletado,
  getUsuariosPorRol,
  getUsuariosPorCliente,
};
