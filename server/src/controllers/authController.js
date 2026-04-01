/**
 * ============================================================================
 * ISTHO CRM - Controlador de Autenticación
 * ============================================================================
 * 
 * Maneja login, registro, logout y gestión de tokens.
 * 
 * OPTIMIZADO: Usa toPublicJSON() del modelo para evitar duplicación.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const jwtConfig = require('../config/jwt');
const { Usuario, Cliente, Auditoria } = require('../models');
const {
  success,
  successMessage,
  created,
  error: errorResponse,
  unauthorized,
  notFound,
  conflict,
  serverError
} = require('../utils/responses');
const logger = require('../utils/logger');
const emailService = require('../services/emailService');
const { cargarCachePermisos, getPermisosForRol } = require('../middleware/auth');
const { getClientIP } = require('../utils/helpers');

// ============================================================================
// CONSTANTES
// ============================================================================

const MAX_INTENTOS_LOGIN = 5;
const TIEMPO_BLOQUEO_MINUTOS = 15;

// ============================================================================
// HELPERS PRIVADOS
// ============================================================================

/**
 * Generar token JWT
 */
const generarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      rol: usuario.rol
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.expiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: jwtConfig.algorithm
    }
  );
};

/**
 * Genera un refresh token con TTL más largo (7 días por defecto)
 */
const generarRefreshToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      tipo: 'refresh'
    },
    jwtConfig.secret,
    {
      expiresIn: jwtConfig.refreshExpiresIn,
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
      algorithm: jwtConfig.algorithm
    }
  );
};

/**
 * Registrar acción en auditoría (helper interno)
 */
const registrarAuditoria = async (data) => {
  try {
    await Auditoria.registrar(data);
  } catch (error) {
    logger.warn('Error registrando auditoría:', error.message);
  }
};

// ============================================================================
// CONTROLADORES
// ============================================================================

/**
 * POST /auth/login
 * Iniciar sesión
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Buscar usuario por email o username
    const usuario = email && email.includes('@')
      ? await Usuario.findByEmail(email)
      : await Usuario.findByEmailOrUsername(email);

    if (!usuario) {
      logger.warn('Login fallido - usuario no encontrado:', { identificador: email });
      return unauthorized(res, 'Credenciales inválidas');
    }

    // Verificar bloqueo
    if (usuario.estaBloqueado()) {
      const tiempoRestante = Math.ceil(
        (new Date(usuario.bloqueado_hasta) - new Date()) / 60000
      );
      return errorResponse(
        res,
        `Cuenta bloqueada. Intente en ${tiempoRestante} minutos`,
        423,
        null,
        'ACCOUNT_LOCKED'
      );
    }

    // Verificar si está activo
    if (!usuario.activo) {
      return errorResponse(
        res,
        'Cuenta desactivada. Contacte al administrador',
        403,
        null,
        'ACCOUNT_DISABLED'
      );
    }

    // Verificar contraseña
    const passwordValido = await usuario.verificarPassword(password);

    if (!passwordValido) {
      usuario.intentos_fallidos += 1;

      if (usuario.intentos_fallidos >= MAX_INTENTOS_LOGIN) {
        usuario.bloqueado_hasta = new Date(Date.now() + TIEMPO_BLOQUEO_MINUTOS * 60000);
        logger.warn('Cuenta bloqueada por intentos:', { email, intentos: usuario.intentos_fallidos });
      }

      await usuario.save();
      return unauthorized(res, 'Credenciales inválidas');
    }

    // Login exitoso
    usuario.intentos_fallidos = 0;
    usuario.bloqueado_hasta = null;
    usuario.ultimo_acceso = new Date();
    await usuario.save();

    const token = generarToken(usuario);

    // Auditoría
    await registrarAuditoria({
      tabla: 'usuarios',
      registro_id: usuario.id,
      accion: 'login',
      usuario_id: usuario.id,
      usuario_nombre: usuario.getNombreDisplay(),
      ip_address: getClientIP(req),
      user_agent: req.get('user-agent'),
      descripcion: `Login exitoso: ${usuario.email}`
    });

    logger.info('Login exitoso:', { userId: usuario.id, email: usuario.email });

    // Cargar cache de permisos dinámicos y construir datos de respuesta
    await cargarCachePermisos();
    const permisosDB = usuario.rol_id ? getPermisosForRol(usuario.rol_id) : null;
    const userData = usuario.toPublicJSON(permisosDB);

    // Si es usuario de cliente, incluir datos del cliente (logo, nombre)
    if (usuario.rol === 'cliente' && usuario.cliente_id) {
      const cliente = await Cliente.findByPk(usuario.cliente_id, {
        attributes: ['id', 'razon_social', 'codigo_cliente', 'logo_url'],
      });
      if (cliente) {
        userData.cliente_info = {
          id: cliente.id,
          razon_social: cliente.razon_social,
          codigo_cliente: cliente.codigo_cliente,
          logo_url: cliente.logo_url,
        };
      }
    }

    const refreshTokenJwt = generarRefreshToken(usuario);

    return successMessage(res, 'Inicio de sesión exitoso', {
      user: userData,
      token,
      refreshToken: refreshTokenJwt,
      expiresIn: jwtConfig.expiresIn,
      refreshExpiresIn: jwtConfig.refreshExpiresIn
    });

  } catch (error) {
    logger.error('Error en login:', { message: error.message });
    return serverError(res, 'Error al procesar el login', error);
  }
};

/**
 * GET /auth/me
 * Obtener usuario actual
 */
