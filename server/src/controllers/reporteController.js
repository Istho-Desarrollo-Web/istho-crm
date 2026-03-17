/**
 * ISTHO CRM - Controlador de Reportes
 * 
 * Maneja la generación y descarga de reportes.
 * 
 * CORRECCIÓN v1.1.0:
 * - getDashboard ahora retorna porTipo y porEstado como objetos
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const { Op } = require('sequelize');
const {
  Operacion,
  OperacionDetalle,
  Inventario,
  Cliente,
  Contacto,
  Auditoria,
  Vehiculo,
  CajaMenor,
  Viaje,
  MovimientoCajaMenor,
  Usuario,
  sequelize
} = require('../models');
const excelService = require('../services/excelService');
const pdfService = require('../services/pdfService');
const notificacionService = require('../services/notificacionService');
const { serverError, notFound } = require('../utils/responses');
const logger = require('../utils/logger');
const { getClientIP } = require('../utils/helpers');

/**
 * Parsear filtros de fecha
 */
const parsearFiltrosFecha = (query) => {
  const where = {};
  
  if (query.fecha_desde) {
    where.fecha_operacion = where.fecha_operacion || {};
    where.fecha_operacion[Op.gte] = query.fecha_desde;
  }
  
  if (query.fecha_hasta) {
    where.fecha_operacion = where.fecha_operacion || {};
    where.fecha_operacion[Op.lte] = query.fecha_hasta;
  }
  
  if (query.cliente_id) {
    where.cliente_id = query.cliente_id;
  }
  
  if (query.tipo && query.tipo !== 'todos') {
    where.tipo = query.tipo;
  }
  
  if (query.estado && query.estado !== 'todos') {
    where.estado = query.estado;
  }
  
  return where;
};

// =============================================
// REPORTES DE OPERACIONES
// =============================================

/**
 * GET /reportes/operaciones/excel
 * Exportar operaciones a Excel
 */
