/**
 * ISTHO CRM - Validadores de Operación
 * 
 * MODIFICACIÓN v1.1.0:
 * - documento_wms ahora es opcional (permite modo manual)
 * - Agregada validación de detalles para modo manual
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.1.0
 */

const { body, param, query, validationResult } = require('express-validator');
const { error: errorResponse } = require('../utils/responses');

const validar = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const erroresFormateados = errors.array().map(err => ({
      field: err.path,
      message: err.msg
    }));
    return errorResponse(res, 'Error de validación', 400, erroresFormateados, 'VALIDATION_ERROR');
  }
  next();
};

// =============================================
// VALIDADORES DE OPERACIÓN
// =============================================

const crearOperacionValidator = [
  body('tipo')
    .notEmpty().withMessage('El tipo es requerido')
    .isIn(['ingreso', 'salida']).withMessage('Tipo debe ser "ingreso" o "salida"'),
  
  // ✅ MODIFICADO: documento_wms ahora es OPCIONAL (permite modo manual)
  body('documento_wms')
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 50 }).withMessage('El documento WMS no puede exceder 50 caracteres'),
  
  body('cliente_id')
    .notEmpty().withMessage('El cliente es requerido')
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  // ✅ AGREGADO: Validación de fecha_operacion
  body('fecha_operacion')
    .optional()
    .isISO8601().withMessage('Fecha de operación inválida'),
  
  body('origen')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('El origen no puede exceder 200 caracteres'),
  
  body('destino')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('El destino no puede exceder 200 caracteres'),
  
  body('vehiculo_placa')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('La placa no puede exceder 10 caracteres'),
  
  body('vehiculo_tipo')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El tipo de vehículo no puede exceder 50 caracteres'),
  
  body('conductor_nombre')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('El nombre del conductor no puede exceder 150 caracteres'),
  
  body('conductor_cedula')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('La cédula no puede exceder 20 caracteres'),
  
  body('conductor_telefono')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),
  
  body('prioridad')
    .optional()
    .isIn(['baja', 'normal', 'alta', 'urgente']).withMessage('Prioridad no válida'),
  
  body('observaciones')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Las observaciones no pueden exceder 2000 caracteres'),
  
  // ✅ AGREGADO: Validación de detalles para modo manual
  body('detalles')
    .optional()
    .isArray().withMessage('Los detalles deben ser un array'),
  
  body('detalles.*.producto_id')
    .optional()
    .isInt({ min: 1 }).withMessage('ID de producto inválido'),
  
  body('detalles.*.sku')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El SKU no puede exceder 50 caracteres'),
  
  body('detalles.*.producto')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('El nombre del producto no puede exceder 200 caracteres'),
  
  body('detalles.*.cantidad')
    .optional()
    .isFloat({ min: 0.001 }).withMessage('La cantidad debe ser mayor a 0'),
  
  body('detalles.*.unidad_medida')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('La unidad de medida no puede exceder 20 caracteres'),
  
  validar
];

const actualizarTransporteValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de operación inválido'),
  
  body('origen')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('El origen no puede exceder 200 caracteres'),
  
  body('destino')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('El destino no puede exceder 200 caracteres'),
  
  body('vehiculo_placa')
    .optional()
    .trim()
    .isLength({ max: 10 }).withMessage('La placa no puede exceder 10 caracteres'),
  
  body('conductor_nombre')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('El nombre del conductor no puede exceder 150 caracteres'),
  
  body('conductor_cedula')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('La cédula no puede exceder 20 caracteres'),
  
  body('conductor_telefono')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('El teléfono no puede exceder 50 caracteres'),
  
  validar
];

const registrarAveriaValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de operación inválido'),
  
  body('detalle_id')
    .optional()
    .isInt({ min: 1 }).withMessage('ID de detalle inválido'),
  
  body('sku')
    .trim()
    .notEmpty().withMessage('El SKU es requerido')
    .isLength({ max: 50 }).withMessage('El SKU no puede exceder 50 caracteres'),
  
  body('cantidad')
    .notEmpty().withMessage('La cantidad es requerida')
    .isFloat({ min: 0.001 }).withMessage('La cantidad debe ser mayor a 0'),
  
  body('tipo_averia')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('El tipo de avería no puede exceder 100 caracteres'),
  
  body('descripcion')
    .optional()
    .trim()
    .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),
  
  validar
];

const cerrarOperacionValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID de operación inválido'),
  
  body('observaciones_cierre')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Las observaciones no pueden exceder 2000 caracteres'),
  
  body('enviar_correo')
    .optional()
    .isBoolean().withMessage('enviar_correo debe ser verdadero o falso'),
  
  body('correos_destino')
    .optional()
    .trim(),
  
  validar
];

const idParamValidator = [
  param('id')
    .isInt({ min: 1 }).withMessage('ID inválido'),
  validar
];

const listarOperacionesValidator = [
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Página debe ser un número positivo'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Límite debe ser entre 1 y 100'),
  
  query('tipo')
    .optional()
    .isIn(['ingreso', 'salida', 'todos']).withMessage('Tipo no válido'),
  
  query('estado')
    .optional()
    .isIn(['pendiente', 'en_proceso', 'cerrado', 'anulado', 'todos']).withMessage('Estado no válido'),
  
  query('cliente_id')
    .optional()
    .isInt({ min: 1 }).withMessage('ID de cliente inválido'),
  
  validar
];

module.exports = {
  validar,
  crearOperacionValidator,
  actualizarTransporteValidator,
  registrarAveriaValidator,
  cerrarOperacionValidator,
  idParamValidator,
  listarOperacionesValidator
};