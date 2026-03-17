/**
 * ============================================================================
 * ISTHO CRM - Controlador de Usuarios de Cliente
 * ============================================================================
 * 
 * Gestión de usuarios con acceso al portal de clientes.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0 - Corregido envío de emails
 */

const { Usuario, Cliente, Auditoria } = require('../models');
const { success, created, badRequest, notFound, serverError } = require('../utils/responses');
const logger = require('../utils/logger');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { getClientIP } = require('../utils/helpers');
const notificacionService = require('../services/notificacionService');

// Importar servicio de email
const {
  enviarBienvenidaUsuarioCliente,
  enviarReseteoPassword
} = require('../services/emailService');

// ════════════════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generar contraseña temporal segura
 */
const generarPasswordTemporal = (longitud = 12) => {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
  let password = '';
  for (let i = 0; i < longitud; i++) {
    password += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return password;
};

/**
 * Generar username único basado en email
 */
const generarUsername = async (email, clienteId) => {
  // Tomar la parte antes del @
  const base = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  let username = base;
  let contador = 1;
  
  // Verificar si existe y agregar número si es necesario
  while (await Usuario.findOne({ where: { username } })) {
    username = `${base}${contador}`;
    contador++;
  }
  
  return username;
};

/**
 * Permisos por defecto para usuario de cliente
 */
const permisosDefecto = {
  inventario: { ver: true, exportar: true },
  despachos: { ver: true, crear: false },
  reportes: { ver: true, exportar: true },
  documentos: { ver: true, descargar: true },
  tickets: { ver: true, crear: true }
};

// ════════════════════════════════════════════════════════════════════════════
// CONTROLADORES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Listar usuarios de un cliente
 * GET /api/clientes/:clienteId/usuarios
 */
const listar = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { page = 1, limit = 10, search, activo } = req.query;
    
    // Verificar que el cliente existe
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Construir condiciones de búsqueda
    const where = {
      cliente_id: clienteId,
      rol: 'cliente'
    };
    
    if (activo !== undefined) {
      where.activo = activo === 'true';
    }
    
    if (search) {
      where[Op.or] = [
        { nombre_completo: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { username: { [Op.like]: `%${search}%` } }
      ];
    }
    
    // Paginación
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Consultar
    const { count, rows: usuarios } = await Usuario.findAndCountAll({
      where,
      attributes: [
        'id', 'username', 'email', 'nombre', 'apellido', 'nombre_completo',
        'telefono', 'cargo', 'departamento', 'avatar_url', 'rol', 'activo',
        'cliente_id', 'permisos_cliente', 'requiere_cambio_password',
        'invitado_por', 'fecha_invitacion', 'ultimo_acceso',
        'reset_token', 'reset_token_expires', 'intentos_fallidos',
        'bloqueado_hasta', 'created_at', 'updated_at'
      ],
      include: [
        {
          model: Usuario,
          as: 'usuarioInvitador',
          attributes: ['id', 'nombre_completo'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset
    });
    
    return success(res, usuarios);
    
  } catch (error) {
    logger.error('Error al listar usuarios de cliente:', { message: error.message });
    return serverError(res, 'Error al obtener usuarios');
  }
};

/**
 * Obtener usuario por ID
 * GET /api/clientes/:clienteId/usuarios/:id
 */
const obtenerPorId = async (req, res) => {
  try {
    const { clienteId, id } = req.params;
    
    const usuario = await Usuario.findOne({
      where: {
        id,
        cliente_id: clienteId,
        rol: 'cliente'
      },
      attributes: { exclude: ['password_hash'] },
      include: [
        {
          model: Usuario,
          as: 'usuarioInvitador',
          attributes: ['id', 'nombre_completo']
        }
      ]
    });
    
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }
    
    return success(res, usuario);
    
  } catch (error) {
    logger.error('Error al obtener usuario:', { message: error.message });
    return serverError(res, 'Error al obtener usuario');
  }
};

/**
 * Crear usuario de cliente
 * POST /api/clientes/:clienteId/usuarios
 */
const crear = async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { 
      nombre_completo, 
      email, 
      telefono, 
      cargo,
      password,
      permisos_cliente,
      enviar_email = true
    } = req.body;
    
    // Verificar cliente
    const cliente = await Cliente.findByPk(clienteId);
    if (!cliente) {
      return notFound(res, 'Cliente no encontrado');
    }
    
    // Verificar email único
    const emailExiste = await Usuario.findOne({ where: { email } });
    if (emailExiste) {
      return badRequest(res, 'El email ya está registrado');
    }
    
    // Generar username y password
    const username = await generarUsername(email, clienteId);
    const passwordTemporal = password || generarPasswordTemporal();
    
    // ✅ CORREGIDO: password_hash y texto plano (el hook del modelo lo hashea)
    const usuario = await Usuario.create({
      username,
      email,
      password_hash: passwordTemporal,
      nombre_completo,
      telefono,
      cargo,
      rol: 'cliente',
      activo: true,
      cliente_id: clienteId,
      permisos_cliente: permisos_cliente || permisosDefecto,
      requiere_cambio_password: true,
      invitado_por: req.user.id,
      fecha_invitacion: new Date()
    });
    
    // Enviar email de bienvenida
    if (enviar_email) {
      try {
        await enviarBienvenidaUsuarioCliente({
          email: usuario.email,
          nombre: usuario.nombre_completo,
          username: usuario.username,
          password: passwordTemporal,  // ← Contraseña en texto plano
          cliente: cliente.razon_social,
          invitadoPor: req.user.nombre_completo,
          esReenvio: false
        });
        logger.info('Email de bienvenida enviado:', { usuarioId: usuario.id });
      } catch (emailError) {
        logger.error('Error al enviar email de bienvenida:', { message: emailError.message });
        // No fallar la creación por error de email
      }
    }
    
    // Respuesta sin password
    const usuarioResponse = usuario.toJSON();
    delete usuarioResponse.password;
    
    // Auditoría
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: usuario.id, accion: 'crear',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: { username, email, nombre_completo, rol: 'cliente', cliente_id: clienteId },
      ip_address: getClientIP(req),
      descripcion: `Usuario portal "${username}" creado para cliente ${cliente.razon_social}`
    });

    // Notificar admins
    notificacionService.notificarAdmins({
      tipo: 'cliente',
      titulo: `Nuevo usuario portal: ${nombre_completo || username}`,
      mensaje: `Se creó usuario "${username}" para el portal de ${cliente.razon_social}.`,
      prioridad: 'baja',
      accion_url: `/clientes/${clienteId}`,
      accion_label: 'Ver cliente',
    });

    return created(res, {
      usuario: usuarioResponse,
      mensaje: enviar_email
        ? 'Usuario creado. Se envió email con credenciales.'
        : 'Usuario creado exitosamente.'
    });

  } catch (error) {
    logger.error('Error al crear usuario de cliente:', { message: error.message, stack: error.stack });
    return serverError(res, 'Error al crear usuario');
  }
};

