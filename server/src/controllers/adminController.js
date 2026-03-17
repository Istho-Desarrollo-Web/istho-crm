/**
 * ISTHO CRM - Controlador de Administración
 *
 * CRUD de Usuarios internos, Roles y Permisos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { Usuario, Rol, Permiso, RolPermiso, Cliente, Auditoria, sequelize } = require('../models');
const { success, successMessage, created, serverError, notFound, badRequest, forbidden } = require('../utils/responses');
const { invalidarCachePermisos } = require('../middleware/auth');
const logger = require('../utils/logger');
const { enviarBienvenidaUsuarioCliente, enviarBienvenida, enviarReseteoPassword } = require('../services/emailService');
const { getClientIP } = require('../utils/helpers');

// ═══════════════════════════════════════════════════════════════════════════
// USUARIOS INTERNOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/usuarios
 */
const listarUsuarios = async (req, res) => {
  try {
    const { page = 1, limit = 20, search, rol_id, activo, sort = 'created_at', order = 'DESC' } = req.query;
    const offset = (page - 1) * limit;

    const where = {};

    if (search) {
      where[Op.or] = [
        { nombre_completo: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    if (rol_id) where.rol_id = rol_id;
    if (activo !== undefined) where.activo = activo === 'true';

    const { rows, count } = await Usuario.findAndCountAll({
      where,
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
      include: [
        { model: Rol, as: 'rolInfo', attributes: ['id', 'nombre', 'codigo', 'color', 'nivel_jerarquia'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social', 'codigo_cliente'], required: false }
      ],
      order: [[sort, order]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    return success(res, {
      usuarios: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    logger.error('Error al listar usuarios:', { message: error.message });
    return serverError(res, 'Error al listar usuarios', error);
  }
};

/**
 * GET /admin/usuarios/:id
 */
const obtenerUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
      include: [
        { model: Rol, as: 'rolInfo', attributes: ['id', 'nombre', 'codigo', 'color', 'nivel_jerarquia'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social', 'codigo_cliente'], required: false }
      ]
    });

    if (!usuario) return notFound(res, 'Usuario no encontrado');
    return success(res, usuario);
  } catch (error) {
    logger.error('Error al obtener usuario:', { message: error.message });
    return serverError(res, 'Error al obtener usuario', error);
  }
};

/**
 * POST /admin/usuarios
 */
const crearUsuario = async (req, res) => {
  try {
    const { username, email, password, nombre, apellido, telefono, cargo, departamento, rol_id, cliente_id } = req.body;

    if (!username || !email || !password || !rol_id) {
      return badRequest(res, 'username, email, password y rol_id son requeridos');
    }

    // Verificar que el rol existe
    const rol = await Rol.findByPk(rol_id);
    if (!rol) return badRequest(res, 'El rol especificado no existe');

    // Verificar unicidad
    const existente = await Usuario.findOne({
      where: { [Op.or]: [{ username }, { email: email.toLowerCase() }] }
    });
    if (existente) {
      return badRequest(res, existente.username === username
        ? 'El username ya está en uso'
        : 'El email ya está registrado'
      );
    }

    const usuario = await Usuario.create({
      username,
      email: email.toLowerCase(),
      password_hash: password,
      nombre,
      apellido,
      telefono,
      cargo,
      departamento,
      rol: rol.codigo,
      rol_id: rol.id,
      cliente_id: rol.es_cliente ? cliente_id : null,
      activo: true,
      invitado_por: req.user.id,
      fecha_invitacion: new Date()
    });

    const resultado = await Usuario.findByPk(usuario.id, {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
      include: [
        { model: Rol, as: 'rolInfo', attributes: ['id', 'nombre', 'codigo', 'color'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'], required: false }
      ]
    });

    // Enviar email de bienvenida con credenciales
    try {
      if (rol.es_cliente && cliente_id) {
        const clienteNombre = resultado.cliente?.razon_social || '';
        await enviarBienvenidaUsuarioCliente({
          email: email.toLowerCase(),
          nombre: `${nombre || ''} ${apellido || ''}`.trim() || username,
          username,
          password,
          cliente: clienteNombre,
          invitadoPor: req.user.nombre_completo || req.user.username,
          esReenvio: false
        });
        logger.info('Email de bienvenida (portal) enviado:', { usuarioId: usuario.id, email });
      } else {
        await enviarBienvenida({
          nombre_completo: `${nombre || ''} ${apellido || ''}`.trim() || username,
          username,
          email: email.toLowerCase(),
          rol: rol.codigo
        }, password);
        logger.info('Email de bienvenida enviado:', { usuarioId: usuario.id, email });
      }
    } catch (emailError) {
      logger.error('Error al enviar email de bienvenida:', { message: emailError.message });
      // No fallar la creación por error de email
    }

    logger.info('Usuario creado:', { id: usuario.id, username, rol: rol.codigo, creadoPor: req.user.id });
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: usuario.id, accion: 'crear',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: { username, email, rol: rol.codigo, rol_id: rol.id },
      ip_address: getClientIP(req), descripcion: `Usuario "${username}" creado con rol ${rol.nombre}`
    });
    return created(res, 'Usuario creado exitosamente', resultado);
  } catch (error) {
    logger.error('Error al crear usuario:', { message: error.message });
    return serverError(res, 'Error al crear usuario', error);
  }
};

/**
 * PUT /admin/usuarios/:id
 */
const actualizarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    const { nombre, apellido, email, telefono, cargo, departamento, rol_id, activo, cliente_id } = req.body;

    // Si cambia rol, verificar que existe
    if (rol_id && rol_id !== usuario.rol_id) {
      const rol = await Rol.findByPk(rol_id);
      if (!rol) return badRequest(res, 'El rol especificado no existe');
      usuario.rol = rol.codigo;
      usuario.rol_id = rol.id;
      usuario.cliente_id = rol.es_cliente ? (cliente_id || usuario.cliente_id) : null;
    }

    // Si cambia email, verificar unicidad
    if (email && email.toLowerCase() !== usuario.email) {
      const existeEmail = await Usuario.findOne({ where: { email: email.toLowerCase(), id: { [Op.ne]: usuario.id } } });
      if (existeEmail) return badRequest(res, 'El email ya está registrado');
      usuario.email = email.toLowerCase();
    }

    if (nombre !== undefined) usuario.nombre = nombre;
    if (apellido !== undefined) usuario.apellido = apellido;
    if (telefono !== undefined) usuario.telefono = telefono;
    if (cargo !== undefined) usuario.cargo = cargo;
    if (departamento !== undefined) usuario.departamento = departamento;
    if (activo !== undefined) usuario.activo = activo;

    await usuario.save();

    const resultado = await Usuario.findByPk(usuario.id, {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] },
      include: [
        { model: Rol, as: 'rolInfo', attributes: ['id', 'nombre', 'codigo', 'color'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'], required: false }
      ]
    });

    logger.info('Usuario actualizado:', { id: usuario.id, modificadoPor: req.user.id });
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: usuario.id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: req.body, ip_address: getClientIP(req),
      descripcion: `Usuario "${usuario.username}" actualizado`
    });
    return successMessage(res, 'Usuario actualizado exitosamente', resultado);
  } catch (error) {
    logger.error('Error al actualizar usuario:', { message: error.message });
    return serverError(res, 'Error al actualizar usuario', error);
  }
};

/**
 * PUT /admin/usuarios/:id/resetear-password
 */
const resetearPassword = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [
        { model: Rol, as: 'rolInfo', attributes: ['id', 'nombre', 'codigo', 'es_cliente'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'], required: false }
      ]
    });
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    const { password, enviar_correo } = req.body;
    if (!password || password.length < 6) {
      return badRequest(res, 'La contraseña debe tener al menos 6 caracteres');
    }

    usuario.password_hash = password;
    usuario.requiere_cambio_password = true;
    await usuario.save();

    // Enviar correo con la nueva contraseña si se solicita
    let correoEnviado = false;
    if (enviar_correo && usuario.email) {
      try {
        await enviarReseteoPassword({
          email: usuario.email,
          nombre: usuario.nombre_completo || usuario.getNombreDisplay(),
          username: usuario.username,
          password,
          cliente: usuario.cliente?.razon_social || null,
          reseteadoPor: req.user.nombre_completo || req.user.username
        });
        correoEnviado = true;
        logger.info('Correo de reseteo enviado:', { usuarioId: usuario.id, email: usuario.email });
      } catch (emailError) {
        logger.error('Error al enviar correo de reseteo:', { message: emailError.message });
      }
    }

    logger.info('Password reseteado:', { id: usuario.id, por: req.user.id, correoEnviado });
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: usuario.id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      ip_address: getClientIP(req), descripcion: `Contraseña de "${usuario.username}" reseteada${correoEnviado ? ' (correo enviado)' : ''}`
    });

    const mensaje = correoEnviado
      ? 'Contraseña reseteada exitosamente. Se envió un correo con las nuevas credenciales.'
      : 'Contraseña reseteada exitosamente. El usuario deberá cambiarla al iniciar sesión.';
    return successMessage(res, mensaje, { correo_enviado: correoEnviado });
  } catch (error) {
    logger.error('Error al resetear password:', { message: error.message });
    return serverError(res, 'Error al resetear contraseña', error);
  }
};

