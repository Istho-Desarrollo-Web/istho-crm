/**
 * Utilidades de procesamiento de imágenes para emails y reportes.
 */

const https = require('https');
const http = require('http');

/**
 * Descarga una URL y retorna un Buffer.
 */
const descargarBuffer = (url) =>
  new Promise((resolve, reject) => {
    const cliente = url.startsWith('https') ? https : http;
    const req = cliente.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} al descargar imagen`));
        return;
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('Timeout descargando imagen'));
    });
  });

/**
 * Convierte un logo a PNG con fondo transparente.
 *
 * Algoritmo: flood-fill BFS desde las 4 esquinas.
 * Detecta el color de fondo en cada esquina y elimina todos los píxeles
 * conectados cuyo color esté dentro del umbral de tolerancia.
 * Funciona para fondos blancos, negros, grises y colores sólidos en general.
 *
 * @param {string|Buffer} origen  URL HTTP(S), data URI base64, o Buffer de imagen
 * @param {number} umbral         Tolerancia de color (0-255). Default 40.
 * @returns {Promise<string>}     data URI `data:image/png;base64,...`
 */
const convertirLogoTransparente = async (origen, umbral = 40) => {
  const sharp = require('sharp');

  // Obtener buffer de entrada
  let buffer;
  if (Buffer.isBuffer(origen)) {
    buffer = origen;
  } else if (typeof origen === 'string' && origen.startsWith('data:')) {
    buffer = Buffer.from(origen.split(',')[1], 'base64');
  } else {
    buffer = await descargarBuffer(origen);
  }

  // Decodificar a píxeles RGBA crudos (redimensionar para limitar costo de BFS)
  const { data, info } = await sharp(buffer)
    .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info; // channels = 4 (RGBA)
  const visited = new Uint8Array(width * height);

  /**
   * Flood-fill BFS desde (startX, startY).
   * Usa el color del píxel inicial como color de fondo a eliminar.
   * Si el píxel inicial ya es transparente (alpha=0), no lanza el BFS
   * — evita usar RGB(0,0,0) como semilla y borrar logos negros.
   */
  const rellenar = (startX, startY) => {
    const si = (startY * width + startX) * channels;

    // Si la esquina ya es transparente, no hay fondo opaco que eliminar
    if (data[si + 3] === 0) return;

    const semilla = [data[si], data[si + 1], data[si + 2]];

    const cola = [startY * width + startX]; // índices de píxel (no byte)
    let cabeza = 0;

    while (cabeza < cola.length) {
      const pi = cola[cabeza++]; // índice de píxel
      if (visited[pi]) continue;
      visited[pi] = 1;

      const bi = pi * channels; // índice de byte

      // Saltar píxeles ya transparentes (no expandir a través de áreas vacías)
      if (data[bi + 3] === 0) continue;

      const dr = data[bi] - semilla[0];
      const dg = data[bi + 1] - semilla[1];
      const db = data[bi + 2] - semilla[2];
      const distancia = Math.sqrt(dr * dr + dg * dg + db * db);

      if (distancia > umbral) continue;

      data[bi + 3] = 0; // alpha → transparente

      const x = pi % width;
      const y = (pi - x) / width;
      if (x > 0)          cola.push(pi - 1);
      if (x < width - 1)  cola.push(pi + 1);
      if (y > 0)          cola.push(pi - width);
      if (y < height - 1) cola.push(pi + width);
    }
  };

  // BFS desde las 4 esquinas (cada una con su propio color semilla)
  rellenar(0, 0);
  rellenar(width - 1, 0);
  rellenar(0, height - 1);
  rellenar(width - 1, height - 1);

  const png = await sharp(data, { raw: { width, height, channels } })
    .png({ compressionLevel: 6 })
    .toBuffer();

  return `data:image/png;base64,${png.toString('base64')}`;
};

module.exports = { convertirLogoTransparente };
