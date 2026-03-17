/**
 * ============================================================================
 * ISTHO CRM - Middleware de Autenticación
 * ============================================================================
 * 
 * Verifica tokens JWT y protege rutas.
 * 
 * ACTUALIZACIÓN v2.0.0:
 * - Soporte para usuarios de cliente (rol='cliente')
 * - Incluye cliente_id y permisos_cliente en req.user
 * - Verificación de cambio de contraseña obligatorio
 * - Registro de último acceso
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { Usuario, Rol, Permiso } = require('../models');
const { unauthorized, forbidden } = require('../utils/responses');
const logger = require('../utils/logger');

// ═══════════════════════════════════════════════════════════════════════════
// CACHE DE PERMISOS POR ROL (evita JOINs en cada request)
// ═══════════════════════════════════════════════════════════════════════════
let _permisosCache = {};
let _rolesCache = {};
let _cacheTimestamp = 0;
const CACHE_TTL = 60 * 1000; // 1 minuto

const cargarCachePermisos = async () => {
  const ahora = Date.now();
  if (ahora - _cacheTimestamp < CACHE_TTL && Object.keys(_rolesCache).length > 0) {
    return; // Cache aún válido
  }

  try {
    const roles = await Rol.findAll({
      where: { activo: true },
      include: [{
        model: Permiso,
        as: 'permisos',
        attributes: ['modulo', 'accion'],
        through: { attributes: [] }
      }]
    });

    const newPermisosCache = {};
    const newRolesCache = {};

    roles.forEach(function(rol) {
      newRolesCache[rol.id] = {
        id: rol.id,
        codigo: rol.codigo,
        nombre: rol.nombre,
        nivel_jerarquia: rol.nivel_jerarquia,
        es_sistema: rol.es_sistema,
        es_cliente: rol.es_cliente,
        color: rol.color
      };

      // Permisos como { modulo: [acciones] }
      const permisos = {};
      rol.permisos.forEach(function(p) {
        if (!permisos[p.modulo]) permisos[p.modulo] = [];
        permisos[p.modulo].push(p.accion);
      });
      newPermisosCache[rol.id] = permisos;
    });

    _rolesCache = newRolesCache;
    _permisosCache = newPermisosCache;
    _cacheTimestamp = ahora;
  } catch (error) {
    logger.error('Error cargando cache de permisos:', { message: error.message });
  }
};

/**
 * Invalida el cache (llamar cuando se editen roles/permisos)
 */
const invalidarCachePermisos = () => {
  _cacheTimestamp = 0;
  _permisosCache = {};
  _rolesCache = {};
};

/**
 * Verificar si un rol_id tiene permiso (módulo + acción)
 */
const rolTienePermiso = (rolId, modulo, accion) => {
  const permisos = _permisosCache[rolId];
  if (!permisos) return false;
  return permisos[modulo] && permisos[modulo].includes(accion);
};

/**
 * Obtener info de un rol por ID desde el cache
 */
const getRolFromCache = (rolId) => {
  return _rolesCache[rolId] || null;
};

/**
 * Obtener permisos dinámicos de un rol desde el cache
 * Formato: { modulo: ['accion1', 'accion2'] }
 * @param {number} rolId
 * @returns {Object|null}
 */
const getPermisosForRol = (rolId) => {
  return _permisosCache[rolId] || null;
};

/**
 * Middleware para verificar token JWT
 * Agrega el usuario decodificado a req.user
 */
