/**
 * ISTHO CRM - Rutas de Operaciones
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

const operacionController = require('../controllers/operacionController');
const {
  verificarToken,
  filtrarPorCliente,
  verificarPermisoCliente,
} = require('../middleware/auth');
const { requiereRolMinimo, noClientes } = require('../middleware/roles');
const { uploadAveria, uploadCumplido } = require('../config/multer');
const comprimir = require('../middleware/comprimir');
const {
  crearOperacionValidator,
  actualizarTransporteValidator,
  registrarAveriaValidator,
  cerrarOperacionValidator,
  idParamValidator,
  listarOperacionesValidator,
} = require('../validators/operacionValidator');

// Todas las rutas requieren autenticación y filtro por cliente
router.use(verificarToken);
router.use(filtrarPorCliente);

// =============================================
// RUTAS WMS (Simulación)
// =============================================

router.get('/wms/documentos', operacionController.listarDocumentosWMS);
router.get('/wms/documento/:numero', operacionController.buscarDocumentoWMS);

// =============================================
// RUTAS DE OPERACIONES
// =============================================

router.get('/', listarOperacionesValidator, operacionController.listar);
router.get('/stats', requiereRolMinimo('operador'), operacionController.estadisticas);
router.get('/:id', idParamValidator, operacionController.obtenerPorId);

router.post(
  '/',
  noClientes,
  requiereRolMinimo('operador'),
  crearOperacionValidator,
  operacionController.crear
);

router.put(
  '/:id/transporte',
  noClientes,
  requiereRolMinimo('operador'),
  actualizarTransporteValidator,
  operacionController.actualizarTransporte
);

// Averías
router.get('/:id/averias', operacionController.listarAverias);
router.post(
  '/:id/averias',
  noClientes,
  requiereRolMinimo('operador'),
  uploadAveria.array('fotos', 20),
  comprimir({ maxWidthPx: 1600 }),
  registrarAveriaValidator,
  operacionController.registrarAveria
);
router.delete(
  '/:id/averias/:averiaId',
  noClientes,
  requiereRolMinimo('operador'),
  operacionController.eliminarAveria
);

// Documentos/Cumplidos (con upload de archivo)
router.post(
  '/:id/documentos',
  noClientes,
  requiereRolMinimo('operador'),
  uploadCumplido.single('archivo'),
  comprimir({ maxWidthPx: 1920 }),
  operacionController.subirDocumento
);

// Cerrar operación
router.post(
  '/:id/cerrar',
  noClientes,
  requiereRolMinimo('operador'),
  cerrarOperacionValidator,
  operacionController.cerrar
);

// Reenviar correo de cierre (requiere permiso auditoria.reenviar_correo)
router.post(
  '/:id/reenviar-correo',
  noClientes,
  requiereRolMinimo('operador'),
  verificarPermisoCliente('auditoria', 'reenviar_correo'),
  operacionController.reenviarCorreo
);

// Edición administrativa (solo admin)
router.put(
  '/:id',
  noClientes,
  requiereRolMinimo('admin'),
  operacionController.editarAdmin
);

// Anular operación
router.delete(
  '/:id',
  requiereRolMinimo('supervisor'),
  idParamValidator,
  operacionController.anular
);

module.exports = router;
