/**
 * ISTHO CRM - FilterDropdown Component
 * Dropdown de filtros reutilizable
 *
 * @author Coordinación TI ISTHO
 * @date Enero 2026
 */

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  // Calcular posición fixed al abrir para escapar del stacking context del modal
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = Math.max(4, Math.min(rect.left, window.innerWidth - rect.width - 4));
    setPanelStyle({
      position: 'fixed',
      top: rect.bottom + 6,
      left,
      width: rect.width,
      zIndex: 9999,
    });
  }, [isOpen]);

  // Cerrar al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cerrar al hacer scroll externo (evita panel flotando desalineado)
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e) => {
      if (panelRef.current && panelRef.current.contains(e.target)) return;
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

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
    <div ref={containerRef} className="relative">
      {label && <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{label}</label>}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 w-full
          bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600
          hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
          transition-all duration-200
          ${compact ? 'px-2.5 py-1.5 rounded-lg text-xs' : 'px-4 py-2.5 rounded-xl text-sm'}
        `}
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={compact ? 'w-3 h-3 text-slate-400' : 'w-4 h-4 text-slate-400'} />}
          <span className={value ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500'}>{getDisplayValue()}</span>
        </div>
        <ChevronDown
          className={`text-slate-400 dark:text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${compact ? 'w-3 h-3' : 'w-4 h-4'}`}
        />
      </button>

      {/* Panel con fixed positioning para escapar del stacking context */}
      {isOpen && (
        <div
          ref={panelRef}
          style={panelStyle}
          className={`
            bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-600 shadow-lg dark:shadow-slate-900/50
            max-h-60 overflow-y-auto animate-fadeIn
            ${compact ? 'rounded-lg' : 'rounded-xl'}
          `}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                flex items-center justify-between w-full
                text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400
                transition-colors duration-150
                ${compact ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'}
              `}
            >
              <span>{option.label}</span>
              {isSelected(option.value) && <Check className={compact ? 'w-3 h-3 text-orange-500' : 'w-4 h-4 text-orange-500'} />}
            </button>
          ))}

          {options.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">No hay opciones</div>
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
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.array]),
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  multiple: PropTypes.bool,
  icon: PropTypes.elementType,
  compact: PropTypes.bool,
};

export default FilterDropdown;
