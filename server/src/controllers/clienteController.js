/**
 * ISTHO CRM - Controlador de Clientes
 * 
 * Maneja todas las operaciones CRUD de clientes y contactos.
 * Incluye paginación, filtros, búsqueda y auditoría.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const { Cliente, Contacto, Operacion, Inventario, Usuario, Auditoria, sequelize } = require('../models');
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
  getClientIP,
  sanitizarBusqueda
} = require('../utils/helpers');
const logger = require('../utils/logger');

// Campos permitidos para ordenamiento
const CAMPOS_ORDENAMIENTO = ['razon_social', 'codigo_cliente', 'created_at', 'ciudad', 'estado', 'nit'];

// =============================================
// OPERACIONES DE CLIENTES
// =============================================

/**
 * GET /clientes
 * Listar clientes con paginación, filtros y búsqueda
 */
const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const order = parseOrdenamiento(req.query, CAMPOS_ORDENAMIENTO);
    
    // Construir condiciones de filtro
    const where = {};
    
    // Filtro por estado
    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }
    
    // Filtro por tipo de cliente
    if (req.query.tipo_cliente && req.query.tipo_cliente !== 'todos') {
      where.tipo_cliente = req.query.tipo_cliente;
    }
    
    // Filtro por ciudad
    if (req.query.ciudad) {
      where.ciudad = { [Op.like]: `%${sanitizarBusqueda(req.query.ciudad)}%` };
    }
    
    // Filtro por departamento
    if (req.query.departamento) {
      where.departamento = { [Op.like]: `%${sanitizarBusqueda(req.query.departamento)}%` };
    }
    
    // Búsqueda general (razón social, NIT, código)
    if (req.query.search) {
      const searchTerm = sanitizarBusqueda(req.query.search);
      where[Op.or] = [
        { razon_social: { [Op.like]: `%${searchTerm}%` } },
        { nit: { [Op.like]: `%${searchTerm}%` } },
        { codigo_cliente: { [Op.like]: `%${searchTerm}%` } },
        { email: { [Op.like]: `%${searchTerm}%` } }
      ];
    }
    
    // Ejecutar consulta
    const { count, rows } = await Cliente.findAndCountAll({
      where,
      order,
      limit,
      offset,
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM inventario WHERE inventario.cliente_id = Cliente.id)'), 'total_productos']
        ]
      },
      include: [{
        model: Contacto,
        as: 'contactos',
        where: { es_principal: true },
        required: false,
        attributes: ['id', 'nombre', 'cargo', 'telefono', 'email']
      }]
    });

    logger.debug('Clientes listados:', {
      total: count,
      page,
      filtros: req.query
    });

    return paginated(res, rows, buildPaginacion(count, page, limit));
    
  } catch (error) {
    logger.error('Error al listar clientes:', { message: error.message });
    return serverError(res, 'Error al obtener la lista de clientes', error);
  }
};

/**
 * GET /clientes/stats
 * Obtener estadísticas de clientes
 */
