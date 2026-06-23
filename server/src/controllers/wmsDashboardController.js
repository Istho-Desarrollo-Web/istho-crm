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
const { WmsSyncLog, Operacion, CajaInventario, Inventario, Cliente, sequelize } = require('../models');
const wmsSyncService = require('../services/wmsSyncService');
const wmsApiService = require('../services/wmsApiService');
const wmsOrderMapper = require('../services/wmsOrderMapper');
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

    // Llamadas paralelas: ubicaciones de pallets + lista de bodegas (para resolver nombre)
    const [pallets, bodegas] = await Promise.all([
      wmsApiService.getProductoUbicaciones(producto.codigo_wms),
      wmsApiService.getWarehouses().catch(() => []),
    ]);

    // Filtrar por productId por si el WMS no filtra en servidor
    const palletsFiltrados = pallets.filter((p) => p.productId === producto.codigo_wms);

    // Mapa warehouseId → nombre de bodega (una sola llamada, no N)
    const bodegaMap = Object.fromEntries(
      (Array.isArray(bodegas) ? bodegas : []).map((b) => [b.id, b.name || b.warehouseName || b.nombre || null])
    );

    // Resolver número de caja desde BD local (CajaInventario.wms_pallet_id → numero_caja).
    // Una sola query en lugar de N llamadas al WMS — escala correctamente con 200+ pallets.
    const { CajaInventario } = require('../models');
    const palletIds = palletsFiltrados.map((p) => p.palletId).filter(Boolean);
    const cajasLocales = palletIds.length
      ? await CajaInventario.findAll({
          where: { wms_pallet_id: palletIds },
          attributes: ['wms_pallet_id', 'numero_caja'],
          raw: true,
        })
      : [];
    const cajaMap = Object.fromEntries(cajasLocales.map((c) => [c.wms_pallet_id, c.numero_caja]));

    const ubicaciones = palletsFiltrados.map((p) => ({
      coordenada: p.coordinate,
      bodega: bodegaMap[p.warehouseId] || null,
      posicion: p.positionName || null,
      nivel: p.levelName || null,
      cantidad: p.quantity,
      lote: p.lot || null,
      numero_caja: cajaMap[p.palletId] ?? null,
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

const getProductoInfoWms = async (req, res) => {
  const { inventarioId } = req.query;

  if (!inventarioId) {
    return res.status(400).json({ success: false, message: 'inventarioId es requerido' });
  }

  try {
    const { Inventario } = require('../models');
    const producto = await Inventario.findByPk(inventarioId, { attributes: ['id', 'codigo_wms'] });

    if (!producto) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado' });
    }
    if (!producto.codigo_wms) {
      return res.status(404).json({ success: false, message: 'Producto sin código WMS' });
    }

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(producto.codigo_wms)) {
      return res.status(404).json({ success: false, message: 'Código WMS inválido' });
    }

    const data = await wmsApiService.getProductoDetalle(producto.codigo_wms);

    return success(res, {
      categoria: data?.productCategory?.name || null,
      costo_unitario: data?.unitPrice ?? 0,
      precio_venta: data?.cost ?? 0,
    });
  } catch (error) {
    const wmsStatus = error.response?.status;
    logger.error('[WMS Dashboard] Error getProductoInfoWms:', { message: error.message, wmsStatus });
    if (wmsStatus === 404) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado en WMS' });
    }
    return res.status(503).json({ success: false, message: 'WMS no disponible temporalmente' });
  }
};

// ============================================================================
// SYNC HISTÓRICO — órdenes anteriores a la fecha de corte o por número
// ============================================================================

