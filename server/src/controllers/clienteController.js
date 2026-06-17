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
const {
  Cliente,
  Contacto,
  ContactoCliente,
  Operacion,
  Inventario,
  Usuario,
  Auditoria,
  ClienteResponsable,
  sequelize,
} = require('../models');
const notificacionService = require('../services/notificacionService');
const { obtenerClientesFiltrados } = require('../middleware/auth');
const {
  success,
  successMessage,
  created,
  paginated,
  error: errorResponse,
  notFound,
  conflict,
  serverError,
} = require('../utils/responses');
const {
  parsePaginacion,
  buildPaginacion,
  parseOrdenamiento,
  limpiarObjeto,
  getClientIP,
  sanitizarBusqueda,
} = require('../utils/helpers');
const logger = require('../utils/logger');

// Campos permitidos para ordenamiento
const CAMPOS_ORDENAMIENTO = [
  'razon_social',
  'codigo_cliente',
  'created_at',
  'ciudad',
  'estado',
  'nit',
];

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
        { email: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    // Filtrar por clientes asignados para supervisores/operadores
    const clientesFiltrados = await obtenerClientesFiltrados(req);
    if (clientesFiltrados !== null) {
      const ids = clientesFiltrados.length > 0 ? clientesFiltrados : [-1];
      where.id = { [Op.in]: ids };
    }

    // Ejecutar consulta principal (sin subquery por cada fila)
    const { count, rows } = await Cliente.findAndCountAll({
      where,
      order,
      limit,
      offset,
      include: [
        {
          model: Contacto,
          as: 'contactos',
          through: { where: { es_principal: true }, attributes: ['es_principal'] },
          required: false,
          attributes: ['id', 'nombre', 'cargo', 'telefono', 'email'],
        },
      ],
    });

    // Batch: contar productos en una sola query para todos los clientes de esta página
    const clienteIds = rows.map((c) => c.id);
    const conteoPorCliente = {};
    if (clienteIds.length > 0) {
      const conteos = await sequelize.query(
        `SELECT cliente_id, COUNT(*) AS total FROM inventario WHERE cliente_id IN (:ids) GROUP BY cliente_id`,
        { replacements: { ids: clienteIds }, type: sequelize.QueryTypes.SELECT }
      );
      conteos.forEach(({ cliente_id, total }) => {
        conteoPorCliente[cliente_id] = Number(total);
      });
    }

    // Inyectar total_productos en cada fila
    const rowsConProductos = rows.map((c) => {
      const plain = c.toJSON();
      plain.total_productos = conteoPorCliente[c.id] || 0;
      return plain;
    });

    logger.debug('Clientes listados:', {
      total: count,
      page,
      filtros: req.query,
    });

    return paginated(res, rowsConProductos, buildPaginacion(count, page, limit));
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
      attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
      group: ['estado'],
    });

    // Total de clientes por tipo
    const porTipo = await Cliente.findAll({
      attributes: ['tipo_cliente', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
      group: ['tipo_cliente'],
    });

    // Total de clientes por ciudad (top 10)
    const porCiudad = await Cliente.findAll({
      attributes: ['ciudad', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
      where: {
        ciudad: { [Op.ne]: null },
      },
      group: ['ciudad'],
      order: [[sequelize.literal('cantidad'), 'DESC']],
      limit: 10,
    });

    // Clientes nuevos este mes
    const inicioMes = new Date();
    inicioMes.setDate(1);
    inicioMes.setHours(0, 0, 0, 0);

    const nuevosEsteMes = await Cliente.count({
      where: {
        created_at: { [Op.gte]: inicioMes },
      },
    });

    // Total general
    const total = await Cliente.count();
    const activos = await Cliente.count({ where: { estado: 'activo' } });

    const stats = {
      total,
      activos,
      inactivos: total - activos,
      nuevosEsteMes,
      porEstado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: parseInt(e.dataValues.cantidad),
      })),
      porTipo: porTipo.map((t) => ({
        tipo: t.tipo_cliente,
        cantidad: parseInt(t.dataValues.cantidad),
      })),
      porCiudad: porCiudad.map((c) => ({
        ciudad: c.ciudad || 'Sin especificar',
        cantidad: parseInt(c.dataValues.cantidad),
      })),
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
      include: [
        {
          model: Contacto,
          as: 'contactos',
          where: { activo: true },
          through: { attributes: ['es_principal'] },
          required: false,
        },
      ],
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
        created_at: { [Op.gte]: inicioMes },
      },
    });

    const totalProductos = await Inventario.count({ where: { cliente_id: id } });

    const s3Service = require('../services/s3Service');
    const clienteData = cliente.toJSON();
    clienteData.operaciones_mes = operacionesMes;
    clienteData.total_productos = totalProductos;
    clienteData.logo_url = await s3Service.resolveUrl(clienteData.logo_url);

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
      paranoid: false,
    });

    if (nitExiste) {
      await transaction.rollback();
      return conflict(res, `El NIT ${datos.nit} ya está registrado`);
    }

    // ========== GENERAR CÓDIGO DE CLIENTE AUTOMÁTICAMENTE ==========
    if (!datos.codigo_cliente) {
      const ultimoCliente = await Cliente.findOne({
        order: [['id', 'DESC']],
        paranoid: false,
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
      descripcion: `Cliente creado: ${cliente.razon_social} (${cliente.codigo_cliente})`,
    });

    await transaction.commit();

    // Notificar nuevo cliente
    notificacionService.notificarClienteCreado(cliente, req.user.nombre_completo).catch(() => {});

    logger.info('Cliente creado:', {
      clienteId: cliente.id,
      codigo: cliente.codigo_cliente,
      creadoPor: req.user.id,
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
          id: { [Op.ne]: id },
        },
        paranoid: false,
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
      descripcion: `Cliente actualizado: ${cliente.razon_social}`,
    });

    await transaction.commit();

    // Recargar con contactos
    await cliente.reload({
      include: [
        {
          model: Contacto,
          as: 'contactos',
          where: { activo: true },
          required: false,
        },
      ],
    });

    logger.info('Cliente actualizado:', {
      clienteId: id,
      actualizadoPor: req.user.id,
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
      descripcion: `Cliente eliminado: ${cliente.razon_social} (${cliente.codigo_cliente})`,
    });

    await transaction.commit();

    // Notificar eliminación de cliente
    notificacionService
      .notificarClienteEliminado(cliente, req.user.nombre_completo)
      .catch(() => {});

    logger.info('Cliente eliminado:', {
      clienteId: id,
      eliminadoPor: req.user.id,
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
 * Listar contactos asignados a un cliente (delega al contactoController)
 */
const listarContactos = async (req, res) => {
  const { listarContactosCliente } = require('./contactoController');
  return listarContactosCliente(req, res);
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

    // Crear contacto (sin cliente_id — ahora es M:N via pivot)
    const { es_principal: esPrincipal = false, ...datosSinPrincipal } = datos;
    const contacto = await Contacto.create(datosSinPrincipal, { transaction });

    // Asignar al cliente via pivot
    await ContactoCliente.create(
      { contacto_id: contacto.id, cliente_id: parseInt(id), es_principal: esPrincipal },
      { transaction }
    );

    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { ...datosSinPrincipal, cliente_id: id },
      ip_address: getClientIP(req),
      descripcion: `Contacto creado: ${contacto.nombre} para cliente ${cliente.razon_social}`,
    });

    await transaction.commit();

    logger.info('Contacto creado:', {
      contactoId: contacto.id,
      clienteId: id,
      creadoPor: req.user.id,
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

    // Verificar que el contacto pertenece al cliente via pivot
    const pivot = await ContactoCliente.findOne({
      where: { contacto_id: contactoId, cliente_id: id },
    });
    if (!pivot) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado para este cliente');
    }

    const contacto = await Contacto.findByPk(contactoId);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    // Guardar datos anteriores
    const datosAnteriores = contacto.toJSON();

    // Actualizar campos del contacto (es_principal va a la pivot)
    const { es_principal: esPrincipal, ...datosSinPrincipal } = datos;
    await contacto.update(datosSinPrincipal, { transaction });
    if (esPrincipal !== undefined) {
      await pivot.update({ es_principal: esPrincipal }, { transaction });
    }

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
      descripcion: `Contacto actualizado: ${contacto.nombre}`,
    });

    await transaction.commit();

    logger.info('Contacto actualizado:', {
      contactoId,
      clienteId: id,
      actualizadoPor: req.user.id,
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

    // Verificar relación via pivot y desasociar
    const pivot = await ContactoCliente.findOne({
      where: { contacto_id: contactoId, cliente_id: id },
    });

    if (!pivot) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado para este cliente');
    }

    const contacto = await Contacto.findByPk(contactoId);
    await pivot.destroy({ transaction });

    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: contactoId,
      accion: 'desasignar_contacto',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: { contacto_id: contactoId, cliente_id: id },
      ip_address: getClientIP(req),
      descripcion: `Contacto ${contacto?.nombre ?? contactoId} desasignado del cliente ${cliente.razon_social}`,
    });

    await transaction.commit();

    logger.info('Contacto eliminado:', {
      contactoId,
      clienteId: id,
      eliminadoPor: req.user.id,
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
    const items = operaciones.map((op) => {
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
        fecha: op.fecha_cierre || op.createdAt,
        usuario: op.cerrador?.nombre_completo || null,
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
    logger.error('Error al obtener historial del cliente:', {
      message: error.message,
      clienteId: req.params.id,
    });
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

    const s3Service = require('../services/s3Service');
    let logo_url;

    if (s3Service.isConfigured()) {
      // Eliminar logo anterior si es una key de S3
      if (s3Service.isS3Key(cliente.logo_url)) {
        try {
          await s3Service.eliminar(cliente.logo_url);
        } catch {
          /* ignorar si no existe */
        }
      }

      // Procesar logo: eliminar fondo y convertir a PNG transparente
      let fileToUpload = req.file;
      try {
        const { convertirLogoTransparente } = require('../utils/imagenUtils');
        const dataUri = await convertirLogoTransparente(req.file.buffer);
        const processedBuffer = Buffer.from(dataUri.split(',')[1], 'base64');
        fileToUpload = {
          ...req.file,
          buffer: processedBuffer,
          mimetype: 'image/png',
          originalname: req.file.originalname.replace(/\.[^.]+$/, '') + '.png',
          size: processedBuffer.length,
        };
      } catch (err) {
        logger.warn('No se pudo procesar fondo del logo, se sube original:', err.message);
      }

      const resultado = await s3Service.subir(fileToUpload, 'logos');
      logo_url = resultado.key;
      logger.info('Logo subido a S3:', { clienteId: id, key: logo_url });
    } else {
      const base64 = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/png';
      logo_url = `data:${mimeType};base64,${base64}`;
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

    const s3ServiceForUrl = require('../services/s3Service');
    const logo_url_resolved = await s3ServiceForUrl.resolveUrl(logo_url);
    return successMessage(res, 'Logo actualizado exitosamente', { logo_url: logo_url_resolved });
  } catch (error) {
    logger.error('Error al subir logo:', { message: error.message });
    return serverError(res, 'Error al subir el logo', error);
  }
};

/**
 * Importar clientes desde Excel/CSV
 */
const importarClientes = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!req.file) {
      return errorResponse(res, 'Debe adjuntar un archivo Excel (.xlsx) o CSV (.csv)', 400);
    }

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const sheet = workbook.worksheets[0];

    if (!sheet || sheet.rowCount < 2) {
      return errorResponse(res, 'El archivo está vacío o no tiene datos', 400);
    }

    // Leer encabezados (fila 1)
    const headers = [];
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber] = String(cell.value || '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n');
    });

    const resultados = { creados: 0, actualizados: 0, errores: [] };

    // Obtener el último ID para generar códigos consecutivos sin depender del hook
    // (el hook falla dentro de transacciones por snapshot REPEATABLE READ de MySQL)
    const ultimoCliente = await Cliente.findOne({ order: [['id', 'DESC']], paranoid: false });
    let nextCodigoNum = ultimoCliente ? ultimoCliente.id + 1 : 1;

    for (let rowNum = 2; rowNum <= sheet.rowCount; rowNum++) {
      const row = sheet.getRow(rowNum);
      const datos = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber];
        if (header) datos[header] = cell.value;
      });

      // Mapeo flexible de columnas
      const nit = String(datos.nit || datos.nit_cc || datos.documento || '').trim();
      const razonSocial = String(datos.razon_social || datos.nombre || datos.empresa || '').trim();

      if (!nit || !razonSocial) {
        resultados.errores.push({ fila: rowNum, error: 'NIT y Razón Social son obligatorios' });
        continue;
      }

      try {
        const codigoCliente = `CLI-${String(nextCodigoNum).padStart(4, '0')}`;

        const [cliente, created] = await Cliente.findOrCreate({
          where: { nit },
          defaults: {
            codigo_cliente: codigoCliente,
            razon_social: razonSocial,
            nit,
            tipo_cliente: datos.tipo_cliente || datos.tipo || 'corporativo',
            sector: datos.sector || null,
            direccion: datos.direccion || null,
            ciudad: datos.ciudad || null,
            departamento: datos.departamento || null,
            telefono: datos.telefono ? String(datos.telefono) : null,
            email: datos.email || datos.correo || null,
            fecha_inicio_relacion: datos.fecha_inicio_relacion || null,
            estado: 'activo',
          },
          transaction,
        });

        if (created) {
          resultados.creados++;
          nextCodigoNum++;
        } else {
          // Actualizar datos existentes si vienen
          const updates = {};
          if (datos.direccion) updates.direccion = datos.direccion;
          if (datos.ciudad) updates.ciudad = datos.ciudad;
          if (datos.telefono) updates.telefono = String(datos.telefono);
          if (datos.email || datos.correo) updates.email = datos.email || datos.correo;
          if (datos.sector) updates.sector = datos.sector;
          if (Object.keys(updates).length > 0) {
            await cliente.update(updates, { transaction });
          }
          resultados.actualizados++;
        }
      } catch (err) {
        resultados.errores.push({ fila: rowNum, nit, error: err.message });
      }
    }

    await transaction.commit();

    // Limpiar archivo temporal
    if (req.file.path) {
      const fs = require('fs');
      fs.unlink(req.file.path, () => {});
    }

    return success(res, resultados, 'Importación completada');
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al importar clientes:', { message: err.message });
    return serverError(res, 'Error al importar clientes', err);
  }
};