const estadisticas = async (req, res) => {
  try {
    // Total de clientes por estado
    const porEstado = await Cliente.findAll({
      attributes: [
        'estado',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['estado']
    });
    
    // Total de clientes por tipo
    const porTipo = await Cliente.findAll({
      attributes: [
        'tipo_cliente',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      group: ['tipo_cliente']
    });
    
    // Total de clientes por ciudad (top 10)
    const porCiudad = await Cliente.findAll({
      attributes: [
        'ciudad',
        [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']
      ],
      where: {
        ciudad: { [Op.ne]: null }
      },
      group: ['ciudad'],
      order: [[sequelize.literal('cantidad'), 'DESC']],
      limit: 10
    });
    
    // Clientes nuevos este mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);
    
    const nuevosEsteMes = await Cliente.count({
      where: {
        created_at: { [Op.gte]: inicioMes }
      }
    });
    
    // Total general
    const total = await Cliente.count();
    const activos = await Cliente.count({ where: { estado: 'activo' } });
    
    const stats = {
      total,
      activos,
      inactivos: total - activos,
      nuevosEsteMes,
      porEstado: porEstado.map(e => ({
        estado: e.estado,
        cantidad: parseInt(e.dataValues.cantidad)
      })),
      porTipo: porTipo.map(t => ({
        tipo: t.tipo_cliente,
        cantidad: parseInt(t.dataValues.cantidad)
      })),
      porCiudad: porCiudad.map(c => ({
        ciudad: c.ciudad || 'Sin especificar',
        cantidad: parseInt(c.dataValues.cantidad)
      }))
    };
    
    return success(res, stats);
    
  } catch (error) {
    logger.error('Error al obtener estadísticas:', { message: error.message });
    return serverError(res, 'Error al obtener estadísticas', error);
  }
};

/**
 * GET /clientes/:id
 * Obtener un cliente por ID
 */
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    
    const cliente = await Cliente.findByPk(id, {
      include: [{
        model: Contacto,
        as: 'contactos',
        where: { activo: true },
        required: false,
        order: [['es_principal', 'DESC'], ['nombre', 'ASC']]
      }]
    });

    if (!cliente) {
      return notFound(res, 'Cliente no encontrado');
    }

    // Calcular operaciones del mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const operacionesMes = await Operacion.count({
      where: {
        cliente_id: id,
        created_at: { [Op.gte]: inicioMes }
      }
    });

    const clienteData = cliente.toJSON();
    clienteData.operaciones_mes = operacionesMes;

    return success(res, clienteData);
    
  } catch (error) {
    logger.error('Error al obtener cliente:', { message: error.message, id: req.params.id });
    return serverError(res, 'Error al obtener el cliente', error);
  }
};

/**
 * POST /clientes
 * Crear un nuevo cliente
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const datos = limpiarObjeto(req.body);
    
    // Verificar NIT duplicado
    const nitExiste = await Cliente.findOne({ 
      where: { nit: datos.nit },
      paranoid: false
    });
    
    if (nitExiste) {
      await transaction.rollback();
      return conflict(res, `El NIT ${datos.nit} ya está registrado`);
    }
    
    // ========== GENERAR CÓDIGO DE CLIENTE AUTOMÁTICAMENTE ==========
    if (!datos.codigo_cliente) {
      const ultimoCliente = await Cliente.findOne({
        order: [['id', 'DESC']],
        paranoid: false
      });
      const siguienteNum = ultimoCliente ? ultimoCliente.id + 1 : 1;
      datos.codigo_cliente = `CLI-${String(siguienteNum).padStart(4, '0')}`;
    }
    // ================================================================
    
    // Crear cliente
    const cliente = await Cliente.create(datos, { transaction });
    
    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'clientes',
      registro_id: cliente.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Cliente creado: ${cliente.razon_social} (${cliente.codigo_cliente})`
    });
    
    await transaction.commit();

    // Notificar nuevo cliente
    notificacionService.notificarClienteCreado(cliente, req.user.nombre_completo).catch(() => {});

    logger.info('Cliente creado:', {
      clienteId: cliente.id,
      codigo: cliente.codigo_cliente,
      creadoPor: req.user.id
    });

    return created(res, 'Cliente creado exitosamente', cliente);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al crear cliente:', { message: error.message });
    return serverError(res, 'Error al crear el cliente', error);
  }
};

/**
 * PUT /clientes/:id
 * Actualizar un cliente
 */
