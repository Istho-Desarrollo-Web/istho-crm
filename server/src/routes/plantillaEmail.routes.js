/**
 * ISTHO CRM - Rutas de Plantillas de Email
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();

const plantillaEmailController = require('../controllers/plantillaEmailController');
const { verificarToken } = require('../middleware/auth');
const { requiereRolMinimo } = require('../middleware/roles');
const { uploadLogo } = require('../config/multer');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Logo de firma (debe ir ANTES de /:id para no confundir rutas)
router.get('/logo-firma', plantillaEmailController.obtenerLogoFirma);
router.post('/logo-firma', requiereRolMinimo('supervisor'), uploadLogo.single('logo'), plantillaEmailController.subirLogoFirma);

// Solo admin y supervisor pueden gestionar plantillas
router.get('/', plantillaEmailController.listar);
router.get('/campos/:tipo', plantillaEmailController.camposPorTipo);
router.get('/:id', plantillaEmailController.obtenerPorId);

router.post('/', requiereRolMinimo('supervisor'), plantillaEmailController.crear);
router.post('/preview-raw', requiereRolMinimo('supervisor'), plantillaEmailController.previewRaw);
router.post('/:id/preview', plantillaEmailController.preview);

router.put('/:id', requiereRolMinimo('supervisor'), plantillaEmailController.actualizar);
router.delete('/:id', requiereRolMinimo('supervisor'), plantillaEmailController.eliminar);

module.exports = router;