/**
 * Descargar plantilla Excel para importación de clientes
 */
const descargarPlantillaImportacion = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Clientes');

    sheet.addTable({
      name: 'PlantillaClientes',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium9',
        showRowStripes: true,
      },
      columns: [
        { name: 'nit', filterButton: true },
        { name: 'razon_social', filterButton: true },
        { name: 'tipo_cliente', filterButton: true },
        { name: 'sector', filterButton: true },
        { name: 'direccion', filterButton: true },
        { name: 'ciudad', filterButton: true },
        { name: 'departamento', filterButton: true },
        { name: 'telefono', filterButton: true },
        { name: 'email', filterButton: true },
        { name: 'fecha_inicio_relacion', filterButton: true },
        { name: 'notas', filterButton: true },
      ],
      rows: [
        [
          '800245795-0',
          'EMPRESA EJEMPLO S.A.S.',
          'corporativo',
          'manufactura',
          'Calle 46A # 53C-15',
          'MEDELLÍN',
          'ANTIOQUIA',
          '6042341234',
          'contacto@empresa.com',
          '2024-01-15',
          '',
        ],
        [
          '900123456-7',
          'COMERCIAL DEMO LTDA',
          'pyme',
          'retail',
          'Carrera 70 # 45-30',
          'BOGOTÁ',
          'CUNDINAMARCA',
          '3001234567',
          'ventas@demo.com',
          '2023-06-01',
          '',
        ],
      ],
    });

    // Ajustar anchos de columna
    const anchos = [18, 35, 18, 16, 35, 20, 20, 14, 30, 22, 35];
    sheet.columns.forEach((col, i) => {
      col.width = anchos[i] || 18;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_importacion_clientes.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('Error al generar plantilla:', { message: err.message });
    return serverError(res, 'Error al generar plantilla', err);
  }
};