/**
 * Actualizar usuario
 * PUT /api/clientes/:clienteId/usuarios/:id
 */
const actualizar = async (req, res) => {
  try {
    const { clienteId, id } = req.params;
    const { 
      nombre_completo, 
      email, 
      telefono, 
      cargo,
      permisos_cliente,
      activo 
    } = req.body;
    
    // Buscar usuario
    const usuario = await Usuario.findOne({
      where: { id, cliente_id: clienteId, rol: 'cliente' }
    });
    
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }
    
    // Verificar email único si cambió
    if (email && email !== usuario.email) {
      const emailExiste = await Usuario.findOne({ 
        where: { email, id: { [Op.ne]: id } } 
      });
      if (emailExiste) {
        return badRequest(res, 'El email ya está registrado');
      }
    }
    
    // Actualizar
    await usuario.update({
      nombre_completo: nombre_completo || usuario.nombre_completo,
      email: email || usuario.email,
      telefono: telefono !== undefined ? telefono : usuario.telefono,
      cargo: cargo !== undefined ? cargo : usuario.cargo,
      permisos_cliente: permisos_cliente || usuario.permisos_cliente,
      activo: activo !== undefined ? activo : usuario.activo
    });
    
    // Respuesta
    const usuarioResponse = usuario.toJSON();
    delete usuarioResponse.password;
    
    // Auditoría
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: req.body, ip_address: getClientIP(req),
      descripcion: `Usuario portal "${usuario.username}" actualizado`
    });

    return success(res, {
      usuario: usuarioResponse,
      mensaje: 'Usuario actualizado exitosamente'
    });

  } catch (error) {
    logger.error('Error al actualizar usuario:', { message: error.message });
    return serverError(res, 'Error al actualizar usuario');
  }
};

/**
 * Desactivar usuario
 * DELETE /api/clientes/:clienteId/usuarios/:id
 */
const desactivar = async (req, res) => {
  try {
    const { clienteId, id } = req.params;
    
    const usuario = await Usuario.findOne({
      where: { id, cliente_id: clienteId, rol: 'cliente' }
    });
    
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }
    
    await usuario.update({ activo: false });

    Auditoria.registrar({
      tabla: 'usuarios', registro_id: id, accion: 'eliminar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      ip_address: getClientIP(req),
      descripcion: `Usuario portal "${usuario.username}" desactivado`
    });

    logger.info('Usuario desactivado:', { usuarioId: id, clienteId });

    return success(res, { mensaje: 'Usuario desactivado exitosamente' });
    
  } catch (error) {
    logger.error('Error al desactivar usuario:', { message: error.message });
    return serverError(res, 'Error al desactivar usuario');
  }
};

/**
 * Reactivar usuario
 * POST /api/clientes/:clienteId/usuarios/:id/reactivar
 */
