import imageCompression from 'browser-image-compression';

/**
 * Comprime una imagen antes de subirla al servidor.
 * Solo actúa sobre imágenes; otros tipos de archivo se devuelven sin cambios.
 *
 * @param {File}   file              - Archivo original
 * @param {Object} opciones          - Opciones opcionales de compresión
 * @param {number} opciones.maxSizeMB        - Tamaño máximo en MB (default: 1)
 * @param {number} opciones.maxWidthOrHeight - Dimensión máxima en px (default: 1920)
 * @param {number} opciones.quality          - Calidad 0-1 (default: 0.8)
 * @returns {Promise<File>} Archivo comprimido (o el original si no es imagen)
 */
export async function comprimirImagen(file, opciones = {}) {
  if (!file || !file.type.startsWith('image/')) return file;

  const config = {
    maxSizeMB:        opciones.maxSizeMB        ?? 1,
    maxWidthOrHeight: opciones.maxWidthOrHeight  ?? 1920,
    initialQuality:   opciones.quality           ?? 0.8,
    useWebWorker:     true,
    fileType:         file.type,
    // Preservar nombre original
    onProgress: opciones.onProgress,
  };

  try {
    const comprimido = await imageCompression(file, config);
    // Preservar nombre original del archivo
    return new File([comprimido], file.name, { type: comprimido.type });
  } catch {
    // Si falla la compresión, devolver original sin romper el flujo
    return file;
  }
}

/**
 * Configuraciones predefinidas por contexto de uso
 */
export const COMPRESS_PRESETS = {
  // Avatares y logos: pequeños, alta calidad visual
  AVATAR: { maxSizeMB: 0.5, maxWidthOrHeight: 800, quality: 0.85 },
  // Fotos de evidencia: balance tamaño/calidad
  EVIDENCIA: { maxSizeMB: 1, maxWidthOrHeight: 1920, quality: 0.8 },
  // Fotos de avería: algo más de detalle
  AVERIA: { maxSizeMB: 1.5, maxWidthOrHeight: 2048, quality: 0.85 },
};