const syncHistoricoOrdenes = async (req, res) => {
  const { numero_orden, fecha_desde, fecha_hasta, tipo, cliente_id } = req.body;

  if (!numero_orden && !fecha_desde && !fecha_hasta && !tipo && !cliente_id) {
    return res.status(400).json({
      success: false,
      message: 'Proporcionar numero_orden, un rango de fechas, tipo o cliente_id',
    });
  }

  let desdeDate = null;
  let hastaDate = null;
  if (fecha_desde) {
    desdeDate = new Date(fecha_desde + 'T00:00:00');
    if (isNaN(desdeDate.getTime())) {
      return res.status(400).json({ success: false, message: 'fecha_desde no es una fecha válida' });
    }
  }
  if (fecha_hasta) {
    hastaDate = new Date(fecha_hasta + 'T23:59:59');
    if (isNaN(hastaDate.getTime())) {
      return res.status(400).json({ success: false, message: 'fecha_hasta no es una fecha válida' });
    }
  }

  // tipo: 'entrada' → WMS type=1, 'salida' → WMS type=2, vacío/undefined = todos
  const tipoNum = tipo === 'entrada' ? 1 : tipo === 'salida' ? 2 : null;

  // Resolver NIT del cliente si se filtra por cliente
  let clienteNit = null;
  if (cliente_id) {
    const cliente = await Cliente.findByPk(cliente_id, { attributes: ['nit'] });
    if (!cliente) {
      return res.status(404).json({ success: false, message: 'Cliente no encontrado' });
    }
    clienteNit = cliente.nit;
  }

  try {
    logger.info(`[WMS Histórico] Iniciando sync histórico — numero_orden="${numero_orden || ''}" desde="${fecha_desde || ''}" hasta="${fecha_hasta || ''}" tipo="${tipo || 'todos'}" cliente_id="${cliente_id || ''}"`);

    const candidatas = [];

    if (numero_orden) {
      // Búsqueda por número: usar list=true para obtener TODAS las órdenes del WMS
      // (incluyendo "Finalizada") en una sola llamada. El listado paginado por defecto
      // solo retorna órdenes activas y no incluye las finalizadas.
      let todasOrdenes;
      try {
        const resultado = await wmsApiService.getOrdenes({ list: true });
        todasOrdenes = Array.isArray(resultado) ? resultado : (resultado?.data ?? resultado ?? []);
      } catch (err) {
        logger.error('[WMS Histórico] Error consultando WMS (list=true):', err.message);
        todasOrdenes = [];
      }

      logger.info(`[WMS Histórico] list=true: ${todasOrdenes.length} órdenes totales en WMS`);

      for (const orden of todasOrdenes) {
        const sysNum = orden.systemNumberOrder?.toString();
        const custNum = orden.customerNumberOrder?.toString();
        if (sysNum !== numero_orden && custNum !== numero_orden && orden.id !== numero_orden) continue;
        if (tipoNum !== null && orden.type !== tipoNum) continue;
        candidatas.push(orden);
      }
    } else if (cliente_id) {
      // Filtro solo por cliente (sin número ni fechas): usar list=true para cubrir todo el
      // historial WMS, incluyendo órdenes finalizadas más antiguas que la paginación activa.
      let todasOrdenes;
      try {
        const resultado = await wmsApiService.getOrdenes({ list: true });
        todasOrdenes = Array.isArray(resultado) ? resultado : (resultado?.data ?? resultado ?? []);
      } catch (err) {
        logger.error('[WMS Histórico] Error consultando WMS (list=true) para cliente:', err.message);
        todasOrdenes = [];
      }
      logger.info(`[WMS Histórico] list=true (cliente_id=${cliente_id}): ${todasOrdenes.length} órdenes totales en WMS`);
      for (const orden of todasOrdenes) {
        if (orden.orderStatus?.name !== 'Finalizada') continue;
        if (tipoNum !== null && orden.type !== tipoNum) continue;
        const fecha = orden.orderDate ? new Date(orden.orderDate) : null;
        if (desdeDate && (!fecha || isNaN(fecha.getTime()) || fecha < desdeDate)) continue;
        if (hastaDate && (!fecha || isNaN(fecha.getTime()) || fecha > hastaDate)) continue;
        candidatas.push(orden);
      }
    } else {
      // Búsqueda por rango de fechas: paginar el listado activo
      const MAX_PAGES = 20;
      const PAGE_SIZE = 50;
      for (let page = 1; page <= MAX_PAGES; page++) {
        let ordenes;
        try {
          const resultado = await wmsApiService.getOrdenes({ limit: PAGE_SIZE, page });
          ordenes = Array.isArray(resultado) ? resultado : (resultado?.data ?? []);
        } catch (err) {
          logger.error(`[WMS Histórico] Error consultando WMS página ${page}:`, err.message);
          break;
        }

        if (ordenes.length === 0) break;

        for (const orden of ordenes) {
          if (orden.orderStatus?.name !== 'Finalizada') continue;
          if (tipoNum !== null && orden.type !== tipoNum) continue;
          const fecha = orden.orderDate ? new Date(orden.orderDate) : null;
          if (!fecha || isNaN(fecha.getTime())) continue;
          if (desdeDate && fecha < desdeDate) continue;
          if (hastaDate && fecha > hastaDate) continue;
          candidatas.push(orden);
        }

        // Si la última orden de esta página es anterior a fecha_desde, no hay más candidatas
        if (desdeDate) {
          const ultima = ordenes[ordenes.length - 1];
          const ultimaFecha = ultima?.orderDate ? new Date(ultima.orderDate) : null;
          if (ultimaFecha && ultimaFecha < desdeDate) break;
        }
      }
    }

    if (candidatas.length === 0) {
      return res.status(404).json({
        success: false,
        message: numero_orden
          ? `No se encontró la orden "${numero_orden}" en el WMS`
          : cliente_id && !fecha_desde && !fecha_hasta
            ? 'No se encontraron órdenes finalizadas en el WMS para ese cliente'
            : 'No se encontraron órdenes finalizadas en el rango de fechas indicado',
      });
    }

    logger.info(`[WMS Histórico] ${candidatas.length} órdenes candidatas a sincronizar`);

    // ── FASE 1: Batch-check de existentes (1 query en lugar de N) ─────────
    const wmsOrderIds = candidatas.map(o => o.id).filter(Boolean);
    const systemNums  = candidatas.map(o => o.systemNumberOrder?.toString()).filter(Boolean);
    const custNums    = candidatas.map(o => o.customerNumberOrder?.toString()).filter(Boolean);

    const orCondiciones = [];
    if (wmsOrderIds.length) orCondiciones.push({ wms_order_id: { [Op.in]: wmsOrderIds } });
    if (systemNums.length)  orCondiciones.push({ documento_wms: { [Op.in]: systemNums } });
    if (custNums.length)    orCondiciones.push({ documento_wms: { [Op.in]: custNums } });

    const existentesMap = new Map();
    if (orCondiciones.length) {
      const existentesEnBD = await Operacion.findAll({
        where: { [Op.or]: orCondiciones },
        attributes: ['id', 'wms_order_id', 'documento_wms', 'cliente_id', 'numero_operacion'],
        paranoid: false,
      });
      for (const op of existentesEnBD) {
        if (op.wms_order_id) existentesMap.set(op.wms_order_id, op);
        if (op.documento_wms) existentesMap.set(op.documento_wms.trim(), op);
      }
      logger.info(`[WMS Histórico] Batch DB: ${existentesEnBD.length} ya en BD de ${candidatas.length} candidatas`);
    }
    // ──────────────────────────────────────────────────────────────────────

    const resultados = [];
    let procesadas = 0;
    let ya_existentes = 0;
    let errores = 0;

    // ── FASE 2: Separar existentes de nuevas ──────────────────────────────
    const nuevas = [];
    for (const orden of candidatas) {
      const existente = existentesMap.get(orden.id)
        || (orden.systemNumberOrder ? existentesMap.get(orden.systemNumberOrder.toString()) : null)
        || (orden.customerNumberOrder ? existentesMap.get(orden.customerNumberOrder.toString()) : null)
        || null;

      if (existente) {
        if (cliente_id && existente.cliente_id && existente.cliente_id !== Number(cliente_id)) {
          logger.debug(`[WMS Histórico] Orden ${orden.systemNumberOrder} existe pero es de cliente_id=${existente.cliente_id} → ignorando`);
          continue;
        }
        ya_existentes++;
        resultados.push({
          orden: orden.systemNumberOrder,
          estado: 'ya_existe',
          operacion: existente.numero_operacion || existente.id,
        });
        logger.debug(`[WMS Histórico] Orden ${orden.systemNumberOrder} ya existe → omitiendo`);
        continue;
      }
      nuevas.push(orden);
    }

    // ── FASE 3: Prefetch de detalles en paralelo (5 a la vez) ─────────────
    // Evita 100+ llamadas WMS secuenciales (~1s c/u) que causan timeout
    const CONCURRENCIA = 5;
    const paraSync = [];

    for (let i = 0; i < nuevas.length; i += CONCURRENCIA) {
      const lote = nuevas.slice(i, i + CONCURRENCIA);
      const resultadosLote = await Promise.all(
        lote.map(async (orden) => {
          try {
            const detalle = await wmsApiService.getOrdenDetalle(orden.id);
            const ordenCompleta = (detalle && typeof detalle === 'object' && !Array.isArray(detalle))
              ? { ...orden, ...detalle }
              : orden;
            const itemsArr = Array.isArray(ordenCompleta.orderItems) ? ordenCompleta.orderItems : [];

            if (clienteNit) {
              const nitWms = ordenCompleta.customer?.nit || ordenCompleta.customer?.taxId || ordenCompleta.customer?.identification;
              if (nitWms !== clienteNit) {
                logger.debug(`[WMS Histórico] Orden ${orden.systemNumberOrder} omitida — cliente WMS "${nitWms}" ≠ "${clienteNit}"`);
                return null;
              }
            }
            return { orden, ordenCompleta, itemsArr };
          } catch (err) {
            logger.error(`[WMS Histórico] Error obteniendo detalle de orden ${orden.systemNumberOrder}: ${err.message}`);
            return { orden, error: err };
          }
        })
      );

      for (const r of resultadosLote) {
        if (!r) continue;
        if (r.error) {
          errores++;
          resultados.push({ orden: r.orden.systemNumberOrder, estado: 'error', error: r.error.message });
          await WmsSyncLog.create({
            tipo: 'polling_entrada',
            documento_origen: r.orden.systemNumberOrder,
            nit: r.orden.customer?.nit,
            estado: 'fallido',
            error_mensaje: r.error.message,
            detalles: { wms_order_id: r.orden.id, sync_historico: true },
          }).catch(() => {});
          continue;
        }
        paraSync.push(r);
      }
    }

    // ── FASE 4: Sincronizar las órdenes que pasaron los filtros ───────────
    for (const { orden, ordenCompleta, itemsArr } of paraSync) {
      try {
        const { tipo: tipoOp, payload } = await wmsOrderMapper.mapearOrden(ordenCompleta, itemsArr);

        let resultado;
        if (tipoOp === 'entrada') {
          resultado = await wmsSyncService.syncEntrada(payload);
        } else {
          resultado = await wmsSyncService.syncSalida(payload);
        }

        await WmsSyncLog.create({
          tipo: tipoOp === 'entrada' ? 'polling_entrada' : 'polling_salida',
          documento_origen: orden.systemNumberOrder,
          nit: ordenCompleta.customer?.nit,
          estado: 'exitoso',
          detalles: {
            wms_order_id: orden.id,
            operacion_id: resultado?.operacion_id,
            numero_operacion: resultado?.numero_operacion,
            sync_historico: true,
          },
        });

        procesadas++;
        resultados.push({
          orden: orden.systemNumberOrder,
          estado: 'sincronizada',
          tipo: tipoOp,
          operacion: resultado?.numero_operacion || resultado?.operacion_id,
        });
        logger.info(`[WMS Histórico] Orden ${orden.systemNumberOrder} sincronizada → ${resultado?.numero_operacion}`);
      } catch (err) {
        errores++;
        resultados.push({
          orden: orden.systemNumberOrder,
          estado: 'error',
          error: err.message,
        });

        await WmsSyncLog.create({
          tipo: 'polling_entrada',
          documento_origen: orden.systemNumberOrder,
          nit: orden.customer?.nit,
          estado: 'fallido',
          error_mensaje: err.message,
          detalles: { wms_order_id: orden.id, sync_historico: true },
        }).catch(() => {});

        logger.error(`[WMS Histórico] Error procesando orden ${orden.systemNumberOrder}: ${err.message}`);
      }
    }

    const mensaje = procesadas > 0
      ? `${procesadas} orden(es) sincronizada(s)${ya_existentes > 0 ? `, ${ya_existentes} ya existían` : ''}${errores > 0 ? `, ${errores} con error` : ''}`
      : ya_existentes > 0
        ? `Las ${ya_existentes} orden(es) encontradas ya estaban sincronizadas en el CRM`
        : `Se encontraron ${candidatas.length} orden(es) pero no se pudo sincronizar ninguna`;

    return success(res, { candidatas: candidatas.length, procesadas, ya_existentes, errores, resultados }, mensaje);
  } catch (error) {
    logger.error('[WMS Dashboard] Error en syncHistoricoOrdenes:', { message: error.message });
    return serverError(res, 'Error al sincronizar histórico', error);
  }
};

