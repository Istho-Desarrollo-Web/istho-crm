/**
 * ISTHO CRM - Servicio de Cloudinary
 *
 * Upload, compresión y eliminación de archivos en Cloudinary.
 * Soporta imágenes (con compresión automática), PDFs y archivos comprimidos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Verificar si Cloudinary está configurado
 */
const isConfigured = () => {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
};

/**
 * Subir imagen con compresión automática
 * @param {string} filePath - Ruta local del archivo
 * @param {Object} options - Opciones adicionales
 * @param {string} options.folder - Carpeta en Cloudinary
 * @param {string} options.publicId - ID público personalizado
 * @returns {Object} { url, public_id, format, bytes, width, height }
 */
const subirImagen = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'istho-crm/general',
      public_id: options.publicId || undefined,
      resource_type: 'image',
      transformation: [
        { width: 1920, crop: 'limit' }, // Max 1920px de ancho
        { quality: 'auto:good' }, // Compresión inteligente
        { fetch_format: 'auto' }, // Formato óptimo (WebP si soportado)
      ],
      overwrite: true,
    });

    logger.info('Imagen subida a Cloudinary:', {
      public_id: result.public_id,
      bytes: result.bytes,
      format: result.format,
      url: result.secure_url,
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      original_filename: result.original_filename,
    };
  } catch (error) {
    logger.error('Error subiendo imagen a Cloudinary:', { message: error.message });
    throw error;
  }
};

/**
 * Subir imagen desde buffer en memoria (sin disco) — para entornos cloud
 * @param {Buffer} buffer - Buffer del archivo
 * @param {Object} options - Opciones adicionales
 */
const subirImagenBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'istho-crm/general',
        public_id: options.publicId || undefined,
        resource_type: 'image',
        transformation: [
          { width: 1920, crop: 'limit' },
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          logger.error('Error subiendo buffer a Cloudinary:', { message: error.message });
          return reject(error);
        }
        logger.info('Imagen subida a Cloudinary (buffer):', {
          public_id: result.public_id,
          bytes: result.bytes,
          url: result.secure_url,
        });
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes,
          width: result.width,
          height: result.height,
          original_filename: result.original_filename,
        });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Subir archivo raw desde buffer en memoria — para entornos cloud
 */
const subirArchivoBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'istho-crm/general',
        public_id: options.publicId || undefined,
        resource_type: 'raw',
        overwrite: true,
      },
      (error, result) => {
        if (error) {
          logger.error('Error subiendo buffer raw a Cloudinary:', { message: error.message });
          return reject(error);
        }
        logger.info('Archivo subido a Cloudinary (buffer):', {
          public_id: result.public_id,
          bytes: result.bytes,
          url: result.secure_url,
        });
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format || options.extension || '',
          bytes: result.bytes,
          original_filename: result.original_filename,
        });
      }
    );
    stream.end(buffer);
  });
};

/**
 * Subir archivo raw (PDF, ZIP, RAR, etc.)
 * @param {string} filePath - Ruta local del archivo
 * @param {Object} options - Opciones adicionales
 * @returns {Object} { url, public_id, format, bytes }
 */
const subirArchivo = async (filePath, options = {}) => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: options.folder || 'istho-crm/general',
      public_id: options.publicId || undefined,
      resource_type: 'raw',
      overwrite: true,
    });

    logger.info('Archivo subido a Cloudinary:', {
      public_id: result.public_id,
      bytes: result.bytes,
      url: result.secure_url,
    });

    return {
      url: result.secure_url,
      public_id: result.public_id,
      format: result.format || options.extension || '',
      bytes: result.bytes,
      original_filename: result.original_filename,
    };
  } catch (error) {
    logger.error('Error subiendo archivo a Cloudinary:', { message: error.message });
    throw error;
  }
};

/**
 * Subir archivo automáticamente según tipo MIME
 * @param {Object} file - Objeto de multer { path, mimetype, originalname, size }
 * @param {string} folder - Carpeta destino en Cloudinary
 * @returns {Object} { url, public_id, format, bytes, tipo }
 */
