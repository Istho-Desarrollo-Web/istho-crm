/**
 * ISTHO CRM - Pagination Component
 * Componente de paginación reutilizable
 * 
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import PropTypes from 'prop-types';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  showInfo = true,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generar array de páginas a mostrar
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100">
      {/* Info */}
      {showInfo && (
        <div className="text-sm text-slate-500">
          Mostrando <span className="font-medium text-slate-700">{startItem}</span> a{' '}
          <span className="font-medium text-slate-700">{endItem}</span> de{' '}
          <span className="font-medium text-slate-700">{totalItems}</span> resultados
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-1">
        {/* Previous */}
        <button
          onClick={() => onPageChange?.(currentPage - 1)}
          disabled={currentPage === 1}
          className="
            p-2 rounded-lg text-slate-500 
            hover:bg-slate-100 hover:text-slate-700
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent
            transition-colors duration-200
          "
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* First page + ellipsis */}
        {pageNumbers[0] > 1 && (
          <>
            <button
              onClick={() => onPageChange?.(1)}
              className="
                w-10 h-10 rounded-lg text-sm font-medium
                text-slate-600 hover:bg-slate-100
                transition-colors duration-200
              "
            >
              1
            </button>
            {pageNumbers[0] > 2 && (
              <span className="px-2 text-slate-400">...</span>
            )}
          </>
        )}

        {/* Page numbers */}
        {pageNumbers.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange?.(page)}
            className={`
              w-10 h-10 rounded-lg text-sm font-medium
              transition-colors duration-200
              ${currentPage === page
                ? 'bg-orange-500 text-white'
                : 'text-slate-600 hover:bg-slate-100'
              }
            `}
          >
            {page}
          </button>
        ))}

        {/* Last page + ellipsis */}
        {pageNumbers[pageNumbers.length - 1] < totalPages && (
          <>
            {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
              <span className="px-2 text-slate-400">...</span>
            )}
            <button
              onClick={() => onPageChange?.(totalPages)}
              className="
                w-10 h-10 rounded-lg text-sm font-medium
                text-slate-600 hover:bg-slate-100
                transition-colors duration-200
              "
            >
              {totalPages}
            </button>
          </>
        )}

        {/* Next */}
        <button
          onClick={() => onPageChange?.(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="
            p-2 rounded-lg text-slate-500 
            hover:bg-slate-100 hover:text-slate-700
            disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent
            transition-colors duration-200
          "
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

Pagination.propTypes = {
  currentPage: PropTypes.number,
  totalPages: PropTypes.number,
  totalItems: PropTypes.number,
  itemsPerPage: PropTypes.number,
  onPageChange: PropTypes.func,
  showInfo: PropTypes.bool,
};

export default Pagination;