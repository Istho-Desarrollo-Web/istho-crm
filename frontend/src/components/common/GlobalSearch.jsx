/**
 * ISTHO CRM - Búsqueda Global (Ctrl+K)
 * v2.0 — Con permisos, recientes, prefijo de módulo, "Ver todos" y resaltado
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Package,
  Building2,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  FileText,
  Loader2,
  Truck,
  Car,
  Wallet,
  ArrowLeftRight,
  Clock,
  ChevronRight,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

// ─────────────────────────────────────────────────────────────
// CONFIGURACIÓN DE MÓDULOS
// ─────────────────────────────────────────────────────────────

const MODULE_CONFIG = [
  {
    key: 'inventario',
    label: 'Inventario',
    prefix: 'i',
    icon: Package,
    color: 'text-blue-500',
    permission: { modulo: 'inventario', accion: 'ver' },
    listPath: '/inventario',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.INVENTARIO.BASE, {
        params: { search: term, limit: 5 },
      });
      return (res?.data || []).map((p) => ({
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
    prefix: 'c',
    icon: Building2,
    color: 'text-emerald-500',
    permission: { modulo: 'clientes', accion: 'ver' },
    listPath: '/clientes',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.CLIENTES.BASE, {
        params: { search: term, limit: 5 },
      });
      const data = res?.data?.clientes || res?.data || [];
      return data.map((c) => ({
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
    prefix: 'e',
    icon: ArrowDownCircle,
    color: 'text-green-500',
    permission: { modulo: 'operaciones', accion: 'ver' },
    listPath: '/operaciones/entradas',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.AUDITORIAS.ENTRADAS, {
        params: { search: term, limit: 5 },
      });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.entradas || [];
      return data.map((e) => ({
        id: e.id,
        title: e.documento_wms || e.documento,
        subtitle: `${e.cliente || ''} - ${e.estado}`,
        path: `/operaciones/entradas/${e.id}`,
      }));
    },
  },
  {
    key: 'salidas',
    label: 'Salidas',
    prefix: 's',
    icon: ArrowUpCircle,
    color: 'text-indigo-500',
    permission: { modulo: 'operaciones', accion: 'ver' },
    listPath: '/operaciones/salidas',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.AUDITORIAS.SALIDAS, {
        params: { search: term, limit: 5 },
      });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.salidas || [];
      return data.map((s) => ({
        id: s.id,
        title: s.documento_wms || s.documento,
        subtitle: `${s.cliente || ''} - ${s.estado}`,
        path: `/operaciones/salidas/${s.id}`,
      }));
    },
  },
  {
    key: 'kardex',
    label: 'Kardex',
    prefix: 'k',
    icon: RefreshCw,
    color: 'text-purple-500',
    permission: { modulo: 'operaciones', accion: 'ver' },
    listPath: '/operaciones/kardex',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.AUDITORIAS.KARDEX, {
        params: { search: term, limit: 5 },
      });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.kardex || [];
      return data.map((k) => ({
        id: k.id,
        title: k.documento_wms || k.motivo || k.documento,
        subtitle: `${k.cliente || ''} - ${k.estado}`,
        path: `/operaciones/kardex/${k.id}`,
      }));
    },
  },
  {
    key: 'viajes',
    label: 'Viajes',
    prefix: 'v',
    icon: Truck,
    color: 'text-yellow-500',
    permission: { modulo: 'viajes', accion: 'ver' },
    listPath: '/viajes/viajes',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.VIAJES.BASE, {
        params: { search: term, limit: 5 },
      });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.viajes || [];
      return data.map((v) => ({
        id: v.id,
        title: v.numero || `Viaje #${v.id}`,
        subtitle: v.destino || '-',
        path: `/viajes/viajes/${v.id}`,
      }));
    },
  },
  {
    key: 'vehiculos',
    label: 'Vehículos',
    prefix: 've',
    icon: Car,
    color: 'text-cyan-500',
    permission: { modulo: 'vehiculos', accion: 'ver' },
    listPath: '/viajes/vehiculos',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.VEHICULOS.BASE, {
        params: { search: term, limit: 5 },
      });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.vehiculos || [];
      return data.map((v) => ({
        id: v.id,
        title: v.placa,
        subtitle: v.tipo_vehiculo || '-',
        path: `/viajes/vehiculos`,
      }));
    },
  },
  {
    key: 'cajas_menores',
    label: 'Cajas Menores',
    prefix: 'cm',
    icon: Wallet,
    color: 'text-orange-500',
    permission: { modulo: 'caja_menor', accion: 'ver' },
    listPath: '/viajes/cajas-menores',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.CAJAS_MENORES.BASE, {
        params: { search: term, limit: 5 },
      });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.cajas || [];
      return data.map((c) => ({
        id: c.id,
        title: `Caja #${String(c.numero || c.id).padStart(3, '0')}`,
        subtitle: c.estado || '-',
        path: `/viajes/cajas-menores/${c.id}`,
      }));
    },
  },
  {
    key: 'movimientos',
    label: 'Movimientos',
    prefix: 'mo',
    icon: ArrowLeftRight,
    color: 'text-pink-500',
    permission: { modulo: 'movimientos', accion: 'ver' },
    listPath: '/viajes/movimientos',
    searchFn: async (term, apiClient, endpoints) => {
      const res = await apiClient.get(endpoints.MOVIMIENTOS.BASE, {
        params: { search: term, limit: 5 },
      });
      const data = Array.isArray(res?.data) ? res.data : res?.data?.movimientos || [];
      return data.map((m) => ({
        id: m.id,
        title: m.concepto || m.descripcion || `Movimiento #${m.id}`,
        subtitle: m.tipo_movimiento || '-',
        path: `/viajes/movimientos`,
      }));
    },
  },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const RECENT_KEY = 'istho_search_recent';
const MAX_RECENT = 8;

const getRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
  } catch {
    return [];
  }
};

const saveRecent = (item) => {
  try {
    const prev = getRecent().filter((r) => r.path !== item.path);
    const next = [item, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage no disponible
  }
};

const clearRecent = () => {
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // noop
  }
};

/**
 * Resalta las coincidencias del término en el texto
 */
