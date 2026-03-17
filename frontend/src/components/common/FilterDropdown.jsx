/**
 * ISTHO CRM - FilterDropdown Component
 * Dropdown de filtros reutilizable
 * 
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown, Check } from 'lucide-react';

const FilterDropdown = ({
  label,
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar',
  multiple = false,
  icon: Icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : [];
      const newValues = currentValues.includes(optionValue)
        ? currentValues.filter((v) => v !== optionValue)
        : [...currentValues, optionValue];
      onChange?.(newValues);
    } else {
      onChange?.(optionValue);
      setIsOpen(false);
    }
  };

  const getDisplayValue = () => {
    if (multiple && Array.isArray(value) && value.length > 0) {
      if (value.length === 1) {
        const option = options.find((o) => o.value === value[0]);
        return option?.label || value[0];
      }
      return `${value.length} seleccionados`;
    }
    
    if (!multiple && value) {
      const option = options.find((o) => o.value === value);
      return option?.label || value;
    }
    
    return placeholder;
  };

  const isSelected = (optionValue) => {
    if (multiple) {
      return Array.isArray(value) && value.includes(optionValue);
    }
    return value === optionValue;
  };

  return (
    <div ref={dropdownRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center justify-between gap-2 w-full
          px-4 py-2.5 bg-white border border-slate-200 rounded-xl
          text-sm text-slate-700
          hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
          transition-all duration-200
        "
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 text-slate-400" />}
          <span className={value ? 'text-slate-800' : 'text-slate-400'}>
            {getDisplayValue()}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="
          absolute z-50 w-full mt-2
          bg-white border border-slate-200 rounded-xl shadow-lg
          max-h-60 overflow-y-auto
          animate-fadeIn
        ">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className="
                flex items-center justify-between w-full px-4 py-2.5
                text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-600
                transition-colors duration-150
              "
            >
              <span>{option.label}</span>
              {isSelected(option.value) && (
                <Check className="w-4 h-4 text-orange-500" />
              )}
            </button>
          ))}
          
          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 text-center">
              No hay opciones
            </div>
          )}
        </div>
      )}
    </div>
  );
};

FilterDropdown.propTypes = {
  label: PropTypes.string,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      label: PropTypes.string.isRequired,
    })
  ),
  value: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number,
    PropTypes.array,
  ]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  multiple: PropTypes.bool,
  icon: PropTypes.elementType,
};

export default FilterDropdown;