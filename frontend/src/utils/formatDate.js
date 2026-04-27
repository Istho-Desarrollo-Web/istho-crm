/**
 * Formatear fechas con soporte de preferencias de usuario.
 *
 * Evita desfase de timezone UTC: cuando MySQL devuelve "2026-03-18"
 * y JS hace new Date("2026-03-18"), lo interpreta como UTC midnight.
 * En Colombia (GMT-5) eso muestra 2026-03-17. Fix: agregar T12:00:00.
 *
 * Las preferencias (zona_horaria, formato_fecha) se inyectan desde
 * AuthContext vía setPreferencias(). Todas las páginas que importan
 * formatDate/formatDateShort heredan el cambio automáticamente.
 */

// Singleton de preferencias — se actualiza desde AuthContext
let _prefs = {};

/** Llamar desde AuthContext cuando cambien las preferencias del usuario */
export const setPreferencias = (prefs) => {
  _prefs = prefs || {};
};

const parseDate = (fecha) => {
  if (!fecha) return null;
  const str = String(fecha);
  const d = str.length === 10 ? new Date(str + 'T12:00:00') : new Date(str);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Formato largo: "18 mar. 2026"
 * Aplica zona horaria del usuario. El orden de día/mes/año se mantiene
 * en estilo es-CO (día primero) para el formato narrativo con mes en letras.
 */
export const formatDate = (fecha, options = {}) => {
  const d = parseDate(fecha);
  if (!d) return '-';
  const zona = _prefs.zona_horaria || 'America/Bogota';
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: zona,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(d);
};

/**
 * Formato corto numérico: respeta formato_fecha y zona_horaria del usuario.
 * DD/MM/YYYY → "18/03/2026" (default)
 * MM/DD/YYYY → "03/18/2026"
 * YYYY-MM-DD → "2026-03-18"
 */
export const formatDateShort = (fecha) => {
  const d = parseDate(fecha);
  if (!d) return '-';
  const zona = _prefs.zona_horaria || 'America/Bogota';
  const formato = _prefs.formato_fecha || 'DD/MM/YYYY';

  const partes = {};
  new Intl.DateTimeFormat('es-CO', {
    timeZone: zona,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .formatToParts(d)
    .forEach(({ type, value }) => {
      partes[type] = value;
    });

  switch (formato) {
    case 'MM/DD/YYYY':
      return `${partes.month}/${partes.day}/${partes.year}`;
    case 'YYYY-MM-DD':
      return `${partes.year}-${partes.month}-${partes.day}`;
    default:
      return `${partes.day}/${partes.month}/${partes.year}`;
  }
};

export default formatDate;
