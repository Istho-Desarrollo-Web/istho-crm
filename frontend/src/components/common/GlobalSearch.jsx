/**
 * ISTHO CRM - Búsqueda Global (Ctrl+K)
 * Busca en módulos: Inventario, Clientes, Entradas, Salidas, Kardex
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, X, Package, Building2, ArrowDownCircle,
  ArrowUpCircle, RefreshCw, FileText, Loader2,
} from 'lucide-react';

const MODULE_CONFIG = [
  {
    key: 'inventario',
    label: 'Inventario',
    icon: Package,
    color: 'text-blue-500',
    path: '/inventario/productos/',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.INVENTARIO.BASE, { params: { search: term, limit: 5 } });
      return (res?.data || []).map(p => ({
        id: p.id,
        title: p.producto || p.nombre,
        subtitle: `${p.sku} - ${p.cliente_nombre || ''}`,
        path: `/inventario/productos/${p.id}`,
      }));
    },
  },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: Building2,
    color: 'text-emerald-500',
    path: '/clientes/',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.CLIENTES.BASE, { params: { search: term, limit: 5 } });
      const data = res?.data?.clientes || res?.data || [];
      return data.map(c => ({
        id: c.id,
        title: c.razon_social,
        subtitle: `NIT: ${c.nit || '-'}`,
        path: `/clientes/${c.id}`,
      }));
    },
  },
  {
    key: 'entradas',
    label: 'Entradas',
    icon: ArrowDownCircle,
    color: 'text-green-500',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.AUDITORIAS.ENTRADAS, { params: { search: term, limit: 5 } });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.entradas || [];
      return data.map(e => ({
        id: e.id,
        title: e.documento_wms || e.documento,
        subtitle: `${e.cliente || ''} - ${e.estado}`,
        path: `/inventario/entradas/${e.id}`,
      }));
    },
  },
  {
    key: 'salidas',
    label: 'Salidas',
    icon: ArrowUpCircle,
    color: 'text-indigo-500',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.AUDITORIAS.SALIDAS, { params: { search: term, limit: 5 } });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.salidas || [];
      return data.map(s => ({
        id: s.id,
        title: s.documento_wms || s.documento,
        subtitle: `${s.cliente || ''} - ${s.estado}`,
        path: `/inventario/salidas/${s.id}`,
      }));
    },
  },
  {
    key: 'kardex',
    label: 'Kardex',
    icon: RefreshCw,
    color: 'text-purple-500',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.AUDITORIAS.KARDEX, { params: { search: term, limit: 5 } });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.kardex || [];
      return data.map(k => ({
        id: k.id,
        title: k.documento_wms || k.motivo || k.documento,
        subtitle: `${k.cliente || ''} - ${k.estado}`,
        path: `/inventario/kardex/${k.id}`,
      }));
    },
  },
];

const GlobalSearch = ({ apiClient, endpoints }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Ctrl+K para abrir
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input al abrir
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({});
      setSelectedIdx(0);
    }
  }, [open]);

  // Buscar con debounce
  const doSearch = useCallback(async (term) => {
    if (!term || term.length < 2) {
      setResults({});
      return;
    }

    setLoading(true);
    try {
      const promises = MODULE_CONFIG.map(async (mod) => {
        try {
          const items = await mod.searchFn(term, apiClient, endpoints);
          return { key: mod.key, items };
        } catch {
          return { key: mod.key, items: [] };
        }
      });

      const settled = await Promise.all(promises);
      const newResults = {};
      settled.forEach(({ key, items }) => {
        if (items.length > 0) newResults[key] = items;
      });
      setResults(newResults);
      setSelectedIdx(0);
    } finally {
      setLoading(false);
    }
  }, [apiClient, endpoints]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  // Flatten results para navegación con teclado
  const flatResults = Object.entries(results).flatMap(([key, items]) =>
    items.map(item => ({ ...item, moduleKey: key }))
  );

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx(prev => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIdx]) {
      navigate(flatResults[selectedIdx].path);
      setOpen(false);
    }
  };

  const handleSelect = (path) => {
    navigate(path);
    setOpen(false);
  };

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Modal */}
      <div
        ref={containerRef}
        className="relative w-full max-w-lg bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Buscar productos, clientes, operaciones..."
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {query.length >= 2 && !loading && flatResults.length === 0 && (
            <div className="py-8 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">No se encontraron resultados para "{query}"</p>
            </div>
          )}

          {query.length < 2 && !loading && (
            <div className="py-6 text-center">
              <p className="text-xs text-slate-400 dark:text-slate-500">Escribe al menos 2 caracteres para buscar</p>
              <div className="flex flex-wrap justify-center gap-2 mt-3">
                {MODULE_CONFIG.map(mod => {
                  const Icon = mod.icon;
                  return (
                    <span key={mod.key} className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                      <Icon className={`w-3 h-3 ${mod.color}`} />
                      {mod.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {Object.entries(results).map(([moduleKey, items]) => {
            const mod = MODULE_CONFIG.find(m => m.key === moduleKey);
            if (!mod) return null;
            const Icon = mod.icon;

            return (
              <div key={moduleKey}>
                <div className="px-4 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${mod.color}`} />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {mod.label}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">({items.length})</span>
                  </div>
                </div>
                {items.map((item) => {
                  const currentIdx = flatIdx++;
                  const isSelected = currentIdx === selectedIdx;
                  return (
                    <button
                      key={`${moduleKey}-${item.id}`}
                      onClick={() => handleSelect(item.path)}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}>
                          {item.title}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{item.subtitle}</p>
                      </div>
                      {isSelected && (
                        <kbd className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded font-mono">
                          Enter
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