const subir = async (file, folder = 'istho-crm/general') => {
  if (!isConfigured()) {
    logger.warn('Cloudinary no configurado, guardando referencia local');
    return {
      url: `/uploads/${file.filename || file.originalname}`,
      public_id: null,
      format: file.mimetype,
      bytes: file.size,
      tipo: 'local',
    };
  }

  const esImagen = file.mimetype && file.mimetype.startsWith('image/');
  const extension = file.originalname?.split('.').pop() || '';

  // memoryStorage: file.buffer disponible, sin path en disco
  if (file.buffer) {
    if (esImagen) {
      const result = await subirImagenBuffer(file.buffer, { folder });
      return { ...result, tipo: 'imagen' };
    } else {
      const result = await subirArchivoBuffer(file.buffer, { folder, extension });
      return { ...result, tipo: 'archivo' };
    }
  }

  // diskStorage: usar path (legacy / desarrollo local)
  if (esImagen) {
    const result = await subirImagen(file.path, { folder });
    return { ...result, tipo: 'imagen' };
  } else {
    const result = await subirArchivo(file.path, { folder, extension });
    return { ...result, tipo: 'archivo' };
  }
};

/**
 * Subir múltiples archivos
 * @param {Array} files - Array de objetos multer
 * @param {string} folder - Carpeta destino
 * @returns {Array} Array de resultados
 */
const subirMultiples = async (files, folder) => {
  const resultados = [];
  for (const file of files) {
    try {
      const resultado = await subir(file, folder);
      resultados.push({
        ...resultado,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
    } catch (error) {
      logger.error('Error subiendo archivo:', { file: file.originalname, error: error.message });
      resultados.push({
        url: null,
        public_id: null,
        error: error.message,
        originalname: file.originalname,
      });
    }
  }
  return resultados;
};

/**
 * Eliminar archivo de Cloudinary
 * @param {string} publicId - Public ID del archivo
 * @param {string} resourceType - 'image' | 'raw' | 'video'
 */
const eliminar = async (publicId, resourceType = 'image') => {
  if (!publicId || !isConfigured()) return;

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    logger.info('Archivo eliminado de Cloudinary:', { public_id: publicId, result: result.result });
    return result;
  } catch (error) {
    logger.error('Error eliminando de Cloudinary:', { public_id: publicId, error: error.message });
    // No relanzar — la eliminación es best-effort
  }
};

/**
 * Eliminar múltiples archivos
 * @param {Array} publicIds - Array de public IDs
 * @param {string} resourceType - 'image' | 'raw'
 */
const eliminarMultiples = async (publicIds, resourceType = 'image') => {
  if (!publicIds?.length || !isConfigured()) return;

  try {
    const result = await cloudinary.api.delete_resources(publicIds, {
      resource_type: resourceType,
    });
    logger.info('Archivos eliminados de Cloudinary:', { count: publicIds.length });
    return result;
  } catch (error) {
    logger.error('Error eliminando múltiples de Cloudinary:', { error: error.message });
  }
};

/**
 * Generar URL con transformación
 * @param {string} publicId - Public ID
 * @param {Object} transformations - Transformaciones de Cloudinary
 * @returns {string} URL transformada
 */
const getUrl = (publicId, transformations = {}) => {
  return cloudinary.url(publicId, {
    secure: true,
    ...transformations,
  });
};

/**
 * Generar thumbnail de una imagen
 * @param {string} publicId - Public ID
 * @param {number} width - Ancho del thumbnail
 * @param {number} height - Alto del thumbnail
 * @returns {string} URL del thumbnail
 */
const getThumbnail = (publicId, width = 200, height = 200) => {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width, height, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:low' },
      { fetch_format: 'auto' },
    ],
  });
};

module.exports = {
  cloudinary,
  isConfigured,
  subir,
  subirImagen,
  subirImagenBuffer,
  subirArchivo,
  subirArchivoBuffer,
  subirMultiples,
  eliminar,
  eliminarMultiples,
  getUrl,
  getThumbnail,
};