const verificarToken = async (req, res, next) => {
  try {
    // Obtener token del header o query param (para descargas de archivos)
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader) {
      // Formato esperado: "Bearer <token>"
      const parts = authHeader.split(' ');

      if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return unauthorized(res, 'Formato de token inválido. Use: Bearer <token>');
      }

      token = parts[1];
    } else if (req.query.token) {
      // Fallback: token por query param (usado en window.open para exportar archivos)
      token = req.query.token;
    }

    if (!token) {
      return unauthorized(res, 'Token de acceso requerido');
    }
    
    // Verificar token
    const decoded = jwt.verify(token, jwtConfig.secret, {
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience
    });
    
    // Cargar cache de permisos dinámicos
    await cargarCachePermisos();

    // Buscar usuario en BD para verificar que sigue activo
    const usuario = await Usuario.findByPk(decoded.id, {
      attributes: [
        'id',
        'username',
        'email',
        'nombre',
        'apellido',
        'nombre_completo',
        'rol',
        'rol_id',
        'activo',
        'cliente_id',
        'permisos_cliente',
        'requiere_cambio_password',
        'ultimo_acceso'
      ]
    });
    
    if (!usuario) {
      return unauthorized(res, 'Usuario no encontrado');
    }
    
    if (!usuario.activo) {
      return forbidden(res, 'Usuario desactivado. Contacte al administrador');
    }
    
    // Obtener info del rol dinámico desde cache
    const rolInfo = usuario.rol_id ? getRolFromCache(usuario.rol_id) : null;

    // ✅ Agregar usuario a la request con datos extendidos
    req.user = {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      nombre: usuario.nombre,
      apellido: usuario.apellido,
      nombre_completo: usuario.nombre_completo || usuario.getNombreDisplay(),
      rol: usuario.rol,
      rol_id: usuario.rol_id,
      rolInfo: rolInfo,
      // Campos de cliente
      cliente_id: usuario.cliente_id || null,
      permisos_cliente: usuario.permisos_cliente || null,
      requiere_cambio_password: usuario.requiere_cambio_password || false,
      // Helpers
      esCliente: usuario.esCliente(),
      esInterno: usuario.esInterno(),
      esAdmin: usuario.esAdmin(),
      esConductor: usuario.esConductor(),
      esFinanciera: usuario.esFinanciera(),
      // Función de verificación de permiso dinámico
      tienePermiso: function(modulo, accion) {
        if (usuario.esAdmin()) return true;
        // Usuario cliente: verificar permisos_cliente individuales
        if (usuario.esCliente()) {
          const permisos = usuario.permisos_cliente || {};
          if (!permisos[modulo]) return false;
          return permisos[modulo][accion] === true;
        }
        // Usuario interno: verificar permisos dinámicos de BD por rol_id
        if (usuario.rol_id) return rolTienePermiso(usuario.rol_id, modulo, accion);
        return false;
      }
    };
    
    // ✅ Referencia al modelo completo (útil para métodos)
    req.usuarioModel = usuario;
    
    next();
    
  } catch (error) {
    logger.warn('Error de autenticación:', { 
      message: error.message,
      ip: req.ip 
    });
    
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, 'Token expirado. Inicie sesión nuevamente');
    }
    
    if (error.name === 'JsonWebTokenError') {
      return unauthorized(res, 'Token inválido');
    }
    
    return unauthorized(res, 'Error de autenticación');
  }
};

/**
 * Middleware opcional - No falla si no hay token
 * Útil para rutas que funcionan diferente con/sin auth
 */
const verificarTokenOpcional = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    req.user = null;
    req.usuarioModel = null;
    return next();
  }
  
  // Si hay token, verificarlo normalmente
  return verificarToken(req, res, next);
};

/**
 * Middleware para verificar roles específicos
 * @param {string[]} rolesPermitidos - Array de roles permitidos
 */
const checkRole = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Usuario no autenticado');
    }
    
    if (!rolesPermitidos.includes(req.user.rol)) {
      logger.warn('Acceso denegado por rol:', {
        usuario: req.user.username,
        rol: req.user.rol,
        rolesRequeridos: rolesPermitidos,
        ruta: req.originalUrl
      });
      return forbidden(res, 'No tiene permisos para realizar esta acción');
    }
    
    next();
  };
};

/**
 * Middleware para bloquear usuarios cliente en ciertas rutas
 * Solo permite usuarios internos (admin, supervisor, operador)
 */
const soloUsuariosInternos = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, 'Usuario no autenticado');
  }
  
  if (req.user.esCliente) {
    logger.warn('Usuario cliente intentó acceder a ruta restringida:', {
      usuario: req.user.username,
      cliente_id: req.user.cliente_id,
      ruta: req.originalUrl
    });
    return forbidden(res, 'Esta funcionalidad no está disponible para usuarios de portal');
  }
  
  next();
};

/**
 * Middleware para verificar permisos específicos de cliente
 * @param {string} modulo - Módulo (inventario, despachos, reportes, etc.)
 * @param {string} accion - Acción (ver, crear, editar, eliminar, exportar)
 */
const verificarPermisoCliente = (modulo, accion) => {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, 'Usuario no autenticado');
    }

    // Admin tiene todos los permisos
    if (req.user.esAdmin) {
      return next();
    }

    // Usuarios internos: verificar permisos dinámicos de BD
    if (req.user.esInterno) {
      if (req.user.tienePermiso && !req.user.tienePermiso(modulo, accion)) {
        logger.warn('Permiso denegado a usuario interno:', {
          usuario: req.user.username,
          rol: req.user.rol,
          modulo,
          accion,
          ruta: req.originalUrl
        });
        return forbidden(res, `No tiene permiso para ${accion} en ${modulo}`);
      }
      return next();
    }

    // Usuario cliente: verificar permisos_cliente
    if (req.user.esCliente) {
      if (req.user.tienePermiso && !req.user.tienePermiso(modulo, accion)) {
        logger.warn('Permiso denegado a usuario cliente:', {
          usuario: req.user.username,
          cliente_id: req.user.cliente_id,
          modulo,
          accion,
          ruta: req.originalUrl
        });
        return forbidden(res, `No tiene permiso para ${accion} en ${modulo}`);
      }
    }

    next();
  };
};