// ─── RESPONSABLES DE CLIENTE ─────────────────────────────────────────────────

/**
 * GET /clientes/:id/responsables
 * Listar responsables asignados a un cliente
 */
const getResponsables = async (req, res) => {
  try {
    const { id } = req.params;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    const responsables = await ClienteResponsable.findAll({
      where: { cliente_id: id },
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre', 'apellido', 'nombre_completo', 'email', 'rol', 'avatar_url'],
        },
      ],
      order: [['created_at', 'ASC']],
    });

    return success(
      res,
      responsables.map((r) => ({
        id: r.id,
        usuario_id: r.usuario_id,
        nombre: r.usuario?.nombre,
        apellido: r.usuario?.apellido,
        nombre_completo: r.usuario?.nombre_completo,
        email: r.usuario?.email,
        rol: r.usuario?.rol,
        avatar_url: r.usuario?.avatar_url,
      }))
    );
  } catch (err) {
    logger.error('Error al obtener responsables:', { message: err.message });
    return serverError(res, 'Error al obtener responsables', err);
  }
};

/**
 * POST /clientes/:id/responsables
 * Asignar un usuario como responsable de un cliente
 */
const addResponsable = async (req, res) => {
  try {
    const { id } = req.params;
    const { usuario_id } = req.body;

    if (!usuario_id) return errorResponse(res, 'usuario_id es requerido', 400);

    const cliente = await Cliente.findByPk(id);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    const usuario = await Usuario.findByPk(usuario_id);
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    const rolesPermitidos = ['admin', 'supervisor', 'operador'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      return errorResponse(res, 'Solo se pueden asignar usuarios con rol admin, supervisor u operador', 422);
    }

    const [responsable, creado] = await ClienteResponsable.findOrCreate({
      where: { cliente_id: id, usuario_id },
      defaults: { cliente_id: id, usuario_id },
    });

    if (!creado) return conflict(res, 'Este usuario ya está asignado a este cliente');

    await Auditoria.registrar({
      tabla: 'cliente_responsables',
      registro_id: responsable.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { cliente_id: id, usuario_id },
      ip_address: getClientIP(req),
      descripcion: `Responsable asignado: ${usuario.nombre} ${usuario.apellido} al cliente ${cliente.razon_social}`,
    });

    logger.info('Responsable asignado:', { clienteId: id, usuarioId: usuario_id, asignadoPor: req.user?.id });

    return created(res, 'Responsable asignado exitosamente', {
      id: responsable.id,
      usuario_id,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      email: usuario.email,
      rol: usuario.rol,
      avatar_url: usuario.avatar_url,
    });
  } catch (err) {
    logger.error('Error al agregar responsable:', { message: err.message });
    return serverError(res, 'Error al agregar responsable', err);
  }
};