/**
 * POST /admin/usuarios/:id/reenviar-credenciales
 * Genera nueva contraseña temporal y envía email con credenciales
 */
const reenviarCredenciales = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [
        { model: Rol, as: 'rolInfo', attributes: ['id', 'nombre', 'codigo', 'es_cliente'] },
        { model: Cliente, as: 'cliente', attributes: ['id', 'razon_social'], required: false }
      ]
    });
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    // Generar contraseña temporal
    const crypto = require('crypto');
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let passwordTemporal = '';
    for (let i = 0; i < 12; i++) {
      passwordTemporal += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }

    // Actualizar contraseña
    usuario.password_hash = passwordTemporal;
    usuario.requiere_cambio_password = true;
    await usuario.save();

    // Enviar email
    const esCliente = usuario.rolInfo?.es_cliente || usuario.rol === 'cliente';

    if (esCliente) {
      await enviarBienvenidaUsuarioCliente({
        email: usuario.email,
        nombre: usuario.nombre_completo || usuario.getNombreDisplay(),
        username: usuario.username,
        password: passwordTemporal,
        cliente: usuario.cliente?.razon_social || '',
        invitadoPor: req.user.nombre_completo || req.user.username,
        esReenvio: true
      });
    } else {
      await enviarBienvenida({
        nombre_completo: usuario.nombre_completo || usuario.getNombreDisplay(),
        username: usuario.username,
        email: usuario.email,
        rol: usuario.rol
      }, passwordTemporal);
    }

    logger.info('Credenciales reenviadas:', { usuarioId: usuario.id, por: req.user.id });
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: usuario.id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      ip_address: getClientIP(req), descripcion: `Credenciales reenviadas a "${usuario.email}"`
    });
    return successMessage(res, 'Credenciales enviadas al correo del usuario exitosamente');
  } catch (error) {
    logger.error('Error al reenviar credenciales:', { message: error.message });
    return serverError(res, 'Error al reenviar credenciales', error);
  }
};

