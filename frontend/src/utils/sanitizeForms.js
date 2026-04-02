/**
 * Utilidad de sanitización de campos de formulario en tiempo real.
 * Usada en formularios RHF: pasar al onChange del input con setValue.
 *
 * Uso en RHF:
 *   onChange={(e) => setValue('campo', sanitizeField('tipo', e.target.value), { shouldValidate: true })}
 */

// Tipos de sanitización disponibles
export const SANITIZE = {
  TEXTO_UPPER:    'texto_upper',    // Mayúsculas, sin restricción de chars
  TEXTO_LETRAS:   'texto_letras',   // Solo letras, espacios y acentos (nombres)
  ALFANUM_UPPER:  'alfanum_upper',  // Alfanumérico en mayúsculas (placa, NIT, códigos)
  SOLO_DIGITOS:   'solo_digitos',   // Solo dígitos (teléfono, cédula)
  TEXTO_LIBRE:    'texto_libre',    // Texto libre, solo aplica maxLength
};

/**
 * Sanitiza un valor de campo según el tipo y límite de caracteres.
 * @param {string} tipo    - Constante SANITIZE.*
 * @param {string} value   - Valor actual del input
 * @param {number} maxLen  - Límite de caracteres (opcional)
 * @returns {string} Valor sanitizado
 */
export function sanitizeField(tipo, value, maxLen = null) {
  if (value === null || value === undefined) return '';
  let v = String(value);

  switch (tipo) {
    case SANITIZE.TEXTO_UPPER:
      v = v.toUpperCase();
      break;
    case SANITIZE.TEXTO_LETRAS:
      v = v.replace(/[^A-Za-záéíóúÁÉÍÓÚñÑüÜ\s]/g, '');
      break;
    case SANITIZE.ALFANUM_UPPER:
      v = v.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      break;
    case SANITIZE.SOLO_DIGITOS:
      v = v.replace(/\D/g, '');
      break;
    case SANITIZE.TEXTO_LIBRE:
    default:
      break;
  }

  if (maxLen !== null) v = v.slice(0, maxLen);
  return v;
}

/**
 * Helper para usar directamente en el prop onChange de un input RHF.
 * Retorna un manejador que sanitiza y llama setValue.
 *
 * @param {Function} setValue - setValue de useForm()
 * @param {string}   name     - Nombre del campo
 * @param {string}   tipo     - Constante SANITIZE.*
 * @param {number}   maxLen   - Límite de caracteres (opcional)
 * @returns {Function} (e: ChangeEvent) => void
 */
export function makeSanitizeHandler(setValue, name, tipo, maxLen = null) {
  return (e) => {
    const clean = sanitizeField(tipo, e.target.value, maxLen);
    setValue(name, clean, { shouldValidate: true });
  };
}
