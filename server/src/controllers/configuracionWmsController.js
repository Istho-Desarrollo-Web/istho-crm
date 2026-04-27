/**
 * ISTHO CRM - Controlador de Configuración WMS
 *
 * CRUD para gestionar la configuración de integración WMS:
 * - Motivos de Kardex permitidos
 * - Mapeo de tipos de orden (fallback)
 * - Estados válidos para procesar órdenes
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { ConfiguracionWms, Auditoria } = require('../models');
const { success, successMessage, created, error, notFound } = require('../utils/responses');
const { getClientIP } = require('../utils/helpers');
const logger = require('../utils/logger');

// ============================================================================
// LISTAR CONFIGURACIONES
// ============================================================================

/**
 * GET /api/v1/admin/configuracion-wms
 * Obtener todas las configuraciones agrupadas por categoría
 */
const listar = async (req, res) => {
  try {
    const { categoria } = req.query;

    const where = {};
    if (categoria) where.categoria = categoria;

    const configuraciones = await ConfiguracionWms.findAll({
      where,
      order: [
        ['categoria', 'ASC'],
        ['orden', 'ASC'],
        ['valor_wms', 'ASC'],
      ],
    });

    // Agrupar por categoría
    const agrupadas = {
      motivo_kardex: configuraciones.filter((c) => c.categoria === 'motivo_kardex'),
      tipo_orden: configuraciones.filter((c) => c.categoria === 'tipo_orden'),
      estado_valido: configuraciones.filter((c) => c.categoria === 'estado_valido'),
    };

    return success(res, categoria ? configuraciones : agrupadas);
  } catch (err) {
    logger.error('Error al listar configuraciones WMS:', { message: err.message });
    return error(res, 'Error al obtener configuraciones WMS', 500);
  }
};

// ============================================================================
// OBTENER UNA CONFIGURACIÓN
// ============================================================================

/**
 * GET /api/v1/admin/configuracion-wms/:id
 */
const obtener = async (req, res) => {
  try {
    const config = await ConfiguracionWms.findByPk(req.params.id);
    if (!config) return notFound(res, 'Configuración no encontrada');

    return success(res, config);
  } catch (err) {
    logger.error('Error al obtener configuración WMS:', { message: err.message });
    return error(res, 'Error al obtener configuración', 500);
  }
};

// ============================================================================
// CREAR CONFIGURACIÓN
// ============================================================================

/**
 * POST /api/v1/admin/configuracion-wms
 */
const crear = async (req, res) => {
  try {
    const {
      categoria,
      valor_wms,
      valor_crm,
      tipo_documento,
      requiere_detalle,
      descripcion,
      orden,
    } = req.body;

    if (!categoria || !valor_wms || !valor_crm) {
      return error(res, 'categoria, valor_wms y valor_crm son requeridos', 400);
    }

    // Verificar duplicado
    const existente = await ConfiguracionWms.findOne({
      where: { categoria, valor_wms: valor_wms.trim() },
    });

    if (existente) {
      return error(
        res,
        `Ya existe una configuración "${valor_wms}" en la categoría "${categoria}"`,
        400
      );
    }

    const config = await ConfiguracionWms.create({
      categoria,
      valor_wms: valor_wms.trim(),
      valor_crm: valor_crm.trim(),
      tipo_documento: tipo_documento || null,
      requiere_detalle: requiere_detalle || false,
      descripcion: descripcion || null,
      orden: orden || 0,
    });

    logger.info('Configuración WMS creada:', { id: config.id, categoria, valor_wms });

    await Auditoria.registrar({
      tabla: 'configuracion_wms',
      registro_id: config.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: {
        categoria,
        valor_wms,
        valor_crm,
        tipo_documento,
        requiere_detalle,
        descripcion,
        orden,
      },
      ip_address: getClientIP(req),
      descripcion: `Configuración WMS creada: [${categoria}] ${valor_wms} → ${valor_crm}`,
    });

    return created(res, 'Configuración creada exitosamente', config);
  } catch (err) {
    logger.error('Error al crear configuración WMS:', { message: err.message });
    return error(res, 'Error al crear configuración', 500);
  }
};

// ============================================================================
// ACTUALIZAR CONFIGURACIÓN
// ============================================================================

/**
 * PUT /api/v1/admin/configuracion-wms/:id
 */
const actualizar = async (req, res) => {
  try {
    const config = await ConfiguracionWms.findByPk(req.params.id);
    if (!config) return notFound(res, 'Configuración no encontrada');

    const { valor_wms, valor_crm, tipo_documento, requiere_detalle, descripcion, orden, activo } =
      req.body;

    // Si cambia valor_wms, verificar duplicado
    if (valor_wms && valor_wms.trim() !== config.valor_wms) {
      const duplicado = await ConfiguracionWms.findOne({
        where: { categoria: config.categoria, valor_wms: valor_wms.trim() },
      });
      if (duplicado) {
        return error(res, `Ya existe una configuración "${valor_wms}" en esta categoría`, 400);
      }
    }

    await config.update({
      valor_wms: valor_wms ? valor_wms.trim() : config.valor_wms,
      valor_crm: valor_crm ? valor_crm.trim() : config.valor_crm,
      tipo_documento: tipo_documento !== undefined ? tipo_documento : config.tipo_documento,
      requiere_detalle: requiere_detalle !== undefined ? requiere_detalle : config.requiere_detalle,
      descripcion: descripcion !== undefined ? descripcion : config.descripcion,
      orden: orden !== undefined ? orden : config.orden,
      activo: activo !== undefined ? activo : config.activo,
    });

    logger.info('Configuración WMS actualizada:', { id: config.id, valor_wms: config.valor_wms });

    await Auditoria.registrar({
      tabla: 'configuracion_wms',
      registro_id: config.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: req.body,
      ip_address: getClientIP(req),
      descripcion: `Configuración WMS actualizada: [${config.categoria}] ${config.valor_wms}`,
    });

    return successMessage(res, 'Configuración actualizada exitosamente', config);
  } catch (err) {
    logger.error('Error al actualizar configuración WMS:', { message: err.message });
    return error(res, 'Error al actualizar configuración', 500);
  }
};

// ============================================================================
// ELIMINAR CONFIGURACIÓN
// ============================================================================

/**
 * DELETE /api/v1/admin/configuracion-wms/:id
 */
const eliminar = async (req, res) => {
  try {
    const config = await ConfiguracionWms.findByPk(req.params.id);
    if (!config) return notFound(res, 'Configuración no encontrada');

    await config.destroy();

    logger.info('Configuración WMS eliminada:', { id: config.id, valor_wms: config.valor_wms });

    await Auditoria.registrar({
      tabla: 'configuracion_wms',
      registro_id: config.id,
      accion: 'eliminar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_anteriores: {
        categoria: config.categoria,
        valor_wms: config.valor_wms,
        valor_crm: config.valor_crm,
      },
      ip_address: getClientIP(req),
      descripcion: `Configuración WMS eliminada: [${config.categoria}] ${config.valor_wms}`,
    });

    return successMessage(res, 'Configuración eliminada exitosamente');
  } catch (err) {
    logger.error('Error al eliminar configuración WMS:', { message: err.message });
    return error(res, 'Error al eliminar configuración', 500);
  }
};

// ============================================================================
// TOGGLE ACTIVO
// ============================================================================

/**
 * PATCH /api/v1/admin/configuracion-wms/:id/toggle
 */
const toggleActivo = async (req, res) => {
  try {
    const config = await ConfiguracionWms.findByPk(req.params.id);
    if (!config) return notFound(res, 'Configuración no encontrada');

    await config.update({ activo: !config.activo });

    logger.info('Configuración WMS toggled:', { id: config.id, activo: config.activo });

    await Auditoria.registrar({
      tabla: 'configuracion_wms',
      registro_id: config.id,
      accion: 'actualizar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: { activo: config.activo },
      ip_address: getClientIP(req),
      descripcion: `Configuración WMS ${config.activo ? 'activada' : 'desactivada'}: [${config.categoria}] ${config.valor_wms}`,
    });

    return successMessage(
      res,
      `Configuración ${config.activo ? 'activada' : 'desactivada'}`,
      config
    );
  } catch (err) {
    logger.error('Error al cambiar estado de configuración WMS:', { message: err.message });
    return error(res, 'Error al cambiar estado', 500);
  }
};

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  eliminar,
  toggleActivo,
};
