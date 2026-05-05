/**
 * ISTHO CRM - Servicio de Amazon S3
 *
 * Upload, descarga (presigned URLs) y eliminación de archivos en S3.
 * Reemplaza Cloudinary. Usa memoryStorage (buffer) — sin archivos en disco.
 *
 * Autenticación: IAM Instance Role de App Runner (sin credenciales hardcodeadas).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 */

const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const crypto = require('crypto');
const logger = require('../utils/logger');

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET = process.env.AWS_S3_BUCKET;

const isConfigured = () => !!BUCKET;

/**
 * Detectar si un valor almacenado es una S3 key (no URL pública ni base64)
 */
const isS3Key = (value) =>
  !!value && !value.startsWith('http') && !value.startsWith('data:');

/**
 * Subir un archivo desde buffer
 * @param {Object} file - Objeto multer con .buffer, .mimetype, .originalname, .size
 * @param {string} carpeta - Prefijo de carpeta en S3 (ej: 'avatares', 'soportes')
 * @returns {{ key, bytes }}
 */
const subir = async (file, carpeta = 'general') => {
  const ext = (file.originalname?.split('.').pop() || 'bin').toLowerCase();
  const key = `${carpeta}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || 'application/octet-stream',
    })
  );

  logger.info('Archivo subido a S3:', { key, bytes: file.size });
  return { key, bytes: file.size };
};

/**
 * Subir múltiples archivos
 * @param {Array} files - Array de objetos multer
 * @param {string} carpeta - Prefijo de carpeta
 * @returns {Array} Array de resultados (con originalname, mimetype, size, key o error)
 */
const subirMultiples = async (files, carpeta = 'general') => {
  const resultados = [];
  for (const file of files) {
    try {
      const resultado = await subir(file, carpeta);
      resultados.push({
        ...resultado,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
      });
    } catch (error) {
      logger.error('Error subiendo archivo a S3:', { file: file.originalname, error: error.message });
      resultados.push({
        key: null,
        error: error.message,
        originalname: file.originalname,
      });
    }
  }
  return resultados;
};

/**
 * Generar URL firmada (presigned) para acceso temporal a un archivo privado
 * @param {string} key - S3 object key
 * @param {number} expiresIn - Segundos de validez (default 3600 = 1 hora)
 * @returns {Promise<string>} URL firmada
 */
const getUrl = async (key, expiresIn = 3600) => {
  if (!key) return null;
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn });
};

/**
 * Resolver URL para respuestas API:
 * - Si es S3 key (sin http/data:) → genera presigned URL
 * - Si ya es URL pública o base64 → devuelve tal cual (compatibilidad con datos legados)
 * @param {string} urlOrKey
 * @param {number} expiresIn
 * @returns {Promise<string|null>}
 */
const resolveUrl = async (urlOrKey, expiresIn = 3600) => {
  if (!urlOrKey) return null;
  if (!isS3Key(urlOrKey)) return urlOrKey;
  return getUrl(urlOrKey, expiresIn);
};

/**
 * Descargar un archivo de S3 como Buffer (para adjuntos de email, etc.)
 * @param {string} key - S3 object key
 * @returns {Promise<Buffer>}
 */
const getBuffer = async (key) => {
  if (!key || !isConfigured()) return null;
  const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

/**
 * Eliminar un archivo de S3
 * @param {string} key - S3 object key
 */
const eliminar = async (key) => {
  if (!key || !isConfigured()) return;
  try {
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    logger.info('Archivo eliminado de S3:', { key });
  } catch (error) {
    logger.error('Error eliminando de S3:', { key, error: error.message });
    // No relanzar — eliminación es best-effort
  }
};

module.exports = {
  isConfigured,
  isS3Key,
  subir,
  subirMultiples,
  getUrl,
  resolveUrl,
  getBuffer,
  eliminar,
};
