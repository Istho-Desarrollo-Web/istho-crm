'use strict';

/**
 * ISTHO CRM - Controlador de Solicitudes del Cliente
 *
 * Maneja avisos de ingreso y solicitudes de despacho creados por los clientes
 * desde el portal, así como su gestión por parte del equipo interno.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

const { Op } = require('sequelize');

const {
  Solicitud,
  SolicitudDetalle,
  SolicitudComentario,
  SolicitudDocumento,
  Cliente,
  Usuario,
  Operacion,
  Notificacion,
  Auditoria,
  sequelize,
} = require('../models');
const s3Service = require('../services/s3Service');
const emailService = require('../services/emailService');
const socketService = require('../services/socketService');
const notificacionService = require('../services/notificacionService');
const {
  success,
  successMessage,
  created,
  paginated,
  error: errorResponse,
  notFound,
  serverError,
} = require('../utils/responses');
const logger = require('../utils/logger');

const TIPO_LABEL = {
  ingreso: 'Aviso de Ingreso',
  despacho: 'Solicitud de Despacho',
};

// ─── GENERAR NÚMERO CORRELATIVO ─────────────────────────────────────────────

const generarNumeroSolicitud = async (t) => {
  const year = new Date().getFullYear();
  const [row] = await sequelize.query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(numero_solicitud, '-', -1) AS UNSIGNED)) AS ultimo
     FROM solicitudes
     WHERE numero_solicitud LIKE :patron FOR UPDATE`,
    {
      replacements: { patron: `SOL-${year}-%` },
      type: sequelize.QueryTypes.SELECT,
      transaction: t,
    }
  );
  const siguiente = ((row?.ultimo || 0) + 1).toString().padStart(4, '0');
  return `SOL-${year}-${siguiente}`;
};

// ─── OBTENER IDs DE USUARIOS A NOTIFICAR ────────────────────────────────────

const getResponsablesIds = async (cliente_id) => {
  return notificacionService.getUsuariosPorCliente(cliente_id);
};

// ─── CREAR SOLICITUD ────────────────────────────────────────────────────────

const crear = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const {
      tipo,
      prioridad,
      fecha_estimada,
      numero_documento,
      transportista,
      direccion_entrega,
      contacto_destino,
      notas,
      detalles,
    } = req.body;

    // Para usuarios cliente del portal, cliente_id viene del token (multer reemplaza req.body
    // antes de que filtrarPorCliente pueda inyectarlo, así que se lee directo de req.user)
    const cliente_id =
      req.user.esCliente && req.user.cliente_id
        ? req.user.cliente_id
        : req.body.cliente_id;

    if (!tipo || !['ingreso', 'despacho'].includes(tipo)) {
      await t.rollback();
      return errorResponse(res, 'tipo debe ser "ingreso" o "despacho"', 400);
    }
    if (!cliente_id) {
      await t.rollback();
      return errorResponse(res, 'cliente_id es requerido', 400);
    }
    // multer (multipart) entrega detalles como JSON string; JSON body lo entrega ya parseado
    const detallesParsed = typeof detalles === 'string' ? JSON.parse(detalles) : detalles;
    if (!Array.isArray(detallesParsed) || detallesParsed.length === 0) {
      await t.rollback();
      return errorResponse(res, 'Debe incluir al menos un producto en detalles', 400);
    }

    for (const d of detallesParsed) {
      const cant = Number(d.cantidad);
      if (!d.referencia || !d.referencia.trim()) {
        await t.rollback();
        return errorResponse(res, 'Cada línea de detalle debe tener referencia', 400);
      }
      if (isNaN(cant) || cant <= 0) {
        await t.rollback();
        return errorResponse(res, 'La cantidad de cada línea debe ser un número positivo', 400);
      }
    }

    const numero_solicitud = await generarNumeroSolicitud(t);

    const solicitud = await Solicitud.create(
      {
        numero_solicitud,
        tipo,
        cliente_id,
        creado_por: req.user.id,
        estado: 'recibida',
        prioridad: prioridad || 'normal',
        fecha_estimada: fecha_estimada || null,
        numero_documento: numero_documento || null,
        transportista: transportista || null,
        direccion_entrega: direccion_entrega || null,
        contacto_destino: contacto_destino || null,
        notas: notas || null,
      },
      { transaction: t }
    );

    const lineas = detallesParsed.map((d) => ({
      solicitud_id: solicitud.id,
      referencia: d.referencia,
      descripcion: d.descripcion || null,
      cantidad: Number(d.cantidad),
      unidad: d.unidad || 'unidad',
    }));
    await SolicitudDetalle.bulkCreate(lineas, { transaction: t });

    await t.commit();

    // Capturar archivos antes del setImmediate (el req object puede gc'd)
    const archivosSubidos = (req.files || []).map((f) => ({
      buffer: f.buffer,
      originalname: f.originalname,
      mimetype: f.mimetype,
    }));

    // Acciones post-commit (no bloquean la respuesta)
    setImmediate(async () => {
      try {
        // Auditoría PRIMERO (antes de notificaciones que pueden fallar)
        await Auditoria.registrar({
          tabla: 'solicitudes',
          registro_id: solicitud.id,
          accion: 'crear',
          usuario_id: req.user.id,
          usuario_nombre: req.user.nombre_completo || req.user.username,
          datos_nuevos: { numero_solicitud, tipo, estado: 'recibida', cliente_id },
        });

        const accion_url = `/solicitudes/${solicitud.id}`;
        const tipoLabel = TIPO_LABEL[tipo];
        const titulo = `Nueva ${tipoLabel}: ${numero_solicitud}`;

        const cliente = await Cliente.findByPk(cliente_id, {
          attributes: ['razon_social'],
        });
        const razonSocial = cliente?.razon_social || '';
        const mensaje = `El cliente ${razonSocial} creó ${tipoLabel.toLowerCase()} ${numero_solicitud}.`;

        const responsablesIds = await getResponsablesIds(cliente_id);

        // Notificación CRM
        if (responsablesIds.length > 0) {
          await Notificacion.notificarMultiple(responsablesIds, {
            tipo: 'cliente',
            titulo,
            mensaje,
            prioridad: prioridad || 'normal',
            accion_url,
            accion_label: 'Ver solicitud',
            metadata: { solicitud_id: solicitud.id, tipo, cliente_id },
          });

          // Socket.IO en tiempo real
          socketService.emitToUsers(responsablesIds, 'notificacion:nueva', {
            tipo: 'cliente',
            titulo,
            mensaje,
            prioridad: prioridad || 'normal',
            accion_url,
            accion_label: 'Ver solicitud',
            created_at: new Date(),
          });

          // Subir documentos adjuntos a S3 y crear registros
          const adjuntosEmail = [];
          for (const archivo of archivosSubidos) {
            try {
              const fakeFile = { buffer: archivo.buffer, mimetype: archivo.mimetype, originalname: archivo.originalname };
              const { key } = await s3Service.subir(fakeFile, `solicitudes/${solicitud.id}`);
              await SolicitudDocumento.create({
                solicitud_id: solicitud.id,
                nombre_original: archivo.originalname,
                s3_key: key,
              });
              adjuntosEmail.push({
                nombre: archivo.originalname,
                content: archivo.buffer,
                contentType: archivo.mimetype,
              });
            } catch (uploadErr) {
              logger.error('[SolicitudController] Error subiendo archivo adjunto:', uploadErr.message);
            }
          }

          // Email usando plantilla BD
          const responsablesUsuarios = await Usuario.findAll({
            where: { id: { [Op.in]: responsablesIds }, activo: true },
            attributes: ['email'],
          });
          const emails = responsablesUsuarios.map((u) => u.email).filter(Boolean);
          if (emails.length > 0) {
            try {
              await emailService.enviarSolicitudNueva(
                { ...solicitud.dataValues, cliente: { razon_social: razonSocial } },
                emails,
                adjuntosEmail
              );
            } catch (mailErr) {
              logger.error('[SolicitudController] Error enviando email:', mailErr.message);
            }
          }
        }
      } catch (err) {
        logger.error('[SolicitudController] Error en post-commit:', err.message);
      }
    });

    return created(res, 'Solicitud creada correctamente', {
      id: solicitud.id,
      numero_solicitud,
    });
  } catch (err) {
    try {
      await t.rollback();
    } catch (_) {
      /* ya estaba commitada */
    }
    return serverError(res, 'Error al crear solicitud', err);
  }
};

