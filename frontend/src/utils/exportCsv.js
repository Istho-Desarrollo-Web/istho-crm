/**
 * Exportar datos a CSV con descarga automática
 * @param {Array<Object>} data - Datos a exportar
 * @param {Array<{key: string, label: string}>} columns - Columnas con key y label
 * @param {string} filename - Nombre del archivo (sin extensión)
 */
export const exportToCsv = (data, columns, filename = 'export') => {
  if (!data || data.length === 0) return;

  const BOM = '\uFEFF';
  const separator = ';';

  const header = columns.map(c => `"${c.label}"`).join(separator);

  const rows = data.map(row =>
    columns.map(col => {
      let val = col.key.split('.').reduce((o, k) => o?.[k], row);
      if (val === null || val === undefined) val = '';
      if (typeof val === 'string') val = val.replace(/"/g, '""');
      return `"${val}"`;
    }).join(separator)
  );

  const csv = BOM + [header, ...rows].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
