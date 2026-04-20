/**
 * Descarga un archivo desde el servidor usando fetch con Authorization header.
 * No expone el JWT en la URL — el token va en el header Authorization.
 *
 * @param {string} url        - URL del endpoint de descarga (sin token)
 * @param {string} nombre     - Nombre del archivo a guardar (ej: 'reporte-clientes-2026-04-20.xlsx')
 * @param {Object} [opciones] - Opciones adicionales de fetch (ej: { method: 'POST', body: ... })
 */
export const descargarArchivo = async (url, nombre, opciones = {}) => {
  const token = localStorage.getItem('istho_token');
  const response = await fetch(url, {
    ...opciones,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...(opciones.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Error al descargar: ${response.status}`);
  const blob = await response.blob();
  const blobUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(blobUrl);
};

/**
 * Retorna la fecha actual en formato YYYY-MM-DD para usar en nombres de archivo.
 * Ejemplo: '2026-04-20'
 */
export const fechaDescarga = () => new Date().toISOString().slice(0, 10);
