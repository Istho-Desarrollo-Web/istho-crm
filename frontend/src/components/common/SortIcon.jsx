import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * Icono de ordenamiento para cabeceras de tabla.
 * @param {string} field - Campo de esta columna
 * @param {string} sortField - Campo actualmente ordenado
 * @param {string} sortDir - Dirección actual ('ASC' o 'DESC')
 */
export default function SortIcon({ field, sortField, sortDir }) {
  if (sortField !== field) return <ChevronsUpDown className="w-3 h-3 opacity-40" />;
  return sortDir === 'ASC'
    ? <ChevronUp className="w-3 h-3 text-purple-500" />
    : <ChevronDown className="w-3 h-3 text-purple-500" />;
}