const me = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] }
    });

    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }

    // Cargar permisos dinámicos
    await cargarCachePermisos();
    const permisosDB = usuario.rol_id ? getPermisosForRol(usuario.rol_id) : null;
    const userData = usuario.toPublicJSON(permisosDB);

    // Si es usuario de cliente, incluir datos del cliente
    if (usuario.rol === 'cliente' && usuario.cliente_id) {
      const cliente = await Cliente.findByPk(usuario.cliente_id, {
        attributes: ['id', 'razon_social', 'codigo_cliente', 'logo_url'],
      });
      if (cliente) {
        userData.cliente_info = {
          id: cliente.id,
          razon_social: cliente.razon_social,
          codigo_cliente: cliente.codigo_cliente,
          logo_url: cliente.logo_url,
        };
      }
    }

    return success(res, userData);

  } catch (error) {
    logger.error('Error en me:', { message: error.message });
    return serverError(res, 'Error al obtener usuario', error);
  }
};

/**
 * PUT /auth/me
 * Actualizar perfil del usuario actual
 */
const actualizarPerfil = async (req, res) => {
  try {
    const userId = req.user.id;
    const { nombre, apellido, telefono, cargo, departamento } = req.body;

    // Campos permitidos
    const camposActualizables = {};

    if (nombre !== undefined) camposActualizables.nombre = nombre.trim();
    if (apellido !== undefined) camposActualizables.apellido = apellido.trim();
    if (telefono !== undefined) camposActualizables.telefono = telefono?.trim() || null;
    if (cargo !== undefined) camposActualizables.cargo = cargo.trim();
    if (departamento !== undefined) camposActualizables.departamento = departamento.trim();

    if (Object.keys(camposActualizables).length === 0) {
      return errorResponse(res, 'No se proporcionaron campos para actualizar', 400);
    }

    // Sincronizar nombre_completo si se actualiza nombre o apellido
    if (camposActualizables.nombre !== undefined || camposActualizables.apellido !== undefined) {
      const usuarioActual = await Usuario.findByPk(userId);
      const nuevoNombre = camposActualizables.nombre ?? (usuarioActual.nombre || '');
      const nuevoApellido = camposActualizables.apellido ?? (usuarioActual.apellido || '');
      camposActualizables.nombre_completo = `${nuevoNombre} ${nuevoApellido}`.trim();
    }

    // Actualizar
    await Usuario.update(camposActualizables, { where: { id: userId } });

    // Obtener actualizado
    const usuarioActualizado = await Usuario.findByPk(userId, {
      attributes: { exclude: ['password_hash', 'reset_token', 'reset_token_expires'] }
    });

    logger.info('Perfil actualizado:', { userId, campos: Object.keys(camposActualizables) });

    await registrarAuditoria({
      tabla: 'usuarios',
      registro_id: userId,
      accion: 'actualizar',
      usuario_id: userId,
      usuario_nombre: req.user.nombre_completo || req.user.username,
      datos_nuevos: camposActualizables,
      ip_address: getClientIP(req),
      descripcion: `Perfil actualizado: ${Object.keys(camposActualizables).join(', ')}`
    });

    await cargarCachePermisos();
    const permisosDB = usuarioActualizado.rol_id ? getPermisosForRol(usuarioActualizado.rol_id) : null;
    return successMessage(res, 'Perfil actualizado correctamente', usuarioActualizado.toPublicJSON(permisosDB));

  } catch (error) {
    logger.error('Error actualizando perfil:', { message: error.message });
    return serverError(res, 'Error al actualizar perfil', error);
  }
};

