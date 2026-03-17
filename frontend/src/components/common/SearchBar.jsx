/**
 * ISTHO CRM - SearchBar Component
 * Barra de búsqueda reutilizable
 * 
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import { useState } from 'react';
import PropTypes from 'prop-types';
import { Search, X } from 'lucide-react';

const SearchBar = ({
  placeholder = 'Buscar...',
  value = '',
  onChange,
  onSearch,
  onClear,
  className = '',
}) => {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch?.(localValue);
    }
  };

  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
    onClear?.();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400" />
      </div>
      
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          w-full pl-10 pr-10 py-2.5 
          bg-white border border-slate-200 rounded-xl
          text-sm text-slate-800 placeholder-slate-400
          focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
          transition-all duration-200
        "
      />

      {localValue && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-3 flex items-center"
        >
          <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
        </button>
      )}
    </div>
  );
};

SearchBar.propTypes = {
  placeholder: PropTypes.string,
  value: PropTypes.string,
  onChange: PropTypes.func,
  onSearch: PropTypes.func,
  onClear: PropTypes.func,
  className: PropTypes.string,
};

export default SearchBar;