// ─── LISTAR SOLICITUDES ─────────────────────────────────────────────────────

const listar = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const { tipo, estado, desde, hasta, cliente_id } = req.query;

    const where = {};
    if (tipo) where.tipo = tipo;
    if (estado) where.estado = estado;
    if (req.user?.rol === 'cliente') {
      if (!req.user.cliente_id) {
        return errorResponse(res, 'Usuario cliente sin cliente asignado', 403);
      }
      where.cliente_id = req.user.cliente_id;
    } else if (cliente_id) {
      where.cliente_id = cliente_id;
    }
    if (desde || hasta) {
      where.createdAt = {};
      if (desde) where.createdAt[Op.gte] = new Date(desde + 'T00:00:00');
      if (hasta) where.createdAt[Op.lte] = new Date(hasta + 'T23:59:59');
    }

    const { count, rows } = await Solicitud.findAndCountAll({
      where,
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'razon_social', 'codigo_cliente'],
        },
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido'],
        },
      ],
      order: [['created_at', 'DESC']],
      limit,
      offset,
    });

    return paginated(res, rows, { total: count, page, limit });
  } catch (err) {
    return serverError(res, 'Error al listar solicitudes', err);
  }
};

// ─── OBTENER DETALLE ────────────────────────────────────────────────────────