const Highlight = ({ text, term }) => {
  if (!term || !text) return <>{text}</>;
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escapedTerm})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <strong key={i} className="font-bold text-orange-500 dark:text-orange-400">
            {part}
          </strong>
        ) : (
          part
        )
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────

const GlobalSearch = ({ apiClient, endpoints }) => {
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recent, setRecent] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);

  // Módulos accesibles según permisos del usuario
  const allowedModules = useMemo(
    () => MODULE_CONFIG.filter((m) => hasPermission(m.permission.modulo, m.permission.accion)),
    [hasPermission]
  );

  // Parsear prefijo de módulo: "v texto" → { prefix: 'v', term: 'texto' }
  const parsedQuery = useMemo(() => {
    const match = query.match(/^([a-z]+)\s+(.+)$/);
    if (match) {
      const [, prefix, term] = match;
      const mod = allowedModules.find((m) => m.prefix === prefix);
      if (mod) return { filteredModules: [mod], term };
    }
    return { filteredModules: allowedModules, term: query };
  }, [query, allowedModules]);

  // Ctrl+K para abrir
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, []);

  // Al abrir: focus + cargar recientes
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery('');
      setResults({});
      setSelectedIdx(0);
      setRecent(getRecent());
    }
  }, [open]);

  // Buscar con debounce
  const doSearch = useCallback(
    async (term, modules) => {
      if (!term || term.length < 2) {
        setResults({});
        return;
      }
      setLoading(true);
      try {
        const promises = modules.map(async (mod) => {
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
    },
    [apiClient, endpoints]
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => doSearch(parsedQuery.term, parsedQuery.filteredModules),
      400
    );
  };

  // Re-ejecutar búsqueda cuando cambia el prefijo de módulo
  useEffect(() => {
    if (parsedQuery.term.length >= 2) {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(
        () => doSearch(parsedQuery.term, parsedQuery.filteredModules),
        400
      );
    }
  }, [parsedQuery.filteredModules, parsedQuery.term, doSearch]);

  // Flatten results para navegación con teclado
  const flatResults = Object.entries(results).flatMap(([key, items]) =>
    items.map((item) => ({ ...item, moduleKey: key }))
  );

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, flatResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatResults[selectedIdx]) {
      handleSelect(flatResults[selectedIdx]);
    }
  };

  const handleSelect = (item) => {
    saveRecent({
      id: item.id,
      title: item.title,
      subtitle: item.subtitle,
      path: item.path,
      moduleKey: item.moduleKey,
    });
    navigate(item.path);
    setOpen(false);
  };

  const handleVerTodos = (mod) => {
    navigate(`${mod.listPath}?search=${encodeURIComponent(parsedQuery.term)}`);
    setOpen(false);
  };

  const activePrefix =
    parsedQuery.filteredModules.length === 1 ? parsedQuery.filteredModules[0] : null;

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Overlay */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div
        ref={containerRef}
        className="relative w-full max-w-lg bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
          {activePrefix && (
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-md font-medium bg-slate-100 dark:bg-centhrix-surface ${activePrefix.color}`}
            >
              <activePrefix.icon className="w-3 h-3" />
              {activePrefix.label}
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            aria-label="Búsqueda global"
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={
              activePrefix
                ? `Buscar en ${activePrefix.label}...`
                : 'Buscar productos, clientes, operaciones...'
            }
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none"
          />
          {loading && <Loader2 className="w-4 h-4 text-orange-500 animate-spin flex-shrink-0" />}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-centhrix-surface rounded">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[55vh] overflow-y-auto">
          {/* Sin query: recientes + prefijos disponibles */}
          {parsedQuery.term.length < 2 && !loading && (
            <div className="p-3">
              {/* Recientes */}
              {recent.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Recientes
                    </span>
                    <button
                      onClick={() => {
                        clearRecent();
                        setRecent([]);
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 flex items-center gap-0.5"
                    >
                      <X className="w-3 h-3" /> Limpiar
                    </button>
                  </div>
                  {recent.map((item) => {
                    const mod = MODULE_CONFIG.find((m) => m.key === item.moduleKey);
                    const Icon = mod?.icon || FileText;
                    return (
                      <button
                        key={item.path}
                        onClick={() => handleSelect(item)}
                        className="w-full text-left px-3 py-2 flex items-center gap-3 rounded-xl hover:bg-slate-50 dark:hover:bg-centhrix-surface/50 transition-colors group"
                      >
                        <Clock className="w-4 h-4 text-slate-300 dark:text-slate-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 dark:text-slate-200 truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                            {item.subtitle}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${mod?.color || 'text-slate-400'}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span className="text-[10px]">{mod?.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Prefijos de módulo */}
              <div className="px-1">
                <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                  Filtrar por módulo — escribe el prefijo + espacio
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {allowedModules.map((mod) => {
                    const Icon = mod.icon;
                    return (
                      <span
                        key={mod.key}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-centhrix-surface/50 rounded-lg border border-slate-100 dark:border-slate-700"
                      >
                        <Icon className={`w-3 h-3 ${mod.color}`} />
                        {mod.label}
                        <kbd className="font-mono text-[9px] px-1 py-0.5 bg-slate-200 dark:bg-centhrix-surface rounded text-slate-500 dark:text-slate-400">
                          {mod.prefix}
                        </kbd>
                      </span>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">
                  Ej: <span className="font-mono">v viaje</span> busca solo en Viajes
                </p>
              </div>
            </div>
          )}

          {/* Sin resultados */}
          {parsedQuery.term.length >= 2 && !loading && flatResults.length === 0 && (
            <div className="py-8 text-center">
              <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No se encontraron resultados para &ldquo;{parsedQuery.term}&rdquo;
              </p>
            </div>
          )}

          {/* Resultados por módulo */}
          {Object.entries(results).map(([moduleKey, items]) => {
            const mod = MODULE_CONFIG.find((m) => m.key === moduleKey);
            if (!mod) return null;
            const Icon = mod.icon;

            return (
              <div key={moduleKey}>
                <div className="px-4 py-2 bg-slate-50 dark:bg-centhrix-bg/50 border-b border-slate-100 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${mod.color}`} />
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      {mod.label}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">
                      ({items.length})
                    </span>
                  </div>
                </div>

                {items.map((item) => {
                  const currentIdx = flatIdx++;
                  const isSelected = currentIdx === selectedIdx;
                  return (
                    <button
                      key={`${moduleKey}-${item.id}`}
                      onClick={() => handleSelect({ ...item, moduleKey })}
                      className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'bg-orange-50 dark:bg-orange-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-centhrix-surface/50'
                      }`}
                    >
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium truncate ${isSelected ? 'text-orange-600 dark:text-orange-400' : 'text-slate-700 dark:text-slate-200'}`}
                        >
                          <Highlight text={item.title} term={parsedQuery.term} />
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {item.subtitle}
                        </p>
                      </div>
                      {isSelected && (
                        <kbd className="text-[10px] text-slate-400 bg-slate-100 dark:bg-centhrix-surface px-1.5 py-0.5 rounded font-mono">
                          Enter
                        </kbd>
                      )}
                    </button>
                  );
                })}

                {/* Ver todos */}
                <button
                  onClick={() => handleVerTodos(mod)}
                  className="w-full text-left px-4 py-2 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 hover:text-orange-500 dark:hover:text-orange-400 hover:bg-slate-50 dark:hover:bg-centhrix-surface/30 transition-colors border-t border-slate-50 dark:border-slate-700/50"
                >
                  <span>Ver todos los resultados en {mod.label}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