/**
 * POST /auth/registro
 * Registrar nuevo usuario (solo admin)
 */
const registro = async (req, res) => {
  try {
    const { username, email, password, nombre, apellido, nombre_completo, rol } = req.body;

    // Verificar duplicados
    if (await Usuario.findByEmail(email)) {
      return conflict(res, 'El email ya está registrado');
    }

    if (await Usuario.findByUsername(username)) {
      return conflict(res, 'El nombre de usuario ya está en uso');
    }

    // Crear usuario
    const nuevoUsuario = await Usuario.crearConPassword({
      username,
      email: email.toLowerCase(),
      password,
      nombre: nombre || null,
      apellido: apellido || null,
      nombre_completo: nombre_completo || `${nombre || ''} ${apellido || ''}`.trim(),
      rol: rol || 'operador'
    });

    // Auditoría
    await registrarAuditoria({
      tabla: 'usuarios',
      registro_id: nuevoUsuario.id,
      accion: 'crear',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      datos_nuevos: { username, email, nombre, apellido, rol },
      ip_address: getClientIP(req),
      descripcion: `Usuario creado: ${username}`
    });

    logger.info('Usuario creado:', { userId: nuevoUsuario.id, createdBy: req.user.id });

    return created(res, 'Usuario creado exitosamente', nuevoUsuario.toPublicJSON());

  } catch (error) {
    logger.error('Error en registro:', { message: error.message });
    return serverError(res, 'Error al crear usuario', error);
  }
};

/**
 * POST /auth/logout
 * Cerrar sesión
 */
const logout = async (req, res) => {
  try {
    await registrarAuditoria({
      tabla: 'usuarios',
      registro_id: req.user.id,
      accion: 'logout',
      usuario_id: req.user.id,
      usuario_nombre: req.user.nombre_completo,
      ip_address: getClientIP(req),
      descripcion: `Logout: ${req.user.email}`
    });

    logger.info('Logout exitoso:', { userId: req.user.id });

    return successMessage(res, 'Sesión cerrada exitosamente');

  } catch (error) {
    logger.error('Error en logout:', { message: error.message });
    return serverError(res, 'Error al cerrar sesión', error);
  }
};

/**
 * PUT /auth/cambiar-password
 * Cambiar contraseña del usuario actual
 */
const cambiarPassword = async (req, res) => {
  try {
    const { password_actual, password_nuevo } = req.body;

    const usuario = await Usuario.findByPk(req.user.id);

    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }

    const passwordValido = await usuario.verificarPassword(password_actual);

    if (!passwordValido) {
      return errorResponse(res, 'La contraseña actual es incorrecta', 400);
    }

    // Validar requisitos de contraseña
    if (!password_nuevo || password_nuevo.length < 8) {
      return errorResponse(res, 'La contraseña debe tener al menos 8 caracteres', 400);
    }
    if (!/[A-Z]/.test(password_nuevo)) {
      return errorResponse(res, 'La contraseña debe contener al menos una mayúscula', 400);
    }
    if (!/[0-9]/.test(password_nuevo)) {
      return errorResponse(res, 'La contraseña debe contener al menos un número', 400);
    }
    if (!/[^A-Za-z0-9]/.test(password_nuevo)) {
      return errorResponse(res, 'La contraseña debe contener al menos un carácter especial', 400);
    }

    usuario.password_hash = password_nuevo;
    usuario.requiere_cambio_password = false;
    usuario.changed('requiere_cambio_password', true);
    await usuario.save();

    await registrarAuditoria({
      tabla: 'usuarios',
      registro_id: usuario.id,
      accion: 'actualizar',
      usuario_id: usuario.id,
      usuario_nombre: usuario.getNombreDisplay(),
      ip_address: getClientIP(req),
      descripcion: 'Cambio de contraseña'
    });

    logger.info('Contraseña cambiada:', { userId: usuario.id });

    return successMessage(res, 'Contraseña actualizada exitosamente');

  } catch (error) {
    logger.error('Error en cambiarPassword:', { message: error.message });
    return serverError(res, 'Error al cambiar la contraseña', error);
  }
};

