'use strict';

const procesarArchivo = require('../utils/procesarArchivo');

/**
 * Middleware Express que comprime imágenes en req.file / req.files justo antes
 * del controller, usando sharp (WebP). PDFs y otros formatos pasan sin cambios.
 *
 * Uso en rutas:
 *   router.post('/ruta', upload.single('foto'), comprimir({ maxWidthPx: 1600, quality: 82 }), controller);
 *
 * @param {object} [opts]
 * @param {number} [opts.maxWidthPx=2000]
 * @param {number} [opts.quality=80]
 */
const comprimir = (opts = {}) =>
  async (req, res, next) => {
    try {
      if (req.file) {
        req.file = await procesarArchivo(req.file, opts);
      }
      if (Array.isArray(req.files) && req.files.length > 0) {
        req.files = await Promise.all(req.files.map((f) => procesarArchivo(f, opts)));
      }
      next();
    } catch (err) {
      next(err);
    }
  };

module.exports = comprimir;
