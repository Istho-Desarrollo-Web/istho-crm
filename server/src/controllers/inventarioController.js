/**
 * ============================================================================
 * ISTHO CRM - Controlador de Inventario (Versión Corregida)
 * ============================================================================
 * Maneja todas las operaciones de inventario incluyendo:
 * - CRUD de productos
 * - Movimientos (entradas/salidas/ajustes)
 * - Alertas de stock
 * - Estadísticas y reportes
 *
 * CORRECCIÓN v2.1.0:
 * - Función listar ahora procesa estados virtuales: bajo_stock, agotado
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.1.0
 * @date Enero 2026
 */

const { Op } = require('sequelize');
const {
  Inventario,
  MovimientoInventario,
  Operacion,
  OperacionDetalle,
  CajaInventario,
  Cliente,
  Usuario,
  Auditoria,
  sequelize,
} = require('../models');
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
const notificacionService = require('../services/notificacionService');

// Campos permitidos para ordenamiento
const CAMPOS_ORDENAMIENTO = [
  'producto',
  'sku',
  'cantidad',
  'fecha_vencimiento',
  'created_at',
  'estado',
];

// ═══════════════════════════════════════════════════════════════════════════
// OPERACIONES CRUD DE INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /inventario
 * Listar inventario con paginación, filtros y búsqueda
 *
 * CORREGIDO: Ahora procesa estados virtuales:
 * - estado=bajo_stock → filtra cantidad <= stock_minimo
 * - estado=agotado → filtra cantidad = 0
 */
const listar = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const order = parseOrdenamiento(req.query, CAMPOS_ORDENAMIENTO);

    // Construir condiciones de filtro
    const where = {};

    // Filtro por cliente
    if (req.query.cliente_id) {
      where.cliente_id = req.query.cliente_id;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FILTRO POR ESTADO (incluyendo estados virtuales)
    // ═══════════════════════════════════════════════════════════════════════
    if (req.query.estado && req.query.estado !== 'todos') {
      switch (req.query.estado) {
        case 'bajo_stock':
          // Estado virtual: productos con stock bajo (cantidad <= stock_minimo pero > 0)
          where[Op.and] = [
            sequelize.literal('cantidad <= stock_minimo'),
            { stock_minimo: { [Op.gt]: 0 } },
            { cantidad: { [Op.gt]: 0 } },
          ];
          break;

        case 'agotado':
          // Estado virtual: productos sin stock
          where.cantidad = 0;
          break;

        default:
          // Estados normales de la base de datos
          where.estado = req.query.estado;
      }
    }

    // Filtro por categoría
    if (req.query.categoria) {
      where.categoria = req.query.categoria;
    }

    // Filtro por stock bajo (parámetro alternativo)
    if (req.query.stock_bajo === 'true' && !req.query.estado) {
      where[Op.and] = [
        sequelize.literal('cantidad <= stock_minimo'),
        { stock_minimo: { [Op.gt]: 0 } },
      ];
    }

    // Filtro por próximos a vencer (30 días)
    if (req.query.por_vencer === 'true') {
      const hoy = new Date();
      const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      where.fecha_vencimiento = {
        [Op.between]: [hoy, en30Dias],
      };
    }

    // Búsqueda general (producto, SKU, código de barras)
    if (req.query.search) {
      const searchTerm = sanitizarBusqueda(req.query.search);
      where[Op.or] = [
        { producto: { [Op.like]: `%${searchTerm}%` } },
        { sku: { [Op.like]: `%${searchTerm}%` } },
        { codigo_barras: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    // Ejecutar consulta
    const { count, rows } = await Inventario.findAndCountAll({
      where,
      order,
      limit,
      offset,
      attributes: {
        include: [
          [
            sequelize.literal(
              '(SELECT COUNT(*) FROM caja_inventario WHERE caja_inventario.inventario_id = Inventario.id)'
            ),
            'total_cajas',
          ],
        ],
      },
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'codigo_cliente', 'razon_social'],
        },
      ],
    });

    // Agregar campos virtuales calculados y renombrar para frontend
    const inventarioConCalculos = rows.map((item) => {
      const itemJSON = item.toJSON();

      // Campos calculados
      itemJSON.valor_total = item.valor_total;
      itemJSON.stock_bajo = item.tieneStockBajo ? item.tieneStockBajo() : false;
      itemJSON.proximo_a_vencer = item.proximoAVencer ? item.proximoAVencer() : false;

      // Aliases para compatibilidad con frontend
      itemJSON.nombre = itemJSON.producto;
      itemJSON.codigo = itemJSON.sku;
      itemJSON.stock_actual = parseFloat(itemJSON.cantidad) || 0;
      itemJSON.stock_minimo = parseFloat(itemJSON.stock_minimo) || 0;
      itemJSON.stock_maximo = parseFloat(itemJSON.stock_maximo) || 0;
      itemJSON.cliente_nombre = itemJSON.cliente?.razon_social || '';

      return itemJSON;
    });

    logger.debug('Inventario listado:', {
      total: count,
      page,
      filtros: req.query,
    });

    return paginated(res, inventarioConCalculos, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('Error al listar inventario:', { message: error.message });
    return serverError(res, 'Error al obtener el inventario', error);
  }
};

/**
 * GET /inventario/stats
 * Obtener estadísticas/KPIs de inventario
 */
