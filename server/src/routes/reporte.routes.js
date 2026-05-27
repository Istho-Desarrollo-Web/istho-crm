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
const { requiereRolMinimo, requierePermiso } = require('../middleware/roles');
const { limiterExport } = require('../middleware/rateLimiter');

// Todas las rutas requieren autenticación y filtro por cliente
router.use(verificarToken);
router.use(filtrarPorCliente);

// Rate limit a todas las exportaciones de este router
router.use(/\/(excel|pdf|csv)$/, limiterExport);

// =============================================
// DASHBOARD
// =============================================

router.get('/dashboard', reporteController.getDashboard);
router.get('/periodos-disponibles', reporteController.getPeriodosDisponibles);

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
// REPORTES DE INVENTARIO POR UBICACIÓN
// =============================================

router.get('/inventario-ubicacion', reporteController.getReporteInventarioUbicacion);
router.get('/inventario-ubicacion/excel', reporteController.exportarInventarioUbicacionExcel);
router.get('/inventario-ubicacion/pdf', reporteController.exportarInventarioUbicacionPDF);

// =============================================
// REPORTES DE CLIENTES
// =============================================

router.get(
  '/clientes/excel',
  requiereRolMinimo('operador'),
  reporteController.exportarClientesExcel
);
router.get('/clientes/pdf', requiereRolMinimo('operador'), reporteController.exportarClientesPDF);

// =============================================
// REPORTES FINANCIEROS (datos JSON para vistas)
// =============================================

router.get('/viajes-reporte', reporteController.getReporteViajes);
router.get('/cajas-menores-reporte', reporteController.getReporteCajasMenores);
router.get('/gastos-reporte', reporteController.getReporteGastos);

// =============================================
// REPORTES DE VIAJES
// =============================================

router.get('/viajes/excel', reporteController.exportarViajesExcel);
router.get('/viajes/pdf', reporteController.exportarViajesPDF);
router.get('/cajas-menores/excel', reporteController.exportarCajasMenoresExcel);
router.get('/cajas-menores/pdf', reporteController.exportarCajasMenoresPDF);
router.get('/cajas-menores/:id/excel', reporteController.exportarCajaMenorExcel);
router.get('/cajas-menores/:id/pdf', reporteController.exportarCajaMenorPDF);

// =============================================
// REPORTES DE VEHICULOS
// =============================================

router.get('/vehiculos/excel', reporteController.exportarVehiculosExcel);
router.get('/vehiculos/pdf', reporteController.exportarVehiculosPDF);
router.get('/vehiculos/csv', reporteController.exportarVehiculosCsv);

// =============================================
// REPORTES DE MOVIMIENTOS
// =============================================

router.get('/movimientos/excel', reporteController.exportarMovimientosExcel);
router.get('/movimientos/pdf', reporteController.exportarGastosPDF);
router.get('/movimientos/csv', reporteController.exportarMovimientosCsv);

// =============================================
// REPORTES DE VIAJES (CSV)
// =============================================

router.get('/viajes/csv', reporteController.exportarViajesCsv);

// =============================================
// REPORTES DE AVERÍAS
// =============================================

// Averías
router.get('/averias', requierePermiso('reportes', 'ver'), reporteController.getReporteAverias);
router.get(
  '/averias/excel',
  requierePermiso('reportes', 'ver'),
  reporteController.exportarAveriasExcel
);
router.get(
  '/averias/pdf',
  requierePermiso('reportes', 'ver'),
  reporteController.exportarAveriasPDF
);

// =============================================
// REPORTE DE SOLICITUDES
// =============================================

router.get('/solicitudes', requierePermiso('reportes', 'ver'), reporteController.reporteSolicitudes);
router.get('/solicitudes/excel', requierePermiso('reportes', 'ver'), reporteController.exportarSolicitudesExcel);
router.get('/solicitudes/pdf', requierePermiso('reportes', 'ver'), reporteController.exportarSolicitudesPDF);

// =============================================
// ENVIAR REPORTE POR EMAIL
// =============================================

router.post(
  '/enviar-email',
  requierePermiso('reportes', 'crear'),
  reporteController.enviarReportePorEmail
);

// =============================================
// REPORTES COMPARATIVOS
// =============================================

router.get('/comparativo', reporteController.getComparativo);

// =============================================
// REPORTES PROGRAMADOS (CRUD)
// =============================================

router.get(
  '/programados',
  requierePermiso('reportes', 'crear'),
  reporteController.listarProgramados
);
router.post(
  '/programados',
  requierePermiso('reportes', 'crear'),
  reporteController.crearProgramado
);
router.put(
  '/programados/:id',
  requierePermiso('reportes', 'crear'),
  reporteController.actualizarProgramado
);
router.delete(
  '/programados/:id',
  requierePermiso('reportes', 'crear'),
  reporteController.eliminarProgramado
);
router.post(
  '/programados/:id/ejecutar',
  requierePermiso('reportes', 'crear'),
  reporteController.ejecutarProgramadoManual
);

module.exports = router;