const obtener = async (req, res) => {
  try {
    const { id } = req.params;
    const esCliente = req.user?.rol === 'cliente';
    const comentariosWhere = esCliente ? { es_interno: false } : {};

    // Verificación de ownership liviana antes del query completo
    if (esCliente) {
      const ownership = await Solicitud.findOne({
        where: { id },
        attributes: ['id', 'cliente_id'],
        paranoid: false,
      });
      if (!ownership) return notFound(res, 'Solicitud no encontrada');
      if (Number(ownership.cliente_id) !== Number(req.user.cliente_id)) {
        return errorResponse(res, 'No tiene acceso a esta solicitud', 403);
      }
    }

    const solicitud = await Solicitud.findByPk(id, {
      include: [
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'razon_social', 'codigo_cliente'],
        },
        {
          model: Usuario,
          as: 'creador',
          attributes: ['id', 'nombre', 'apellido'],
        },
        { model: SolicitudDetalle, as: 'detalles' },
        { model: SolicitudDocumento, as: 'documentos', attributes: ['id', 'nombre_original', 's3_key', 'created_at'] },
        {
          model: SolicitudComentario,
          as: 'comentarios',
          where: comentariosWhere,
          required: false,
          include: [
            {
              model: Usuario,
              as: 'autor',
              attributes: ['id', 'nombre', 'apellido', 'nombre_completo', 'username', 'rol', 'avatar_url'],
            },
          ],
        },
        {
          model: Operacion,
          as: 'operacion',
          attributes: ['id', 'numero_operacion', 'estado'],
          required: false,
        },
      ],
      order: [[{ model: SolicitudComentario, as: 'comentarios' }, 'created_at', 'ASC']],
    });

    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    let documento_url = solicitud.documento_url;
    if (documento_url && s3Service.isS3Key && s3Service.isS3Key(documento_url)) {
      documento_url = await s3Service.getUrl(documento_url, 7200);
    }

    const documentos = await Promise.all(
      (solicitud.documentos || []).map(async (d) => ({
        id: d.id,
        nombre_original: d.nombre_original,
        url: await s3Service.getUrl(d.s3_key, 7200),
        download_url: await s3Service.getUrl(d.s3_key, 7200, {
          contentDisposition: `attachment; filename="${encodeURIComponent(d.nombre_original)}"`,
        }),
        created_at: d.created_at,
      }))
    );

    return success(res, { ...solicitud.toJSON(), documento_url, documentos });
  } catch (err) {
    return serverError(res, 'Error al obtener solicitud', err);
  }
};

// ─── CAMBIAR ESTADO ─────────────────────────────────────────────────────────