/**
 * DELETE /admin/usuarios/:id
 */
const desactivarUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id);
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    // No permitir desactivarse a sí mismo
    if (usuario.id === req.user.id) {
      return badRequest(res, 'No puedes desactivar tu propia cuenta');
    }

    await usuario.update({ activo: false });
    logger.info('Usuario desactivado:', { id: usuario.id, por: req.user.id });
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: usuario.id, accion: 'eliminar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      ip_address: getClientIP(req), descripcion: `Usuario "${usuario.username}" desactivado`
    });
    return successMessage(res, 'Usuario desactivado exitosamente');
  } catch (error) {
    logger.error('Error al desactivar usuario:', { message: error.message });
    return serverError(res, 'Error al desactivar usuario', error);
  }
};

/**
 * GET /admin/usuarios/:id/permisos
 * Obtener permisos efectivos de un usuario (rol + personalizados)
 */
const obtenerPermisosUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      attributes: ['id', 'username', 'nombre_completo', 'rol', 'rol_id', 'cliente_id', 'permisos_cliente', 'permisos_personalizados'],
      include: [
        { model: Rol, as: 'rolInfo', attributes: ['id', 'nombre', 'codigo', 'color', 'es_cliente'], include: [
          { model: Permiso, as: 'permisos', attributes: ['id', 'modulo', 'accion', 'descripcion', 'grupo'], through: { attributes: [] } }
        ]}
      ]
    });

    if (!usuario) return notFound(res, 'Usuario no encontrado');

    const esCliente = usuario.rolInfo?.es_cliente || usuario.rol === 'cliente';

    if (esCliente) {
      // Retornar permisos del portal cliente
      return success(res, {
        tipo: 'cliente',
        usuario: { id: usuario.id, username: usuario.username, nombre: usuario.nombre_completo },
        permisos_cliente: usuario.permisos_cliente || null,
        catalogo: Usuario.getPermisosClienteCatalogo(),
        defaults: Usuario.getPermisosClienteDefault()
      });
    }

    // Usuario interno: retornar permisos del rol + personalizados
    const rolPermisos = (usuario.rolInfo?.permisos || []).map(p => ({ id: p.id, modulo: p.modulo, accion: p.accion, descripcion: p.descripcion, grupo: p.grupo }));

    return success(res, {
      tipo: 'interno',
      usuario: { id: usuario.id, username: usuario.username, nombre: usuario.nombre_completo },
      rol: usuario.rolInfo ? { id: usuario.rolInfo.id, nombre: usuario.rolInfo.nombre, codigo: usuario.rolInfo.codigo, color: usuario.rolInfo.color } : null,
      permisos_rol: rolPermisos,
      permisos_personalizados: usuario.permisos_personalizados,
      tiene_personalizados: usuario.permisos_personalizados !== null
    });
  } catch (error) {
    logger.error('Error al obtener permisos de usuario:', { message: error.message });
    return serverError(res, 'Error al obtener permisos de usuario', error);
  }
};