const estadisticas = async (req, res) => {
  try {
    const whereCliente = req.query.cliente_id ? { cliente_id: req.query.cliente_id } : {};

    // Total de items y valor
    const totales = await Inventario.findOne({
      where: whereCliente,
      attributes: [
        [sequelize.fn('COUNT', sequelize.col('id')), 'total_items'],
        [sequelize.fn('SUM', sequelize.col('cantidad')), 'total_unidades'],
        [
          sequelize.fn('SUM', sequelize.literal('cantidad * COALESCE(costo_unitario, 0)')),
          'valor_total',
        ],
      ],
      raw: true,
    });

    // Por estado
    const porEstado = await Inventario.findAll({
      where: whereCliente,
      attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
      group: ['estado'],
      raw: true,
    });

    // Stock bajo
    const stockBajo = await Inventario.count({
      where: {
        ...whereCliente,
        [Op.and]: [
          sequelize.literal('cantidad <= stock_minimo'),
          { stock_minimo: { [Op.gt]: 0 } },
          { cantidad: { [Op.gt]: 0 } },
        ],
      },
    });

    // Agotados
    const agotados = await Inventario.count({
      where: {
        ...whereCliente,
        cantidad: 0,
      },
    });

    // Disponibles (con stock > mínimo)
    const disponibles = await Inventario.count({
      where: {
        ...whereCliente,
        estado: 'disponible',
        [Op.or]: [sequelize.literal('cantidad > stock_minimo'), { stock_minimo: 0 }],
      },
    });

    // Próximos a vencer (30 días)
    const hoy = new Date();
    const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const proximosVencer = await Inventario.count({
      where: {
        ...whereCliente,
        fecha_vencimiento: {
          [Op.between]: [hoy, en30Dias],
        },
      },
    });

    // Por categoría (top 10)
    const porCategoria = await Inventario.findAll({
      where: {
        ...whereCliente,
        categoria: { [Op.ne]: null },
      },
      attributes: [
        'categoria',
        [sequelize.fn('COUNT', sequelize.col('id')), 'items'],
        [sequelize.fn('SUM', sequelize.col('cantidad')), 'unidades'],
      ],
      group: ['categoria'],
      order: [[sequelize.literal('unidades'), 'DESC']],
      limit: 10,
      raw: true,
    });

    // Formato para KPIs del frontend
    const stats = {
      // KPIs principales
      total: parseInt(totales.total_items) || 0,
      disponibles: disponibles,
      bajoStock: stockBajo,
      agotados: agotados,
      valorTotal: parseFloat(totales.valor_total) || 0,
      proximosVencer: proximosVencer,

      // Detalle por estado
      resumen: {
        total_items: parseInt(totales.total_items) || 0,
        total_unidades: parseFloat(totales.total_unidades) || 0,
        valor_total: parseFloat(totales.valor_total) || 0,
      },
      alertas: {
        stock_bajo: stockBajo,
        proximos_vencer: proximosVencer,
        agotados: agotados,
      },
      porEstado: porEstado.map((e) => ({
        estado: e.estado,
        cantidad: parseInt(e.cantidad),
      })),
      porCategoria: porCategoria.map((c) => ({
        categoria: c.categoria,
        items: parseInt(c.items),
        unidades: parseFloat(c.unidades),
      })),
    };

    return success(res, stats);
  } catch (error) {
    logger.error('Error al obtener estadísticas de inventario:', { message: error.message });
    return serverError(res, 'Error al obtener estadísticas', error);
  }
};

/**
 * GET /inventario/alertas
 * Obtener alertas de stock bajo, agotados y vencimientos
 */
const alertas = async (req, res) => {
  try {
    const whereCliente = req.query.cliente_id ? { cliente_id: req.query.cliente_id } : {};
    const tipoFiltro = req.query.tipo; // 'agotado', 'bajo_stock', 'vencimiento'

    let alertasData = [];

    // Productos agotados
    if (!tipoFiltro || tipoFiltro === 'agotado') {
      const agotados = await Inventario.findAll({
        where: {
          ...whereCliente,
          cantidad: 0,
          [Op.and]: [
            sequelize.literal(
              "(alertas_silenciadas IS NULL OR JSON_EXTRACT(alertas_silenciadas, '$.agotado') IS NULL)"
            ),
          ],
        },
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'codigo_cliente', 'razon_social'],
          },
        ],
        order: [['updated_at', 'DESC']],
        limit: 50,
      });

      alertasData = alertasData.concat(
        agotados.map((item) => ({
          id: `agotado-${item.id}`,
          producto_id: item.id,
          tipo: 'agotado',
          prioridad: 'alta',
          estado: 'pendiente',
          producto_nombre: item.producto,
          producto_codigo: item.sku,
          nombre: item.producto,
          codigo: item.sku,
          cliente_nombre: item.cliente?.razon_social,
          cliente: item.cliente?.razon_social,
          stock_actual: 0,
          stockActual: 0,
          stock_minimo: parseFloat(item.stock_minimo) || 0,
          stockMinimo: parseFloat(item.stock_minimo) || 0,
          unidad_medida: item.unidad_medida,
          fecha_alerta: item.updated_at,
          created_at: item.updated_at,
        }))
      );
    }

    // Stock bajo (cantidad <= mínimo pero > 0)
    if (!tipoFiltro || tipoFiltro === 'bajo_stock') {
      const stockBajo = await Inventario.findAll({
        where: {
          ...whereCliente,
          [Op.and]: [
            sequelize.literal('cantidad <= stock_minimo'),
            { stock_minimo: { [Op.gt]: 0 } },
            { cantidad: { [Op.gt]: 0 } },
            sequelize.literal(
              "(alertas_silenciadas IS NULL OR JSON_EXTRACT(alertas_silenciadas, '$.bajo_stock') IS NULL)"
            ),
          ],
        },
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'codigo_cliente', 'razon_social'],
          },
        ],
        order: [['cantidad', 'ASC']],
        limit: 50,
      });

      alertasData = alertasData.concat(
        stockBajo.map((item) => ({
          id: `bajo_stock-${item.id}`,
          producto_id: item.id,
          tipo: 'bajo_stock',
          prioridad: 'media',
          estado: 'pendiente',
          producto_nombre: item.producto,
          producto_codigo: item.sku,
          nombre: item.producto,
          codigo: item.sku,
          cliente_nombre: item.cliente?.razon_social,
          cliente: item.cliente?.razon_social,
          stock_actual: parseFloat(item.cantidad),
          stockActual: parseFloat(item.cantidad),
          stock_minimo: parseFloat(item.stock_minimo),
          stockMinimo: parseFloat(item.stock_minimo),
          ubicacion: item.ubicacion,
          unidad_medida: item.unidad_medida,
          fecha_alerta: item.updated_at,
          created_at: item.updated_at,
        }))
      );
    }

    // Próximos a vencer (30 días)
    if (!tipoFiltro || tipoFiltro === 'vencimiento') {
      const hoy = new Date();
      const en30Dias = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const proximosVencer = await Inventario.findAll({
        where: {
          ...whereCliente,
          fecha_vencimiento: {
            [Op.between]: [hoy, en30Dias],
          },
          cantidad: { [Op.gt]: 0 },
          [Op.and]: [
            sequelize.literal(
              "(alertas_silenciadas IS NULL OR JSON_EXTRACT(alertas_silenciadas, '$.vencimiento') IS NULL)"
            ),
          ],
        },
        include: [
          {
            model: Cliente,
            as: 'cliente',
            attributes: ['id', 'codigo_cliente', 'razon_social'],
          },
        ],
        order: [['fecha_vencimiento', 'ASC']],
        limit: 50,
      });

      alertasData = alertasData.concat(
        proximosVencer.map((item) => {
          const diasRestantes = Math.ceil(
            (new Date(item.fecha_vencimiento) - hoy) / (1000 * 60 * 60 * 24)
          );
          return {
            id: `vencimiento-${item.id}`,
            producto_id: item.id,
            tipo: 'vencimiento',
            prioridad: diasRestantes <= 7 ? 'alta' : 'media',
            estado: 'pendiente',
            producto_nombre: item.producto,
            producto_codigo: item.sku,
            nombre: item.producto,
            codigo: item.sku,
            cliente_nombre: item.cliente?.razon_social,
            cliente: item.cliente?.razon_social,
            stock_actual: parseFloat(item.cantidad),
            stockActual: parseFloat(item.cantidad),
            fecha_vencimiento: item.fecha_vencimiento,
            fechaVencimiento: item.fecha_vencimiento,
            dias_restantes: diasRestantes,
            unidad_medida: item.unidad_medida,
            fecha_alerta: item.updated_at,
            created_at: item.updated_at,
          };
        })
      );
    }

    // Ordenar por prioridad
    const prioridadOrden = { alta: 0, media: 1, baja: 2 };
    alertasData.sort((a, b) => prioridadOrden[a.prioridad] - prioridadOrden[b.prioridad]);

    return success(res, alertasData);
  } catch (error) {
    logger.error('Error al obtener alertas:', { message: error.message });
    return serverError(res, 'Error al obtener alertas', error);
  }
};