const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);
    
    // Buscar cliente
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Si se cambia el NIT, verificar que no esté duplicado
    if (datos.nit && datos.nit !== cliente.nit) {
      const nitExiste = await Cliente.findOne({
        where: { 
          nit: datos.nit,
          id: { [Op.ne]: id }
        },
        paranoid: false
      });
      
      if (nitExiste) {
        await transaction.rollback();
        return conflict(res, `El NIT ${datos.nit} ya está registrado`);
      }
    }
    
    // Guardar datos anteriores para auditoría
    const datosAnteriores = cliente.toJSON();
    
    // Actualizar
    await cliente.update(datos, { transaction });
    
    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'clientes',
      registro_id: cliente.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Cliente actualizado: ${cliente.razon_social}`
    });
    
    await transaction.commit();
    
    // Recargar con contactos
    await cliente.reload({
      include: [{
        model: Contacto,
        as: 'contactos',
        where: { activo: true },
        required: false
      }]
    });
    
    logger.info('Cliente actualizado:', { 
      clienteId: id, 
      actualizadoPor: req.user.id 
    });
    
    return successMessage(res, 'Cliente actualizado exitosamente', cliente);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar cliente:', { message: error.message, id: req.params.id });
    return serverError(res, 'Error al actualizar el cliente', error);
  }
};

/**
 * DELETE /clientes/:id
 * Eliminar un cliente (soft delete)
 */
const eliminar = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Guardar datos para auditoría
    const datosAnteriores = cliente.toJSON();
    
    // Soft delete (paranoid: true en el modelo)
    await cliente.destroy({ transaction });
    
    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'clientes',
      registro_id: id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Cliente eliminado: ${cliente.razon_social} (${cliente.codigo_cliente})`
    });
    
    await transaction.commit();

    // Notificar eliminación de cliente
    notificacionService.notificarClienteEliminado(cliente, req.user.nombre_completo).catch(() => {});

    logger.info('Cliente eliminado:', {
      clienteId: id,
      eliminadoPor: req.user.id
    });

    return successMessage(res, 'Cliente eliminado exitosamente');
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar cliente:', { message: error.message, id: req.params.id });
    return serverError(res, 'Error al eliminar el cliente', error);
  }
};

// =============================================
// OPERACIONES DE CONTACTOS
// =============================================

/**
 * GET /clientes/:id/contactos
 * Listar contactos de un cliente
 */
const listarContactos = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Incluir inactivos si se solicita
    const incluirInactivos = req.query.incluir_inactivos === 'true';
    
    const where = { cliente_id: id };
    if (!incluirInactivos) {
      where.activo = true;
    }
    
    const contactos = await Contacto.findAll({
      where,
      order: [['es_principal', 'DESC'], ['nombre', 'ASC']]
    });
    
    return success(res, contactos);
    
  } catch (error) {
    logger.error('Error al listar contactos:', { message: error.message, clienteId: req.params.id });
    return serverError(res, 'Error al obtener los contactos', error);
  }
};

/**
 * POST /clientes/:id/contactos
 * Agregar contacto a un cliente
 */
const crearContacto = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(id);
    
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Crear contacto
    const contacto = await Contacto.create({
      ...datos,
      cliente_id: id
    }, { transaction });
    
    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { ...datos, cliente_id: id },
      ip_address: getClientIP(req),
      descripcion: `Contacto creado: ${contacto.nombre} para cliente ${cliente.razon_social}`
    });
    
    await transaction.commit();
    
    logger.info('Contacto creado:', { 
      contactoId: contacto.id, 
      clienteId: id,
      creadoPor: req.user.id 
    });
    
    return created(res, 'Contacto creado exitosamente', contacto);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al crear contacto:', { message: error.message });
    return serverError(res, 'Error al crear el contacto', error);
  }
};

/**
 * PUT /clientes/:id/contactos/:contactoId
 * Actualizar contacto de un cliente
 */
const actualizarContacto = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id, contactoId } = req.params;
    const datos = limpiarObjeto(req.body);
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Buscar contacto
    const contacto = await Contacto.findOne({
      where: { id: contactoId, cliente_id: id }
    });
    
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }
    
    // Guardar datos anteriores
    const datosAnteriores = contacto.toJSON();
    
    // Actualizar
    await contacto.update(datos, { transaction });
    
    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: datos,
      ip_address: getClientIP(req),
      descripcion: `Contacto actualizado: ${contacto.nombre}`
    });
    
    await transaction.commit();
    
    logger.info('Contacto actualizado:', { 
      contactoId, 
      clienteId: id,
      actualizadoPor: req.user.id 
    });
    
    return successMessage(res, 'Contacto actualizado exitosamente', contacto);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar contacto:', { message: error.message });
    return serverError(res, 'Error al actualizar el contacto', error);
  }
};

/**
 * DELETE /clientes/:id/contactos/:contactoId
 * Eliminar contacto de un cliente
 */
