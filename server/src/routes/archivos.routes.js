/**
 * ISTHO CRM - Rutas de Archivos S3
 *
 * Genera presigned URLs para acceso temporal a archivos en S3.
 */

const express = require('express');
const router = express.Router();
const { verificarToken } = require('../middleware/auth');
const s3Service = require('../services/s3Service');
const { success, error: errorResponse } = require('../utils/responses');

/**
 * GET /archivos/url?key=<s3-key>&expires=3600
 * Genera presigned URL para un archivo S3 almacenado en BD.
 * Requiere autenticación — los archivos son privados.
 */
router.get('/url', verificarToken, async (req, res) => {
  try {
    const { key } = req.query;
    if (!key) return errorResponse(res, 'Parámetro key requerido', 400);

    // Solo aceptar S3 keys (sin http ni data:)
    if (!s3Service.isS3Key(key)) {
      return errorResponse(res, 'Key inválida', 400);
    }

    const url = await s3Service.getUrl(key, 3600);
    return success(res, { url });
  } catch (_err) {
    return errorResponse(res, 'Error al generar URL de descarga', 500);
  }
});

module.exports = router;