/**
 * GET /inventario/:id
 * Obtener un item de inventario por ID
 */
const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Inventario.findByPk(id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'codigo_cliente', 'razon_social', 'nit'],
        },
      ],
    });

    if (!item) {
      return notFound(res, 'Item de inventario no encontrado');
    }

    // Agregar campos calculados y aliases
    const itemJSON = item.toJSON();
    itemJSON.cantidad_disponible = item.cantidad_disponible;
    itemJSON.valor_total = item.valor_total;
    itemJSON.stock_bajo = item.tieneStockBajo ? item.tieneStockBajo() : false;
    itemJSON.proximo_a_vencer = item.proximoAVencer ? item.proximoAVencer() : false;
    itemJSON.esta_vencido = item.estaVencido ? item.estaVencido() : false;

    // Aliases para frontend
    itemJSON.nombre = itemJSON.producto;
    itemJSON.codigo = itemJSON.sku;
    itemJSON.stock_actual = parseFloat(itemJSON.cantidad) || 0;
    itemJSON.cliente_nombre = itemJSON.cliente?.razon_social || '';

    return success(res, itemJSON);
  } catch (error) {
    logger.error('Error al obtener item:', { message: error.message, id: req.params.id });
    return serverError(res, 'Error al obtener el item', error);
  }
};

/**
 * GET /inventario/cliente/:clienteId
 * Obtener inventario de un cliente específico
 */
const obtenerPorCliente = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { page, limit, offset } = parsePaginacion(req.query);
    const order = parseOrdenamiento(req.query, CAMPOS_ORDENAMIENTO);

    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      return notFound(res, 'Cliente no encontrado');
    }

    const where = { cliente_id: clienteId };

    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }

    if (req.query.search) {
      const searchTerm = sanitizarBusqueda(req.query.search);
      where[Op.or] = [
        { producto: { [Op.like]: `%${searchTerm}%` } },
        { sku: { [Op.like]: `%${searchTerm}%` } },
      ];
    }

    const { count, rows } = await Inventario.findAndCountAll({
      where,
      order,
      limit,
      offset,
    });

    const inventarioConCalculos = rows.map((item) => {
      const itemJSON = item.toJSON();
      itemJSON.cantidad_disponible = item.cantidad_disponible;
      itemJSON.valor_total = item.valor_total;
      itemJSON.stock_bajo = item.tieneStockBajo ? item.tieneStockBajo() : false;
      itemJSON.nombre = itemJSON.producto;
      itemJSON.codigo = itemJSON.sku;
      itemJSON.stock_actual = parseFloat(itemJSON.cantidad) || 0;
      return itemJSON;
    });

    return paginated(res, inventarioConCalculos, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('Error al obtener inventario por cliente:', { message: error.message });
    return serverError(res, 'Error al obtener el inventario', error);
  }
};

/**
 * POST /inventario
 * Crear un nuevo item de inventario
 */
