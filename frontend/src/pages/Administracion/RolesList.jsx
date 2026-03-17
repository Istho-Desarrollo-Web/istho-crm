/**
 * ISTHO CRM - Gestión de Roles y Permisos
 *
 * Muestra la matriz de permisos por rol con checkboxes editables.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Save, Trash2, Users, RefreshCw, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import adminService from '../../api/admin.service';
import { useAuth } from '../../context/AuthContext';

// Nombres legibles de módulos
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
};

const RolesList = () => {
  const { hasPermission } = useAuth();
  const canCreateRol = hasPermission('roles', 'crear');
  const canEditRol = hasPermission('roles', 'editar');
  const canDeleteRol = hasPermission('roles', 'eliminar');

  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [permisosAgrupados, setPermisosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [showNewRol, setShowNewRol] = useState(false);
  const [newRol, setNewRol] = useState({ nombre: '', codigo: '', descripcion: '', nivel_jerarquia: 50, color: '#6B7280' });
  const [expandedGroups, setExpandedGroups] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editPermisos, setEditPermisos] = useState({}); // { rolId: Set(permisoIds) }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permisosRes] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermisos()
      ]);

      const rolesData = rolesRes.data || [];
      const permisosData = permisosRes.data || {};

      setRoles(rolesData);
      setPermisos(permisosData.permisos || []);
      setPermisosAgrupados(permisosData.agrupados || []);

      // Inicializar editPermisos con los permisos actuales de cada rol
      const initial = {};
      rolesData.forEach(function(rol) {
        const ids = (rol.permisos || []).map(function(p) { return p.id; });
        initial[rol.id] = new Set(ids);
      });
      setEditPermisos(initial);

      // Expandir todos los grupos por defecto
      const groups = {};
      (permisosData.agrupados || []).forEach(function(g) { groups[g.modulo] = true; });
      setExpandedGroups(groups);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const togglePermiso = (rolId, permisoId) => {
    setEditPermisos(prev => {
      const updated = { ...prev };
      const set = new Set(updated[rolId] || []);
      if (set.has(permisoId)) {
        set.delete(permisoId);
      } else {
        set.add(permisoId);
      }
      updated[rolId] = set;
      return updated;
    });
  };

  const toggleModuloCompleto = (rolId, modulo) => {
    const moduloPermisos = permisos.filter(function(p) { return p.modulo === modulo; });
    const currentSet = editPermisos[rolId] || new Set();
    const allChecked = moduloPermisos.every(function(p) { return currentSet.has(p.id); });

    setEditPermisos(prev => {
      const updated = { ...prev };
      const set = new Set(updated[rolId] || []);
      moduloPermisos.forEach(function(p) {
        if (allChecked) {
          set.delete(p.id);
        } else {
          set.add(p.id);
        }
      });
      updated[rolId] = set;
      return updated;
    });
  };

  const hasChanges = (rolId) => {
    const rol = roles.find(function(r) { return r.id === rolId; });
    if (!rol) return false;
    const original = new Set((rol.permisos || []).map(function(p) { return p.id; }));
    const current = editPermisos[rolId] || new Set();
    if (original.size !== current.size) return true;
    for (const id of current) {
      if (!original.has(id)) return true;
    }
    return false;
  };

  const saveRolPermisos = async (rolId) => {
    setSaving(rolId);
    try {
      const permisoIds = Array.from(editPermisos[rolId] || []);
      await adminService.actualizarRol(rolId, { permisos_ids: permisoIds });
      await fetchData();
    } catch (error) {
      console.error('Error guardando permisos:', error);
    }
    setSaving(null);
  };

  const handleCreateRol = async (e) => {
    e.preventDefault();
    try {
      await adminService.crearRol(newRol);
      setShowNewRol(false);
      setNewRol({ nombre: '', codigo: '', descripcion: '', nivel_jerarquia: 50, color: '#6B7280' });
      fetchData();
    } catch (error) {
      console.error('Error creando rol:', error);
    }
  };

  const handleDeleteRol = async (rolId) => {
    try {
      await adminService.eliminarRol(rolId);
      setShowDeleteConfirm(null);
      fetchData();
    } catch (error) {
      console.error('Error eliminando rol:', error);
    }
  };

  const toggleGroup = (modulo) => {
    setExpandedGroups(prev => ({ ...prev, [modulo]: !prev[modulo] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Todos los roles para la matriz de permisos
  const rolesMatriz = roles;

  return (
    <div className="space-y-6">
      {/* Header + Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            Roles del Sistema
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {roles.length} roles configurados, {permisos.length} permisos en el catálogo
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchData}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {canCreateRol && (
            <button
              onClick={() => setShowNewRol(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl"
            >
              <Plus className="w-4 h-4" /> Nuevo Rol
            </button>
          )}
        </div>
      </div>

      {/* Roles Cards (resumen) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roles.map(function(rol) {
          return (
            <div key={rol.id} className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rol.color }} />
                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{rol.nombre}</span>
                {rol.es_sistema && <Lock className="w-3 h-3 text-slate-400" />}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Nivel {rol.nivel_jerarquia}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  <Users className="w-3 h-3" /> {rol.total_usuarios || 0}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {(rol.permisos || []).length} permisos
              </div>
            </div>
          );
        })}
      </div>

      {/* Matriz de Permisos */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-slate-700">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100">Matriz de Permisos</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Marca los permisos para cada rol. Los cambios se guardan por rol.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <th className="text-left px-4 py-3 font-medium text-slate-500 dark:text-slate-400 min-w-[200px] sticky left-0 bg-slate-50 dark:bg-slate-900/50 z-10">
                  Módulo / Acción
                </th>
                {rolesMatriz.map(function(rol) {
                  return (
                    <th key={rol.id} className="text-center px-3 py-3 min-w-[100px]">
                      <div className="flex flex-col items-center gap-1">
                        <span
                          className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full text-white"
                          style={{ backgroundColor: rol.color }}
                        >
                          {rol.nombre}
                        </span>
                        {canEditRol && hasChanges(rol.id) && (
                          <button
                            onClick={() => saveRolPermisos(rol.id)}
                            disabled={saving === rol.id}
                            className="flex items-center gap-1 text-[10px] text-orange-600 hover:text-orange-700 font-medium"
                          >
                            <Save className="w-3 h-3" />
                            {saving === rol.id ? 'Guardando...' : 'Guardar'}
                          </button>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {permisosAgrupados.map(function(grupo) {
                const isExpanded = expandedGroups[grupo.modulo];
                const moduloPermisos = permisos.filter(function(p) { return p.modulo === grupo.modulo; });

                return (
                  <React.Fragment key={grupo.modulo}>
                    {/* Module header row */}
                    <tr className="bg-slate-50/50 dark:bg-slate-900/30 border-t border-gray-100 dark:border-slate-700/50">
                      <td
                        className="px-4 py-2 font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none sticky left-0 bg-slate-50/50 dark:bg-slate-900/30 z-10"
                        onClick={() => toggleGroup(grupo.modulo)}
                      >
                        <span className="flex items-center gap-2">
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4 text-slate-400" />
                            : <ChevronRight className="w-4 h-4 text-slate-400" />
                          }
                          {MODULO_LABELS[grupo.modulo] || grupo.modulo}
                          <span className="text-xs text-slate-400 font-normal">({grupo.grupo})</span>
                        </span>
                      </td>
                      {rolesMatriz.map(function(rol) {
                        const currentSet = editPermisos[rol.id] || new Set();
                        const allChecked = moduloPermisos.every(function(p) { return currentSet.has(p.id); });
                        const someChecked = moduloPermisos.some(function(p) { return currentSet.has(p.id); });

                        return (
                          <td key={rol.id} className="text-center px-3 py-2">
                            <input
                              type="checkbox"
                              checked={allChecked}
                              ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                              onChange={() => canEditRol && toggleModuloCompleto(rol.id, grupo.modulo)}
                              disabled={!canEditRol}
                              className={`w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 ${canEditRol ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                            />
                          </td>
                        );
                      })}
                    </tr>

                    {/* Individual permission rows */}
                    {isExpanded && grupo.acciones.map(function(accion) {
                      const permiso = permisos.find(function(p) { return p.modulo === grupo.modulo && p.accion === accion.accion; });
                      if (!permiso) return null;

                      return (
                        <tr key={permiso.id} className="border-t border-gray-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                          <td className="pl-12 pr-4 py-2 text-slate-600 dark:text-slate-400 sticky left-0 bg-white dark:bg-slate-800 z-10">
                            <span className="flex items-center gap-2">
                              {ACCION_LABELS[accion.accion] || accion.accion}
                              <span className="text-[10px] text-slate-400 hidden xl:inline">{accion.descripcion}</span>
                            </span>
                          </td>
                          {rolesMatriz.map(function(rol) {
                            const currentSet = editPermisos[rol.id] || new Set();
                            const checked = currentSet.has(permiso.id);

                            return (
                              <td key={rol.id} className="text-center px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => canEditRol && togglePermiso(rol.id, permiso.id)}
                                  disabled={!canEditRol}
                                  className={`w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 ${canEditRol ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles no sistema: delete option */}
      {roles.some(function(r) { return !r.es_sistema; }) && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Roles Personalizados</h4>
          <div className="space-y-2">
            {roles.filter(function(r) { return !r.es_sistema; }).map(function(rol) {
              return (
                <div key={rol.id} className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rol.color }} />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{rol.nombre}</span>
                    <span className="text-xs text-slate-400">({rol.codigo})</span>
                    <span className="text-xs text-slate-400">{rol.total_usuarios || 0} usuarios</span>
                  </div>
                  {canDeleteRol && (
                    <button
                      onClick={() => setShowDeleteConfirm(rol)}
                      className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Eliminar rol"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: New Rol */}
      {showNewRol && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Crear Nuevo Rol
            </h3>
            <form onSubmit={handleCreateRol} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nombre *</label>
                <input
                  value={newRol.nombre}
                  onChange={(e) => setNewRol({ ...newRol, nombre: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  placeholder="Ej: Coordinador Bodega"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Código * (solo minúsculas y _)</label>
                <input
                  value={newRol.codigo}
                  onChange={(e) => setNewRol({ ...newRol, codigo: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  placeholder="Ej: coordinador_bodega"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                <input
                  value={newRol.descripcion}
                  onChange={(e) => setNewRol({ ...newRol, descripcion: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Nivel Jerárquico (1-100)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newRol.nivel_jerarquia}
                    onChange={(e) => setNewRol({ ...newRol, nivel_jerarquia: parseInt(e.target.value) || 50 })}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={newRol.color}
                      onChange={(e) => setNewRol({ ...newRol, color: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-200 dark:border-slate-700 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newRol.color}
                      onChange={(e) => setNewRol({ ...newRol, color: e.target.value })}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRol(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl"
                >
                  Crear Rol
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirm */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Eliminar Rol
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              ¿Estás seguro de eliminar el rol <strong>{showDeleteConfirm.nombre}</strong>?
              {showDeleteConfirm.total_usuarios > 0 && (
                <span className="block mt-1 text-red-500">
                  Este rol tiene {showDeleteConfirm.total_usuarios} usuario(s) asignados. Debes reasignarlos antes de eliminar.
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteRol(showDeleteConfirm.id)}
                disabled={showDeleteConfirm.total_usuarios > 0}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl disabled:opacity-50"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RolesList;
