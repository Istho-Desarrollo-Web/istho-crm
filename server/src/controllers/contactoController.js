// server/src/controllers/contactoController.js
const { Op } = require('sequelize');
const { sequelize, Contacto, ContactoCliente, Cliente, Usuario, Auditoria } = require('../models');
const { success, paginated, error: errorResponse, notFound } = require('../utils/responses');
const logger = require('../utils/logger');
const ExcelJS = require('exceljs');

// ─── DIRECTORIO ───────────────────────────────────────────────────────────────

const listar = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      tipo,
      activo,
      cliente_id,
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

    // Filtrar por cliente: solo contactos vinculados a ese cliente_id
    const includeCliente = cliente_id
      ? {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'] },
          attributes: ['id', 'razon_social', 'codigo_cliente'],
          required: true,
          where: { id: parseInt(cliente_id) },
        }
      : {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'] },
          attributes: ['id', 'razon_social', 'codigo_cliente'],
          required: false,
        };

    const { count, rows } = await Contacto.findAndCountAll({
      where,
      include: [
        includeCliente,
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

const desactivarMasivo = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'Se requiere al menos un ID de contacto', 400);
    }

    const idsValidos = ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0).map(Number);
    if (idsValidos.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'IDs de contacto inválidos', 400);
    }

    const contactos = await Contacto.findAll({ where: { id: idsValidos, activo: true } });
    if (contactos.length === 0) {
      await transaction.rollback();
      return success(res, { desactivados: 0 });
    }

    await Contacto.update({ activo: false }, {
      where: { id: contactos.map((c) => c.id) },
      transaction,
    });

    for (const contacto of contactos) {
      await Auditoria.registrar({
        tabla: 'contactos',
        registro_id: contacto.id,
        accion: 'desactivar',
        usuario_id: req.user.id,
        usuario_nombre: req.user.nombre_completo,
        ip_address: req.ip,
        descripcion: `Contacto desactivado en operación masiva: ${contacto.nombre}`,
        transaction,
      });
    }

    await transaction.commit();
    return success(res, { desactivados: contactos.length });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al desactivar contactos en masa:', { message: err.message });
    return errorResponse(res, 'Error al desactivar los contactos', 500);
  }
};

const activarMasivo = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'Se requiere al menos un ID de contacto', 400);
    }
    const idsValidos = ids.filter((id) => Number.isInteger(Number(id)) && Number(id) > 0).map(Number);
    if (idsValidos.length === 0) {
      await transaction.rollback();
      return errorResponse(res, 'IDs de contacto inválidos', 400);
    }
    const contactos = await Contacto.findAll({ where: { id: idsValidos, activo: false } });
    if (contactos.length === 0) {
      await transaction.rollback();
      return success(res, { activados: 0 });
    }
    await Contacto.update({ activo: true }, {
      where: { id: contactos.map((c) => c.id) },
      transaction,
    });
    for (const contacto of contactos) {
      await Auditoria.registrar({
        tabla: 'contactos',
        registro_id: contacto.id,
        accion: 'activar',
        usuario_id: req.user.id,
        usuario_nombre: req.user.nombre_completo,
        ip_address: req.ip,
        descripcion: `Contacto activado en operación masiva: ${contacto.nombre}`,
        transaction,
      });
    }
    await transaction.commit();
    return success(res, { activados: contactos.length });
  } catch (err) {
    await transaction.rollback();
    logger.error('Error al activar contactos en masa:', { message: err.message });
    return errorResponse(res, 'Error al activar los contactos', 500);
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

// ─── EXPORTAR EXCEL ───────────────────────────────────────────────────────────

const exportarExcel = async (req, res) => {
  try {
    const { search, tipo, activo, cliente_id } = req.query;
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

    const includeClienteExcel = cliente_id
      ? {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'] },
          attributes: ['nit', 'razon_social'],
          required: true,
          where: { id: parseInt(cliente_id) },
        }
      : {
          model: Cliente,
          as: 'clientes',
          through: { attributes: ['es_principal'] },
          attributes: ['nit', 'razon_social'],
          required: false,
        };

    const contactos = await Contacto.findAll({
      where,
      include: [includeClienteExcel],
      order: [['nombre', 'ASC']],
    });

    const wb = new ExcelJS.Workbook();
    wb.creator = 'ISTHO CRM';
    const ws = wb.addWorksheet('Contactos');

    // Cabecera
    ws.columns = [
      { header: 'ID',                   key: 'id',                    width: 8  },
      { header: 'Nombre',               key: 'nombre',                width: 30 },
      { header: 'Tipo',                 key: 'tipo',                  width: 12 },
      { header: 'Cargo',                key: 'cargo',                 width: 25 },
      { header: 'Email',                key: 'email',                 width: 30 },
      { header: 'Teléfono',             key: 'telefono',              width: 18 },
      { header: 'Celular',              key: 'celular',               width: 18 },
      { header: 'Clientes (NIT)',        key: 'nits',                  width: 35 },
      { header: 'Clientes (Razón Social)', key: 'razones',            width: 50 },
      { header: 'Recibe Notificaciones', key: 'recibe_notificaciones', width: 22 },
      { header: 'Notas',                key: 'notas',                 width: 40 },
      { header: 'Estado',               key: 'activo',                width: 12 },
    ];

    // Estilo cabecera
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 22;

    // Filas
    contactos.forEach((c) => {
      const clientes = c.clientes || [];
      ws.addRow({
        id:                    c.id,
        nombre:                c.nombre,
        tipo:                  c.tipo,
        cargo:                 c.cargo || '',
        email:                 c.email || '',
        telefono:              c.telefono || '',
        celular:               c.celular || '',
        nits:                  clientes.map((cl) => cl.nit).join(', '),
        razones:               clientes.map((cl) => cl.razon_social).join(', '),
        recibe_notificaciones: c.recibe_notificaciones ? 'Sí' : 'No',
        notas:                 c.notas || '',
        activo:                c.activo ? 'Activo' : 'Inactivo',
      });
    });

    // Bordes en todas las filas de datos
    ws.eachRow((row, rn) => {
      if (rn === 1) return;
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      });
      if (rn % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        });
      }
    });

    const fecha = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="contactos-${fecha}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('Error al exportar contactos Excel:', { message: err.message });
    return errorResponse(res, 'Error al exportar los contactos', 500);
  }
};