const crear = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const datos = limpiarObjeto(req.body);

    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(datos.cliente_id);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }

    // Verificar SKU duplicado por cliente (referencia única)
    const existente = await Inventario.findOne({
      where: {
        cliente_id: datos.cliente_id,
        sku: datos.sku || datos.codigo,
      },
    });

    if (existente) {
      await transaction.rollback();
      return conflict(
        res,
        `Ya existe un producto con SKU ${datos.sku || datos.codigo} para este cliente`
      );
    }

    // Mapear campos del frontend
    const itemData = {
      cliente_id: datos.cliente_id,
      sku: datos.sku || datos.codigo,
      codigo_barras: datos.codigo_barras,
      producto: datos.producto || datos.nombre,
      descripcion: datos.descripcion,
      categoria: datos.categoria,
      unidad_medida: datos.unidad_medida || 'UND',
      cantidad: datos.cantidad || datos.stock_actual || 0,
      stock_minimo: datos.stock_minimo || 0,
      stock_maximo: datos.stock_maximo,
      fecha_vencimiento: datos.fecha_vencimiento,
      fecha_ingreso: datos.fecha_ingreso || new Date(),
      costo_unitario: datos.costo_unitario,
      estado: datos.estado || 'disponible',
      codigo_wms: datos.codigo_wms,
      notas: datos.notas,
    };

    // Crear item
    const item = await Inventario.create(itemData, { transaction });

    // Registrar movimiento inicial si hay cantidad
    if (parseFloat(itemData.cantidad) > 0) {
      await MovimientoInventario.registrar(
        {
          inventario_id: item.id,
          usuario_id: req.user.id,
          tipo: 'entrada',
          motivo: 'Registro inicial',
          cantidad: itemData.cantidad,
          stock_anterior: 0,
          stock_resultante: itemData.cantidad,
          costo_unitario: itemData.costo_unitario,
          ip_address: getClientIP(req),
          user_agent: req.get('user-agent'),
        },
        { transaction }
      );
    }

    // Auditoría
    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: item.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: itemData,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Item de inventario creado: ${item.producto} (${item.sku})`,
    });

    await transaction.commit();

    logger.info('Item de inventario creado:', { itemId: item.id, sku: item.sku });

    return created(res, 'Item de inventario creado exitosamente', item);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al crear item:', { message: error.message });
    return serverError(res, 'Error al crear el item', error);
  }
};

/**
 * PUT /inventario/:id
 * Actualizar un item de inventario
 */
const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const datos = limpiarObjeto(req.body);

    const item = await Inventario.findByPk(id);

    if (!item) {
      await transaction.rollback();
      return notFound(res, 'Item de inventario no encontrado');
    }

    // Verificar duplicados si se cambia SKU
    if (datos.sku && datos.sku !== item.sku) {
      const existente = await Inventario.findOne({
        where: {
          cliente_id: item.cliente_id,
          sku: datos.sku,
          id: { [Op.ne]: id },
        },
      });

      if (existente) {
        await transaction.rollback();
        return conflict(res, 'Ya existe un item con ese SKU para este cliente');
      }
    }

    const datosAnteriores = item.toJSON();

    // Mapear campos
    const updateData = {};
    if (datos.sku || datos.codigo) updateData.sku = datos.sku || datos.codigo;
    if (datos.producto || datos.nombre) updateData.producto = datos.producto || datos.nombre;
    if (datos.descripcion !== undefined) updateData.descripcion = datos.descripcion;
    if (datos.categoria !== undefined) updateData.categoria = datos.categoria;
    if (datos.unidad_medida !== undefined) updateData.unidad_medida = datos.unidad_medida;
    if (datos.stock_minimo !== undefined) updateData.stock_minimo = datos.stock_minimo;
    if (datos.stock_maximo !== undefined) updateData.stock_maximo = datos.stock_maximo;
    if (datos.fecha_vencimiento !== undefined)
      updateData.fecha_vencimiento = datos.fecha_vencimiento;
    if (datos.costo_unitario !== undefined) updateData.costo_unitario = datos.costo_unitario;
    if (datos.estado !== undefined) updateData.estado = datos.estado;
    if (datos.notas !== undefined) updateData.notas = datos.notas;

    await item.update(updateData, { transaction });

    // Auditoría
    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: item.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      datos_nuevos: updateData,
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Item actualizado: ${item.producto}`,
    });

    await transaction.commit();

    // Recargar con cliente
    await item.reload({
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social'] },
      ],
    });

    const itemJSON = item.toJSON();
    itemJSON.nombre = itemJSON.producto;
    itemJSON.codigo = itemJSON.sku;
    itemJSON.stock_actual = parseFloat(itemJSON.cantidad) || 0;
    itemJSON.cliente_nombre = itemJSON.cliente?.razon_social || '';

    // Verificar alertas si se actualizaron límites de stock
    if (updateData.stock_minimo !== undefined || updateData.stock_maximo !== undefined) {
      const cantidad = parseFloat(item.cantidad) || 0;
      const minimo = parseFloat(item.stock_minimo) || 0;
      const maximo = parseFloat(item.stock_maximo) || 0;
      const itemData = item.toJSON ? item.toJSON() : item;

      if (cantidad === 0) {
        notificacionService.notificarProductoAgotado(itemData).catch(() => {});
      } else if (minimo > 0 && cantidad <= minimo) {
        notificacionService.notificarStockBajo(itemData).catch(() => {});
      } else if (maximo > 0 && cantidad >= maximo) {
        notificacionService.notificarStockSobreMaximo(itemData).catch(() => {});
      }
    }

    return successMessage(res, 'Item actualizado exitosamente', itemJSON);
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al actualizar item:', { message: error.message });
    return serverError(res, 'Error al actualizar el item', error);
  }
};

/**
 * DELETE /inventario/:id
 * Eliminar un item de inventario
 */
