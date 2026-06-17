// server/src/controllers/contactoController.js
const { Op } = require('sequelize');
const { sequelize, Contacto, ContactoCliente, Cliente, Usuario, Auditoria } = require('../models');
const { success, paginated, error: errorResponse, notFound } = require('../utils/responses');
const logger = require('../utils/logger');

// ─── DIRECTORIO ───────────────────────────────────────────────────────────────

const listar = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      tipo,
      activo,
    } = req.query;

    const where = {};

    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { cargo: { [Op.like]: `%${search}%` } },
      ];
    }
    if (tipo && tipo !== 'todos') where.tipo = tipo;
    if (activo !== undefined && activo !== 'todos') where.activo = activo === 'true';

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Contacto.findAndCountAll({
      where,
      include: [
        {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'] },
          attributes: ['id', 'razon_social', 'codigo_cliente'],
          required: false,
        },
        {
          model: Usuario,
          as: 'usuarioCrm',
          attributes: ['id', 'nombre_completo', 'rol', 'email'],
          required: false,
        },
      ],
      limit: parseInt(limit),
      offset,
      order: [['nombre', 'ASC']],
      distinct: true,
    });

    return paginated(res, rows, { total: count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    logger.error('Error al listar contactos directorio:', { message: err.message });
    return errorResponse(res, 'Error al obtener los contactos', 500);
  }
};

const obtenerPorId = async (req, res) => {
  try {
    const contacto = await Contacto.findByPk(req.params.id, {
      include: [
        {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['id', 'es_principal'] },
          attributes: ['id', 'razon_social', 'codigo_cliente', 'estado'],
        },
        {
          model: Usuario,
          as: 'usuarioCrm',
          attributes: ['id', 'nombre_completo', 'rol', 'email', 'avatar_url'],
          required: false,
        },
      ],
    });

    if (!contacto) return notFound(res, 'Contacto no encontrado');

    return success(res, contacto);
  } catch (err) {
    logger.error('Error al obtener contacto:', { message: err.message, id: req.params.id });
    return errorResponse(res, 'Error al obtener el contacto', 500);
  }
};

const crear = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const {
      nombre, tipo = 'externo', usuario_id,
      cargo, telefono, celular, email,
      recibe_notificaciones, tipos_notificacion, notas,
    } = req.body;

    if (email) {
      const existente = await Contacto.findOne({ where: { email } });
      if (existente) {
        await transaction.rollback();
        return errorResponse(res, 'Ya existe un contacto con ese email', 400, null, 'EMAIL_DUPLICADO');
      }
    }

    if (usuario_id) {
      const usuarioExiste = await Usuario.findByPk(usuario_id);
      if (!usuarioExiste) {
        await transaction.rollback();
        return notFound(res, 'Usuario CRM no encontrado');
      }
      const contactoConUsuario = await Contacto.findOne({ where: { usuario_id } });
      if (contactoConUsuario) {
        await transaction.rollback();
        return errorResponse(res, 'Ese usuario ya está vinculado a otro contacto', 400, null, 'USUARIO_DUPLICADO');
      }
    }

    const contacto = await Contacto.create(
      { nombre, tipo, usuario_id: usuario_id || null, cargo, telefono, celular, email,
        recibe_notificaciones, tipos_notificacion, notas },
      { transaction }
    );

    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { nombre, tipo, email, cargo },
      ip_address: req.ip,
      descripcion: `Contacto creado: ${nombre}`,
      transaction,
    });

    await transaction.commit();
    return success(res, contacto, 201);
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al crear contacto:', { message: err.message });
    return errorResponse(res, 'Error al crear el contacto', 500);
  }
};

const actualizar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contacto = await Contacto.findByPk(req.params.id);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    const { email, usuario_id } = req.body;

    if (email && email !== contacto.email) {
      const existente = await Contacto.findOne({
        where: { email, id: { [Op.ne]: contacto.id } },
      });
      if (existente) {
        await transaction.rollback();
        return errorResponse(res, 'Ya existe un contacto con ese email', 400, null, 'EMAIL_DUPLICADO');
      }
    }

    if (usuario_id !== undefined && usuario_id !== null && usuario_id !== contacto.usuario_id) {
      const usuarioExiste = await Usuario.findByPk(usuario_id);
      if (!usuarioExiste) {
        await transaction.rollback();
        return notFound(res, 'Usuario CRM no encontrado');
      }
      const contactoConUsuario = await Contacto.findOne({
        where: { usuario_id, id: { [Op.ne]: contacto.id } },
      });
      if (contactoConUsuario) {
        await transaction.rollback();
        return errorResponse(res, 'Ese usuario ya está vinculado a otro contacto', 400, null, 'USUARIO_DUPLICADO');
      }
    }

    const datosPrevios = contacto.toJSON();
    await contacto.update(req.body, { transaction });

    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'editar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: datosPrevios,
      datos_nuevos: req.body,
      ip_address: req.ip,
      descripcion: `Contacto editado: ${contacto.nombre}`,
      transaction,
    });

    await transaction.commit();
    return success(res, await Contacto.findByPk(contacto.id));
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al actualizar contacto:', { message: err.message, id: req.params.id });
    return errorResponse(res, 'Error al actualizar el contacto', 500);
  }
};