// ============================================================================
// SYNC KARDEX HISTÓRICO — ajustes de una caja específica por número
// ============================================================================

const syncHistoricoKardex = async (req, res) => {
  const { numero_caja } = req.body;

  if (!numero_caja?.toString().trim()) {
    return res.status(400).json({ success: false, message: 'Se requiere el número de caja' });
  }

  const numeroCaja = numero_caja.toString().trim();

  try {
    logger.info(`[WMS Kardex] Iniciando sync histórico kardex para caja="${numeroCaja}"`);

    // 1. Buscar la caja en BD local para obtener wms_pallet_id y NIT
    const caja = await CajaInventario.findOne({
      where: { numero_caja: numeroCaja },
      include: [
        {
          model: Inventario,
          as: 'inventario',
          include: [{ model: Cliente, as: 'cliente' }],
        },
      ],
    });

    let wmsPalletId = caja?.wms_pallet_id || null;
    const nit = caja?.inventario?.cliente?.nit || null;

    // 2. Si no hay wms_pallet_id local, buscar en WMS por código de caja
    if (!wmsPalletId) {
      try {
        const palletWms = await wmsApiService.searchPalletKardex(numeroCaja);
        wmsPalletId = palletWms?.id || null;
      } catch (err) {
        logger.warn(`[WMS Kardex] searchPalletKardex falló para "${numeroCaja}": ${err.message}`);
      }
    }

    if (!wmsPalletId) {
      return res.status(404).json({
        success: false,
        message: `No se encontró el pallet "${numeroCaja}" en el WMS. Verifique el número de caja.`,
      });
    }

    if (!nit) {
      return res.status(422).json({
        success: false,
        message: `La caja "${numeroCaja}" no tiene cliente asociado. Asegúrese de que esté registrada con producto y cliente asignados.`,
      });
    }

    // 3. Obtener historial completo de kardex desde WMS (paginado)
    const MAX_PAGES = 10;
    const PAGE_SIZE = 100;
    const todasLasEntradas = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      let items;
      try {
        const resultado = await wmsApiService.getKardexHistory(wmsPalletId, { limit: PAGE_SIZE, page });
        items = Array.isArray(resultado) ? resultado : [];
      } catch (err) {
        logger.error(`[WMS Kardex] Error obteniendo historial página ${page}: ${err.message}`);
        break;
      }
      if (items.length === 0) break;
      todasLasEntradas.push(...items);
      if (items.length < PAGE_SIZE) break;
    }

    if (todasLasEntradas.length === 0) {
      return success(res, {
        caja: numeroCaja,
        total: 0, procesadas: 0, ya_existentes: 0, omitidas: 0, errores: 0, resultados: [],
      }, `No se encontraron movimientos de kardex para la caja "${numeroCaja}" en el WMS`);
    }

    logger.info(`[WMS Kardex] ${todasLasEntradas.length} entrada(s) en historial para caja ${numeroCaja}`);

    // 4. Procesar cada entrada
    let procesadas = 0;
    let ya_existentes = 0;
    let omitidas = 0;
    let errores = 0;
    const resultados = [];

    for (const entry of todasLasEntradas) {
      const palletCode = entry.palletCode || numeroCaja;

      // Normalizar motivo (puede ser string o { name, motive })
      const motivoRaw = typeof entry.motive === 'string'
        ? entry.motive
        : (entry.motive?.name || entry.motive?.motive || '');
      const motivoNombre = motivoRaw.toLowerCase();

      // Ignorar movimientos operacionales (picking/recepción cubiertos por polling de órdenes)
      if (motivoNombre.includes('picking') || motivoNombre.includes('orden de')) {
        omitidas++;
        continue;
      }

      // Solo Carga; Descarga llega por polling de órdenes de picking
      if (entry.operation !== 'Carga') {
        omitidas++;
        continue;
      }

      const entryKey = `${palletCode}::${entry.createdAt}::${entry.operation}::${entry.quantity}`.substring(0, 150);

      // Dedup contra WmsSyncLog
      const existeLog = await WmsSyncLog.findOne({
        where: { tipo: 'polling_kardex', documento_origen: entryKey, estado: 'exitoso' },
      });

      if (existeLog) {
        ya_existentes++;
        resultados.push({
          key: entryKey, estado: 'ya_existe', motivo: motivoRaw,
          cantidad: entry.quantity, fecha: entry.createdAt,
        });
        continue;
      }

      try {
        const resultado = await wmsSyncService.syncKardex({
          nit,
          motivo: motivoRaw,
          detalles: [{
            producto: entry.product?.sku || caja?.inventario?.sku || palletCode,
            descripcion: entry.product?.name || caja?.inventario?.descripcion || motivoRaw,
            caja: palletCode,
            cantidad: Number(entry.quantity),
            lote: caja?.lote || null,
            unidad_medida: caja?.inventario?.unidad_medida || 'UND',
          }],
        });

        await WmsSyncLog.create({
          tipo: 'polling_kardex',
          documento_origen: entryKey,
          nit,
          estado: 'exitoso',
          detalles: {
            operacion_id: resultado?.operacion_id,
            numero_operacion: resultado?.numero_operacion,
            motivo: motivoRaw,
            operacion_wms: entry.operation,
            cantidad: entry.quantity,
            pallet_code: palletCode,
            sync_historico: true,
          },
        }).catch(() => {});

        procesadas++;
        resultados.push({
          key: entryKey,
          estado: 'sincronizado',
          operacion: resultado?.numero_operacion,
          motivo: motivoRaw,
          cantidad: entry.quantity,
          fecha: entry.createdAt,
        });

        logger.info(`[WMS Kardex] Sincronizado: caja=${palletCode}, qty=${entry.quantity}, motivo=${motivoRaw}`);
      } catch (entryErr) {
        await WmsSyncLog.create({
          tipo: 'polling_kardex',
          documento_origen: entryKey,
          nit,
          estado: 'fallido',
          error_mensaje: entryErr.message,
          detalles: { motivo: motivoRaw, operacion_wms: entry.operation, pallet_code: palletCode, sync_historico: true },
        }).catch(() => {});

        errores++;
        resultados.push({
          key: entryKey, estado: 'error', error: entryErr.message,
          motivo: motivoRaw, cantidad: entry.quantity, fecha: entry.createdAt,
        });

        logger.error(`[WMS Kardex] Error procesando entrada ${palletCode}: ${entryErr.message}`);
      }
    }

    const mensaje = procesadas > 0
      ? `${procesadas} movimiento(s) de kardex sincronizado(s)${ya_existentes > 0 ? `, ${ya_existentes} ya existían` : ''}${errores > 0 ? `, ${errores} con error` : ''}`
      : ya_existentes > 0
        ? `Los ${ya_existentes} movimiento(s) ya estaban sincronizados en el CRM`
        : `No se sincronizó ningún movimiento${errores > 0 ? ` (${errores} error(es))` : ''}`;

    return success(res, {
      caja: numeroCaja,
      total: todasLasEntradas.length,
      procesadas,
      ya_existentes,
      omitidas,
      errores,
      resultados,
    }, mensaje);
  } catch (err) {
    logger.error('[WMS Dashboard] Error en syncHistoricoKardex:', { message: err.message });
    return serverError(res, 'Error al sincronizar kardex histórico', err);
  }
};

module.exports = {
  getStatus,
  getEstadisticas,
  getHistorial,
  reejecutarUltimoSync,
  ejecutarPolling,
  syncHistoricoOrdenes,
  syncHistoricoKardex,
  getPalletUbicacion,
  getProductoUbicaciones,
  getProductoInfoWms,
};
