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
  ClienteResponsable,
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
     WHERE numero_solicitud LIKE :patron`,
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
  const registros = await ClienteResponsable.findAll({
    where: { cliente_id },
    attributes: ['usuario_id'],
  });
  if (registros.length > 0) {
    return registros.map((r) => r.usuario_id);
  }
  // Fallback: todos los admin activos
  return notificacionService.getUsuariosPorRol(['admin']);
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
      cliente_id,
    } = req.body;

    if (!tipo || !['ingreso', 'despacho'].includes(tipo)) {
      await t.rollback();
      return errorResponse(res, 'tipo debe ser "ingreso" o "despacho"', 400);
    }
    if (!cliente_id) {
      await t.rollback();
      return errorResponse(res, 'cliente_id es requerido', 400);
    }
    if (!Array.isArray(detalles) || detalles.length === 0) {
      await t.rollback();
      return errorResponse(res, 'Debe incluir al menos un producto en detalles', 400);
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

    const lineas = detalles.map((d) => ({
      solicitud_id: solicitud.id,
      referencia: d.referencia,
      descripcion: d.descripcion || null,
      cantidad: Number(d.cantidad),
      unidad: d.unidad || 'unidad',
    }));
    await SolicitudDetalle.bulkCreate(lineas, { transaction: t });

    await t.commit();

    // Acciones post-commit (no bloquean la respuesta)
    setImmediate(async () => {
      try {
        const accion_url = `/clientes/${cliente_id}?tab=solicitudes&id=${solicitud.id}`;
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

          // Email
          const responsablesUsuarios = await Usuario.findAll({
            where: { id: { [Op.in]: responsablesIds }, activo: true },
            attributes: ['email', 'nombre'],
          });
          const emails = responsablesUsuarios.map((u) => u.email).filter(Boolean);
          if (emails.length > 0) {
            const appUrl =
              process.env.APP_URL ||
              (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',')[0].trim();
            try {
              await emailService.enviarManual({
                para: emails,
                asunto: `Nueva ${tipoLabel}: ${numero_solicitud} — ${razonSocial}`,
                cuerpoHtml: `
                  <h2 style="color:#E74C3C">${tipoLabel} recibida</h2>
                  <p><strong>N° Solicitud:</strong> ${numero_solicitud}</p>
                  <p><strong>Cliente:</strong> ${razonSocial}</p>
                  <p><strong>Prioridad:</strong> ${prioridad || 'normal'}</p>
                  ${fecha_estimada ? `<p><strong>Fecha estimada:</strong> ${fecha_estimada}</p>` : ''}
                  ${notas ? `<p><strong>Notas:</strong> ${notas}</p>` : ''}
                  <p style="margin-top:20px">
                    <a href="${appUrl}${accion_url}"
                       style="background:#E74C3C;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">
                      Ver Solicitud
                    </a>
                  </p>
                `,
              });
            } catch (mailErr) {
              logger.error('[SolicitudController] Error enviando email:', mailErr.message);
            }
          }
        }

        // Auditoría
        await Auditoria.registrar({
          tabla: 'solicitudes',
          registro_id: solicitud.id,
          accion: 'crear',
          usuario_id: req.user.id,
          usuario_nombre: req.user.nombre_completo || req.user.username,
          datos_nuevos: { numero_solicitud, tipo, estado: 'recibida', cliente_id },
        });
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
    if (cliente_id) where.cliente_id = cliente_id;
    if (desde || hasta) {
      where.created_at = {};
      if (desde) where.created_at[Op.gte] = new Date(desde + 'T00:00:00');
      if (hasta) where.created_at[Op.lte] = new Date(hasta + 'T23:59:59');
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
        {
          model: SolicitudComentario,
          as: 'comentarios',
          where: comentariosWhere,
          required: false,
          include: [
            {
              model: Usuario,
              as: 'autor',
              attributes: ['id', 'nombre', 'apellido', 'rol', 'avatar_url'],
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

    if (esCliente && Number(solicitud.cliente_id) !== Number(req.user.cliente_id)) {
      return errorResponse(res, 'No tiene acceso a esta solicitud', 403);
    }

    let documento_url = solicitud.documento_url;
    if (documento_url && s3Service.isS3Key && s3Service.isS3Key(documento_url)) {
      documento_url = await s3Service.getUrl(documento_url, 900);
    }

    return success(res, { ...solicitud.toJSON(), documento_url });
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
      await SolicitudComentario.create({
        solicitud_id: id,
        usuario_id: req.user.id,
        mensaje: `Solicitud rechazada: ${motivo.trim()}`,
        es_interno: false,
      });
    }

    const estadoAnterior = solicitud.estado;
    await solicitud.update({ estado });

    await Auditoria.registrar({
      tabla: 'solicitudes',
      registro_id: id,
      accion: 'cambiar_estado',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_anteriores: { estado: estadoAnterior },
      datos_nuevos: { estado, motivo: motivo || null },
    });

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

    const operacion = await Operacion.findByPk(operacion_id);
    if (!operacion) return notFound(res, 'Operación no encontrada');

    const nuevoEstado = solicitud.estado === 'recibida' ? 'en_proceso' : solicitud.estado;
    await solicitud.update({ operacion_id, estado: nuevoEstado });

    await Auditoria.registrar({
      tabla: 'solicitudes',
      registro_id: id,
      accion: 'vincular_operacion',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo || req.user.username,
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

    const autor = await Usuario.findByPk(req.user.id, {
      attributes: ['id', 'nombre', 'apellido', 'rol', 'avatar_url'],
    });

    return created(res, 'Comentario agregado', { ...comentario.toJSON(), autor });
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

    const url = await s3Service.getUrl(key, 900);
    return success(res, { documento_url: url });
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
};
