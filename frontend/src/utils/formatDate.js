/**
 * Formatear fecha evitando desfase de timezone UTC.
 * Cuando MySQL devuelve "2026-03-18" (solo fecha) y JavaScript hace
 * new Date("2026-03-18"), lo interpreta como UTC midnight.
 * En Colombia (GMT-5) eso se muestra como 2026-03-17 (día anterior).
 *
 * Fix: agregar T12:00:00 a fechas sin hora para evitar el desfase.
 */

export const formatDate = (fecha, options = {}) => {
  if (!fecha) return '-';
  const str = String(fecha);
  // Si es solo fecha (YYYY-MM-DD, 10 chars), agregar mediodía para evitar desfase
  const d = str.length === 10 ? new Date(str + 'T12:00:00') : new Date(str);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  });
};

export const formatDateShort = (fecha) => {
  if (!fecha) return '-';
  const str = String(fecha);
  const d = str.length === 10 ? new Date(str + 'T12:00:00') : new Date(str);
  if (isNaN(d)) return '-';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default formatDate;