const eliminar = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;

    const item = await Inventario.findByPk(id, {
      include: [{ model: Cliente, as: 'cliente' }],
    });

    if (!item) {
      await transaction.rollback();
      return notFound(res, 'Item no encontrado');
    }

    // Verificar si tiene stock
    if (parseFloat(item.cantidad) > 0) {
      await transaction.rollback();
      return errorResponse(res, 'No se puede eliminar un item con stock disponible', 400);
    }

    const datosAnteriores = item.toJSON();

    await item.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosAnteriores,
      ip_address: getClientIP(req),
      descripcion: `Item eliminado: ${item.producto}`,
    });

    await transaction.commit();

    return successMessage(res, 'Item eliminado exitosamente');
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al eliminar item:', { message: error.message });
    return serverError(res, 'Error al eliminar el item', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// MOVIMIENTOS DE INVENTARIO
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /inventario/:id/ajustar
 * Ajustar cantidad (entrada, salida, ajuste)
 */
const ajustarCantidad = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { cantidad, tipo, motivo, documento_referencia, documento, observaciones } = req.body;

    const item = await Inventario.findByPk(id);

    if (!item) {
      await transaction.rollback();
      return notFound(res, 'Item no encontrado');
    }

    const cantidadAnterior = parseFloat(item.cantidad);
    let cantidadNueva;
    let cantidadMovimiento;

    switch (tipo) {
      case 'entrada':
        cantidadMovimiento = Math.abs(parseFloat(cantidad));
        cantidadNueva = cantidadAnterior + cantidadMovimiento;
        break;
      case 'salida':
        cantidadMovimiento = -Math.abs(parseFloat(cantidad));
        cantidadNueva = cantidadAnterior + cantidadMovimiento;
        if (cantidadNueva < 0) {
          await transaction.rollback();
          return errorResponse(res, `Stock insuficiente. Disponible: ${cantidadAnterior}`, 400);
        }
        break;
      case 'ajuste':
        cantidadNueva = parseFloat(cantidad);
        cantidadMovimiento = cantidadNueva - cantidadAnterior;
        break;
      default:
        await transaction.rollback();
        return errorResponse(res, 'Tipo de movimiento no válido', 400);
    }

    // Actualizar cantidad y limpiar alertas silenciadas
    await item.update({ cantidad: cantidadNueva, alertas_silenciadas: null }, { transaction });

    // Registrar movimiento
    const movimiento = await MovimientoInventario.registrar(
      {
        inventario_id: item.id,
        usuario_id: req.user.id,
        tipo: tipo,
        motivo: motivo,
        cantidad: cantidadMovimiento,
        stock_anterior: cantidadAnterior,
        stock_resultante: cantidadNueva,
        documento_referencia: documento_referencia || documento,
        observaciones: observaciones,
        costo_unitario: item.costo_unitario,
        ip_address: getClientIP(req),
        user_agent: req.get('user-agent'),
      },
      { transaction }
    );

    // Auditoría
    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: item.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: { cantidad: cantidadAnterior },
      datos_nuevos: { cantidad: cantidadNueva, tipo_ajuste: tipo, motivo },
      ip_address: getClientIP(req),
      descripcion: `Movimiento (${tipo}): ${item.producto} - ${cantidadAnterior} → ${cantidadNueva}`,
    });

    await transaction.commit();

    logger.info('Movimiento registrado:', { itemId: id, tipo, cantidad: cantidadMovimiento });

    // Notificaciones automáticas de stock (async, no bloquean respuesta)
    const itemData = item.toJSON ? item.toJSON() : item;
    itemData.cantidad = cantidadNueva;

    if (cantidadNueva === 0) {
      notificacionService.notificarProductoAgotado(itemData).catch(() => {});
    } else if (
      parseFloat(item.stock_minimo) > 0 &&
      cantidadNueva <= parseFloat(item.stock_minimo)
    ) {
      notificacionService.notificarStockBajo(itemData).catch(() => {});
    } else if (
      parseFloat(item.stock_maximo) > 0 &&
      cantidadNueva >= parseFloat(item.stock_maximo)
    ) {
      notificacionService.notificarStockSobreMaximo(itemData).catch(() => {});
    }

    return successMessage(res, 'Movimiento registrado exitosamente', {
      id: item.id,
      movimiento_id: movimiento.id,
      producto: item.producto,
      sku: item.sku,
      cantidad_anterior: cantidadAnterior,
      cantidad_nueva: cantidadNueva,
      diferencia: cantidadMovimiento,
    });
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al ajustar cantidad:', { message: error.message });
    return serverError(res, 'Error al registrar el movimiento', error);
  }
};

/**
 * GET /inventario/:id/movimientos
 * Obtener historial de movimientos de un producto
 */
const obtenerMovimientos = async (req, res) => {
  try {
    const { id } = req.params;
    const { page, limit, offset } = parsePaginacion(req.query);

    // Verificar que el item existe
    const item = await Inventario.findByPk(id);
    if (!item) {
      return notFound(res, 'Item no encontrado');
    }

    const { count, rows } = await MovimientoInventario.findAndCountAll({
      where: { inventario_id: id },
      order: [['fecha_movimiento', 'DESC']],
      limit,
      offset,
      include: [
        {
          model: Usuario,
          as: 'usuario',
          attributes: ['id', 'nombre_completo', 'username'],
        },
      ],
    });

    // Formatear para frontend
    const movimientos = rows.map((mov) => ({
      id: mov.id,
      tipo: mov.tipo,
      cantidad: parseFloat(mov.cantidad),
      stock_anterior: parseFloat(mov.stock_anterior),
      stock_resultante: parseFloat(mov.stock_resultante),
      stockResultante: parseFloat(mov.stock_resultante),
      motivo: mov.motivo,
      descripcion: mov.motivo,
      documento_referencia: mov.documento_referencia,
      documento: mov.documento_referencia,
      observaciones: mov.observaciones,
      fecha: mov.fecha_movimiento,
      created_at: mov.fecha_movimiento,
      usuario_nombre: mov.usuario?.nombre_completo || 'Sistema',
      responsable: mov.usuario?.nombre_completo || 'Sistema',
    }));

    return paginated(res, movimientos, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('Error al obtener movimientos:', { message: error.message });
    return serverError(res, 'Error al obtener movimientos', error);
  }
};

/**
 * GET /inventario/:id/estadisticas
 * Obtener estadísticas de movimientos para gráficos
 */
const obtenerEstadisticasProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const meses = parseInt(req.query.meses) || 6;

    // Verificar que el item existe
    const item = await Inventario.findByPk(id);
    if (!item) {
      return notFound(res, 'Item no encontrado');
    }

    const estadisticas = await MovimientoInventario.getEstadisticas(id, meses);

    return success(res, estadisticas);
  } catch (error) {
    logger.error('Error al obtener estadísticas:', { message: error.message });
    return serverError(res, 'Error al obtener estadísticas', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GESTIÓN DE ALERTAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * PUT /inventario/alertas/:alertaId/atender
 * Marcar una alerta como atendida
 */
const atenderAlerta = async (req, res) => {
  try {
    const { alertaId } = req.params;
    const { observaciones } = req.body;

    // El alertaId tiene formato "tipo-id" (ej: "bajo_stock-123", "agotado-45")
    const lastDash = alertaId.lastIndexOf('-');
    const tipo = alertaId.substring(0, lastDash);
    const productoId = alertaId.substring(lastDash + 1);

    if (!productoId || !tipo) {
      return errorResponse(res, 'ID de alerta inválido', 400);
    }

    const item = await Inventario.findByPk(productoId);
    if (!item) {
      return notFound(res, 'Producto no encontrado');
    }

    // Silenciar la alerta persistentemente
    const silenciadasActual = item.alertas_silenciadas;
    const silenciadas =
      (typeof silenciadasActual === 'string' ? JSON.parse(silenciadasActual) : silenciadasActual) ||
      {};
    silenciadas[tipo] = new Date().toISOString();
    await item.update({ alertas_silenciadas: silenciadas });

    logger.info('Alerta atendida - silenciadas guardadas:', {
      alertaId,
      tipo,
      productoId,
      silenciadasAntes: silenciadasActual,
      silenciadasDespues: silenciadas,
    });

    // Registrar en auditoría que la alerta fue atendida
    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: productoId,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { alerta_atendida: tipo, observaciones },
      ip_address: getClientIP(req),
      descripcion: `Alerta de ${tipo} atendida para: ${item.producto}`,
    });

    logger.info('Alerta atendida:', { alertaId, tipo, productoId, usuario: req.user.id });

    return successMessage(res, 'Alerta marcada como atendida');
  } catch (error) {
    logger.error('Error al atender alerta:', { message: error.message });
    return serverError(res, 'Error al atender la alerta', error);
  }
};