const eliminarContacto = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id, contactoId } = req.params;
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Buscar contacto
    const contacto = await Contacto.findOne({
      where: { id: contactoId, cliente_id: id }
    });
    
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }
    
    const datosAnteriores = contacto.toJSON();
    
    // Eliminar (hard delete para contactos)
    await contacto.destroy({ transaction });
    
    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contactoId,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      ip_address: getClientIP(req),
      descripcion: `Contacto eliminado: ${contacto.nombre} del cliente ${cliente.razon_social}`
    });
    
    await transaction.commit();
    
    logger.info('Contacto eliminado:', { 
      contactoId, 
      clienteId: id,
      eliminadoPor: req.user.id 
    });
    
    return successMessage(res, 'Contacto eliminado exitosamente');
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar contacto:', { message: error.message });
    return serverError(res, 'Error al eliminar el contacto', error);
  }
};

/**
 * GET /clientes/:id/historial
 * Obtener historial de operaciones y actividad de un cliente
 */
const historial = async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return notFound(res, 'Cliente no encontrado');
    }

    // Operaciones del cliente
    const { count, rows: operaciones } = await Operacion.findAndCountAll({
      where: { cliente_id: id },
      include: [
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre_completo'] },
        { model: Usuario, as: 'cerrador', attributes: ['id', 'nombre_completo'] },
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    // Transformar a formato historial
    const items = operaciones.map(op => {
      const tipo_op = op.tipo === 'entrada' ? 'Entrada' : 'Salida';
      const doc = op.documento_wms || op.numero_operacion;
      let titulo, descripcion, tipo;

      if (op.estado === 'cerrado') {
        titulo = `${tipo_op} cerrada: ${doc}`;
        descripcion = `Operación cerrada por ${op.cerrador?.nombre_completo || 'Sistema'}${op.observaciones_cierre ? ` - ${op.observaciones_cierre}` : ''}`;
        tipo = 'operacion';
      } else if (op.estado === 'anulado') {
        titulo = `${tipo_op} anulada: ${doc}`;
        descripcion = `Operación anulada${op.motivo_anulacion ? `: ${op.motivo_anulacion}` : ''}`;
        tipo = 'operacion';
      } else {
        titulo = `${tipo_op} creada: ${doc}`;
        descripcion = `Operación registrada por ${op.creador?.nombre_completo || 'Sistema'}`;
        tipo = 'operacion';
      }

      return {
        id: `op-${op.id}`,
        tipo,
        titulo,
        descripcion,
        estado: op.estado,
        fecha: op.fecha_cierre || op.created_at,
        usuario: op.cerrador?.nombre_completo || op.creador?.nombre_completo || 'Sistema',
        referencia_id: op.id,
        referencia_tipo: 'operacion',
        metadata: {
          numero_operacion: op.numero_operacion,
          tipo_operacion: op.tipo,
          documento_wms: op.documento_wms,
          estado: op.estado,
        },
      };
    });

    return paginated(res, items, buildPaginacion(count, parseInt(page), parseInt(limit)));

  } catch (error) {
    logger.error('Error al obtener historial del cliente:', { message: error.message, clienteId: req.params.id });
    return serverError(res, 'Error al obtener el historial', error);
  }
};

/**
 * POST /clientes/:id/logo
 * Subir logo del cliente
 */
const subirLogo = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return errorResponse(res, 'No se proporcionó un archivo de imagen', 400);
    }

    const cliente = await Cliente.findByPk(id);
    if (!cliente) {
      return notFound(res, 'Cliente no encontrado');
    }

    // Construir URL relativa del logo
    const logo_url = `/uploads/logos/${req.file.filename}`;

    // Si ya tenía logo, eliminar el anterior
    if (cliente.logo_url) {
      const fs = require('fs');
      const path = require('path');
      const oldPath = path.join(__dirname, '../../', cliente.logo_url);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await cliente.update({ logo_url });

    await Auditoria.registrar({
      tabla: 'clientes',
      registro_id: id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { logo_url },
      ip_address: getClientIP(req),
      descripcion: `Logo actualizado para cliente: ${cliente.razon_social}`,
    });

    logger.info('Logo de cliente actualizado:', { clienteId: id });

    return successMessage(res, 'Logo actualizado exitosamente', { logo_url });
  } catch (error) {
    logger.error('Error al subir logo:', { message: error.message });
    return serverError(res, 'Error al subir el logo', error);
  }
};

module.exports = {
  // Clientes
  listar,
  estadisticas,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  subirLogo,
  // Contactos
  listarContactos,
  crearContacto,
  actualizarContacto,
  eliminarContacto,
  // Historial
  historial,
};