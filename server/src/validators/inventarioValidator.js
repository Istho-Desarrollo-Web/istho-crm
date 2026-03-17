/**
 * ISTHO CRM - Validadores de Inventario
 * 
 * Esquemas de validación para endpoints de inventario.
 * 
 * CORRECCIÓN v1.1.0:
 * - Agregados 'bajo_stock' y 'agotado' como valores válidos de estado
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const { body, param, query, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

/**
 * Middleware para ejecutar validaciones
 */
const validar = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const erroresFormateados = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    
    return errorResponse(
      res, 
      'Error de validación', 
      400, 
      erroresFormateados,
      'VALIDATION_ERROR'
    );
  }
  
  next();
};

// =============================================
// VALIDADORES DE INVENTARIO
// =============================================

/**
 * Validación para crear item de inventario
 */
const crearInventarioValidator = [
  body('cliente_id')
    .notEmpty().withMessage('El cliente es requerido')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El SKU no puede exceder 50 caracteres'),
  
  body('codigo')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El código no puede exceder 50 caracteres'),
  
  body('codigo_barras')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El código de barras no puede exceder 50 caracteres'),
  
  body('producto')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('El producto debe tener entre 2 y 200 caracteres'),
  
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  
  body('categoria')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La categoría no puede exceder 100 caracteres'),
  
  body('unidad_medida')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('La unidad de medida no puede exceder 20 caracteres'),
  
  body('cantidad')
    .optional()
    .isFloat({ min: 0 }).withMessage('La cantidad debe ser un número positivo'),
  
  body('stock_actual')
    .optional()
    .isFloat({ min: 0 }).withMessage('El stock actual debe ser un número positivo'),
  
  body('cantidad_reservada')
    .optional()
    .isFloat({ min: 0 }).withMessage('La cantidad reservada debe ser un número positivo'),
  
  body('stock_minimo')
    .optional()
    .isFloat({ min: 0 }).withMessage('El stock mínimo debe ser un número positivo'),
  
  body('stock_maximo')
    .optional()
    .isFloat({ min: 0 }).withMessage('El stock máximo debe ser un número positivo'),
  
  body('ubicacion')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La ubicación no puede exceder 50 caracteres'),
  
  body('zona')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La zona no puede exceder 50 caracteres'),
  
  body('bodega')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La bodega no puede exceder 50 caracteres'),
  
  body('lote')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El lote no puede exceder 50 caracteres'),
  
  body('fecha_vencimiento')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === '' || value === null) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Fecha de vencimiento debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),
  
  body('fecha_ingreso')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === '' || value === null) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Fecha de ingreso debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),
  
  body('costo_unitario')
    .optional()
    .isFloat({ min: 0 }).withMessage('El costo unitario debe ser un número positivo'),
  
  body('estado')
    .optional()
    .isIn(['disponible', 'reservado', 'dañado', 'cuarentena', 'vencido'])
    .withMessage('Estado no válido'),
  
  body('codigo_wms')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El código WMS no puede exceder 50 caracteres'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Las notas no pueden exceder 2000 caracteres'),
  
  // Validación custom: debe tener producto o nombre, y sku o codigo
  (req, res, next) => {
    if (!req.body.producto && !req.body.nombre) {
      return errorResponse(res, 'El nombre del producto es requerido', 400, [
        { field: 'producto', message: 'El nombre del producto es requerido' }
      ], 'VALIDATION_ERROR');
    }
    if (!req.body.sku && !req.body.codigo) {
      return errorResponse(res, 'El código/SKU es requerido', 400, [
        { field: 'sku', message: 'El código/SKU es requerido' }
      ], 'VALIDATION_ERROR');
    }
    next();
  },
  
  validar
];

/**
 * Validación para actualizar item de inventario
 */
const actualizarInventarioValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de inventario inválido'),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El SKU no puede exceder 50 caracteres'),
  
  body('codigo')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El código no puede exceder 50 caracteres'),
  
  body('codigo_barras')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El código de barras no puede exceder 50 caracteres'),
  
  body('producto')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('El producto debe tener entre 2 y 200 caracteres'),
  
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  
  body('categoria')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('La categoría no puede exceder 100 caracteres'),
  
  body('unidad_medida')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('La unidad de medida no puede exceder 20 caracteres'),
  
  body('cantidad')
    .optional()
    .isFloat({ min: 0 }).withMessage('La cantidad debe ser un número positivo'),
  
  body('stock_actual')
    .optional()
    .isFloat({ min: 0 }).withMessage('El stock actual debe ser un número positivo'),
  
  body('cantidad_reservada')
    .optional()
    .isFloat({ min: 0 }).withMessage('La cantidad reservada debe ser un número positivo'),
  
  body('stock_minimo')
    .optional()
    .isFloat({ min: 0 }).withMessage('El stock mínimo debe ser un número positivo'),
  
  body('stock_maximo')
    .optional()
    .isFloat({ min: 0 }).withMessage('El stock máximo debe ser un número positivo'),
  
  body('ubicacion')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La ubicación no puede exceder 50 caracteres'),
  
  body('zona')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La zona no puede exceder 50 caracteres'),
  
  body('bodega')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('La bodega no puede exceder 50 caracteres'),
  
  body('lote')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El lote no puede exceder 50 caracteres'),
  
  body('fecha_vencimiento')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === '' || value === null) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error('Fecha de vencimiento debe ser válida (YYYY-MM-DD)');
      }
      return true;
    }),
  
  body('costo_unitario')
    .optional()
    .isFloat({ min: 0 }).withMessage('El costo unitario debe ser un número positivo'),
  
  body('estado')
    .optional()
    .isIn(['disponible', 'reservado', 'dañado', 'cuarentena', 'vencido'])
    .withMessage('Estado no válido'),
  
  body('notas')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Las notas no pueden exceder 2000 caracteres'),
  
  validar
];

/**
 * Validación de parámetro ID
 */
const idParamValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID inválido'),
  
  validar
];

/**
 * Validación para parámetro de cliente
 */
const clienteIdParamValidator = [
  param('clienteId')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  validar
];

/**
 * Validación de query params para listado
 * 
 * CORRECCIÓN: Agregados 'bajo_stock' y 'agotado' como estados virtuales
 * para filtrar desde el frontend
 */
const listarInventarioValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  
  query('cliente_id')
    .optional()
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  // CORREGIDO: Agregados bajo_stock y agotado
  query('estado')
    .optional()
    .isIn([
      'disponible', 
      'reservado', 
      'dañado', 
      'cuarentena', 
      'vencido', 
      'bajo_stock',  // Estado virtual - filtra por cantidad <= stock_minimo
      'agotado',     // Estado virtual - filtra por cantidad = 0
      'todos'
    ])
    .withMessage('Estado no válido'),
  
  query('categoria')
    .optional()
    .trim(),
  
  query('zona')
    .optional()
    .trim(),
  
  query('bodega')
    .optional()
    .trim(),
  
  query('stock_bajo')
    .optional()
    .isIn(['true', 'false']).withMessage('stock_bajo debe ser true o false'),
  
  query('por_vencer')
    .optional()
    .isIn(['true', 'false']).withMessage('por_vencer debe ser true o false'),
  
  query('search')
    .optional()
    .trim(),
  
  query('sort')
    .optional()
    .isIn(['producto', 'sku', 'cantidad', 'ubicacion', 'fecha_vencimiento', 'created_at', 'estado'])
    .withMessage('Campo de ordenamiento no válido'),
  
  query('order')
    .optional()
    .isIn(['ASC', 'DESC', 'asc', 'desc']).withMessage('Orden debe ser ASC o DESC'),
  
  validar
];

/**
 * Validación para ajuste de cantidad
 */
const ajustarCantidadValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de inventario inválido'),
  
  body('cantidad')
    .notEmpty().withMessage('La cantidad es requerida')
    .isFloat().withMessage('La cantidad debe ser un número'),
  
  body('tipo')
    .notEmpty().withMessage('El tipo de ajuste es requerido')
    .isIn(['entrada', 'salida', 'ajuste']).withMessage('Tipo debe ser: entrada, salida o ajuste'),
  
  body('motivo')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('El motivo no puede exceder 500 caracteres'),
  
  body('documento_referencia')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El documento de referencia no puede exceder 100 caracteres'),
  
  body('documento')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El documento no puede exceder 100 caracteres'),
  
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('Las observaciones no pueden exceder 1000 caracteres'),
  
  validar
];

module.exports = {
  validar,
  crearInventarioValidator,
  actualizarInventarioValidator,
  idParamValidator,
  clienteIdParamValidator,
  listarInventarioValidator,
  ajustarCantidadValidator
};