/**
 * DELETE /inventario/alertas/:alertaId
 * Descartar una alerta
 */
const descartarAlerta = async (req, res) => {
  try {
    const { alertaId } = req.params;
    const lastDash = alertaId.lastIndexOf('-');
    const tipo = alertaId.substring(0, lastDash);
    const productoId = alertaId.substring(lastDash + 1);

    if (!productoId || !tipo) {
      return errorResponse(res, 'ID de alerta inválido', 400);
    }

    const item = await Inventario.findByPk(productoId);
    if (!item) {
      return notFound(res, 'Producto no encontrado');
    }

    // Silenciar la alerta persistentemente
    const silenciadasActual = item.alertas_silenciadas;
    const silenciadas =
      (typeof silenciadasActual === 'string' ? JSON.parse(silenciadasActual) : silenciadasActual) ||
      {};
    silenciadas[tipo] = new Date().toISOString();
    await item.update({ alertas_silenciadas: silenciadas });

    logger.info('Alerta descartada - silenciadas guardadas:', {
      alertaId,
      tipo,
      productoId,
      silenciadasAntes: silenciadasActual,
      silenciadasDespues: silenciadas,
    });

    // Registrar en auditoría
    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: productoId,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { alerta_descartada: tipo, alertas_silenciadas: silenciadas },
      ip_address: getClientIP(req),
      descripcion: `Alerta de ${tipo} descartada para: ${item.producto}`,
    });

    return successMessage(res, 'Alerta descartada');
  } catch (error) {
    logger.error('Error al descartar alerta:', { message: error.message });
    return serverError(res, 'Error al descartar la alerta', error);
  }
};

/**
 * POST /inventario/alertas/descartar-todas
 * Descarta (silencia) todas las alertas activas de un cliente o de todo el inventario
 */
