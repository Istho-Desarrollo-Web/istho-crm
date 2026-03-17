/**
 * ISTHO CRM - Modal de Permisos por Usuario
 *
 * Permite editar permisos individuales por usuario.
 * - Usuarios internos: muestra matriz de permisos del catálogo con override del rol
 * - Usuarios cliente: muestra catálogo de permisos del portal
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X, Save, Shield, RotateCcw, ChevronDown, ChevronRight,
  CheckCircle, AlertTriangle, Loader2
} from 'lucide-react';
import adminService from '../../api/admin.service';

const MODULO_LABELS = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  inventario: 'Inventario',
  operaciones: 'Operaciones',
  despachos: 'Despachos',
  reportes: 'Reportes',
  auditoria: 'Auditoría',
  usuarios: 'Usuarios',
  roles: 'Roles',
  configuracion: 'Configuración',
  notificaciones: 'Notificaciones',
  facturacion: 'Facturación',
  perfil: 'Perfil',
};

const ACCION_LABELS = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  exportar: 'Exportar',
  ajustar: 'Ajustar',
  cerrar: 'Cerrar',
  anular: 'Anular',
  alertas: 'Alertas',
  crear_solicitud: 'Crear Solicitud',
  descargar_documentos: 'Descargar Documentos',
  descargar: 'Descargar',
  cambiar_password: 'Cambiar Contraseña',
};

const UsuarioPermisos = ({ usuario, onClose, onSave }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [data, setData] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({});

  // Para usuarios internos: Set de permiso IDs seleccionados
  const [selectedPermisos, setSelectedPermisos] = useState(new Set());
  // Para usuarios internos: catálogo completo de permisos
  const [catalogoPermisos, setCatalogoPermisos] = useState([]);
  const [catalogoAgrupados, setCatalogoAgrupados] = useState([]);
  // Track si tiene permisos personalizados activos
  const [tienePersonalizados, setTienePersonalizados] = useState(false);

  // Para usuarios cliente: objeto de permisos { modulo: { accion: bool } }
  const [permisosCliente, setPermisosCliente] = useState({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [permisosRes, catalogoRes] = await Promise.all([
        adminService.getPermisosUsuario(usuario.id),
        adminService.getPermisos()
      ]);

      const permData = permisosRes.data;
      setData(permData);

      if (permData.tipo === 'cliente') {
        // Inicializar permisos de cliente
        const defaults = permData.defaults || {};
        const current = permData.permisos_cliente || defaults;
        setPermisosCliente(JSON.parse(JSON.stringify(current)));

        // Expandir todos los módulos
        const groups = {};
        Object.keys(permData.catalogo || {}).forEach(m => { groups[m] = true; });
        setExpandedGroups(groups);
      } else {
        // Usuario interno
        const catalogoData = catalogoRes.data || {};
        setCatalogoPermisos(catalogoData.permisos || []);
        setCatalogoAgrupados(catalogoData.agrupados || []);

        setTienePersonalizados(permData.tiene_personalizados);

        if (permData.tiene_personalizados && permData.permisos_personalizados) {
          // Convertir { modulo: ['accion1'] } a Set de permiso IDs
          const pp = permData.permisos_personalizados;
          const allPermisos = catalogoData.permisos || [];
          const ids = new Set();
          Object.entries(pp).forEach(([modulo, acciones]) => {
            acciones.forEach(accion => {
              const p = allPermisos.find(x => x.modulo === modulo && x.accion === accion);
              if (p) ids.add(p.id);
            });
          });
          setSelectedPermisos(ids);
        } else {
          // Usar permisos del rol
          const rolIds = new Set((permData.permisos_rol || []).map(p => p.id));
          setSelectedPermisos(rolIds);
        }

        // Expandir todos los grupos
        const groups = {};
        (catalogoData.agrupados || []).forEach(g => { groups[g.modulo] = true; });
        setExpandedGroups(groups);
      }
    } catch (err) {
      setError('Error cargando permisos del usuario');
      console.error(err);
    }
    setLoading(false);
  }, [usuario.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleGroup = (modulo) => {
    setExpandedGroups(prev => ({ ...prev, [modulo]: !prev[modulo] }));
  };

  // ── Handlers para usuarios internos ──

  const togglePermiso = (permisoId) => {
    if (!tienePersonalizados) setTienePersonalizados(true);
    setSelectedPermisos(prev => {
      const next = new Set(prev);
      if (next.has(permisoId)) {
        next.delete(permisoId);
      } else {
        next.add(permisoId);
      }
      return next;
    });
  };

  const toggleModuloCompleto = (modulo) => {
    if (!tienePersonalizados) setTienePersonalizados(true);
    const moduloPermisos = catalogoPermisos.filter(p => p.modulo === modulo);
    const allChecked = moduloPermisos.every(p => selectedPermisos.has(p.id));

    setSelectedPermisos(prev => {
      const next = new Set(prev);
      moduloPermisos.forEach(p => {
        if (allChecked) {
          next.delete(p.id);
        } else {
          next.add(p.id);
        }
      });
      return next;
    });
  };

  const handleRestaurarRol = async () => {
    setSaving(true);
    setError('');
    try {
      await adminService.actualizarPermisosUsuario(usuario.id, { restaurar_rol: true });
      setSuccessMsg('Permisos restaurados a los del rol');
      setTienePersonalizados(false);
      // Recargar permisos del rol
      await fetchData();
      setTimeout(() => { setSuccessMsg(''); }, 2000);
      if (onSave) onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al restaurar permisos');
    }
    setSaving(false);
  };

  // ── Handlers para usuarios cliente ──

  const togglePermisoCliente = (modulo, accion) => {
    setPermisosCliente(prev => {
      const next = { ...prev };
      if (!next[modulo]) next[modulo] = {};
      next[modulo] = { ...next[modulo], [accion]: !next[modulo][accion] };
      return next;
    });
  };

  // ── Guardar ──

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      if (data.tipo === 'cliente') {
        await adminService.actualizarPermisosUsuario(usuario.id, {
          permisos_cliente: permisosCliente
        });
      } else {
        // Convertir Set de IDs a formato { modulo: ['accion1', 'accion2'] }
        const permisos_personalizados = {};
        selectedPermisos.forEach(id => {
          const p = catalogoPermisos.find(x => x.id === id);
          if (p) {
            if (!permisos_personalizados[p.modulo]) permisos_personalizados[p.modulo] = [];
            permisos_personalizados[p.modulo].push(p.accion);
          }
        });

        await adminService.actualizarPermisosUsuario(usuario.id, {
          permisos_personalizados
        });
        setTienePersonalizados(true);
      }

      setSuccessMsg('Permisos guardados exitosamente');
      setTimeout(() => { setSuccessMsg(''); }, 2000);
      if (onSave) onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar permisos');
    }
    setSaving(false);
  };

  // ── Detectar cambios ──

  const hasChanges = () => {
    if (!data) return false;

    if (data.tipo === 'cliente') {
      const original = data.permisos_cliente || data.defaults || {};
      return JSON.stringify(permisosCliente) !== JSON.stringify(original);
    }

    // Interno
    if (data.tiene_personalizados && data.permisos_personalizados) {
      const allPermisos = catalogoPermisos;
      const originalIds = new Set();
      Object.entries(data.permisos_personalizados).forEach(([modulo, acciones]) => {
        acciones.forEach(accion => {
          const p = allPermisos.find(x => x.modulo === modulo && x.accion === accion);
          if (p) originalIds.add(p.id);
        });
      });
      if (originalIds.size !== selectedPermisos.size) return true;
      for (const id of selectedPermisos) {
        if (!originalIds.has(id)) return true;
      }
      return false;
    }

    // Comparar con permisos del rol
    const rolIds = new Set((data.permisos_rol || []).map(p => p.id));
    if (rolIds.size !== selectedPermisos.size) return true;
    for (const id of selectedPermisos) {
      if (!rolIds.has(id)) return true;
    }
    return false;
  };

  // ── Render ──

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                Permisos de Usuario
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {usuario.nombre_completo || usuario.username}
                {data?.rol && (
                  <span
                    className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full text-white"
                    style={{ backgroundColor: data.rol.color }}
                  >
                    {data.rol.nombre}
                  </span>
                )}
                {data?.tipo === 'cliente' && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded-full text-white bg-purple-500">
                    Portal Cliente
                  </span>
                )}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-6 mt-4 px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-4 px-4 py-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 rounded-xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : data?.tipo === 'cliente' ? (
            /* ════ PERMISOS CLIENTE ════ */
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Configura los permisos del portal cliente para este usuario.
              </p>
              {Object.entries(data.catalogo || {}).map(([modulo, acciones]) => {
                const isExpanded = expandedGroups[modulo];
                const moduloPermisos = permisosCliente[modulo] || {};
                const totalActivos = acciones.filter(a => moduloPermisos[a.codigo]).length;

                return (
                  <div key={modulo} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleGroup(modulo)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900/70 transition-colors"
                    >
                      <span className="flex items-center gap-2 font-medium text-sm text-slate-700 dark:text-slate-200">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        {MODULO_LABELS[modulo] || modulo}
                      </span>
                      <span className="text-xs text-slate-400">
                        {totalActivos}/{acciones.length} activos
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                        {acciones.map((accion) => (
                          <label
                            key={accion.codigo}
                            className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer"
                          >
                            <div>
                              <span className="text-sm text-slate-700 dark:text-slate-200">{accion.nombre}</span>
                              <span className="block text-[11px] text-slate-400">{accion.descripcion}</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={!!moduloPermisos[accion.codigo]}
                              onChange={() => togglePermisoCliente(modulo, accion.codigo)}
                              className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                            />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* ════ PERMISOS INTERNO ════ */
            <div className="space-y-3">
              {/* Info banner */}
              <div className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs ${
                tienePersonalizados
                  ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                  : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400'
              }`}>
                <Shield className="w-4 h-4 shrink-0" />
                {tienePersonalizados
                  ? 'Este usuario tiene permisos personalizados (no hereda del rol).'
                  : `Permisos heredados del rol "${data?.rol?.nombre}". Al modificar se crearán permisos personalizados.`
                }
                {tienePersonalizados && (
                  <button
                    onClick={handleRestaurarRol}
                    disabled={saving}
                    className="ml-auto flex items-center gap-1 text-amber-600 dark:text-amber-300 hover:underline font-medium whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3" /> Restaurar rol
                  </button>
                )}
              </div>

              {/* Matriz de permisos */}
              {catalogoAgrupados.map((grupo) => {
                const isExpanded = expandedGroups[grupo.modulo];
                const moduloPermisos = catalogoPermisos.filter(p => p.modulo === grupo.modulo);
                const allChecked = moduloPermisos.every(p => selectedPermisos.has(p.id));
                const someChecked = moduloPermisos.some(p => selectedPermisos.has(p.id));
                const totalActivos = moduloPermisos.filter(p => selectedPermisos.has(p.id)).length;

                return (
                  <div key={grupo.modulo} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                    <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-900/50">
                      <input
                        type="checkbox"
                        checked={allChecked}
                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                        onChange={() => toggleModuloCompleto(grupo.modulo)}
                        className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                      />
                      <button
                        onClick={() => toggleGroup(grupo.modulo)}
                        className="flex-1 flex items-center justify-between"
                      >
                        <span className="flex items-center gap-2 font-medium text-sm text-slate-700 dark:text-slate-200">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          {MODULO_LABELS[grupo.modulo] || grupo.modulo}
                          <span className="text-[10px] text-slate-400 font-normal">({grupo.grupo})</span>
                        </span>
                        <span className="text-xs text-slate-400">
                          {totalActivos}/{moduloPermisos.length}
                        </span>
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 dark:divide-slate-700/50">
                        {grupo.acciones.map((accion) => {
                          const permiso = catalogoPermisos.find(p => p.modulo === grupo.modulo && p.accion === accion.accion);
                          if (!permiso) return null;
                          const isFromRol = (data?.permisos_rol || []).some(p => p.id === permiso.id);

                          return (
                            <label
                              key={permiso.id}
                              className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-700/20 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-700 dark:text-slate-200">
                                  {ACCION_LABELS[accion.accion] || accion.accion}
                                </span>
                                {isFromRol && !tienePersonalizados && (
                                  <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded">
                                    rol
                                  </span>
                                )}
                                <span className="text-[11px] text-slate-400 hidden sm:inline">{accion.descripcion}</span>
                              </div>
                              <input
                                type="checkbox"
                                checked={selectedPermisos.has(permiso.id)}
                                onChange={() => togglePermiso(permiso.id)}
                                className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                              />
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-700 shrink-0">
          <span className="text-xs text-slate-400">
            {data?.tipo === 'cliente'
              ? `${Object.values(permisosCliente).reduce((acc, m) => acc + Object.values(m).filter(Boolean).length, 0)} permisos activos`
              : `${selectedPermisos.size} permisos seleccionados`
            }
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !hasChanges()}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Guardando...' : 'Guardar Permisos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsuarioPermisos;