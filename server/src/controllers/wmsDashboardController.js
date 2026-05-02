/**
 * ISTHO CRM - Dashboard WMS CenthriX
 *
 * Endpoints para el panel de monitoreo de sincronizaciones WMS.
 * Autenticación JWT (solo admins).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const { WmsSyncLog, sequelize } = require('../models');
const wmsSyncService = require('../services/wmsSyncService');
const wmsApiService = require('../services/wmsApiService');
const { success, paginated, serverError } = require('../utils/responses');
const { parsePaginacion, buildPaginacion } = require('../utils/helpers');
const logger = require('../utils/logger');

// Importación diferida para evitar circular en startup
const getPollingJob = () => require('../jobs/wmsPollingJob');

// ============================================================================
// STATUS / ESTADO DE CONEXIÓN
// ============================================================================

const getStatus = async (req, res) => {
  try {
    const ultimoSync = await WmsSyncLog.findOne({ order: [['created_at', 'DESC']] });
    const ultimoExitoso = await WmsSyncLog.findOne({
      where: { estado: 'exitoso' },
      order: [['created_at', 'DESC']],
    });
    const totalFallidos24h = await WmsSyncLog.count({
      where: {
        estado: 'fallido',
        created_at: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });

    let polling = { activo: false, ejecutando: false };
    if (process.env.WMS_URL && process.env.WMS_EMAIL) {
      try {
        polling = getPollingJob().getEstadoPolling();
      } catch { /* polling no iniciado */ }
    }

    return success(res, {
      api_activa: true,
      version: '1.0.0',
      ultimo_sync: ultimoSync?.created_at || null,
      ultimo_sync_exitoso: ultimoExitoso?.created_at || null,
      ultimo_tipo: ultimoSync?.tipo || null,
      fallidos_24h: totalFallidos24h,
      polling,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[WMS Dashboard] Error en getStatus:', { message: error.message });
    return serverError(res, 'Error al obtener estado WMS', error);
  }
};

// ============================================================================
// ESTADÍSTICAS
// ============================================================================

const getEstadisticas = async (req, res) => {
  try {
    const ahora = new Date();
    const inicioHoy = new Date(ahora);
    inicioHoy.setHours(0, 0, 0, 0);
    const iniciaSemana = new Date(ahora);
    iniciaSemana.setDate(ahora.getDate() - 7);
    const iniciaMes = new Date(ahora);
    iniciaMes.setDate(ahora.getDate() - 30);

    const [hoy, semana, mes, total, porTipo, porEstado, recientes] = await Promise.all([
      WmsSyncLog.count({ where: { created_at: { [Op.gte]: inicioHoy } } }),
      WmsSyncLog.count({ where: { created_at: { [Op.gte]: iniciaSemana } } }),
      WmsSyncLog.count({ where: { created_at: { [Op.gte]: iniciaMes } } }),
      WmsSyncLog.count(),
      WmsSyncLog.findAll({
        attributes: ['tipo', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
        group: ['tipo'],
        raw: true,
      }),
      WmsSyncLog.findAll({
        attributes: ['estado', [sequelize.fn('COUNT', sequelize.col('id')), 'cantidad']],
        group: ['estado'],
        raw: true,
      }),
      WmsSyncLog.findAll({
        order: [['created_at', 'DESC']],
        limit: 5,
        attributes: [
          'id',
          'tipo',
          'documento_origen',
          'nit',
          'estado',
          'error_mensaje',
          'created_at',
        ],
      }),
    ]);

    const tipoMap = { entrada: 0, salida: 0, kardex: 0, productos: 0 };
    porTipo.forEach((r) => {
      // polling_entrada → entrada, polling_salida → salida, etc.
      const clave = r.tipo.replace('polling_', '');
      if (clave in tipoMap) tipoMap[clave] += parseInt(r.cantidad);
    });

    const estadoMap = { exitoso: 0, fallido: 0 };
    porEstado.forEach((r) => {
      estadoMap[r.estado] = parseInt(r.cantidad);
    });

    return success(res, {
      resumen: { hoy, semana, mes, total },
      por_tipo: tipoMap,
      por_estado: estadoMap,
      tasa_exito: total > 0 ? Math.round((estadoMap.exitoso / total) * 100) : 100,
      recientes,
    });
  } catch (error) {
    logger.error('[WMS Dashboard] Error en getEstadisticas:', { message: error.message });
    return serverError(res, 'Error al obtener estadísticas WMS', error);
  }
};

// ============================================================================
// HISTORIAL DE SINCRONIZACIONES
// ============================================================================

const getHistorial = async (req, res) => {
  try {
    const { page, limit, offset } = parsePaginacion(req.query);
    const { tipo, estado, fecha_desde, fecha_hasta } = req.query;

    const where = {};
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (fecha_desde || fecha_hasta) {
      where.created_at = {};
      if (fecha_desde) where.created_at[Op.gte] = new Date(fecha_desde + 'T00:00:00');
      if (fecha_hasta) where.created_at[Op.lte] = new Date(fecha_hasta + 'T23:59:59');
    }

    const { count, rows } = await WmsSyncLog.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit,
      offset,
      attributes: [
        'id',
        'tipo',
        'documento_origen',
        'nit',
        'estado',
        'error_mensaje',
        'detalles',
        'ip_origen',
        'created_at',
      ],
    });

    return paginated(res, rows, buildPaginacion(count, page, limit));
  } catch (error) {
    logger.error('[WMS Dashboard] Error en getHistorial:', { message: error.message });
    return serverError(res, 'Error al obtener historial WMS', error);
  }
};

// ============================================================================
// RE-EJECUTAR ÚLTIMO SYNC
// ============================================================================

const reejecutarUltimoSync = async (req, res) => {
  try {
    const { tipo } = req.body;

    const where = { estado: 'exitoso', payload: { [Op.not]: null } };
    if (tipo) where.tipo = tipo;

    const ultimo = await WmsSyncLog.findOne({
      where,
      order: [['created_at', 'DESC']],
    });

    if (!ultimo) {
      return res.status(404).json({
        success: false,
        message: tipo
          ? `No se encontró un sync exitoso de tipo "${tipo}" con payload para re-ejecutar`
          : 'No se encontró ningún sync con payload para re-ejecutar (los syncs de polling no son re-ejecutables)',
      });
    }

    logger.info(`[WMS Dashboard] Re-ejecutando sync tipo "${ultimo.tipo}" (log ID: ${ultimo.id})`);
    logger.info(`[WMS Dashboard] Payload del log: ${JSON.stringify(ultimo.payload)}`);

    // MySQL puede devolver JSON columns como string en algunas configuraciones
    let payload = ultimo.payload;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        /* usar tal cual */
      }
    }

    let resultado;
    switch (ultimo.tipo) {
      case 'entrada':
        resultado = await wmsSyncService.syncEntrada(payload);
        break;
      case 'salida':
        resultado = await wmsSyncService.syncSalida(payload);
        break;
      case 'kardex':
        resultado = await wmsSyncService.syncKardex(payload);
        break;
      case 'productos':
        resultado = await wmsSyncService.syncProductos(payload);
        break;
      default:
        return res
          .status(400)
          .json({ success: false, message: `Tipo de sync desconocido: ${ultimo.tipo}` });
    }

    await WmsSyncLog.create({
      tipo: ultimo.tipo,
      documento_origen: ultimo.documento_origen,
      nit: ultimo.nit,
      estado: 'exitoso',
      detalles: { ...resultado, re_ejecucion: true, log_origen_id: ultimo.id },
      payload: ultimo.payload,
      ip_origen: 'dashboard-manual',
    });

    return success(
      res,
      {
        tipo: ultimo.tipo,
        documento_origen: ultimo.documento_origen,
        resultado,
        log_origen_id: ultimo.id,
      },
      'Re-ejecución completada exitosamente'
    );
  } catch (error) {
    logger.error('[WMS Dashboard] Error en reejecutarUltimoSync:', { message: error.message });

    WmsSyncLog.create({
      tipo: req.body?.tipo || 'entrada',
      estado: 'fallido',
      error_mensaje: error.message,
      ip_origen: 'dashboard-manual',
    }).catch(() => {});

    // Los errores del servicio son de negocio (400), no errores de servidor (500)
    return res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================================================
// EJECUTAR POLLING MANUAL
// ============================================================================

const ejecutarPolling = async (req, res) => {
  try {
    if (!process.env.WMS_URL || !process.env.WMS_EMAIL) {
      return res.status(503).json({
        success: false,
        message: 'El polling WMS no está configurado en este entorno (faltan WMS_URL / WMS_EMAIL)',
      });
    }

    const pollingJob = getPollingJob();
    const estado = pollingJob.getEstadoPolling();

    if (estado.ejecutando) {
      return res.status(409).json({
        success: false,
        message: 'El polling ya está en ejecución. Espera a que termine antes de lanzarlo nuevamente.',
      });
    }

    logger.info('[WMS Dashboard] Polling manual solicitado desde dashboard');

    // Ejecutar en segundo plano: responde de inmediato y el ciclo corre asíncronamente
    pollingJob.ejecutarPollingManual().catch((err) =>
      logger.error('[WMS Dashboard] Error en polling manual:', err.message)
    );

    return success(
      res,
      { iniciado: true },
      'Ciclo de polling iniciado. Los resultados aparecerán en el historial en unos segundos.'
    );
  } catch (error) {
    logger.error('[WMS Dashboard] Error en ejecutarPolling:', { message: error.message });
    return serverError(res, 'Error al iniciar polling', error);
  }
};

// ============================================================================
// UBICACIÓN DE PALLETS Y PRODUCTOS EN BODEGA (WMS API)
// ============================================================================

const getPalletUbicacion = async (req, res) => {
  const { wmspalletId } = req.params;
  try {
    const datos = await wmsApiService.getPalletUbicacion(wmspalletId);
    return success(res, datos, 'Ubicación del pallet obtenida');
  } catch (error) {
    const wmsStatus = error.response?.status;
    logger.error('[WMS Dashboard] Error getPalletUbicacion:', {
      message: error.message,
      wmsStatus,
      wmsData: error.response?.data,
    });
    if (wmsStatus === 400 || wmsStatus === 404) {
      return res.status(404).json({ success: false, message: 'Pallet no encontrado en WMS' });
    }
    return res.status(503).json({ success: false, message: 'WMS no disponible temporalmente' });
  }
};

const getProductoUbicaciones = async (req, res) => {
  const { inventarioId } = req.query;

  if (!inventarioId) {
    return res.status(400).json({ success: false, message: 'inventarioId es requerido' });
  }

  try {
    const { Inventario } = require('../models');
    const producto = await Inventario.findByPk(inventarioId, {
      attributes: ['id', 'codigo_wms'],
    });

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    if (!producto.codigo_wms) {
      return res.status(404).json({
        success: false,
        message: 'Este producto no tiene código WMS asociado',
      });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(producto.codigo_wms)) {
      return res.status(404).json({
        success: false,
        message: 'Código WMS pendiente de actualización en el próximo ciclo de sincronización',
      });
    }

    const pallets = await wmsApiService.getProductoUbicaciones(producto.codigo_wms);

    // Filtrar por productId por si el WMS no filtra en servidor
    const ubicaciones = pallets
      .filter((p) => p.productId === producto.codigo_wms)
      .map((p) => ({
        coordenada: p.coordinate,
        zona: p.zoneName || null,
        posicion: p.positionName || null,
        nivel: p.levelName || null,
        cantidad: p.quantity,
        lote: p.lot || null,
      }));

    return success(res, { ubicaciones }, 'Ubicaciones obtenidas');
  } catch (error) {
    const wmsStatus = error.response?.status;
    const wmsData = error.response?.data;
    logger.error('[WMS Dashboard] Error getProductoUbicaciones:', {
      message: error.message,
      wmsStatus,
      wmsData,
    });
    if (wmsStatus === 400 || wmsStatus === 404) {
      return res.status(404).json({
        success: false,
        message: wmsData?.message || 'Ubicación no disponible en WMS para este producto',
      });
    }
    return res.status(503).json({ success: false, message: 'WMS no disponible temporalmente' });
  }
};

module.exports = {
  getStatus,
  getEstadisticas,
  getHistorial,
  reejecutarUltimoSync,
  ejecutarPolling,
  getPalletUbicacion,
  getProductoUbicaciones,
};