const cambiarEstado = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, motivo } = req.body;

    const estadosValidos = ['en_proceso', 'completada', 'rechazada'];
    if (!estadosValidos.includes(estado)) {
      return errorResponse(
        res,
        `estado debe ser uno de: ${estadosValidos.join(', ')}`,
        400
      );
    }

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (['completada', 'rechazada'].includes(solicitud.estado)) {
      return errorResponse(res, 'La solicitud ya está en estado final', 422);
    }

    if (estado === 'completada' && !solicitud.operacion_id) {
      return errorResponse(
        res,
        'Debe vincular una operación antes de marcar como completada',
        422
      );
    }

    if (estado === 'rechazada') {
      if (!motivo || motivo.trim().length < 5) {
        return errorResponse(
          res,
          'El motivo de rechazo es requerido (mínimo 5 caracteres)',
          400
        );
      }
    }

    const estadoAnterior = solicitud.estado;

    await sequelize.transaction(async (t) => {
      if (estado === 'rechazada') {
        await SolicitudComentario.create(
          {
            solicitud_id: id,
            usuario_id: req.user.id,
            mensaje: `Solicitud rechazada: ${motivo.trim()}`,
            es_interno: false,
          },
          { transaction: t }
        );
      }
      await solicitud.update({ estado }, { transaction: t });
    });

    await Auditoria.registrar({
      tabla: 'solicitudes',
      registro_id: id,
      accion: 'cambiar_estado',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_anteriores: { estado: estadoAnterior },
      datos_nuevos: { estado, motivo: motivo || null },
    });

    // Notificar al cliente creador del cambio de estado
    setImmediate(async () => {
      try {
        const estadoLabel = { en_proceso: 'En Proceso', completada: 'Completada', rechazada: 'Rechazada' };
        const creadorSolicitud = await Solicitud.findByPk(id, {
          include: [
            { model: Usuario, as: 'creador', attributes: ['id', 'email', 'nombre'] },
            { model: Cliente, as: 'cliente', attributes: ['razon_social'] },
          ],
        });
        if (creadorSolicitud?.creado_por) {
          await Notificacion.notificarMultiple(
            [creadorSolicitud.creado_por],
            {
              tipo: 'solicitud_estado',
              titulo: `Solicitud ${solicitud.numero_solicitud} — ${estadoLabel[estado] || estado}`,
              mensaje: `Tu solicitud fue actualizada al estado: ${estadoLabel[estado] || estado}`,
              accion_url: `/solicitudes/${id}`,
              accion_label: 'Ver solicitud',
            }
          );
        }
      } catch (err) {
        logger.error('[cambiarEstado] Error al notificar cliente:', err);
      }
    });

    const destinatariosEstado = await getResponsablesIds(solicitud.cliente_id);
    if (solicitud.creado_por) destinatariosEstado.push(solicitud.creado_por);
    socketService.emitToUsers([...new Set(destinatariosEstado)], 'solicitud:estado_cambio', { solicitud_id: Number(id), estado });

    return successMessage(res, `Solicitud marcada como ${estado}`, { id, estado });
  } catch (err) {
    return serverError(res, 'Error al cambiar estado', err);
  }
};

// ─── VINCULAR A OPERACIÓN ───────────────────────────────────────────────────

const vincular = async (req, res) => {
  try {
    const { id } = req.params;
    const { operacion_id } = req.body;

    if (!operacion_id) return errorResponse(res, 'operacion_id es requerido', 400);

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (solicitud.operacion_id && Number(solicitud.operacion_id) !== Number(operacion_id)) {
      return errorResponse(
        res,
        `Esta solicitud ya está vinculada a la operación #${solicitud.operacion_id}`,
        422
      );
    }

    const operacion = await Operacion.findByPk(operacion_id);
    if (!operacion) return notFound(res, 'Operación no encontrada');

    if (Number(operacion.cliente_id) !== Number(solicitud.cliente_id)) {
      return errorResponse(res, 'La operación no pertenece al mismo cliente que la solicitud', 422);
    }

    const operacionAnterior = solicitud.operacion_id || null;
    const nuevoEstado = solicitud.estado === 'recibida' ? 'en_proceso' : solicitud.estado;
    await solicitud.update({ operacion_id, estado: nuevoEstado });

    await Auditoria.registrar({
      tabla: 'solicitudes',
      registro_id: id,
      accion: 'vincular_operacion',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_anteriores: { operacion_id: operacionAnterior },
      datos_nuevos: { operacion_id },
    });

    return successMessage(res, 'Operación vinculada correctamente', {
      id,
      operacion_id,
    });
  } catch (err) {
    return serverError(res, 'Error al vincular operación', err);
  }
};

// ─── AGREGAR COMENTARIO ─────────────────────────────────────────────────────