/**
 * PUT /admin/usuarios/:id/permisos
 * Actualizar permisos personalizados de un usuario
 */
const actualizarPermisosUsuario = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: Rol, as: 'rolInfo', attributes: ['id', 'es_cliente'] }]
    });
    if (!usuario) return notFound(res, 'Usuario no encontrado');

    // No se pueden personalizar permisos de admin
    if (usuario.rol === 'admin') {
      return badRequest(res, 'No se pueden personalizar los permisos de un administrador');
    }

    const esCliente = usuario.rolInfo?.es_cliente || usuario.rol === 'cliente';

    if (esCliente) {
      // Actualizar permisos_cliente
      const { permisos_cliente } = req.body;
      if (!permisos_cliente || typeof permisos_cliente !== 'object') {
        return badRequest(res, 'permisos_cliente es requerido y debe ser un objeto');
      }
      await usuario.update({ permisos_cliente });
      invalidarCachePermisos();
      logger.info('Permisos de cliente actualizados:', { usuarioId: usuario.id, por: req.user.id });
      return successMessage(res, 'Permisos del usuario actualizados exitosamente', { permisos_cliente });
    }

    // Usuario interno: actualizar permisos_personalizados
    const { permisos_personalizados, restaurar_rol } = req.body;

    if (restaurar_rol) {
      // Restaurar a permisos del rol (eliminar override)
      await usuario.update({ permisos_personalizados: null });
      invalidarCachePermisos();
      logger.info('Permisos personalizados eliminados (restaurar rol):', { usuarioId: usuario.id, por: req.user.id });
      return successMessage(res, 'Permisos restaurados a los del rol');
    }

    if (!permisos_personalizados || typeof permisos_personalizados !== 'object') {
      return badRequest(res, 'permisos_personalizados es requerido y debe ser un objeto');
    }

    // Validar formato: { modulo: ['accion1', 'accion2'] }
    for (const [modulo, acciones] of Object.entries(permisos_personalizados)) {
      if (!Array.isArray(acciones)) {
        return badRequest(res, `Las acciones del módulo ${modulo} deben ser un array`);
      }
    }

    await usuario.update({ permisos_personalizados });
    invalidarCachePermisos();
    logger.info('Permisos personalizados actualizados:', { usuarioId: usuario.id, por: req.user.id });
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: usuario.id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: { permisos_personalizados }, ip_address: getClientIP(req),
      descripcion: `Permisos personalizados de usuario #${usuario.id} actualizados`
    });
    return successMessage(res, 'Permisos del usuario actualizados exitosamente', { permisos_personalizados });
  } catch (error) {
    logger.error('Error al actualizar permisos de usuario:', { message: error.message });
    return serverError(res, 'Error al actualizar permisos de usuario', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// ROLES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/roles
 */
const listarRoles = async (req, res) => {
  try {
    const roles = await Rol.findAll({
      include: [
        {
          model: Permiso,
          as: 'permisos',
          attributes: ['id', 'modulo', 'accion', 'descripcion', 'grupo'],
          through: { attributes: [] }
        }
      ],
      order: [['nivel_jerarquia', 'DESC']]
    });

    // Contar usuarios por rol
    const conteos = await Usuario.findAll({
      attributes: ['rol_id', [sequelize.fn('COUNT', sequelize.col('id')), 'total']],
      group: ['rol_id'],
      raw: true
    });

    const conteoMap = {};
    conteos.forEach(function(c) { conteoMap[c.rol_id] = parseInt(c.total); });

    const resultado = roles.map(function(rol) {
      const r = rol.toJSON();
      r.total_usuarios = conteoMap[r.id] || 0;
      return r;
    });

    return success(res, resultado);
  } catch (error) {
    logger.error('Error al listar roles:', { message: error.message });
    return serverError(res, 'Error al listar roles', error);
  }
};

/**
 * GET /admin/roles/:id
 */
const obtenerRol = async (req, res) => {
  try {
    const rol = await Rol.findByPk(req.params.id, {
      include: [{
        model: Permiso,
        as: 'permisos',
        attributes: ['id', 'modulo', 'accion', 'descripcion', 'grupo'],
        through: { attributes: [] }
      }]
    });

    if (!rol) return notFound(res, 'Rol no encontrado');

    // Contar usuarios
    const totalUsuarios = await Usuario.count({ where: { rol_id: rol.id } });
    const resultado = rol.toJSON();
    resultado.total_usuarios = totalUsuarios;

    return success(res, resultado);
  } catch (error) {
    logger.error('Error al obtener rol:', { message: error.message });
    return serverError(res, 'Error al obtener rol', error);
  }
};

/**
 * POST /admin/roles
 */
const crearRol = async (req, res) => {
  try {
    const { nombre, codigo, descripcion, nivel_jerarquia, color, permisos_ids } = req.body;

    if (!nombre || !codigo) {
      return badRequest(res, 'nombre y codigo son requeridos');
    }

    // Verificar unicidad
    const existente = await Rol.findOne({
      where: { [Op.or]: [{ nombre }, { codigo }] }
    });
    if (existente) {
      return badRequest(res, existente.nombre === nombre
        ? 'Ya existe un rol con este nombre'
        : 'Ya existe un rol con este código'
      );
    }

    const rol = await Rol.create({
      nombre,
      codigo,
      descripcion,
      nivel_jerarquia: nivel_jerarquia || 50,
      color: color || '#6B7280',
      es_sistema: false,
      es_cliente: false,
      activo: true
    });

    // Asignar permisos
    if (permisos_ids && permisos_ids.length > 0) {
      const records = permisos_ids.map(function(pid) {
        return { rol_id: rol.id, permiso_id: pid };
      });
      await RolPermiso.bulkCreate(records);
    }

    // Retornar con permisos incluidos
    const resultado = await Rol.findByPk(rol.id, {
      include: [{
        model: Permiso,
        as: 'permisos',
        attributes: ['id', 'modulo', 'accion', 'descripcion', 'grupo'],
        through: { attributes: [] }
      }]
    });

    invalidarCachePermisos();
    logger.info('Rol creado:', { id: rol.id, nombre, creadoPor: req.user.id });
    return created(res, 'Rol creado exitosamente', resultado);
  } catch (error) {
    logger.error('Error al crear rol:', { message: error.message });
    return serverError(res, 'Error al crear rol', error);
  }
};

/**
 * PUT /admin/roles/:id
 */
const actualizarRol = async (req, res) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return notFound(res, 'Rol no encontrado');

    const { nombre, descripcion, nivel_jerarquia, color, permisos_ids } = req.body;

    // No cambiar código de roles del sistema
    if (rol.es_sistema && req.body.codigo && req.body.codigo !== rol.codigo) {
      return badRequest(res, 'No se puede cambiar el código de un rol del sistema');
    }

    // Actualizar campos
    if (nombre) rol.nombre = nombre;
    if (descripcion !== undefined) rol.descripcion = descripcion;
    if (nivel_jerarquia !== undefined) rol.nivel_jerarquia = nivel_jerarquia;
    if (color) rol.color = color;
    if (req.body.activo !== undefined) rol.activo = req.body.activo;

    await rol.save();

    // Actualizar permisos si se enviaron
    if (permisos_ids !== undefined) {
      await RolPermiso.destroy({ where: { rol_id: rol.id } });
      if (permisos_ids.length > 0) {
        const records = permisos_ids.map(function(pid) {
          return { rol_id: rol.id, permiso_id: pid };
        });
        await RolPermiso.bulkCreate(records);
      }

      // Sincronizar campo `rol` legacy de usuarios con este rol
      // (no se necesita ya que `rol` se mantiene por el código del Rol)
    }

    const resultado = await Rol.findByPk(rol.id, {
      include: [{
        model: Permiso,
        as: 'permisos',
        attributes: ['id', 'modulo', 'accion', 'descripcion', 'grupo'],
        through: { attributes: [] }
      }]
    });

    invalidarCachePermisos();
    logger.info('Rol actualizado:', { id: rol.id, modificadoPor: req.user.id });
    Auditoria.registrar({
      tabla: 'roles', registro_id: rol.id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: req.body, ip_address: getClientIP(req),
      descripcion: `Rol "${rol.nombre}" actualizado${req.body.permisos_ids !== undefined ? ' (permisos modificados)' : ''}`
    });
    return successMessage(res, 'Rol actualizado exitosamente', resultado);
  } catch (error) {
    logger.error('Error al actualizar rol:', { message: error.message });
    return serverError(res, 'Error al actualizar rol', error);
  }
};