/**
 * POST /auth/forgot-password
 * Solicitar recuperación de contraseña
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const usuario = await Usuario.findByEmail(email);

    // Respuesta genérica por seguridad
    const mensajeExito = 'Si el email existe, recibirás instrucciones para restablecer tu contraseña';

    if (!usuario) {
      return successMessage(res, mensajeExito);
    }

    // Generar token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    usuario.reset_token = resetTokenHash;
    usuario.reset_token_expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
    await usuario.save();

    // Enviar email con token
    await emailService.enviarReseteoPassword({
      email: usuario.email,
      nombre: usuario.nombre_completo || usuario.username,
      username: usuario.username,
      passwordTemporal: resetToken // Usamos este campo para pasar el token en la plantilla actual
    });

    logger.info('Token de recuperación generado:', { email });

    return successMessage(res, mensajeExito);

  } catch (error) {
    logger.error('Error en forgotPassword:', { message: error.message });
    return serverError(res, 'Error al procesar la solicitud', error);
  }
};

/**
 * POST /auth/reset-password
 * Resetear contraseña con token
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const usuario = await Usuario.findOne({
      where: {
        reset_token: resetTokenHash,
        reset_token_expires: { [Op.gt]: new Date() }
      }
    });

    if (!usuario) {
      return errorResponse(res, 'Token inválido o expirado', 400, null, 'INVALID_TOKEN');
    }

    // Validar requisitos de contraseña
    if (!password || password.length < 8) {
      return errorResponse(res, 'La contraseña debe tener al menos 8 caracteres', 400);
    }
    if (!/[A-Z]/.test(password)) {
      return errorResponse(res, 'La contraseña debe contener al menos una mayúscula', 400);
    }
    if (!/[0-9]/.test(password)) {
      return errorResponse(res, 'La contraseña debe contener al menos un número', 400);
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return errorResponse(res, 'La contraseña debe contener al menos un carácter especial', 400);
    }

    usuario.password_hash = password;
    usuario.reset_token = null;
    usuario.reset_token_expires = null;
    usuario.intentos_fallidos = 0;
    usuario.bloqueado_hasta = null;
    await usuario.save();

    await registrarAuditoria({
      tabla: 'usuarios',
      registro_id: usuario.id,
      accion: 'actualizar',
      usuario_id: usuario.id,
      usuario_nombre: usuario.getNombreDisplay(),
      ip_address: getClientIP(req),
      descripcion: 'Contraseña restablecida mediante token'
    });

    logger.info('Contraseña restablecida:', { userId: usuario.id });

    return successMessage(res, 'Contraseña restablecida exitosamente');

  } catch (error) {
    logger.error('Error en resetPassword:', { message: error.message });
    return serverError(res, 'Error al restablecer la contraseña', error);
  }
};

/**
 * POST /auth/refresh
 * Refrescar token usando refresh token (NO requiere verificarToken middleware)
 * Acepta refreshToken en body o en header Authorization
 */
const refreshToken = async (req, res) => {
  try {
    // Obtener refresh token del body o del header
    const token = req.body.refreshToken
      || (req.headers.authorization && req.headers.authorization.replace('Bearer ', ''));

    if (!token) {
      return unauthorized(res, 'Refresh token no proporcionado');
    }

    // Verificar el refresh token manualmente (sin middleware)
    let decoded;
    try {
      decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: [jwtConfig.algorithm]
      });
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return unauthorized(res, 'Refresh token expirado. Inicie sesión nuevamente.');
      }
      return unauthorized(res, 'Refresh token inválido');
    }

    // Verificar que es un refresh token (no un access token)
    if (decoded.tipo !== 'refresh') {
      return unauthorized(res, 'Token proporcionado no es un refresh token');
    }

    // Buscar usuario
    const usuario = await Usuario.findByPk(decoded.id);
    if (!usuario || !usuario.activo) {
      return unauthorized(res, 'Usuario no válido o desactivado');
    }

    // Generar nuevo access token + nuevo refresh token
    const nuevoToken = generarToken(usuario);
    const nuevoRefreshToken = generarRefreshToken(usuario);

    logger.info('Token refrescado:', { userId: usuario.id });

    return success(res, {
      token: nuevoToken,
      refreshToken: nuevoRefreshToken,
      expiresIn: jwtConfig.expiresIn,
      refreshExpiresIn: jwtConfig.refreshExpiresIn
    });

  } catch (error) {
    logger.error('Error en refreshToken:', { message: error.message });
    return serverError(res, 'Error al refrescar token', error);
  }
};