/**
 * DELETE /clientes/:id/responsables/:uid
 * Remover un responsable de un cliente
 */
const removeResponsable = async (req, res) => {
  try {
    const { id, uid } = req.params;

    const cliente = await Cliente.findByPk(id);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    const responsable = await ClienteResponsable.findOne({
      where: { cliente_id: id, usuario_id: uid },
    });
    if (!responsable) return notFound(res, 'Responsable no encontrado');

    await Auditoria.registrar({
      tabla: 'cliente_responsables',
      registro_id: responsable.id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: { cliente_id: id, usuario_id: uid },
      ip_address: getClientIP(req),
      descripcion: `Responsable removido del cliente ${cliente.razon_social}`,
    });

    await responsable.destroy();

    logger.info('Responsable removido:', { clienteId: id, usuarioId: uid, removidoPor: req.user?.id });

    return successMessage(res, 'Responsable removido correctamente');
  } catch (err) {
    logger.error('Error al remover responsable:', { message: err.message });
    return serverError(res, 'Error al remover responsable', err);
  }
};

// ─── GESTIÓN DE ASIGNACIONES DESDE PERSPECTIVA DE USUARIO (admin) ────────────

/**
 * GET /administracion/usuarios/:id/clientes-asignados
 * Clientes asignados a un usuario específico
 */
