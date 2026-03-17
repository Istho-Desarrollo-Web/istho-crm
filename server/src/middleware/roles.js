/**
 * ISTHO CRM - Middleware de Control de Roles
 *
 * Controla el acceso a recursos según el rol del usuario.
 * Soporta tanto roles legacy (string) como dinámicos (rol_id + nivel_jerarquia).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const { forbidden } = require('../utils/responses');
const { ROLES } = require('../utils/constants');

/**
 * Jerarquía legacy de roles (fallback si no hay rol_id)
 */
const JERARQUIA_ROLES = {
  [ROLES.CLIENTE]: 10,
  [ROLES.CONDUCTOR]: 30,
  [ROLES.OPERADOR]: 50,
  [ROLES.FINANCIERA]: 70,
  [ROLES.SUPERVISOR]: 75,
  [ROLES.ADMIN]: 100
};

/**
 * Obtener nivel jerárquico del usuario (dinámico o legacy)
 */
const getNivelUsuario = (user) => {
  // Primero intentar nivel dinámico del cache de rolInfo
  if (user.rolInfo && user.rolInfo.nivel_jerarquia) {
    return user.rolInfo.nivel_jerarquia;
  }
  // Fallback a jerarquía legacy
  return JERARQUIA_ROLES[user.rol] || 0;
};

/**
 * Middleware que requiere roles específicos (por código)
 * @param  {...string} rolesPermitidos - Códigos de roles permitidos
 */
const requiereRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Acceso denegado');
    }

    const rolUsuario = req.user.rol;

    if (rolesPermitidos.includes(rolUsuario)) {
      return next();
    }

    return forbidden(res, `Esta acción requiere rol: ${rolesPermitidos.join(' o ')}`);
  };
};

/**
 * Middleware que requiere nivel de rol mínimo
 * Usa nivel_jerarquia dinámico del cache, con fallback a jerarquía legacy
 * @param {string} rolMinimo - Código del rol mínimo requerido
 */
const requiereRolMinimo = (rolMinimo) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Acceso denegado');
    }

    const nivelUsuario = getNivelUsuario(req.user);
    const nivelMinimo = JERARQUIA_ROLES[rolMinimo] || 0;

    if (nivelUsuario >= nivelMinimo) {
      return next();
    }

    return forbidden(res, `Se requiere rol ${rolMinimo} o superior`);
  };
};

/**
 * Middleware que requiere un permiso específico (módulo + acción)
 * Verifica contra el sistema dinámico de permisos
 * @param {string} modulo - Módulo requerido
 * @param {string} accion - Acción requerida
 */
const requierePermiso = (modulo, accion) => {
  return (req, res, next) => {
    if (!req.user) {
      return forbidden(res, 'Acceso denegado');
    }

    // Admin siempre tiene acceso
    if (req.user.esAdmin) {
      return next();
    }

    // Verificar permiso dinámico
    if (req.user.tienePermiso && req.user.tienePermiso(modulo, accion)) {
      return next();
    }

    return forbidden(res, `No tiene permiso para ${accion} en ${modulo}`);
  };
};

const soloAdmin = requiereRol(ROLES.ADMIN);
const supervisorOAdmin = requiereRol(ROLES.ADMIN, ROLES.SUPERVISOR);
const financieraOAdmin = requiereRol(ROLES.ADMIN, ROLES.SUPERVISOR, ROLES.FINANCIERA);

const noClientes = (req, res, next) => {
  if (!req.user) {
    return forbidden(res, 'Acceso denegado');
  }

  if (req.user.esCliente) {
    return forbidden(res, 'Los clientes no pueden acceder a este recurso');
  }

  next();
};

module.exports = {
  requiereRol,
  requiereRolMinimo,
  requierePermiso,
  soloAdmin,
  supervisorOAdmin,
  financieraOAdmin,
  noClientes,
  JERARQUIA_ROLES,
  getNivelUsuario
};