/**
 * DELETE /admin/roles/:id
 */
const eliminarRol = async (req, res) => {
  try {
    const rol = await Rol.findByPk(req.params.id);
    if (!rol) return notFound(res, 'Rol no encontrado');

    if (rol.es_sistema) {
      return badRequest(res, 'No se pueden eliminar roles del sistema');
    }

    // Verificar que no tenga usuarios asignados
    const totalUsuarios = await Usuario.count({ where: { rol_id: rol.id } });
    if (totalUsuarios > 0) {
      return badRequest(res, `No se puede eliminar: ${totalUsuarios} usuario(s) tienen este rol asignado`);
    }

    // Eliminar permisos asociados y el rol
    await RolPermiso.destroy({ where: { rol_id: rol.id } });
    await rol.destroy();

    invalidarCachePermisos();
    logger.info('Rol eliminado:', { id: rol.id, nombre: rol.nombre, por: req.user.id });
    return successMessage(res, 'Rol eliminado exitosamente');
  } catch (error) {
    logger.error('Error al eliminar rol:', { message: error.message });
    return serverError(res, 'Error al eliminar rol', error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// PERMISOS (solo lectura)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /admin/permisos
 */
const listarPermisos = async (req, res) => {
  try {
    const permisos = await Permiso.findAll({
      order: [['grupo', 'ASC'], ['modulo', 'ASC'], ['accion', 'ASC']]
    });

    // Agrupar por módulo para la UI
    const agrupados = {};
    permisos.forEach(function(p) {
      if (!agrupados[p.modulo]) {
        agrupados[p.modulo] = { modulo: p.modulo, grupo: p.grupo, acciones: [] };
      }
      agrupados[p.modulo].acciones.push({
        id: p.id,
        accion: p.accion,
        descripcion: p.descripcion
      });
    });

    return success(res, {
      permisos: permisos,
      agrupados: Object.values(agrupados)
    });
  } catch (error) {
    logger.error('Error al listar permisos:', { message: error.message });
    return serverError(res, 'Error al listar permisos', error);
  }
};

module.exports = {
  // Usuarios
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  resetearPassword,
  desactivarUsuario,
  reenviarCredenciales,
  obtenerPermisosUsuario,
  actualizarPermisosUsuario,
  // Roles
  listarRoles,
  obtenerRol,
  crearRol,
  actualizarRol,
  eliminarRol,
  // Permisos
  listarPermisos,
};
