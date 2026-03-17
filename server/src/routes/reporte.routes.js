/**
 * ISTHO CRM - Rutas de Reportes
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

const reporteController = require('../controllers/reporteController');
const { verificarToken, filtrarPorCliente } = require('../middleware/auth');
const { requiereRolMinimo } = require('../middleware/roles');

// Todas las rutas requieren autenticación y filtro por cliente
router.use(verificarToken);
router.use(filtrarPorCliente);

// =============================================
// DASHBOARD
// =============================================

router.get('/dashboard', reporteController.getDashboard);

// =============================================
// REPORTES DE OPERACIONES
// =============================================

// Exportar listado de operaciones
router.get('/operaciones/excel', reporteController.exportarOperacionesExcel);
router.get('/operaciones/pdf', reporteController.exportarOperacionesPDF);

// Exportar detalle de una operación
router.get('/operaciones/:id/excel', reporteController.exportarDetalleOperacionExcel);
router.get('/operaciones/:id/pdf', reporteController.exportarDetalleOperacionPDF);

// =============================================
// REPORTES DE INVENTARIO
// =============================================

router.get('/inventario/excel', reporteController.exportarInventarioExcel);
router.get('/inventario/pdf', reporteController.exportarInventarioPDF);

// =============================================
// REPORTES DE CLIENTES
// =============================================

router.get('/clientes/excel', requiereRolMinimo('operador'), reporteController.exportarClientesExcel);
router.get('/clientes/pdf', requiereRolMinimo('operador'), reporteController.exportarClientesPDF);

// =============================================
// REPORTES DE VIAJES
// =============================================

router.get('/viajes/excel', reporteController.exportarViajesExcel);
router.get('/cajas-menores/:id/excel', reporteController.exportarCajaMenorExcel);

// =============================================
// ENVIAR REPORTE POR EMAIL
// =============================================

router.post('/enviar-email', requiereRolMinimo('supervisor'), reporteController.enviarReportePorEmail);

// =============================================
// REPORTES COMPARATIVOS
// =============================================

router.get('/comparativo', reporteController.getComparativo);

// =============================================
// REPORTES PROGRAMADOS (CRUD)
// =============================================

router.get('/programados', requiereRolMinimo('supervisor'), reporteController.listarProgramados);
router.post('/programados', requiereRolMinimo('supervisor'), reporteController.crearProgramado);
router.put('/programados/:id', requiereRolMinimo('supervisor'), reporteController.actualizarProgramado);
router.delete('/programados/:id', requiereRolMinimo('supervisor'), reporteController.eliminarProgramado);
router.post('/programados/:id/ejecutar', requiereRolMinimo('supervisor'), reporteController.ejecutarProgramadoManual);

module.exports = router;