/**
 * ISTHO CRM - Funciones Helper
 * 
 * Utilidades comunes para toda la aplicación.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { PAGINATION } = require('./constants');

/**
 * Parsear parámetros de paginación desde query string
 * @param {Object} query - req.query de Express
 * @returns {Object} { page, limit, offset }
 */
const parsePaginacion = (query) => {
  let page = parseInt(query.page) || PAGINATION.DEFAULT_PAGE;
  let limit = parseInt(query.limit) || PAGINATION.DEFAULT_LIMIT;
  
  // Validar límites
  if (page < 1) page = 1;
  if (limit < 1) limit = PAGINATION.DEFAULT_LIMIT;
  if (limit > PAGINATION.MAX_LIMIT) limit = PAGINATION.MAX_LIMIT;
  
  const offset = (page - 1) * limit;
  
  return { page, limit, offset };
};

/**
 * Construir objeto de paginación para respuesta
 * @param {number} total - Total de registros
 * @param {number} page - Página actual
 * @param {number} limit - Registros por página
 * @returns {Object} Objeto de paginación
 */
const buildPaginacion = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  
  return {
    total,
    page,
    limit,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1
  };
};

/**
 * Parsear parámetros de ordenamiento
 * @param {Object} query - req.query de Express
 * @param {Array} camposPermitidos - Campos permitidos para ordenar
 * @param {string} defaultField - Campo por defecto
 * @param {string} defaultOrder - Orden por defecto ('ASC' o 'DESC')
 * @returns {Array} Array para Sequelize order
 */
const parseOrdenamiento = (query, camposPermitidos, defaultField = 'created_at', defaultOrder = 'DESC') => {
  const { sort, order } = query;
  
  let campo = defaultField;
  let direccion = defaultOrder;
  
  if (sort && camposPermitidos.includes(sort)) {
    campo = sort;
  }
  
  if (order && ['ASC', 'DESC', 'asc', 'desc'].includes(order)) {
    direccion = order.toUpperCase();
  }
  
  return [[campo, direccion]];
};

/**
 * Limpiar objeto removiendo campos undefined o null
 * @param {Object} obj - Objeto a limpiar
 * @returns {Object} Objeto limpio
 */
const limpiarObjeto = (obj) => {
  const limpio = {};
  
  Object.keys(obj).forEach(key => {
    if (obj[key] !== undefined && obj[key] !== null && obj[key] !== '') {
      limpio[key] = obj[key];
    }
  });
  
  return limpio;
};

/**
 * Formatear NIT colombiano
 * @param {string} nit - NIT sin formato
 * @returns {string} NIT formateado (123456789-0)
 */
const formatearNIT = (nit) => {
  if (!nit) return null;
  
  // Remover caracteres no numéricos excepto guión
  const limpio = nit.replace(/[^0-9-]/g, '');
  
  // Si ya tiene guión, retornar
  if (limpio.includes('-')) return limpio;
  
  // Si tiene 10 dígitos, agregar guión
  if (limpio.length === 10) {
    return `${limpio.slice(0, 9)}-${limpio.slice(9)}`;
  }
  
  return limpio;
};

/**
 * Generar código de cliente automático
 * @param {number} ultimoId - Último ID de cliente
 * @returns {string} Código en formato CLI-0001
 */
const generarCodigoCliente = (ultimoId) => {
  const siguiente = (ultimoId || 0) + 1;
  return `CLI-${String(siguiente).padStart(4, '0')}`;
};

/**
 * Obtener IP real del cliente (considerando proxies)
 * @param {Object} req - Request de Express
 * @returns {string} IP del cliente
 */
const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
};

/**
 * Sanitizar string para búsqueda SQL
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
const sanitizarBusqueda = (str) => {
  if (!str) return '';
  return str.replace(/[%_]/g, '\\$&').trim();
};

module.exports = {
  parsePaginacion,
  buildPaginacion,
  parseOrdenamiento,
  limpiarObjeto,
  formatearNIT,
  generarCodigoCliente,
  getClientIP,
  sanitizarBusqueda
};