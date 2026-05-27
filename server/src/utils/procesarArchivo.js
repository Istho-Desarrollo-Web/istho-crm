'use strict';

/**
 * Procesa un archivo de multer antes de subirlo a S3.
 * - Imágenes (JPEG, PNG, WebP, GIF): reencoda a WebP lossless y escala si supera maxWidthPx.
 *   Solo aplica el resultado si es más pequeño que el original.
 * - PDF, ZIP, DOC, XLS y otros: pasa sin modificar.
 *
 * @param {object} file      Objeto multer ({ buffer, mimetype, originalname, size, ... })
 * @param {object} [opts]
 * @param {number} [opts.maxWidthPx=2000]  Ancho máximo en píxeles (sin ampliar)
 * @returns {Promise<object>} Mismo objeto multer, posiblemente con buffer/mimetype reemplazados
 */
const procesarArchivo = async (file, { maxWidthPx = 2000 } = {}) => {
  const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!file?.buffer || !TIPOS_IMAGEN.includes(file.mimetype)) return file;

  const sharp = require('sharp');

  const { data, info } = await sharp(file.buffer)
    .resize({ width: maxWidthPx, withoutEnlargement: true })
    .webp({ lossless: true })
    .toBuffer({ resolveWithObject: true });

  if (data.length >= file.buffer.length) return file; // original ya era más pequeño

  const nombre = file.originalname?.replace(/\.[^.]+$/, '') || 'imagen';
  return {
    ...file,
    buffer: data,
    mimetype: 'image/webp',
    originalname: `${nombre}.webp`,
    size: info.size,
  };
};

module.exports = procesarArchivo;