/**
 * Middleware para forzar cambio de contraseña
 * Bloquea todas las rutas excepto cambio de contraseña si está pendiente
 */
const verificarCambioPassword = (req, res, next) => {
  if (!req.user) {
    return next();
  }
  
  // Rutas permitidas aunque requiera cambio de contraseña
  const rutasPermitidas = [
    '/api/auth/cambiar-password',
    '/api/auth/logout',
    '/api/usuarios/me/password'
  ];
  
  if (req.user.requiere_cambio_password && !rutasPermitidas.includes(req.path)) {
    return forbidden(res, 'Debe cambiar su contraseña antes de continuar', {
      codigo: 'PASSWORD_CHANGE_REQUIRED',
      requiere_cambio_password: true
    });
  }
  
  next();
};

/**
 * Middleware para filtrar datos por cliente
 * Inyecta cliente_id en query/body para usuarios cliente
 */
const filtrarPorCliente = (req, res, next) => {
  if (!req.user) {
    return next();
  }
  
  // Si es usuario cliente, forzar filtro por su cliente_id
  if (req.user.esCliente && req.user.cliente_id) {
    // Inyectar en query params
    req.query.cliente_id = req.user.cliente_id;
    
    // Inyectar en body si es POST/PUT
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      req.body.cliente_id = req.user.cliente_id;
    }
    
    // Marcar que está filtrado
    req.filtradoPorCliente = true;
  }
  
  next();
};

/**
 * Middleware para verificar acceso a un cliente específico
 * Verifica que el usuario tenga acceso al cliente_id del request
 */
const verificarAccesoCliente = (req, res, next) => {
  if (!req.user) {
    return unauthorized(res, 'Usuario no autenticado');
  }
  
  // Admin y usuarios internos pueden acceder a cualquier cliente
  if (req.user.esAdmin || req.user.esInterno) {
    return next();
  }
  
  // Obtener cliente_id del request (params, query o body)
  const clienteIdSolicitado = parseInt(
    req.params.clienteId || 
    req.params.cliente_id || 
    req.query.cliente_id || 
    req.body?.cliente_id
  );
  
  // Si no hay cliente_id en el request, continuar
  if (!clienteIdSolicitado) {
    return next();
  }
  
  // Verificar que el usuario cliente solo acceda a su propio cliente
  if (req.user.esCliente && req.user.cliente_id !== clienteIdSolicitado) {
    logger.warn('Intento de acceso a cliente no autorizado:', {
      usuario: req.user.username,
      cliente_id_usuario: req.user.cliente_id,
      cliente_id_solicitado: clienteIdSolicitado,
      ruta: req.originalUrl
    });
    return forbidden(res, 'No tiene acceso a este cliente');
  }
  
  next();
};

/**
 * Middleware para registrar último acceso
 * Actualiza el campo ultimo_acceso del usuario
 */
const registrarAcceso = async (req, res, next) => {
  if (req.usuarioModel) {
    try {
      // Actualizar en background, no bloquear la request
      req.usuarioModel.update({ 
        ultimo_acceso: new Date() 
      }).catch(err => {
        logger.error('Error registrando acceso:', err);
      });
    } catch (error) {
      // No bloquear si falla
      logger.error('Error registrando acceso:', error);
    }
  }
  next();
};

/**
 * Helper: Obtener cliente_id del contexto
 * Útil para controladores que necesitan el cliente_id
 */
const obtenerClienteIdContexto = (req) => {
  // Si es usuario cliente, retornar su cliente_id
  if (req.user?.esCliente && req.user?.cliente_id) {
    return req.user.cliente_id;
  }
  
  // Si no, buscar en params/query/body
  return parseInt(
    req.params.clienteId || 
    req.params.cliente_id || 
    req.query.cliente_id || 
    req.body?.cliente_id
  ) || null;
};

module.exports = {
  // Autenticación básica
  verificarToken,
  verificarTokenOpcional,
  
  // Control de roles
  checkRole,
  soloUsuariosInternos,
  
  // Permisos de cliente
  verificarPermisoCliente,
  verificarCambioPassword,
  filtrarPorCliente,
  verificarAccesoCliente,
  
  // Utilidades
  registrarAcceso,
  obtenerClienteIdContexto,

  // Cache de permisos
  invalidarCachePermisos,
  cargarCachePermisos,
  getRolFromCache,
  getPermisosForRol
};