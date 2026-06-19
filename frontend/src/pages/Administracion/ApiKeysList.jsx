import { useState, useEffect, useCallback } from 'react';
import {
  Key, Plus, Trash2, Power, PowerOff, Copy, CheckCheck,
  RefreshCw, Eye, EyeOff, BarChart3, Clock, Shield,
} from 'lucide-react';
import apiKeysService from '@api/apiKeys.service';
import useNotification from '@hooks/useNotification';
import { formatDate } from '@utils/formatDate';
import { ConfirmDialog } from '@components/common';

// ─── Modal para mostrar el token recién creado ────────────────────────────────
const TokenModal = ({ token, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
              API Key creada
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Copia el token ahora — no se podrá ver de nuevo
            </p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 mb-4 font-mono text-sm text-green-400 break-all select-all">
          {token}
        </div>

        <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 mb-4">
          Este token se muestra una única vez. Guárdalo en un lugar seguro antes de cerrar.
        </p>

        <div className="flex gap-3">
          <button
            onClick={copiar}
            className="flex-1 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            {copied ? <CheckCheck className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar token'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-centhrix-accent hover:bg-centhrix-accent-hover text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Modal para crear nueva key ───────────────────────────────────────────────
const CrearModal = ({ onClose, onCreate }) => {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const { error } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setLoading(true);
    try {
      const res = await apiKeysService.crear({ nombre, descripcion });
      onCreate(res.data?.token || res.token);
    } catch (err) {
      error(err.response?.data?.message || 'Error al crear la API key');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
          Nueva API Key
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: PowerBI Producción"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-centhrix-accent/50"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Descripción
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Conecta el dashboard de operaciones en Power BI"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-centhrix-surface text-slate-800 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-centhrix-accent/50"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !nombre.trim()}
              className="flex-1 px-4 py-2.5 rounded-xl bg-centhrix-accent hover:bg-centhrix-accent-hover disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {loading ? 'Generando...' : 'Generar key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Componente principal ─────────────────────────────────────────────────────
const ApiKeysList = () => {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrear, setShowCrear] = useState(false);
  const [tokenNuevo, setTokenNuevo] = useState(null);
  const [confirmEliminar, setConfirmEliminar] = useState(null);
  const { success, error } = useNotification();

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiKeysService.listar();
      setKeys(res.data || []);
    } catch {
      error('Error al cargar las API keys');
    } finally {
      setLoading(false);
    }
  }, [error]);

  useEffect(() => { cargar(); }, [cargar]);

  const handleCreada = (token) => {
    setShowCrear(false);
    setTokenNuevo(token);
    cargar();
  };

  const handleToggle = async (key) => {
    try {
      const res = await apiKeysService.toggle(key.id);
      const activa = res.data?.activa ?? !key.activa;
      setKeys((prev) => prev.map((k) => k.id === key.id ? { ...k, activa } : k));
      success(`API key ${activa ? 'activada' : 'desactivada'}`);
    } catch {
      error('Error al cambiar el estado de la key');
    }
  };

  const handleEliminar = async () => {
    if (!confirmEliminar) return;
    try {
      await apiKeysService.eliminar(confirmEliminar.id);
      setKeys((prev) => prev.filter((k) => k.id !== confirmEliminar.id));
      success('API key eliminada');
    } catch {
      error('Error al eliminar la API key');
    } finally {
      setConfirmEliminar(null);
    }
  };

  // Info de los endpoints disponibles
  const BASE_URL = import.meta.env.VITE_API_URL || 'https://tu-backend.com/api/v1';

  const ENDPOINTS_INFO = [
    { path: '/powerbi/kpis', desc: 'KPIs consolidados (operaciones, clientes, inventario, viajes)' },
    { path: '/powerbi/operaciones', desc: 'Cabeceras de operaciones — unir con operaciones-lineas via operacion_id' },
    { path: '/powerbi/operaciones-lineas', desc: 'Líneas de detalle por operación — una fila por producto/lote' },
    { path: '/powerbi/inventario', desc: 'Dataset de productos con stock' },
    { path: '/powerbi/clientes', desc: 'Dataset de clientes activos e inactivos' },
    { path: '/powerbi/viajes', desc: 'Dataset de viajes con conductor y vehículo' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">API Keys</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Tokens de acceso para Power BI y otras integraciones externas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={cargar}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCrear(true)}
            id="tour-admin-apikeys-nuevo"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-centhrix-accent hover:bg-centhrix-accent-hover text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva API Key
          </button>
        </div>
      </div>

      {/* Endpoints de referencia */}
      <div className="bg-slate-50 dark:bg-centhrix-surface rounded-2xl p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-blue-500" />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Endpoints Power BI
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">
            — header requerido: <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">Authorization: Bearer &lt;api-key&gt;</code>
          </span>
        </div>
        <div className="space-y-1.5">
          {ENDPOINTS_INFO.map((ep) => (
            <div key={ep.path} className="flex items-start gap-3">
              <code className="text-xs bg-slate-800 dark:bg-slate-700 text-green-400 px-2 py-1 rounded shrink-0">
                GET {BASE_URL}{ep.path}
              </code>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{ep.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla de keys */}
      <div
        id="tour-admin-apikeys-tabla"
        className="bg-white dark:bg-centhrix-card rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
          </div>
        ) : keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <Key className="w-10 h-10 mb-3 opacity-40" />
            <p className="text-sm font-medium">Sin API keys</p>
            <p className="text-xs mt-1">Crea una key para conectar Power BI</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">
                  Descripción
                </th>
                <th className="text-center px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">
                  Último uso
                </th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell">
                  Creada
                </th>
                <th className="px-4 py-3.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {keys.map((key) => (
                <tr key={key.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                        <Key className="w-3.5 h-3.5 text-blue-500" />
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {key.nombre}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 hidden sm:table-cell">
                    <span className="text-slate-500 dark:text-slate-400">
                      {key.descripcion || <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    {key.activa ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                        Activa
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                        Inactiva
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    {key.ultimo_uso ? (
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(key.ultimo_uso, { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">Nunca</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 hidden lg:table-cell text-slate-500 dark:text-slate-400">
                    {formatDate(key.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => handleToggle(key)}
                        title={key.activa ? 'Desactivar' : 'Activar'}
                        className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                      >
                        {key.activa
                          ? <PowerOff className="w-4 h-4 text-amber-500" />
                          : <Power className="w-4 h-4 text-green-500" />
                        }
                      </button>
                      <button
                        onClick={() => setConfirmEliminar(key)}
                        title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modales */}
      {showCrear && (
        <CrearModal onClose={() => setShowCrear(false)} onCreate={handleCreada} />
      )}

      {tokenNuevo && (
        <TokenModal token={tokenNuevo} onClose={() => setTokenNuevo(null)} />
      )}

      <ConfirmDialog
        isOpen={!!confirmEliminar}
        title="Eliminar API Key"
        message={`¿Eliminar la key "${confirmEliminar?.nombre}"? Las conexiones que la usen dejarán de funcionar inmediatamente.`}
        confirmText="Eliminar"
        variant="danger"
        onConfirm={handleEliminar}
        onCancel={() => setConfirmEliminar(null)}
      />
    </div>
  );
};

export default ApiKeysList;