const getClientesAsignados = async (req, res) => {
  try {
    const { id } = req.params;

    const asignaciones = await ClienteResponsable.findAll({
      where: { usuario_id: id },
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'codigo_cliente', 'razon_social', 'nit', 'estado'],
        },
      ],
      order: [[{ model: Cliente, as: 'cliente' }, 'razon_social', 'ASC']],
    });

    return success(
      res,
      asignaciones.map((a) => ({
        asignacion_id: a.id,
        cliente_id: a.cliente_id,
        codigo_cliente: a.cliente?.codigo_cliente,
        razon_social: a.cliente?.razon_social,
        nit: a.cliente?.nit,
        estado: a.cliente?.estado,
      }))
    );
  } catch (err) {
    logger.error('Error al obtener clientes asignados:', { message: err.message });
    return serverError(res, 'Error al obtener clientes asignados', err);
  }
};

/**
 * POST /administracion/usuarios/:id/clientes-asignados
 * Asignar un cliente a un usuario (perspectiva admin desde lista de usuarios)
 */
const addClienteAsignado = async (req, res) => {
  try {
    const { id: usuario_id } = req.params;
    const { cliente_id } = req.body;

    if (!cliente_id) return errorResponse(res, 'cliente_id es requerido', 400);

    const usuario = await Usuario.findByPk(usuario_id);
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    const rolesPermitidos = ['admin', 'supervisor', 'operador'];
    if (!rolesPermitidos.includes(usuario.rol)) {
      return errorResponse(res, 'Solo se pueden asignar clientes a usuarios con rol admin, supervisor u operador', 422);
    }

    const cliente = await Cliente.findByPk(cliente_id);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    const [responsable, creado] = await ClienteResponsable.findOrCreate({
      where: { cliente_id, usuario_id },
      defaults: { cliente_id, usuario_id },
    });

    if (!creado) return conflict(res, 'Este cliente ya está asignado a este usuario');

    await Auditoria.registrar({
      tabla: 'cliente_responsables',
      registro_id: responsable.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { cliente_id, usuario_id },
      ip_address: getClientIP(req),
      descripcion: `Cliente ${cliente.razon_social} asignado a ${usuario.nombre_completo}`,
    });

    return created(res, 'Cliente asignado exitosamente', {
      asignacion_id: responsable.id,
      cliente_id: Number(cliente_id),
      razon_social: cliente.razon_social,
      codigo_cliente: cliente.codigo_cliente,
    });
  } catch (err) {
    logger.error('Error al asignar cliente:', { message: err.message });
    return serverError(res, 'Error al asignar cliente', err);
  }
};