// ─── PLANTILLA DE IMPORTACIÓN ─────────────────────────────────────────────────

const descargarPlantilla = async (req, res) => {
  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'ISTHO CRM';

    const ws = wb.addWorksheet('Contactos');
    ws.columns = [
      { header: 'nombre',       key: 'nombre',       width: 30 },
      { header: 'tipo',         key: 'tipo',         width: 12 },
      { header: 'cargo',        key: 'cargo',        width: 25 },
      { header: 'email',        key: 'email',        width: 30 },
      { header: 'telefono',     key: 'telefono',     width: 18 },
      { header: 'celular',      key: 'celular',      width: 18 },
      { header: 'nit',          key: 'nit',          width: 20 },
      { header: 'es_principal', key: 'es_principal', width: 15 },
      { header: 'recibe_notif', key: 'recibe_notif', width: 18 },
      { header: 'notas',        key: 'notas',        width: 40 },
    ];

    // Estilo cabecera
    ws.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE74C3C' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    ws.getRow(1).height = 22;

    // Fila de ejemplo
    ws.addRow({
      nombre:       'Juan Pérez',
      tipo:         'externo',
      cargo:        'Gerente Logística',
      email:        'juan.perez@empresa.com',
      telefono:     '(604) 123 4567',
      celular:      '3001234567',
      nit:          '900123456',
      es_principal: 'true',
      recibe_notif: 'true',
      notas:        'Contacto principal para despachos',
    });

    // Hoja de instrucciones
    const wsInst = wb.addWorksheet('Instrucciones');
    wsInst.getColumn(1).width = 60;
    [
      ['INSTRUCCIONES DE IMPORTACIÓN MASIVA DE CONTACTOS', true],
      ['', false],
      ['CAMPOS REQUERIDOS:', true],
      ['  • nombre — Nombre completo del contacto (máx. 150 caracteres)', false],
      ['', false],
      ['CAMPOS OPCIONALES:', true],
      ['  • tipo — "istho" o "externo" (default: externo)', false],
      ['  • cargo — Cargo o puesto del contacto', false],
      ['  • email — Email único. Si ya existe en CRM, la fila se omite.', false],
      ['  • telefono — Teléfono fijo', false],
      ['  • celular — Teléfono celular', false],
      ['  • nit — NIT del cliente para vincular el contacto', false],
      ['  • es_principal — true/false. Indica si es el contacto principal del cliente.', false],
      ['  • recibe_notif — true/false (default: true)', false],
      ['  • notas — Observaciones adicionales', false],
      ['', false],
      ['NOTAS IMPORTANTES:', true],
      ['  • Si el email ya existe en BD, se actualizan los datos del contacto con los del archivo.', false],
      ['  • El NIT debe corresponder a un cliente registrado en el CRM.', false],
      ['  • Los valores de es_principal y recibe_notif aceptan: true/false, si/no, 1/0.', false],
    ].forEach(([text, bold]) => {
      const row = wsInst.addRow([text]);
      if (bold) row.getCell(1).font = { bold: true };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="plantilla-contactos.xlsx"');
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    logger.error('Error al generar plantilla de contactos:', { message: err.message });
    return errorResponse(res, 'Error al generar la plantilla', 500);
  }
};

// ─── IMPORTAR DESDE EXCEL ─────────────────────────────────────────────────────

const importarContactos = async (req, res) => {
  try {
    if (!req.file) return errorResponse(res, 'No se recibió ningún archivo', 400);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(req.file.buffer);
    const ws = wb.worksheets[0];
    if (!ws) return errorResponse(res, 'El archivo no contiene hojas de cálculo', 400);

    // Mapear columnas
    const colIdx = {};
    ws.getRow(1).eachCell((cell, colNum) => {
      const h = String(cell.value || '').trim().toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
      if (/^nombre$/.test(h))     colIdx.nombre       = colNum;
      else if (/^tipo$/.test(h))  colIdx.tipo         = colNum;
      else if (/^cargo$/.test(h)) colIdx.cargo        = colNum;
      else if (/^email$/.test(h)) colIdx.email        = colNum;
      else if (/^telefono$/.test(h)) colIdx.telefono  = colNum;
      else if (/^celular$/.test(h))  colIdx.celular   = colNum;
      else if (/^nit$/.test(h))      colIdx.nit       = colNum;
      else if (/principal/.test(h))  colIdx.es_principal = colNum;
      else if (/recibe/.test(h))     colIdx.recibe_notif = colNum;
      else if (/^nota/.test(h))      colIdx.notas     = colNum;
    });

    if (!colIdx.nombre) return errorResponse(res, 'Columna "nombre" no encontrada en el archivo', 400);

    const limpiar = (val) => { const s = String(val ?? '').trim(); return s || null; };
    const limpiarEmail = (val) => { const e = limpiar(val); return e ? e.toLowerCase() : null; };
    const parsearBool = (val, def = true) => {
      if (val === null || val === undefined || val === '') return def;
      const s = String(val).trim().toLowerCase();
      return ['1','true','si','sí','yes','verdadero'].includes(s) ? true
           : ['0','false','no','falso'].includes(s) ? false
           : def;
    };

    // Parsear filas
    const filas = [];
    ws.eachRow((row, rn) => {
      if (rn === 1) return;
      const nombre = limpiar(row.getCell(colIdx.nombre)?.value);
      if (!nombre) return;
      const tipoRaw = limpiar(colIdx.tipo ? row.getCell(colIdx.tipo)?.value : null);
      filas.push({
        nombre,
        tipo: tipoRaw === 'istho' ? 'istho' : 'externo',
        cargo:    limpiar(colIdx.cargo    ? row.getCell(colIdx.cargo)?.value    : null),
        email:    limpiarEmail(colIdx.email ? row.getCell(colIdx.email)?.value   : null),
        telefono: limpiar(colIdx.telefono ? row.getCell(colIdx.telefono)?.value : null),
        celular:  limpiar(colIdx.celular  ? row.getCell(colIdx.celular)?.value  : null),
        nit:      limpiar(colIdx.nit      ? row.getCell(colIdx.nit)?.value      : null),
        es_principal:        parsearBool(colIdx.es_principal ? row.getCell(colIdx.es_principal)?.value : null, false),
        recibe_notificaciones: parsearBool(colIdx.recibe_notif ? row.getCell(colIdx.recibe_notif)?.value : null, true),
        notas:    limpiar(colIdx.notas    ? row.getCell(colIdx.notas)?.value    : null),
        _fila: rn,
      });
    });

    if (!filas.length) return errorResponse(res, 'El archivo no contiene filas válidas', 400);

    // Resolver clientes
    const nitsUnicos = [...new Set(filas.map(f => f.nit).filter(Boolean))];
    let clientePorNit = {};
    if (nitsUnicos.length) {
      const clientes = await Cliente.findAll({ where: { nit: nitsUnicos }, attributes: ['id','nit'] });
      clientePorNit = Object.fromEntries(clientes.map(c => [c.nit, c]));
    }

    // Emails ya existentes
    const emailsEnExcel = [...new Set(filas.map(f => f.email).filter(Boolean))];
    let emailsExistentes = new Set();
    if (emailsEnExcel.length) {
      const existentes = await Contacto.findAll({ where: { email: emailsEnExcel }, attributes: ['email'] });
      emailsExistentes = new Set(existentes.map(c => c.email));
    }

    const contadores = { creados: 0, actualizados: 0, vinculados: 0, errores: [] };

    for (const fila of filas) {
      const emailYaExiste = fila.email && emailsExistentes.has(fila.email);

      const transaction = await sequelize.transaction();
      try {
        let contacto;

        if (emailYaExiste) {
          contacto = await Contacto.findOne({ where: { email: fila.email }, transaction });
          const datosActualizar = {};
          if (fila.nombre) datosActualizar.nombre = fila.nombre;
          if (fila.tipo) datosActualizar.tipo = fila.tipo;
          if (fila.cargo !== null) datosActualizar.cargo = fila.cargo;
          if (fila.telefono !== null) datosActualizar.telefono = fila.telefono;
          if (fila.celular !== null) datosActualizar.celular = fila.celular;
          if (fila.notas !== null) datosActualizar.notas = fila.notas;
          await contacto.update(datosActualizar, { transaction });
          contadores.actualizados++;
        } else {
          contacto = await Contacto.create({
            tipo: fila.tipo, nombre: fila.nombre, cargo: fila.cargo,
            telefono: fila.telefono, celular: fila.celular, email: fila.email,
            recibe_notificaciones: fila.recibe_notificaciones,
            tipos_notificacion: ['todas'], notas: fila.notas, activo: true,
          }, { transaction });
          contadores.creados++;
          if (fila.email) emailsExistentes.add(fila.email);
        }

        const cliente = fila.nit ? clientePorNit[fila.nit] : null;
        if (cliente) {
          const yaVinculado = await ContactoCliente.findOne({
            where: { contacto_id: contacto.id, cliente_id: cliente.id },
            transaction,
          });
          if (!yaVinculado) {
            if (fila.es_principal) {
              await ContactoCliente.update({ es_principal: false }, { where: { cliente_id: cliente.id }, transaction });
            }
            await ContactoCliente.create({
              contacto_id: contacto.id, cliente_id: cliente.id, es_principal: fila.es_principal,
            }, { transaction });
            contadores.vinculados++;
          } else if (yaVinculado.es_principal !== fila.es_principal) {
            if (fila.es_principal) {
              await ContactoCliente.update({ es_principal: false }, { where: { cliente_id: cliente.id }, transaction });
            }
            await yaVinculado.update({ es_principal: fila.es_principal }, { transaction });
          }
        }

        await Auditoria.registrar({
          tabla: 'contactos', registro_id: contacto.id,
          accion: emailYaExiste ? 'editar' : 'crear',
          usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo,
          datos_nuevos: { nombre: fila.nombre, tipo: fila.tipo, email: fila.email },
          ip_address: req.ip,
          descripcion: `Contacto ${emailYaExiste ? 'actualizado' : 'importado'}: ${fila.nombre}`,
          transaction,
        });

        await transaction.commit();
      } catch (err) {
        await transaction.rollback();
        contadores.errores.push({ fila: fila._fila, nombre: fila.nombre, error: err.message });
      }
    }

    return success(res, {
      creados:      contadores.creados,
      actualizados: contadores.actualizados,
      vinculados:   contadores.vinculados,
      errores:      contadores.errores,
      total:        filas.length,
    });
  } catch (err) {
    logger.error('Error al importar contactos:', { message: err.message });
    return errorResponse(res, 'Error al importar los contactos', 500);
  }
};

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  desactivarMasivo,
  activarMasivo,
  asignarCliente,
  desasignarCliente,
  listarContactosCliente,
  asignarContactoDesdeCliente,
  desasignarContactoDesdeCliente,
  exportarExcel,
  descargarPlantilla,
  importarContactos,
};
