import { useState } from 'react';

/**
 * Hook reutilizable para manejo de ordenamiento en tablas.
 * @param {string} defaultField - Campo por defecto para ordenar
 * @param {string} defaultDir - Dirección por defecto ('ASC' o 'DESC')
 */
export default function useSort(defaultField = 'created_at', defaultDir = 'DESC') {
  const [sortField, setSortField] = useState(defaultField);
  const [sortDir, setSortDir] = useState(defaultDir);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortField(field);
      setSortDir('ASC');
    }
  };

  return { sortField, sortDir, handleSort };
}