const descartarTodasAlertas = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { cliente_id, tipo } = req.body;
    const ahora = new Date().toISOString();

    // Condiciones para encontrar ítems con alertas activas
    const tiposAlerta = tipo ? [tipo] : ['agotado', 'bajo_stock', 'vencimiento'];
    const whereBase = {};
    if (cliente_id) whereBase.cliente_id = cliente_id;

    // Construir condición OR de alertas activas según los tipos solicitados
    const condiciones = [];
    if (tiposAlerta.includes('agotado')) {
      condiciones.push(
        sequelize.literal(
          "cantidad = 0 AND (alertas_silenciadas IS NULL OR JSON_EXTRACT(alertas_silenciadas, '$.agotado') IS NULL)"
        )
      );
    }
    if (tiposAlerta.includes('bajo_stock')) {
      condiciones.push(
        sequelize.literal(
          "cantidad > 0 AND stock_minimo > 0 AND cantidad <= stock_minimo AND (alertas_silenciadas IS NULL OR JSON_EXTRACT(alertas_silenciadas, '$.bajo_stock') IS NULL)"
        )
      );
    }
    if (tiposAlerta.includes('vencimiento')) {
      const enDias = new Date();
      enDias.setDate(enDias.getDate() + 30);
      condiciones.push(
        sequelize.literal(
          `fecha_vencimiento IS NOT NULL AND fecha_vencimiento <= '${enDias.toISOString().split('T')[0]}' AND (alertas_silenciadas IS NULL OR JSON_EXTRACT(alertas_silenciadas, '$.vencimiento') IS NULL)`
        )
      );
    }

    if (condiciones.length === 0) {
      await transaction.rollback();
      return success(res, { descartadas: 0 }, 'No hay alertas que descartar');
    }

    const items = await Inventario.findAll({
      where: { ...whereBase, [Op.or]: condiciones },
      attributes: [
        'id',
        'alertas_silenciadas',
        'producto',
        'cantidad',
        'stock_minimo',
        'fecha_vencimiento',
      ],
      transaction,
    });

    // Agrupar IDs por tipo de alerta para hacer UPDATEs bulk (1 query por tipo)
    const idsPorTipo = { agotado: [], bajo_stock: [], vencimiento: [] };
    for (const item of items) {
      if (tiposAlerta.includes('agotado') && Number(item.cantidad) === 0)
        idsPorTipo.agotado.push(item.id);
      if (
        tiposAlerta.includes('bajo_stock') &&
        Number(item.cantidad) > 0 &&
        Number(item.stock_minimo) > 0 &&
        Number(item.cantidad) <= Number(item.stock_minimo)
      )
        idsPorTipo.bajo_stock.push(item.id);
      if (tiposAlerta.includes('vencimiento') && item.fecha_vencimiento)
        idsPorTipo.vencimiento.push(item.id);
    }

    // Ejecutar bulk UPDATE por tipo (máximo 3 queries en lugar de N individuales)
    const actualizaciones = [];
    for (const [tipoKey, ids] of Object.entries(idsPorTipo)) {
      if (ids.length === 0) continue;
      actualizaciones.push(
        sequelize.query(
          `UPDATE inventario SET alertas_silenciadas = JSON_SET(COALESCE(alertas_silenciadas, '{}'), '$.${tipoKey}', ?), updated_at = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`,
          { replacements: [ahora, ...ids], transaction }
        )
      );
    }
    await Promise.all(actualizaciones);

    const descartadas = items.length;

    await transaction.commit();

    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: 0,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: {
        accion: 'descartar_todas_alertas',
        tipos: tiposAlerta,
        cliente_id,
        descartadas,
      },
      ip_address: getClientIP(req),
      descripcion: `${descartadas} alertas descartadas en masa${cliente_id ? ` para cliente ${cliente_id}` : ''}`,
    });

    return success(
      res,
      { descartadas },
      `${descartadas} alerta${descartadas !== 1 ? 's' : ''} descartada${descartadas !== 1 ? 's' : ''}`
    );
  } catch (error) {
    await transaction.rollback();
    logger.error('Error al descartar todas las alertas:', { message: error.message });
    return serverError(res, 'Error al descartar las alertas', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// CAJAS Y DETALLES DE OPERACIONES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /inventario/:id/cajas
 * Obtener cajas/detalles de operaciones asociadas a un producto
 */
const obtenerCajas = async (req, res) => {
  try {
    const { id } = req.params;

    const inventario = await Inventario.findByPk(id);
    if (!inventario) {
      return notFound(res, 'Producto no encontrado');
    }

    // Buscar cajas del modelo CajaInventario
    // Excluir tipo='salida': syncSalida crea ese registro Y actualiza la entrada original, generando filas duplicadas.
    const cajasDB = await CajaInventario.findAll({
      where: { inventario_id: id, tipo: { [Op.ne]: 'salida' } },
      include: [
        {
          model: Operacion,
          as: 'operacion',
          attributes: [
            'id',
            'numero_operacion',
            'tipo',
            'estado',
            'fecha_operacion',
            'numero_picking',
            'documento_wms',
          ],
        },
      ],
      order: [
        ['fecha_movimiento', 'DESC'],
        ['created_at', 'DESC'],
      ],
    });

    // Si no hay cajas en el nuevo modelo, hacer fallback a OperacionDetalle (datos legacy)
    if (cajasDB.length === 0) {
      const detalles = await OperacionDetalle.findAll({
        where: {
          [Op.or]: [{ inventario_id: id }, { sku: inventario.sku }],
        },
        include: [
          {
            model: Operacion,
            as: 'operacion',
            where: { cliente_id: inventario.cliente_id },
            attributes: [
              'id',
              'numero_operacion',
              'tipo',
              'estado',
              'fecha_operacion',
              'numero_picking',
              'documento_wms',
            ],
          },
        ],
        order: [[{ model: Operacion, as: 'operacion' }, 'fecha_operacion', 'DESC']],
        attributes: [
          'id',
          'producto',
          'cantidad',
          'numero_caja',
          'lote',
          'lote_externo',
          'documento_asociado',
          'peso',
          'created_at',
        ],
      });

      const cajasLegacy = detalles.map((d) => ({
        id: d.id,
        numero_caja: d.numero_caja || '-',
        producto: d.producto,
        cantidad: parseFloat(d.cantidad) || 0,
        lote: d.lote || d.lote_externo || '-',
        ubicacion: '-',
        documento: d.documento_asociado || d.operacion?.documento_wms || '-',
        peso: d.peso ? parseFloat(d.peso) : null,
        tipo: d.operacion?.tipo === 'ingreso' ? 'entrada' : 'salida',
        estado: d.operacion?.tipo === 'ingreso' ? 'disponible' : 'despachada',
        numero_operacion: d.operacion?.numero_operacion,
        numero_picking: d.operacion?.numero_picking,
        estado_operacion: d.operacion?.estado,
        fecha: d.operacion?.fecha_operacion || d.created_at,
      }));

      return success(res, cajasLegacy);
    }

    const cajas = cajasDB.map((c) => ({
      id: c.id,
      numero_caja: c.numero_caja || '-',
      lote: c.lote || c.lote_externo || '-',
      ubicacion: c.ubicacion || '-',
      cantidad: parseFloat(c.cantidad) || 0,
      peso: c.peso ? parseFloat(c.peso) : null,
      unidad_medida: c.unidad_medida,
      tipo: c.tipo,
      estado: c.estado,
      documento: c.documento_asociado || c.operacion?.documento_wms || '-',
      numero_operacion: c.operacion?.numero_operacion,
      numero_picking: c.operacion?.numero_picking,
      estado_operacion: c.operacion?.estado,
      fecha: c.fecha_movimiento || c.operacion?.fecha_operacion || c.created_at,
    }));

    return success(res, cajas);
  } catch (error) {
    logger.error('Error al obtener cajas:', { message: error.message });
    return serverError(res, 'Error al obtener cajas del producto', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// IMPORTACIÓN MASIVA DE PRODUCTOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * POST /inventario/importar
 * Importar productos desde Excel (.xlsx)
 *
 * Columnas esperadas (case-insensitive, con trim):
 * nit_cliente, sku, producto, descripcion, categoria, unidad_medida,
 * cantidad, stock_minimo, stock_maximo, costo_unitario, ubicacion, zona, codigo_wms
 *
 * Obligatorios: nit_cliente, sku, producto
 * Límite: 10.000 filas por importación
 */
const importarProductos = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    if (!req.file) {
      await transaction.rollback();
      return errorResponse(res, 'Debe adjuntar un archivo Excel (.xlsx)', 400);
    }

    // SheetJS (xlsx) — más robusto que ExcelJS para archivos con filtros avanzados de Excel
    const XLSX = require('xlsx');
    const wb = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const rawRows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
      header: 1,
      defval: null,
    });

    if (rawRows.length < 2) {
      await transaction.rollback();
      return errorResponse(res, 'El archivo está vacío o no contiene datos', 400);
    }

    const totalFilas = rawRows.length - 1;
    if (totalFilas > 10000) {
      await transaction.rollback();
      return errorResponse(
        res,
        `El archivo supera el límite de 10.000 filas (tiene ${totalFilas})`,
        400
      );
    }

    // Normalizar encabezados (fila 0)
    const headers = (rawRows[0] || []).map((h) =>
      String(h ?? '')
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/á/g, 'a')
        .replace(/é/g, 'e')
        .replace(/í/g, 'i')
        .replace(/ó/g, 'o')
        .replace(/ú/g, 'u')
        .replace(/ñ/g, 'n')
    );

    const leerCelda = (valor) => {
      if (valor === null || valor === undefined) return null;
      return valor;
    };

    // Pre-cargar todos los NITs únicos para evitar N+1 queries
    const nitsUnicos = new Set();
    const nitIdx = headers.indexOf('nit_cliente');
    for (let i = 1; i < rawRows.length; i++) {
      const nit = String(rawRows[i][nitIdx] ?? '').trim();
      if (nit) nitsUnicos.add(nit);
    }

    const clientes = await Cliente.findAll({
      where: { nit: { [Op.in]: [...nitsUnicos] } },
      attributes: ['id', 'nit'],
    });
    const mapaNit = {};
    clientes.forEach((c) => {
      mapaNit[c.nit] = c.id;
    });

    const resultados = { creados: 0, actualizados: 0, errores: [], total: totalFilas };

    // Procesamiento en lotes de 500
    const BATCH_SIZE = 500;
    const loteUpsert = [];

    const procesarLote = async (lote) => {
      await Inventario.bulkCreate(lote, {
        updateOnDuplicate: [
          'producto',
          'descripcion',
          'categoria',
          'unidad_medida',
          'cantidad',
          'stock_minimo',
          'stock_maximo',
          'costo_unitario',
          'codigo_wms',
          'updated_at',
        ],
        transaction,
      });
    };

    for (let i = 1; i < rawRows.length; i++) {
      const rowNum = i + 1; // número de fila para mensajes de error (encabezado = fila 1)
      const datos = {};
      headers.forEach((header, colIdx) => {
        if (header) datos[header] = leerCelda(rawRows[i][colIdx]);
      });

      const nitCliente = String(datos.nit_cliente ?? '').trim();
      const sku = String(datos.sku ?? '').trim();
      const producto = String(datos.producto ?? '').trim();

      // Validaciones obligatorias
      if (!nitCliente) {
        resultados.errores.push({
          fila: rowNum,
          sku: sku || '(sin sku)',
          mensaje: 'nit_cliente es obligatorio',
        });
        continue;
      }
      if (!sku) {
        resultados.errores.push({ fila: rowNum, sku: '(sin sku)', mensaje: 'sku es obligatorio' });
        continue;
      }
      if (!producto) {
        resultados.errores.push({ fila: rowNum, sku, mensaje: 'producto es obligatorio' });
        continue;
      }

      const clienteId = mapaNit[nitCliente];
      if (!clienteId) {
        resultados.errores.push({
          fila: rowNum,
          sku,
          mensaje: `No se encontró cliente con NIT "${nitCliente}"`,
        });
        continue;
      }

      // Verificar si ya existe para conteo creados/actualizados
      const existe = await Inventario.findOne({
        where: { cliente_id: clienteId, sku },
        attributes: ['id'],
        transaction,
      });
      if (existe) {
        resultados.actualizados++;
      } else {
        resultados.creados++;
      }

      loteUpsert.push({
        cliente_id: clienteId,
        sku,
        producto,
        descripcion: datos.descripcion ? String(datos.descripcion) : null,
        categoria: datos.categoria ? String(datos.categoria) : null,
        unidad_medida: datos.unidad_medida ? String(datos.unidad_medida).toUpperCase() : 'UND',
        cantidad: parseFloat(datos.cantidad) || 0,
        stock_minimo: parseFloat(datos.stock_minimo) || 0,
        stock_maximo: datos.stock_maximo != null ? parseFloat(datos.stock_maximo) : null,
        costo_unitario: datos.costo_unitario != null ? parseFloat(datos.costo_unitario) : null,
        codigo_wms: datos.codigo_wms ? String(datos.codigo_wms) : null,
      });

      if (loteUpsert.length >= BATCH_SIZE) {
        await procesarLote([...loteUpsert]);
        loteUpsert.length = 0;
      }
    }

    // Último lote restante
    if (loteUpsert.length > 0) {
      await procesarLote(loteUpsert);
    }

    await transaction.commit();

    // Auditoría
    await Auditoria.registrar({
      tabla: 'inventario',
      registro_id: 0,
      accion: 'importar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: {
        creados: resultados.creados,
        actualizados: resultados.actualizados,
        errores: resultados.errores.length,
        total: resultados.total,
      },
      ip_address: getClientIP(req),
      descripcion: `Importación masiva de productos: ${resultados.creados} creados, ${resultados.actualizados} actualizados, ${resultados.errores.length} errores`,
    });

    logger.info('Importación de productos completada:', {
      creados: resultados.creados,
      actualizados: resultados.actualizados,
      errores: resultados.errores.length,
      usuario: req.user.id,
    });

    return success(res, resultados, 'Importación completada');
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al importar productos:', { message: err.message });
    return serverError(res, 'Error al importar productos', err);
  }
};