const reactivar = async (req, res) => {
  try {
    const { clienteId, id } = req.params;
    
    const usuario = await Usuario.findOne({
      where: { id, cliente_id: clienteId, rol: 'cliente' }
    });
    
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }
    
    await usuario.update({
      activo: true,
      intentos_fallidos: 0,
      bloqueado_hasta: null
    });

    Auditoria.registrar({
      tabla: 'usuarios', registro_id: id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      ip_address: getClientIP(req),
      descripcion: `Usuario portal "${usuario.username}" reactivado`
    });

    logger.info('Usuario reactivado:', { usuarioId: id, clienteId });

    return success(res, { mensaje: 'Usuario reactivado exitosamente' });
    
  } catch (error) {
    logger.error('Error al reactivar usuario:', { message: error.message });
    return serverError(res, 'Error al reactivar usuario');
  }
};

/**
 * Resetear contraseña
 * POST /api/clientes/:clienteId/usuarios/:id/resetear-password
 * 
 * ✅ CORREGIDO: Ahora pasa todas las variables necesarias al template
 */
const resetearPassword = async (req, res) => {
  try {
    const { clienteId, id } = req.params;
    const { nueva_password, enviar_email = true } = req.body;
    
    // Buscar usuario
    const usuario = await Usuario.findOne({
      where: { id, cliente_id: clienteId, rol: 'cliente' }
    });
    
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }
    
    // Generar o usar contraseña proporcionada
    const passwordTemporal = nueva_password || generarPasswordTemporal();
    
    // ✅ CORREGIDO: 
    // 1. Campo correcto: password_hash (no password)
    // 2. Pasar texto plano - el hook del modelo lo hashea automáticamente
    await usuario.update({
      password_hash: passwordTemporal,
      requiere_cambio_password: true,
      intentos_fallidos: 0,
      bloqueado_hasta: null
    });
    
    // Enviar email con nueva contraseña
    if (enviar_email) {
      try {
        // ✅ CORREGIDO: Pasar TODAS las variables que necesita el template
        const resultadoEmail = await enviarReseteoPassword({
          email: usuario.email,
          nombre: usuario.nombre_completo || usuario.nombre || 'Usuario',
          username: usuario.username,
          passwordTemporal: passwordTemporal  // ← La contraseña en texto plano
        });
        
        if (resultadoEmail.success) {
          logger.info('Email de reseteo enviado:', { 
            usuarioId: usuario.id,
            email: usuario.email 
          });
        } else {
          logger.warn('No se pudo enviar email de reseteo:', { 
            error: resultadoEmail.error 
          });
        }
      } catch (emailError) {
        logger.error('Error al enviar email de reseteo:', { 
          message: emailError.message 
        });
      }
    }
    
    Auditoria.registrar({
      tabla: 'usuarios', registro_id: id, accion: 'actualizar',
      usuario_id: req.user.id, usuario_nombre: req.user.nombre_completo || req.user.username,
      ip_address: getClientIP(req),
      descripcion: `Contraseña de usuario portal "${usuario.username}" reseteada`
    });

    logger.info('Contraseña reseteada:', { usuarioId: id, clienteId });

    return success(res, {
      mensaje: enviar_email
        ? 'Contraseña reseteada. Se envió email con las nuevas credenciales.'
        : 'Contraseña reseteada exitosamente.',
      // Solo incluir contraseña en respuesta si NO se envió email
      ...(enviar_email ? {} : { passwordTemporal })
    });
    
  } catch (error) {
    logger.error('Error al resetear contraseña:', { message: error.message });
    return serverError(res, 'Error al resetear contraseña');
  }
};

/**
 * Reenviar invitación
 * POST /api/clientes/:clienteId/usuarios/:id/reenviar-invitacion
 */
const reenviarInvitacion = async (req, res) => {
  try {
    const { clienteId, id } = req.params;
    
    // Buscar usuario
    const usuario = await Usuario.findOne({
      where: { id, cliente_id: clienteId, rol: 'cliente' }
    });
    
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }
    
    // Buscar cliente para el nombre
    const cliente = await Cliente.findByPk(clienteId);
    
    // Generar nueva contraseña temporal
    const passwordTemporal = generarPasswordTemporal();
    
    // ✅ CORREGIDO: password_hash y texto plano (el hook lo hashea)
    await usuario.update({
      password_hash: passwordTemporal,
      requiere_cambio_password: true,
      fecha_invitacion: new Date()
    });
    
    // Enviar email
    try {
      await enviarBienvenidaUsuarioCliente({
        email: usuario.email,
        nombre: usuario.nombre_completo || usuario.nombre || 'Usuario',
        username: usuario.username,
        password: passwordTemporal,
        cliente: cliente?.razon_social || 'Cliente',
        invitadoPor: req.user.nombre_completo,
        esReenvio: true
      });
      
      logger.info('Invitación reenviada:', { usuarioId: id });
      
      return success(res, { 
        mensaje: 'Invitación reenviada exitosamente' 
      });
      
    } catch (emailError) {
      logger.error('Error al reenviar invitación:', { message: emailError.message });
      return serverError(res, 'Error al enviar el correo de invitación');
    }
    
  } catch (error) {
    logger.error('Error al reenviar invitación:', { message: error.message });
    return serverError(res, 'Error al reenviar invitación');
  }
};

// ════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════════════════

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  desactivar,
  reactivar,
  resetearPassword,
  reenviarInvitacion
};