/**
 * DELETE /administracion/usuarios/:id/clientes-asignados/:clienteId
 * Remover un cliente asignado a un usuario
 */
const removeClienteAsignado = async (req, res) => {
  try {
    const { id: usuario_id, clienteId: cliente_id } = req.params;

    const responsable = await ClienteResponsable.findOne({
      where: { cliente_id, usuario_id },
    });
    if (!responsable) return notFound(res, 'Asignación no encontrada');

    await Auditoria.registrar({
      tabla: 'cliente_responsables',
      registro_id: responsable.id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: { cliente_id, usuario_id },
      ip_address: getClientIP(req),
      descripcion: `Cliente ${cliente_id} removido del usuario ${usuario_id}`,
    });

    await responsable.destroy();
    return successMessage(res, 'Asignación removida correctamente');
  } catch (err) {
    logger.error('Error al remover cliente asignado:', { message: err.message });
    return serverError(res, 'Error al remover asignación', err);
  }
};

const asignarContactoDesdeCliente = async (req, res) => {
  const { asignarContactoDesdeCliente: fn } = require('./contactoController');
  return fn(req, res);
};

const desasignarContactoDesdeCliente = async (req, res) => {
  const { desasignarContactoDesdeCliente: fn } = require('./contactoController');
  return fn(req, res);
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
  importarClientes,
  descargarPlantillaImportacion,
  // Contactos
  listarContactos,
  asignarContactoDesdeCliente,
  desasignarContactoDesdeCliente,
  // Historial
  historial,
  // Responsables
  getResponsables,
  addResponsable,
  removeResponsable,
  getClientesAsignados,
  addClienteAsignado,
  removeClienteAsignado,
};
