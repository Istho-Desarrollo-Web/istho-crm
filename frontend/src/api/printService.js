/**
 * Servicio para comunicarse con el microservicio centhrix-print-server.
 * Las llamadas van del navegador directamente al servidor de impresión en LAN.
 */

const PRINT_URL = (import.meta.env.VITE_PRINT_SERVER_URL || '').replace(/\/$/, '');
const PRINT_KEY = import.meta.env.VITE_PRINT_API_KEY || '';

async function _fetch(path, options = {}) {
  if (!PRINT_URL) throw new Error('VITE_PRINT_SERVER_URL no está configurado');

  const res = await fetch(`${PRINT_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': PRINT_KEY,
      ...(options.headers || {}),
    },
  });

  let body;
  try {
    body = await res.json();
  } catch {
    throw new Error(`El servidor de impresión respondió sin JSON (status ${res.status})`);
  }

  if (!res.ok) {
    const msg = body?.message || body?.error || `Error ${res.status}`;
    throw new Error(msg);
  }

  return body;
}

/** Lista impresoras disponibles (online / printing) en el microservicio. */
export async function getPrintersDisponibles() {
  const data = await _fetch('/api/printers/available');
  return data?.printers ?? [];
}

/**
 * Envía un lote de etiquetas a imprimir.
 * @param {object} payload
 * @param {string} payload.printer_id
 * @param {{ label_id: string, pallet_id?: string }[]} payload.labels
 * @param {number} [payload.copies]
 * @param {number} [payload.priority]
 * @param {string} [payload.source]
 * @param {string} [payload.source_ref]
 */
export async function enviarJobsBulk(payload) {
  return _fetch('/api/jobs/bulk', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export default { getPrintersDisponibles, enviarJobsBulk };
