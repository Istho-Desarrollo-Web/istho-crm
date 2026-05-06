/**
 * ISTHO CRM - DatePicker Component
 * Selector de fecha personalizado con calendario desplegable
 *
 * @author Coordinación TI ISTHO
 * @date Mayo 2026
 */

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import PropTypes from 'prop-types';
import { DayPicker } from 'react-day-picker';
import { es } from 'react-day-picker/locale';
import { Calendar, ChevronDown, X } from 'lucide-react';

const parseDate = (str) => {
  if (!str) return undefined;
  const d = new Date(str + 'T00:00:00');
  return isNaN(d.getTime()) ? undefined : d;
};

const formatToIso = (date) => {
  if (!date) return '';
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatDisplay = (date) => {
  if (!date) return null;
  return [
    String(date.getDate()).padStart(2, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    date.getFullYear(),
  ].join('/');
};

const DatePicker = ({
  value,
  onChange,
  placeholder = 'dd/mm/aaaa',
  label,
  clearable = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [panelStyle, setPanelStyle] = useState({});
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const selected = parseDate(value);

  // Calcular posición fixed al abrir para escapar del stacking context del modal
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    // Verificar si hay espacio suficiente abajo; si no, abrir hacia arriba
    const calendarHeight = 320;
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= calendarHeight
      ? rect.bottom + 6
      : rect.top - calendarHeight - 6;
    setPanelStyle({
      position: 'fixed',
      top,
      left: rect.left,
      zIndex: 9999,
    });
  }, [isOpen]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Cerrar al hacer scroll (evita panel flotando desalineado)
  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [isOpen]);

  const handleSelect = (date) => {
    onChange?.(formatToIso(date) || '');
    if (date) setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.('');
  };

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
          {label}
        </label>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center justify-between gap-2 w-full bg-white dark:bg-centhrix-surface border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-200 px-4 py-2.5 rounded-xl text-sm"
      >
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <span className={selected ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
            {selected ? formatDisplay(selected) : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {clearable && selected && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Panel con fixed positioning para escapar del stacking context */}
      {isOpen && (
        <div
          style={panelStyle}
          className="bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl animate-fadeIn"
        >
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            locale={es}
            classNames={{
              root: 'p-3 w-72',
              months: '',
              month: '',
              month_caption: 'flex items-center justify-between mb-3 px-1',
              caption_label: 'text-sm font-semibold text-slate-800 dark:text-slate-100 capitalize',
              nav: 'flex items-center gap-1',
              button_previous: 'p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-centhrix-surface text-slate-500 dark:text-slate-400 transition-colors [&_svg]:w-4 [&_svg]:h-4',
              button_next: 'p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-centhrix-surface text-slate-500 dark:text-slate-400 transition-colors [&_svg]:w-4 [&_svg]:h-4',
              month_grid: 'w-full border-collapse',
              weekdays: '',
              weekday: 'w-9 h-8 text-center text-xs font-medium text-slate-400 dark:text-slate-500',
              weeks: '',
              week: '',
              day: 'p-0 text-center',
              day_button: 'w-9 h-9 rounded-lg text-sm text-slate-700 dark:text-slate-200 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 transition-colors duration-150 mx-auto',
              selected: '[&>button]:bg-orange-500 [&>button]:text-white [&>button]:hover:bg-orange-600',
              today: '[&>button]:font-bold [&>button]:ring-1 [&>button]:ring-orange-400',
              outside: '[&>button]:text-slate-300 dark:[&>button]:text-slate-600 [&>button]:hover:bg-transparent',
              disabled: '[&>button]:opacity-30 [&>button]:cursor-not-allowed [&>button]:hover:bg-transparent',
            }}
          />
        </div>
      )}
    </div>
  );
};

DatePicker.propTypes = {
  value: PropTypes.string,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  label: PropTypes.string,
  clearable: PropTypes.bool,
};

export default DatePicker;