/**
 * GET /inventario/plantilla-importacion
 * Descargar plantilla Excel para importación de productos
 */
const plantillaImportacion = async (req, res) => {
  try {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Productos');

    sheet.addTable({
      name: 'PlantillaProductos',
      ref: 'A1',
      headerRow: true,
      totalsRow: false,
      style: {
        theme: 'TableStyleMedium9',
        showRowStripes: true,
      },
      columns: [
        { name: 'nit_cliente', filterButton: true },
        { name: 'sku', filterButton: true },
        { name: 'producto', filterButton: true },
        { name: 'descripcion', filterButton: true },
        { name: 'categoria', filterButton: true },
        { name: 'unidad_medida', filterButton: true },
        { name: 'cantidad', filterButton: true },
        { name: 'stock_minimo', filterButton: true },
        { name: 'stock_maximo', filterButton: true },
        { name: 'costo_unitario', filterButton: true },
        { name: 'codigo_wms', filterButton: true },
      ],
      rows: [
        [
          '800245795-0',
          'SKU-001',
          'Leche Entera 1L',
          'Leche entera pasteurizada 1 litro',
          'lacteos',
          'UND',
          100,
          20,
          500,
          2500,
          '',
        ],
        [
          '800245795-0',
          'SKU-002',
          'Jugo de Naranja 500ml',
          'Jugo de naranja natural 500ml',
          'bebidas',
          'UND',
          50,
          10,
          200,
          3200,
          '',
        ],
        [
          '900123456-7',
          'SKU-010',
          'Cemento Gris 50kg',
          'Saco de cemento gris 50 kilogramos',
          'construccion',
          'SAC',
          200,
          30,
          1000,
          28000,
          '',
        ],
      ],
    });

    // Ajustar anchos de columna
    const anchos = [18, 14, 35, 40, 18, 14, 12, 14, 14, 16, 16];
    sheet.columns.forEach((col, i) => {
      col.width = anchos[i] || 16;
    });

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla_importacion_productos.xlsx"'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('Error al generar plantilla de productos:', { message: err.message });
    return serverError(res, 'Error al generar la plantilla', err);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  // CRUD
  listar,
  estadisticas,
  alertas,
  obtenerPorId,
  obtenerPorCliente,
  crear,
  actualizar,
  eliminar,

  // Movimientos
  ajustarCantidad,
  obtenerMovimientos,
  obtenerEstadisticasProducto,

  // Cajas
  obtenerCajas,

  // Alertas
  atenderAlerta,
  descartarAlerta,
  descartarTodasAlertas,

  // Importación
  importarProductos,
  plantillaImportacion,
};