const agregarComentario = async (req, res) => {
  try {
    const { id } = req.params;
    const { mensaje, es_interno } = req.body;
    const esCliente = req.user?.rol === 'cliente';

    if (!mensaje || mensaje.trim().length === 0) {
      return errorResponse(res, 'El mensaje es requerido', 400);
    }

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (esCliente && Number(solicitud.cliente_id) !== Number(req.user.cliente_id)) {
      return errorResponse(res, 'No tiene acceso a esta solicitud', 403);
    }

    const comentario = await SolicitudComentario.create({
      solicitud_id: id,
      usuario_id: req.user.id,
      mensaje: mensaje.trim(),
      es_interno: esCliente ? false : !!es_interno,
    });

    // Notificar al cliente si el comentario es visible y lo hace un usuario interno
    if (!esCliente && !comentario.es_interno) {
      setImmediate(async () => {
        try {
          const solicitudInfo = await Solicitud.findByPk(id, { attributes: ['numero_solicitud', 'creado_por'] });
          if (solicitudInfo?.creado_por) {
            await Notificacion.notificarMultiple(
              [solicitudInfo.creado_por],
              {
                tipo: 'solicitud_comentario',
                titulo: `Nueva respuesta en solicitud ${solicitudInfo.numero_solicitud}`,
                mensaje: 'El equipo ISTHO respondió a tu solicitud',
                accion_url: `/solicitudes/${id}`,
                accion_label: 'Ver solicitud',
              }
            );
          }
        } catch (err) {
          logger.error('[agregarComentario] Error al notificar cliente:', err);
        }
      });
    }

    const autor = await Usuario.findByPk(req.user.id, {
      attributes: ['id', 'nombre', 'apellido', 'nombre_completo', 'username', 'rol', 'avatar_url'],
    });

    const payload = { ...comentario.toJSON(), autor };
    const destinatariosComentario = await getResponsablesIds(solicitud.cliente_id);
    // No enviar comentarios internos al creador portal (es_interno solo visible para ISTHO)
    if (solicitud.creado_por && !comentario.es_interno) destinatariosComentario.push(solicitud.creado_por);
    socketService.emitToUsers([...new Set(destinatariosComentario)], 'solicitud:comentario_nuevo', { solicitud_id: Number(id), comentario: payload });

    return created(res, 'Comentario agregado', payload);
  } catch (err) {
    return serverError(res, 'Error al agregar comentario', err);
  }
};

// ─── SUBIR DOCUMENTO ADJUNTO ────────────────────────────────────────────────

const subirDocumento = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return errorResponse(res, 'No se recibió ningún archivo', 400);

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (
      req.user?.rol === 'cliente' &&
      Number(solicitud.cliente_id) !== Number(req.user.cliente_id)
    ) {
      return errorResponse(res, 'No tiene acceso a esta solicitud', 403);
    }

    const { key } = await s3Service.subir(req.file, `solicitudes/${id}`);
    await solicitud.update({ documento_url: key });

    await Auditoria.registrar({
      tabla: 'solicitudes',
      registro_id: id,
      accion: 'subir_documento',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: { documento_url: key },
    });

    const url = await s3Service.getUrl(key, 7200);
    return success(res, { documento_url: url });
  } catch (err) {
    return serverError(res, 'Error al subir documento', err);
  }
};

// ─── SUBIR DOCUMENTO ADICIONAL (tabla solicitud_documentos) ─────────────────

const subirDocumentoAdicional = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return errorResponse(res, 'No se recibió ningún archivo', 400);

    const solicitud = await Solicitud.findByPk(id);
    if (!solicitud) return notFound(res, 'Solicitud no encontrada');

    if (
      req.user?.rol === 'cliente' &&
      Number(solicitud.cliente_id) !== Number(req.user.cliente_id)
    ) {
      return errorResponse(res, 'No tiene acceso a esta solicitud', 403);
    }

    const { key } = await s3Service.subir(req.file, `solicitudes/${id}`);
    const doc = await SolicitudDocumento.create({
      solicitud_id: id,
      nombre_original: req.file.originalname,
      s3_key: key,
    });

    await Auditoria.registrar({
      tabla: 'solicitudes',
      registro_id: id,
      accion: 'subir_documento',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: { documento: req.file.originalname },
    });

    const url = await s3Service.getUrl(key, 7200);
    return success(res, { id: doc.id, nombre_original: doc.nombre_original, url });
  } catch (err) {
    return serverError(res, 'Error al subir documento', err);
  }
};

module.exports = {
  crear,
  listar,
  obtener,
  cambiarEstado,
  vincular,
  agregarComentario,
  subirDocumento,
  subirDocumentoAdicional,
};