/**
 * PUT /auth/me/preferencias
 * Guardar preferencias del usuario
 */
const actualizarPreferencias = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }

    const preferenciasActuales = usuario.preferencias || {};
    const nuevasPreferencias = { ...preferenciasActuales, ...req.body };

    // Validar valores permitidos
    const validos = {
      tema: ['light', 'dark'],
      idioma: ['es', 'en'],
      zona_horaria: ['America/Bogota', 'America/Mexico_City', 'America/Lima', 'America/Argentina/Buenos_Aires'],
      formato_fecha: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      tiempo_sesion: [15, 30, 60, 120, 0],
    };

    for (const [key, opciones] of Object.entries(validos)) {
      if (nuevasPreferencias[key] !== undefined && !opciones.includes(nuevasPreferencias[key])) {
        delete nuevasPreferencias[key];
      }
    }

    usuario.preferencias = nuevasPreferencias;
    await usuario.save();

    logger.info('Preferencias actualizadas:', { userId: usuario.id });
    return successMessage(res, 'Preferencias guardadas', { preferencias: nuevasPreferencias });
  } catch (error) {
    logger.error('Error al actualizar preferencias:', { message: error.message });
    return serverError(res, 'Error al guardar preferencias', error);
  }
};

/**
 * POST /auth/me/avatar
 * Subir foto de perfil
 */
const subirAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No se proporcionó una imagen', 400);
    }

    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }

    const cloudinaryService = require('../services/cloudinaryService');
    const fs = require('fs');
    let avatar_url;

    if (cloudinaryService.isConfigured()) {
      // Subir a Cloudinary con compresión automática
      const resultado = await cloudinaryService.subirImagen(req.file.path, {
        folder: 'istho-crm/avatares',
        publicId: `usuario_${usuario.id}`,
      });
      avatar_url = resultado.url;
      // Limpiar temp
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      logger.info('Avatar subido a Cloudinary:', { userId: usuario.id, url: avatar_url });
    } else {
      // Fallback: base64 en BD
      const fileBuffer = fs.readFileSync(req.file.path);
      const base64 = fileBuffer.toString('base64');
      const mimeType = req.file.mimetype || 'image/png';
      avatar_url = `data:${mimeType};base64,${base64}`;
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
      logger.info('Avatar actualizado (base64 fallback):', { userId: usuario.id });
    }

    usuario.avatar_url = avatar_url;
    await usuario.save();

    await registrarAuditoria({
      tabla: 'usuarios',
      registro_id: usuario.id,
      accion: 'actualizar',
      usuario_id: usuario.id,
      usuario_nombre: usuario.getNombreDisplay(),
      ip_address: getClientIP(req),
      descripcion: 'Foto de perfil actualizada'
    });

    return successMessage(res, 'Foto de perfil actualizada', { avatar_url });

  } catch (error) {
    logger.error('Error al subir avatar:', { message: error.message });
    return serverError(res, 'Error al subir la foto de perfil', error);
  }
};

/**
 * DELETE /auth/me/avatar
 * Eliminar foto de perfil
 */
const eliminarAvatar = async (req, res) => {
  try {
    const usuario = await Usuario.findByPk(req.user.id);
    if (!usuario) {
      return notFound(res, 'Usuario no encontrado');
    }

    // Eliminar de Cloudinary si es URL de Cloudinary
    if (usuario.avatar_url?.includes('cloudinary.com')) {
      const cloudinaryService = require('../services/cloudinaryService');
      await cloudinaryService.eliminar(`istho-crm/avatares/usuario_${usuario.id}`, 'image');
    }

    usuario.avatar_url = null;
    await usuario.save();

    logger.info('Avatar eliminado:', { userId: usuario.id });

    return successMessage(res, 'Foto de perfil eliminada');

  } catch (error) {
    logger.error('Error al eliminar avatar:', { message: error.message });
    return serverError(res, 'Error al eliminar la foto de perfil', error);
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  login,
  me,
  actualizarPerfil,
  registro,
  logout,
  cambiarPassword,
  forgotPassword,
  resetPassword,
  refreshToken,
  subirAvatar,
  eliminarAvatar,
  actualizarPreferencias
};