const desactivar = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contacto = await Contacto.findByPk(req.params.id);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    await contacto.update({ activo: false }, { transaction });

    await Auditoria.registrar({
      tabla: 'contactos',
      registro_id: contacto.id,
      accion: 'desactivar',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      ip_address: req.ip,
      descripcion: `Contacto desactivado: ${contacto.nombre}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: 'Contacto desactivado correctamente' });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al desactivar contacto:', { message: err.message, id: req.params.id });
    return errorResponse(res, 'Error al desactivar el contacto', 500);
  }
};

// ─── ASIGNACIONES ─────────────────────────────────────────────────────────────

const asignarCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contactoId = parseInt(req.params.id);
    const { cliente_id, es_principal = false } = req.body;

    const contacto = await Contacto.findByPk(contactoId);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    const cliente = await Cliente.findByPk(cliente_id);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }

    const [pivot, creado] = await ContactoCliente.upsert(
      { contacto_id: contactoId, cliente_id: parseInt(cliente_id), es_principal },
      { transaction, returning: true }
    );

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: pivot.id || contactoId,
      accion: creado ? 'asignar_cliente' : 'actualizar_asignacion',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { contacto_id: contactoId, cliente_id, es_principal },
      ip_address: req.ip,
      descripcion: `Contacto ${contacto.nombre} ${creado ? 'asignado a' : 'actualizado en'} cliente ${cliente.razon_social}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: `Contacto ${creado ? 'asignado' : 'actualizado'}`, pivot }, creado ? 201 : 200);
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al asignar cliente a contacto:', { message: err.message });
    return errorResponse(res, 'Error al asignar el cliente', 500);
  }
};

const desasignarCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const contactoId = parseInt(req.params.id);
    const clienteId = parseInt(req.params.clienteId);

    const pivot = await ContactoCliente.findOne({
      where: { contacto_id: contactoId, cliente_id: clienteId },
    });

    if (!pivot) {
      await transaction.rollback();
      return notFound(res, 'El contacto no está asignado a ese cliente');
    }

    await pivot.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: contactoId,
      accion: 'desasignar_cliente',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: pivot.toJSON(),
      ip_address: req.ip,
      descripcion: `Contacto desasignado del cliente ${clienteId}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: 'Contacto desasignado correctamente' });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al desasignar cliente:', { message: err.message });
    return errorResponse(res, 'Error al desasignar el cliente', 500);
  }
};

// ─── DESDE CLIENTE DETAIL ─────────────────────────────────────────────────────

const listarContactosCliente = async (req, res) => {
  try {
    const clienteId = parseInt(req.params.id);
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) return notFound(res, 'Cliente no encontrado');

    const contactos = await Contacto.findAll({
      include: [
        {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'], where: { cliente_id: clienteId } },
          attributes: [],
          required: true,
        },
        {
          model: Usuario,
          as: 'usuarioCrm',
          attributes: ['id', 'nombre_completo', 'rol'],
          required: false,
        },
      ],
      order: [['nombre', 'ASC']],
    });

    const resultado = contactos.map((c) => {
      const plain = c.toJSON();
      return {
        ...plain,
        es_principal: plain.clientes?.[0]?.ContactoCliente?.es_principal ?? false,
      };
    });

    return success(res, resultado);
  } catch (err) {
    logger.error('Error al listar contactos del cliente:', { message: err.message, clienteId: req.params.id });
    return errorResponse(res, 'Error al obtener los contactos', 500);
  }
};

const asignarContactoDesdeCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const clienteId = parseInt(req.params.id);
    const { contacto_id, es_principal = false } = req.body;

    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      await transaction.rollback();
      return notFound(res, 'Cliente no encontrado');
    }

    const contacto = await Contacto.findByPk(contacto_id);
    if (!contacto) {
      await transaction.rollback();
      return notFound(res, 'Contacto no encontrado');
    }

    const [pivot, creado] = await ContactoCliente.upsert(
      { contacto_id: parseInt(contacto_id), cliente_id: clienteId, es_principal },
      { transaction, returning: true }
    );

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: pivot.id || clienteId,
      accion: creado ? 'asignar_contacto' : 'actualizar_asignacion',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { contacto_id, cliente_id: clienteId, es_principal },
      ip_address: req.ip,
      descripcion: `Contacto ${contacto.nombre} asignado al cliente ${cliente.razon_social}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: `Contacto ${creado ? 'asignado' : 'actualizado'}`, pivot }, creado ? 201 : 200);
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al asignar contacto desde cliente:', { message: err.message });
    return errorResponse(res, 'Error al asignar el contacto', 500);
  }
};

const desasignarContactoDesdeCliente = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const clienteId = parseInt(req.params.id);
    const contactoId = parseInt(req.params.contactoId);

    const pivot = await ContactoCliente.findOne({
      where: { contacto_id: contactoId, cliente_id: clienteId },
    });

    if (!pivot) {
      await transaction.rollback();
      return notFound(res, 'El contacto no está asignado a este cliente');
    }

    await pivot.destroy({ transaction });

    await Auditoria.registrar({
      tabla: 'contacto_clientes',
      registro_id: contactoId,
      accion: 'desasignar_contacto',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_anteriores: pivot.toJSON(),
      ip_address: req.ip,
      descripcion: `Contacto ${contactoId} desasignado del cliente ${clienteId}`,
      transaction,
    });

    await transaction.commit();
    return success(res, { mensaje: 'Contacto desasignado correctamente' });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al desasignar contacto desde cliente:', { message: err.message });
    return errorResponse(res, 'Error al desasignar el contacto', 500);
  }
};

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  asignarCliente,
  desasignarCliente,
  listarContactosCliente,
  asignarContactoDesdeCliente,
  desasignarContactoDesdeCliente,
};
