/**
 * ISTHO CRM - Rutas de Auditorías WMS
 *
 * Endpoints para el módulo de auditoría de entradas/salidas.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

const auditoriaWmsController = require('../controllers/auditoriaWmsController');
const { verificarToken, filtrarPorCliente } = require('../middleware/auth');
const { requiereRolMinimo } = require('../middleware/roles');
const { uploadCumplido } = require('../config/multer');

// Todas las rutas requieren autenticación y filtrado por cliente portal
router.use(verificarToken);
router.use(filtrarPorCliente);

// =============================================
// ESTADÍSTICAS Y RECIENTES
// =============================================

router.get('/stats', auditoriaWmsController.estadisticas);
router.get('/recientes', auditoriaWmsController.recientes);

// Exportar a Excel
router.get('/:tipo/excel', auditoriaWmsController.exportarExcel);

// =============================================
// ENTRADAS (Ingresos)
// =============================================

router.get('/entradas', auditoriaWmsController.listarEntradas);
router.get('/entradas/:id', auditoriaWmsController.obtenerEntradaPorId);

// =============================================
// SALIDAS (Despachos)
// =============================================

router.get('/salidas', auditoriaWmsController.listarSalidas);
router.get('/salidas/:id', auditoriaWmsController.obtenerSalidaPorId);

// =============================================
// KARDEX (Ajustes)
// =============================================

router.get('/kardex', auditoriaWmsController.listarKardex);
router.get('/kardex/:id', auditoriaWmsController.obtenerKardexPorId);

// =============================================
// ACCIONES SOBRE LÍNEAS
// =============================================

router.put('/:id/lineas/:lineaId/verificar', requiereRolMinimo('operador'), auditoriaWmsController.verificarLinea);
router.delete('/:id/lineas/:lineaId', requiereRolMinimo('operador'), auditoriaWmsController.eliminarLinea);
router.put('/:id/lineas/:lineaId/restaurar', requiereRolMinimo('operador'), auditoriaWmsController.restaurarLinea);

// =============================================
// DATOS LOGÍSTICOS
// =============================================

router.put('/:id/logistica', requiereRolMinimo('operador'), auditoriaWmsController.guardarDatosLogisticos);

// =============================================
// EVIDENCIAS
// =============================================

router.post('/:id/evidencias', requiereRolMinimo('operador'), uploadCumplido.array('evidencias', 6), auditoriaWmsController.subirEvidencias);
router.delete('/:id/evidencias/:evidenciaId', requiereRolMinimo('operador'), auditoriaWmsController.eliminarEvidencia);

// =============================================
// CIERRE
// =============================================

router.post('/:id/cerrar', requiereRolMinimo('operador'), auditoriaWmsController.cerrarAuditoria);

module.exports = router;