const exportarOperacionesExcel = async (req, res) => {
  try {
    const where = parsearFiltrosFecha(req.query);
    
    const operaciones = await Operacion.findAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social'] }
      ],
      order: [['fecha_operacion', 'DESC']]
    });
    
    const buffer = await excelService.exportarOperaciones(operaciones, req.query);
    
    const filename = `operaciones_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    logger.error('Error al exportar operaciones Excel:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

/**
 * GET /reportes/operaciones/pdf
 * Exportar operaciones a PDF
 */
const exportarOperacionesPDF = async (req, res) => {
  try {
    const where = parsearFiltrosFecha(req.query);
    
    const operaciones = await Operacion.findAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social'] }
      ],
      order: [['fecha_operacion', 'DESC']]
    });
    
    const buffer = await pdfService.generarPDFOperaciones(operaciones, req.query);
    
    const filename = `operaciones_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    logger.error('Error al exportar operaciones PDF:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

/**
 * GET /reportes/operaciones/:id/excel
 * Exportar detalle de operación a Excel
 */
const exportarDetalleOperacionExcel = async (req, res) => {
  try {
    const { id } = req.params;
    
    const operacion = await Operacion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: OperacionDetalle, as: 'detalles' }
      ]
    });
    
    if (!operacion) {
      return notFound(res, 'Operación no encontrada');
    }
    
    const buffer = await excelService.exportarDetalleOperacion(operacion);
    
    const filename = `operacion_${operacion.numero_operacion}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    logger.error('Error al exportar detalle Excel:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

/**
 * GET /reportes/operaciones/:id/pdf
 * Exportar detalle de operación a PDF
 */
const exportarDetalleOperacionPDF = async (req, res) => {
  try {
    const { id } = req.params;
    
    const operacion = await Operacion.findByPk(id, {
      include: [
        { model: Cliente, as: 'cliente' },
        { model: OperacionDetalle, as: 'detalles' }
      ]
    });
    
    if (!operacion) {
      return notFound(res, 'Operación no encontrada');
    }
    
    const buffer = await pdfService.generarPDFDetalleOperacion(operacion);
    
    const filename = `operacion_${operacion.numero_operacion}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    logger.error('Error al exportar detalle PDF:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

// =============================================
// REPORTES DE INVENTARIO
// =============================================

/**
 * GET /reportes/inventario/excel
 * Exportar inventario a Excel
 */
const exportarInventarioExcel = async (req, res) => {
  try {
    const where = {};

    if (req.query.cliente_id) {
      where.cliente_id = req.query.cliente_id;
    }

    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }

    if (req.query.zona) {
      where.zona = req.query.zona;
    }

    // Filtro por rango de fechas (updated_at del inventario)
    if (req.query.fecha_desde) {
      where.updated_at = where.updated_at || {};
      where.updated_at[Op.gte] = req.query.fecha_desde;
    }
    if (req.query.fecha_hasta) {
      where.updated_at = where.updated_at || {};
      where.updated_at[Op.lte] = req.query.fecha_hasta + ' 23:59:59';
    }

    const inventario = await Inventario.findAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social'] }
      ],
      order: [['producto', 'ASC']]
    });
    
    const buffer = await excelService.exportarInventario(inventario, req.query);
    
    const filename = `inventario_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    logger.error('Error al exportar inventario Excel:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

/**
 * GET /reportes/inventario/pdf
 * Exportar inventario a PDF
 */
const exportarInventarioPDF = async (req, res) => {
  try {
    const where = {};

    if (req.query.cliente_id) {
      where.cliente_id = req.query.cliente_id;
    }

    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }

    // Filtro por rango de fechas (updated_at del inventario)
    if (req.query.fecha_desde) {
      where.updated_at = where.updated_at || {};
      where.updated_at[Op.gte] = req.query.fecha_desde;
    }
    if (req.query.fecha_hasta) {
      where.updated_at = where.updated_at || {};
      where.updated_at[Op.lte] = req.query.fecha_hasta + ' 23:59:59';
    }

    const inventario = await Inventario.findAll({
      where,
      include: [
        { model: Cliente, as: 'cliente', attributes: ['id', 'codigo_cliente', 'razon_social'] }
      ],
      order: [['producto', 'ASC']]
    });
    
    const buffer = await pdfService.generarPDFInventario(inventario, req.query);
    
    const filename = `inventario_${new Date().toISOString().split('T')[0]}.pdf`;
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    logger.error('Error al exportar inventario PDF:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

// =============================================
// REPORTES DE CLIENTES
// =============================================

/**
 * GET /reportes/clientes/excel
 * Exportar clientes a Excel
 */
const exportarClientesExcel = async (req, res) => {
  try {
    const where = {};

    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }

    if (req.query.tipo_cliente) {
      where.tipo_cliente = req.query.tipo_cliente;
    }

    // Filtro por rango de fechas (created_at del cliente)
    if (req.query.fecha_desde) {
      where.created_at = where.created_at || {};
      where.created_at[Op.gte] = req.query.fecha_desde;
    }
    if (req.query.fecha_hasta) {
      where.created_at = where.created_at || {};
      where.created_at[Op.lte] = req.query.fecha_hasta + ' 23:59:59';
    }

    const clientes = await Cliente.findAll({
      where,
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM inventario WHERE inventario.cliente_id = Cliente.id)'), 'total_productos']
        ]
      },
      include: [
        { model: Contacto, as: 'contactos', where: { activo: true }, required: false }
      ],
      order: [['razon_social', 'ASC']]
    });

    const buffer = await excelService.exportarClientes(clientes);

    const filename = `clientes_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
    
  } catch (error) {
    logger.error('Error al exportar clientes Excel:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

/**
 * GET /reportes/clientes/pdf
 * Exportar clientes a PDF
 */
const exportarClientesPDF = async (req, res) => {
  try {
    const where = {};

    if (req.query.estado && req.query.estado !== 'todos') {
      where.estado = req.query.estado;
    }
    if (req.query.tipo_cliente) {
      where.tipo_cliente = req.query.tipo_cliente;
    }
    if (req.query.fecha_desde) {
      where.created_at = where.created_at || {};
      where.created_at[Op.gte] = req.query.fecha_desde;
    }
    if (req.query.fecha_hasta) {
      where.created_at = where.created_at || {};
      where.created_at[Op.lte] = req.query.fecha_hasta + ' 23:59:59';
    }

    const clientes = await Cliente.findAll({
      where,
      attributes: {
        include: [
          [sequelize.literal('(SELECT COUNT(*) FROM inventario WHERE inventario.cliente_id = Cliente.id)'), 'total_productos']
        ]
      },
      include: [
        { model: Contacto, as: 'contactos', where: { activo: true }, required: false }
      ],
      order: [['razon_social', 'ASC']]
    });

    const buffer = await pdfService.generarPDFClientes(clientes);

    const filename = `clientes_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    logger.error('Error al exportar clientes PDF:', { message: error.message });
    return serverError(res, 'Error al generar el reporte', error);
  }
};

// =============================================
// DASHBOARD
// =============================================

/**
 * GET /reportes/dashboard
 * Datos consolidados para dashboard
 * 
 * CORREGIDO: porTipo y porEstado ahora son objetos, no arrays
 */
const getDashboard = async (req, res) => {
  try {
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());

    // Filtro base por cliente (inyectado por filtrarPorCliente middleware)
    const clienteFilter = req.query.cliente_id ? { cliente_id: req.query.cliente_id } : {};
    const esCliente = !!req.query.cliente_id;

    // ═══════════════════════════════════════════════════════════════════════
    // OPERACIONES
    // ═══════════════════════════════════════════════════════════════════════

    const [
      totalOperaciones,
      operacionesMes,
      operacionesSemana,
      operacionesPendientes,
      operacionesPorTipoRaw,
      operacionesPorEstadoRaw,
      entradasPendientes,
      salidasPendientes,
      enProceso,
      cerradasMes
    ] = await Promise.all([
      Operacion.count({ where: { ...clienteFilter } }),
      Operacion.count({ where: { ...clienteFilter, created_at: { [Op.gte]: inicioMes } } }),
      Operacion.count({ where: { ...clienteFilter, created_at: { [Op.gte]: inicioSemana } } }),
      Operacion.count({ where: { ...clienteFilter, estado: { [Op.in]: ['pendiente', 'en_proceso'] } } }),
      Operacion.findAll({
        attributes: ['tipo', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
        where: { ...clienteFilter, created_at: { [Op.gte]: inicioMes } },
        group: ['tipo'],
        raw: true
      }),
      Operacion.findAll({
        attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
        where: { ...clienteFilter },
        group: ['estado'],
        raw: true
      }),
      // KPIs de auditoría
      Operacion.count({ where: { ...clienteFilter, tipo: 'ingreso', estado: { [Op.in]: ['pendiente', 'en_proceso'] } } }),
      Operacion.count({ where: { ...clienteFilter, tipo: 'salida', estado: { [Op.in]: ['pendiente', 'en_proceso'] } } }),
      Operacion.count({ where: { ...clienteFilter, estado: 'en_proceso' } }),
      Operacion.count({ where: { ...clienteFilter, estado: 'cerrado', created_at: { [Op.gte]: inicioMes } } }),
    ]);
    
    // Convertir arrays a objetos para el frontend
    const porTipo = {
      ingreso: 0,
      salida: 0,
      transferencia: 0,
      ajuste: 0
    };
    operacionesPorTipoRaw.forEach(item => {
      if (item.tipo) {
        porTipo[item.tipo] = parseInt(item.cantidad) || 0;
      }
    });
    
    const porEstado = {
      pendiente: 0,
      en_proceso: 0,
      cerrado: 0,
      anulado: 0
    };
    operacionesPorEstadoRaw.forEach(item => {
      if (item.estado) {
        porEstado[item.estado] = parseInt(item.cantidad) || 0;
      }
    });
    
    // ═══════════════════════════════════════════════════════════════════════
    // INVENTARIO
    // ═══════════════════════════════════════════════════════════════════════
    
    const invFilter = clienteFilter;
    const [
      totalItems,
      totalUnidades,
      valorInventarioRaw,
      itemsStockBajo,
      itemsPorVencer
    ] = await Promise.all([
      Inventario.count({ where: { ...invFilter } }),
      Inventario.sum('cantidad', { where: { ...invFilter } }),
      Inventario.findAll({
        attributes: [[sequelize.literal('SUM(cantidad * COALESCE(costo_unitario, 0))'), 'valor']],
        where: { ...invFilter },
        raw: true
      }),
      Inventario.count({
        where: { ...invFilter, [Op.and]: [sequelize.literal('cantidad <= stock_minimo AND stock_minimo > 0')] }
      }),
      Inventario.count({
        where: {
          ...invFilter,
          fecha_vencimiento: {
            [Op.between]: [hoy, new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)]
          }
        }
      })
    ]);
    
    // ═══════════════════════════════════════════════════════════════════════
    // CLIENTES
    // ═══════════════════════════════════════════════════════════════════════
    
    // Para clientes, solo mostrar su propio dato
    const clienteWhere = esCliente ? { id: req.query.cliente_id } : {};
    const [
      totalClientes,
      clientesActivos,
      clientesNuevosMes
    ] = await Promise.all([
      Cliente.count({ where: { ...clienteWhere } }),
      Cliente.count({ where: { ...clienteWhere, estado: 'activo' } }),
      esCliente ? 0 : Cliente.count({ where: { created_at: { [Op.gte]: inicioMes } } })
    ]);
    
    // ═══════════════════════════════════════════════════════════════════════
    // ÚLTIMAS OPERACIONES
    // ═══════════════════════════════════════════════════════════════════════
    
    const ultimasOperaciones = await Operacion.findAll({
      where: { ...clienteFilter },
      limit: 5,
      order: [['created_at', 'DESC']],
      include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }],
      attributes: ['id', 'numero_operacion', 'tipo', 'estado', 'total_unidades', 'created_at']
    });

    // Últimas entradas y salidas por separado (para tablas del dashboard)
    const [ultimasEntradas, ultimasSalidas] = await Promise.all([
      Operacion.findAll({
        where: { ...clienteFilter, tipo: 'ingreso' },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [
          { model: Cliente, as: 'cliente', attributes: ['razon_social'] },
          { model: OperacionDetalle, as: 'detalles', attributes: ['id', 'verificado'] }
        ],
        attributes: ['id', 'numero_operacion', 'documento_wms', 'tipo', 'estado', 'total_unidades', 'total_referencias', 'created_at']
      }),
      Operacion.findAll({
        where: { ...clienteFilter, tipo: 'salida' },
        limit: 5,
        order: [['created_at', 'DESC']],
        include: [
          { model: Cliente, as: 'cliente', attributes: ['razon_social'] },
          { model: OperacionDetalle, as: 'detalles', attributes: ['id', 'verificado'] }
        ],
        attributes: ['id', 'numero_operacion', 'documento_wms', 'tipo', 'estado', 'total_unidades', 'total_referencias', 'created_at']
      }),
    ]);

    const formatOp = (op) => {
      const detalles = op.detalles || [];
      const lineas = op.total_referencias || detalles.length || 0;
      const verificadas = detalles.filter(d => d.verificado).length;
      return {
        id: op.id,
        documento: op.documento_wms || op.numero_operacion,
        cliente: op.cliente?.razon_social || 'N/A',
        tipo: op.tipo,
        lineas,
        verificadas,
        estado: op.estado,
      };
    };
    
    // ═══════════════════════════════════════════════════════════════════════
    // RESPUESTA
    // ═══════════════════════════════════════════════════════════════════════
    
    return res.json({
      success: true,
      data: {
        operaciones: {
          total: totalOperaciones || 0,
          mes: operacionesMes || 0,
          semana: operacionesSemana || 0,
          pendientes: operacionesPendientes || 0,
          entradasPendientes: entradasPendientes || 0,
          salidasPendientes: salidasPendientes || 0,
          enProceso: enProceso || 0,
          cerradasMes: cerradasMes || 0,
          porTipo,
          porEstado
        },
        inventario: {
          totalItems: totalItems || 0,
          totalUnidades: parseFloat(totalUnidades) || 0,
          valorTotal: parseFloat(valorInventarioRaw[0]?.valor) || 0,
          alertas: {
            stockBajo: itemsStockBajo || 0,
            porVencer: itemsPorVencer || 0
          }
        },
        clientes: {
          total: totalClientes || 0,
          activos: clientesActivos || 0,
          nuevosMes: clientesNuevosMes || 0
        },
        ultimasOperaciones: ultimasOperaciones || [],
        ultimasEntradas: ultimasEntradas.map(formatOp),
        ultimasSalidas: ultimasSalidas.map(formatOp)
      }
    });
    
  } catch (error) {
    logger.error('Error al obtener dashboard:', { message: error.message, stack: error.stack });
    return serverError(res, 'Error al obtener datos del dashboard', error);
  }
};

// =============================================
// #8 - ENVIAR REPORTE POR EMAIL
// =============================================

const enviarReportePorEmail = async (req, res) => {
  try {
    const { tipo_reporte, formato = 'excel', formatos, destinatarios, cliente_id, filtros = {} } = req.body;

    if (!tipo_reporte || !destinatarios || destinatarios.length === 0) {
      return serverError(res, 'tipo_reporte y destinatarios son requeridos');
    }

    const emailService = require('../services/emailService');
    const pdfServiceMod = require('../services/pdfService');
    const path = require('path');
    const fs = require('fs');
    const hoy = new Date();
    const fechaStr = hoy.toISOString().split('T')[0];
    const tmpDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    // Determinar qué formatos generar
    const formatosAGenerar = formatos && Array.isArray(formatos)
      ? formatos
      : formato === 'ambos' ? ['excel', 'pdf'] : [formato];

    // Consultar datos una sola vez
    const where = {};
    if (cliente_id) where.cliente_id = cliente_id;
    let datos;

    switch (tipo_reporte) {
      case 'operaciones': {
        if (filtros?.estado) where.estado = filtros.estado;
        if (filtros?.tipo) where.tipo = filtros.tipo;
        datos = await Operacion.findAll({
          where,
          include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }],
          order: [['created_at', 'DESC']]
        });
        break;
      }
      case 'inventario': {
        datos = await Inventario.findAll({
          where,
          include: [{ model: Cliente, as: 'cliente', attributes: ['razon_social'] }],
          order: [['producto', 'ASC']]
        });
        break;
      }
      case 'clientes': {
        datos = await Cliente.findAll({
          attributes: {
            include: [[sequelize.literal('(SELECT COUNT(*) FROM inventario WHERE inventario.cliente_id = Cliente.id)'), 'total_productos']]
          },
          include: [{ model: Contacto, as: 'contactos', where: { activo: true }, required: false }],
          order: [['razon_social', 'ASC']]
        });
        break;
      }
      default:
        return serverError(res, 'Tipo de reporte no válido');
    }

    // Generar archivos por formato
    const adjuntos = [];
    const tmpFiles = [];

    const generadores = {
      operaciones: { excel: () => excelService.exportarOperaciones(datos), pdf: () => pdfServiceMod.generarPDFOperaciones(datos) },
      inventario: { excel: () => excelService.exportarInventario(datos), pdf: () => pdfServiceMod.generarPDFInventario(datos) },
      clientes: { excel: () => excelService.exportarClientes(datos), pdf: () => pdfServiceMod.generarPDFClientes(datos) },
    };

    for (const fmt of formatosAGenerar) {
      const gen = generadores[tipo_reporte]?.[fmt];
      if (!gen) continue;

      const buffer = await gen();
      const ext = fmt === 'pdf' ? 'pdf' : 'xlsx';
      const mime = fmt === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const fname = `${tipo_reporte}_${fechaStr}.${ext}`;
      const tmpPath = path.join(tmpDir, `${Date.now()}_${fname}`);

      fs.writeFileSync(tmpPath, buffer);
      adjuntos.push({ nombre: fname, path: tmpPath, tipo: mime });
      tmpFiles.push(tmpPath);
    }

    // Enviar email
    try {
      const emailDest = Array.isArray(destinatarios) ? destinatarios : destinatarios.split(',').map(e => e.trim());
      const tipoLabel = tipo_reporte.charAt(0).toUpperCase() + tipo_reporte.slice(1);
      const formatoLabel = formatosAGenerar.map(f => f.toUpperCase()).join(' + ');

      await emailService.enviarCorreo({
        para: emailDest,
        asunto: `[ISTHO CRM] Reporte de ${tipoLabel}`,
        templateName: 'general',
        datos: {
          titulo: `Reporte de ${tipoLabel}`,
          mensaje: `Se adjunta el reporte de ${tipo_reporte} en formato ${formatoLabel}, generado el ${hoy.toLocaleDateString('es-CO')}.`,
          asunto: `Reporte de ${tipoLabel}`
        },
        adjuntos
      });

      return res.json({ success: true, message: `Reporte enviado en formato ${formatoLabel} a ${emailDest.length} destinatario(s)` });
    } finally {
      tmpFiles.forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });
    }
  } catch (error) {
    logger.error('Error al enviar reporte por email:', { message: error.message });
    return serverError(res, 'Error al enviar el reporte', error);
  }
};

// =============================================
// #10 - REPORTES COMPARATIVOS
// =============================================

const getComparativo = async (req, res) => {
  try {
    const { meses = 6 } = req.query;
    const clienteFilter = req.query.cliente_id ? { cliente_id: req.query.cliente_id } : {};
    const numMeses = Math.min(parseInt(meses) || 6, 12);

    const hoy = new Date();
    const resultado = [];

    for (let i = numMeses - 1; i >= 0; i--) {
      const inicio = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
      const fin = new Date(hoy.getFullYear(), hoy.getMonth() - i + 1, 0, 23, 59, 59);
      const mesLabel = inicio.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });

      const [entradas, salidas, kardex, productosNuevos, valorInventario] = await Promise.all([
        Operacion.count({ where: { ...clienteFilter, tipo: 'ingreso', created_at: { [Op.between]: [inicio, fin] } } }),
        Operacion.count({ where: { ...clienteFilter, tipo: 'salida', created_at: { [Op.between]: [inicio, fin] } } }),
        Operacion.count({ where: { ...clienteFilter, tipo: 'kardex', created_at: { [Op.between]: [inicio, fin] } } }),
        Inventario.count({ where: { ...clienteFilter, created_at: { [Op.between]: [inicio, fin] } } }),
        Inventario.findAll({
          attributes: [[sequelize.literal('SUM(cantidad * COALESCE(costo_unitario, 0))'), 'valor']],
          where: { ...clienteFilter },
          raw: true
        }),
      ]);

      resultado.push({
        mes: mesLabel,
        entradas,
        salidas,
        kardex,
        total_operaciones: entradas + salidas + kardex,
        productos_nuevos: productosNuevos,
      });
    }

    // Mes actual vs anterior
    const mesActual = resultado[resultado.length - 1] || {};
    const mesAnterior = resultado[resultado.length - 2] || {};

    const calcVariacion = (actual, anterior) => {
      if (!anterior || anterior === 0) return actual > 0 ? 100 : 0;
      return Math.round(((actual - anterior) / anterior) * 100);
    };

    return res.json({
      success: true,
      data: {
        meses: resultado,
        comparacion: {
          operaciones: {
            actual: mesActual.total_operaciones || 0,
            anterior: mesAnterior.total_operaciones || 0,
            variacion: calcVariacion(mesActual.total_operaciones, mesAnterior.total_operaciones),
          },
          entradas: {
            actual: mesActual.entradas || 0,
            anterior: mesAnterior.entradas || 0,
            variacion: calcVariacion(mesActual.entradas, mesAnterior.entradas),
          },
          salidas: {
            actual: mesActual.salidas || 0,
            anterior: mesAnterior.salidas || 0,
            variacion: calcVariacion(mesActual.salidas, mesAnterior.salidas),
          },
        }
      }
    });
  } catch (error) {
    logger.error('Error al obtener comparativo:', { message: error.message });
    return serverError(res, 'Error al obtener datos comparativos', error);
  }
};

// =============================================
// #9 - REPORTES PROGRAMADOS (CRUD)
// =============================================

const { ReporteProgramado } = require('../models');
const scheduler = require('../services/reporteScheduler');

const listarProgramados = async (req, res) => {
  try {
    const reportes = await ReporteProgramado.findAll({
      include: [
        { model: require('../models').Usuario, as: 'creador', attributes: ['id', 'nombre_completo', 'username'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'] }
      ],
      order: [['created_at', 'DESC']]
    });
    return res.json({ success: true, data: reportes });
  } catch (error) {
    logger.error('Error al listar programados:', { message: error.message });
    return serverError(res, 'Error al listar reportes programados', error);
  }
};

const crearProgramado = async (req, res) => {
  try {
    const { nombre, tipo_reporte, formato, cron_expresion, frecuencia_label, destinatarios, cliente_id, filtros } = req.body;

    if (!nombre || !tipo_reporte || !cron_expresion || !destinatarios) {
      return serverError(res, 'nombre, tipo_reporte, cron_expresion y destinatarios son requeridos');
    }

    const cron = require('node-cron');
    if (!cron.validate(cron_expresion)) {
      return serverError(res, 'Expresión cron inválida');
    }

    const reporte = await ReporteProgramado.create({
      nombre,
      tipo_reporte,
      formato: formato || 'excel',
      cron_expresion,
      frecuencia_label,
      destinatarios: Array.isArray(destinatarios) ? destinatarios.join(',') : destinatarios,
      cliente_id,
      filtros,
      creado_por: req.user.id,
      activo: true
    });

    // Programar inmediatamente
    scheduler.programar(reporte);

    // Auditoría
    Auditoria.registrar({
      tabla: 'reportes_programados', registro_id: reporte.id, accion: 'crear',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: { nombre, tipo_reporte, formato, cron_expresion, destinatarios },
      ip_address: getClientIP(req),
      descripcion: `Reporte programado "${nombre}" creado`
    });

    // Notificar admins
    notificacionService.notificarAdmins({
      tipo: 'sistema',
      titulo: `Nuevo reporte programado: ${nombre}`,
      mensaje: `Se creó el reporte "${nombre}" (${tipo_reporte}) programado: ${frecuencia_label || cron_expresion}.`,
      prioridad: 'baja',
      accion_url: '/reportes/programados',
      accion_label: 'Ver programados',
    });

    return res.json({ success: true, message: 'Reporte programado creado', data: reporte });
  } catch (error) {
    logger.error('Error al crear programado:', { message: error.message });
    return serverError(res, 'Error al crear reporte programado', error);
  }
};

const actualizarProgramado = async (req, res) => {
  try {
    const reporte = await ReporteProgramado.findByPk(req.params.id);
    if (!reporte) return notFound(res, 'Reporte programado no encontrado');

    const { nombre, tipo_reporte, formato, cron_expresion, frecuencia_label, destinatarios, cliente_id, filtros, activo } = req.body;

    if (cron_expresion) {
      const cron = require('node-cron');
      if (!cron.validate(cron_expresion)) {
        return serverError(res, 'Expresión cron inválida');
      }
    }

    await reporte.update({
      ...(nombre !== undefined && { nombre }),
      ...(tipo_reporte !== undefined && { tipo_reporte }),
      ...(formato !== undefined && { formato }),
      ...(cron_expresion !== undefined && { cron_expresion }),
      ...(frecuencia_label !== undefined && { frecuencia_label }),
      ...(destinatarios !== undefined && { destinatarios: Array.isArray(destinatarios) ? destinatarios.join(',') : destinatarios }),
      ...(cliente_id !== undefined && { cliente_id }),
      ...(filtros !== undefined && { filtros }),
      ...(activo !== undefined && { activo }),
    });

    // Re-programar o cancelar
    if (reporte.activo) {
      scheduler.programar(reporte);
    } else {
      scheduler.cancelar(reporte.id);
    }

    // Auditoría
    Auditoria.registrar({
      tabla: 'reportes_programados', registro_id: reporte.id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: req.body, ip_address: getClientIP(req),
      descripcion: `Reporte programado "${reporte.nombre}" actualizado${activo !== undefined ? (activo ? ' (activado)' : ' (pausado)') : ''}`
    });

    return res.json({ success: true, message: 'Reporte programado actualizado', data: reporte });
  } catch (error) {
    logger.error('Error al actualizar programado:', { message: error.message });
    return serverError(res, 'Error al actualizar reporte programado', error);
  }
};

const eliminarProgramado = async (req, res) => {
  try {
    const reporte = await ReporteProgramado.findByPk(req.params.id);
    if (!reporte) return notFound(res, 'Reporte programado no encontrado');

    const nombreReporte = reporte.nombre;
    scheduler.cancelar(reporte.id);
    await reporte.destroy();

    // Auditoría
    Auditoria.registrar({
      tabla: 'reportes_programados', registro_id: req.params.id, accion: 'eliminar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_anteriores: { nombre: nombreReporte }, ip_address: getClientIP(req),
      descripcion: `Reporte programado "${nombreReporte}" eliminado`
    });

    return res.json({ success: true, message: 'Reporte programado eliminado' });
  } catch (error) {
    logger.error('Error al eliminar programado:', { message: error.message });
    return serverError(res, 'Error al eliminar reporte programado', error);
  }
};

const ejecutarProgramadoManual = async (req, res) => {
  try {
    const reporte = await ReporteProgramado.findByPk(req.params.id);
    if (!reporte) return notFound(res, 'Reporte programado no encontrado');

    await scheduler.ejecutarReporte(reporte);
    return res.json({ success: true, message: `Reporte "${reporte.nombre}" ejecutado y enviado exitosamente` });
  } catch (error) {
    logger.error('Error al ejecutar programado manual:', { message: error.message });
    return serverError(res, 'Error al ejecutar el reporte', error);
  }
};

// =============================================
// EXPORTAR VIAJES A EXCEL
// =============================================

const exportarViajesExcel = async (req, res) => {
  try {
    const where = {};
    if (req.query.conductor_id) where.conductor_id = req.query.conductor_id;
    if (req.query.vehiculo_id) where.vehiculo_id = req.query.vehiculo_id;
    if (req.query.caja_menor_id) where.caja_menor_id = req.query.caja_menor_id;
    if (req.query.estado && req.query.estado !== 'todos') where.estado = req.query.estado;
    if (req.query.fecha_desde || req.query.fecha_hasta) {
      where.fecha = {};
      if (req.query.fecha_desde) where.fecha[Op.gte] = req.query.fecha_desde;
      if (req.query.fecha_hasta) where.fecha[Op.lte] = req.query.fecha_hasta;
    }
    if (req.user.esConductor) where.conductor_id = req.user.id;

    const viajes = await Viaje.findAll({
      where,
      include: [
        { model: Vehiculo, as: 'vehiculo', attributes: ['id', 'placa', 'tipo_vehiculo'] },
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] },
        { model: CajaMenor, as: 'cajaMenor', attributes: ['id', 'numero'] }
      ],
      order: [['fecha', 'DESC']]
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Viajes');

    sheet.columns = [
      { header: 'Número', key: 'numero', width: 12 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Origen', key: 'origen', width: 18 },
      { header: 'Destino', key: 'destino', width: 18 },
      { header: 'Cliente', key: 'cliente_nombre', width: 25 },
      { header: 'Doc. Cliente', key: 'documento_cliente', width: 15 },
      { header: 'Vehículo', key: 'vehiculo', width: 12 },
      { header: 'Conductor', key: 'conductor', width: 25 },
      { header: 'Peso (kg)', key: 'peso', width: 12 },
      { header: 'Valor Viaje', key: 'valor_viaje', width: 15 },
      { header: 'Facturado', key: 'facturado', width: 10 },
      { header: 'No. Factura', key: 'no_factura', width: 15 },
      { header: 'Caja Menor', key: 'caja_menor', width: 12 },
      { header: 'Estado', key: 'estado', width: 12 },
    ];

    // Header style
    sheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B3A5C' } };
    });

    viajes.forEach(v => {
      sheet.addRow({
        numero: v.numero,
        fecha: v.fecha,
        origen: v.origen,
        destino: v.destino,
        cliente_nombre: v.cliente_nombre || '',
        documento_cliente: v.documento_cliente || '',
        vehiculo: v.vehiculo?.placa || '',
        conductor: v.conductor?.nombre_completo || '',
        peso: parseFloat(v.peso) || 0,
        valor_viaje: parseFloat(v.valor_viaje) || 0,
        facturado: v.facturado ? 'Sí' : 'No',
        no_factura: v.no_factura || '',
        caja_menor: v.cajaMenor?.numero || '',
        estado: v.estado,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `viajes_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

    logger.info('Excel viajes generado:', { registros: viajes.length });
  } catch (error) {
    logger.error('Error al exportar viajes Excel:', { message: error.message });
    return serverError(res, 'Error al generar reporte de viajes', error);
  }
};

// =============================================
// EXPORTAR CAJA MENOR A EXCEL
// =============================================

const exportarCajaMenorExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const caja = await CajaMenor.findByPk(id, {
      include: [
        { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] },
        { model: Usuario, as: 'creador', attributes: ['id', 'nombre_completo'] },
        {
          model: MovimientoCajaMenor, as: 'movimientos',
          include: [
            { model: Usuario, as: 'conductor', attributes: ['id', 'nombre_completo'] },
            { model: Viaje, as: 'viaje', attributes: ['id', 'numero', 'destino'] }
          ],
          order: [['consecutivo', 'ASC']]
        },
        {
          model: Viaje, as: 'viajes',
          include: [{ model: Vehiculo, as: 'vehiculo', attributes: ['id', 'placa'] }]
        }
      ]
    });

    if (!caja) return res.status(404).json({ success: false, message: 'Caja menor no encontrada' });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    // Hoja 1: Resumen
    const resumen = workbook.addWorksheet('Resumen');
    resumen.columns = [{ header: 'Campo', key: 'campo', width: 25 }, { header: 'Valor', key: 'valor', width: 30 }];
    resumen.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B3A5C' } }; });
    [
      ['Número', caja.numero],
      ['Conductor', caja.conductor?.nombre_completo || ''],
      ['Estado', caja.estado],
      ['Fecha Apertura', caja.fecha_apertura],
      ['Fecha Cierre', caja.fecha_cierre || 'N/A'],
      ['Saldo Inicial', `$${Number(caja.saldo_inicial).toLocaleString('es-CO')}`],
      ['Saldo Trasladado', `$${Number(caja.saldo_trasladado || 0).toLocaleString('es-CO')}`],
      ['Total Ingresos', `$${Number(caja.total_ingresos).toLocaleString('es-CO')}`],
      ['Total Egresos', `$${Number(caja.total_egresos).toLocaleString('es-CO')}`],
      ['Saldo Actual', `$${Number(caja.saldo_actual).toLocaleString('es-CO')}`],
      ['Creado por', caja.creador?.nombre_completo || ''],
      ['Total Viajes', caja.viajes?.length || 0],
      ['Total Movimientos', caja.movimientos?.length || 0],
    ].forEach(([campo, valor]) => resumen.addRow({ campo, valor }));

    // Hoja 2: Movimientos
    const movSheet = workbook.addWorksheet('Movimientos');
    movSheet.columns = [
      { header: '#', key: 'consecutivo', width: 8 },
      { header: 'Tipo', key: 'tipo', width: 10 },
      { header: 'Concepto', key: 'concepto', width: 20 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Aprobado', key: 'aprobado', width: 10 },
      { header: 'Valor Aprobado', key: 'valor_aprobado', width: 15 },
      { header: 'Viaje', key: 'viaje', width: 15 },
      { header: 'Descripción', key: 'descripcion', width: 30 },
      { header: 'Fecha', key: 'fecha', width: 18 },
    ];
    movSheet.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B3A5C' } }; });

    (caja.movimientos || []).forEach(m => {
      movSheet.addRow({
        consecutivo: m.consecutivo,
        tipo: m.tipo_movimiento === 'ingreso' ? 'Ingreso' : 'Egreso',
        concepto: m.concepto,
        valor: parseFloat(m.valor) || 0,
        aprobado: m.aprobado ? 'Sí' : m.rechazado ? 'Rechazado' : 'Pendiente',
        valor_aprobado: parseFloat(m.valor_aprobado) || 0,
        viaje: m.viaje ? `#${m.viaje.numero} - ${m.viaje.destino}` : 'Directo',
        descripcion: m.descripcion || '',
        fecha: m.created_at,
      });
    });

    // Hoja 3: Viajes
    const viajesSheet = workbook.addWorksheet('Viajes');
    viajesSheet.columns = [
      { header: '#', key: 'numero', width: 10 },
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Destino', key: 'destino', width: 20 },
      { header: 'Vehículo', key: 'vehiculo', width: 12 },
      { header: 'Cliente', key: 'cliente', width: 25 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Estado', key: 'estado', width: 12 },
    ];
    viajesSheet.getRow(1).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1B3A5C' } }; });

    (caja.viajes || []).forEach(v => {
      viajesSheet.addRow({
        numero: v.numero,
        fecha: v.fecha,
        destino: v.destino,
        vehiculo: v.vehiculo?.placa || '',
        cliente: v.cliente_nombre || '',
        valor: parseFloat(v.valor_viaje) || 0,
        estado: v.estado,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `caja_menor_${caja.numero}_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

    logger.info('Excel caja menor generado:', { numero: caja.numero, movimientos: caja.movimientos?.length });
  } catch (error) {
    logger.error('Error al exportar caja menor Excel:', { message: error.message });
    return serverError(res, 'Error al generar reporte de caja menor', error);
  }
};

module.exports = {
  exportarOperacionesExcel,
  exportarOperacionesPDF,
  exportarDetalleOperacionExcel,
  exportarDetalleOperacionPDF,
  exportarInventarioExcel,
  exportarInventarioPDF,
  exportarClientesExcel,
  exportarClientesPDF,
  getDashboard,
  enviarReportePorEmail,
  getComparativo,
  exportarViajesExcel,
  exportarCajaMenorExcel,
  // Reportes programados
  listarProgramados,
  crearProgramado,
  actualizarProgramado,
  eliminarProgramado,
  ejecutarProgramadoManual,
};