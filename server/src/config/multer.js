/**
 * ISTHO CRM - Configuración de Multer
 *
 * Configuración para subida de archivos.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Crear directorios si no existen
const createDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Directorios de uploads
const UPLOAD_DIRS = {
  averias: path.join(__dirname, '../../uploads/averias'),
  cumplidos: path.join(__dirname, '../../uploads/cumplidos'),
  logos: path.join(__dirname, '../../uploads/logos'),
  soportes: path.join(__dirname, '../../uploads/soportes'),
  temp: path.join(__dirname, '../../uploads/temp'),
};

// Crear directorios
Object.values(UPLOAD_DIRS).forEach(createDir);

// Memory storage para uploads que van directo a S3 (sin disco)
const storageMemory = multer.memoryStorage();

/**
 * Filtro para imágenes
 */
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'), false);
  }
};

/**
 * Filtro para documentos
 */
const documentFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/vnd.rar',
  ];

  // También aceptar por extensión (algunos navegadores no detectan bien el MIME)
  const ext = file.originalname?.toLowerCase()?.split('.').pop();
  const allowedExts = [
    'pdf',
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'zip',
    'rar',
    'doc',
    'docx',
    'xls',
    'xlsx',
  ];

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error('Tipo de archivo no permitido. Formatos aceptados: imágenes, PDF, ZIP, RAR'),
      false
    );
  }
};

/**
 * Upload para evidencias de averías (Cloudinary vía buffer)
 */
const uploadAveria = multer({
  storage: storageMemory,
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Upload para documentos de cumplido (Cloudinary vía buffer)
 */
const uploadCumplido = multer({
  storage: storageMemory,
  fileFilter: documentFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});


/**
 * Upload para logos de clientes (Cloudinary vía buffer)
 */
const uploadLogo = multer({
  storage: storageMemory,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

/**
 * Upload para avatares de usuarios (Cloudinary vía buffer)
 */
const uploadAvatar = multer({
  storage: storageMemory,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

/**
 * Upload para soportes de gastos (Cloudinary vía buffer)
 */
const uploadSoporte = multer({
  storage: storageMemory,
  fileFilter: documentFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/**
 * Upload para documentos adjuntos de solicitudes de cliente (S3 vía buffer)
 */
const uploadSolicitudDoc = multer({
  storage: storageMemory,
  fileFilter: documentFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB
  },
});

module.exports = {
  uploadAveria,
  uploadCumplido,
  uploadLogo,
  uploadAvatar,
  uploadSoporte,
  uploadSolicitudDoc,
  UPLOAD_DIRS,
};
