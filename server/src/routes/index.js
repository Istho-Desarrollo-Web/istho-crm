/**
 * ISTHO CRM - Router Principal
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

// Importar rutas
const authRoutes = require('./auth.routes');
const clienteRoutes = require('./cliente.routes');
const inventarioRoutes = require('./inventario.routes');
const operacionRoutes = require('./operacion.routes');
const auditoriasRoutes = require('./auditorias.routes');
const reporteRoutes = require('./reporte.routes');
const notificacionesRoutes = require('./notificacionesRoutes');
const wmsSyncRoutes = require('./wmsSync.routes');
const plantillaEmailRoutes = require('./plantillaEmail.routes');
const adminRoutes = require('./admin.routes');
const auditoriaAccionesRoutes = require('./auditoriaAcciones.routes');
const vehiculoRoutes = require('./vehiculo.routes');
const cajaMenorRoutes = require('./cajaMenor.routes');
const viajeRoutes = require('./viaje.routes');
const movimientoCajaMenorRoutes = require('./movimientoCajaMenor.routes');

// Info de la API
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'ISTHO CRM API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/auth - Autenticación y usuarios',
      clientes: '/clientes - Gestión de clientes y contactos',
      inventario: '/inventario - Gestión de inventario y stock',
      operaciones: '/operaciones - Ingresos y salidas de mercancía',
      auditorias: '/auditorias - Auditorías WMS (entradas y salidas)',
      reportes: '/reportes - Reportes y exportación',
      notificaciones: '/notificaciones - Notificaciones',
      wms: '/wms/sync - Sincronización con WMS Copérnico',
      vehiculos: '/vehiculos - Gestión de vehículos',
      cajaMenor: '/cajas-menores - Gestión de cajas menores',
      viajes: '/viajes - Registro de viajes',
      movimientos: '/movimientos-caja-menor - Gastos e ingresos'
    }
  });
});

// Montar rutas
router.use('/auth', authRoutes);
router.use('/clientes', clienteRoutes);
router.use('/inventario', inventarioRoutes);
router.use('/operaciones', operacionRoutes);
router.use('/auditorias', auditoriasRoutes);
router.use('/reportes', reporteRoutes);
router.use('/notificaciones', notificacionesRoutes);
router.use('/wms/sync', wmsSyncRoutes);
router.use('/plantillas-email', plantillaEmailRoutes);
router.use('/admin', adminRoutes);
router.use('/auditoria-acciones', auditoriaAccionesRoutes);
router.use('/vehiculos', vehiculoRoutes);
router.use('/cajas-menores', cajaMenorRoutes);
router.use('/viajes', viajeRoutes);
router.use('/movimientos-caja-menor', movimientoCajaMenorRoutes);

module.exports = router;