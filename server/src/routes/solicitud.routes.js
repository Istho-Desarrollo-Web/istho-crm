/**
 * ISTHO CRM - Rutas de Solicitudes del Cliente
 *
 * Endpoints para avisos de ingreso y solicitudes de despacho creados desde
 * el portal del cliente y gestionados por el equipo interno.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

'use strict';

const express = require('express');
const router = express.Router();

const solicitudController = require('../controllers/solicitudController');
const { uploadSolicitudDoc } = require('../config/multer');
const comprimir = require('../middleware/comprimir');

const { verificarToken, filtrarPorCliente } = require('../middleware/auth');
const { noClientes } = require('../middleware/roles');

const OPTS_SOLICITUD = { maxWidthPx: 1920 };

// =============================================
// Todas las rutas requieren autenticación
// Para usuarios cliente, se filtra automáticamente por su cliente_id
// =============================================
router.use(verificarToken);
router.use(filtrarPorCliente);

// Listar / Crear
router.get('/', solicitudController.listar);
router.post('/', uploadSolicitudDoc.array('archivos', 10), comprimir(OPTS_SOLICITUD), solicitudController.crear);

// Detalle
router.get('/:id', solicitudController.obtener);

// Acciones solo para usuarios internos (no clientes)
router.patch('/:id/estado', noClientes, solicitudController.cambiarEstado);
router.patch('/:id/vincular', noClientes, solicitudController.vincular);

// Comentarios y adjuntos (cliente + internos)
router.post('/:id/comentarios', solicitudController.agregarComentario);
router.post(
  '/:id/documento',
  uploadSolicitudDoc.single('archivo'),
  comprimir(OPTS_SOLICITUD),
  solicitudController.subirDocumento
);
router.post(
  '/:id/documentos',
  uploadSolicitudDoc.single('archivo'),
  comprimir(OPTS_SOLICITUD),
  solicitudController.subirDocumentoAdicional
);

module.exports = router;
