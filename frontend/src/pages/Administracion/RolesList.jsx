/**
 * ISTHO CRM - Gestión de Roles y Permisos
 *
 * Muestra la matriz de permisos por rol con checkboxes editables.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Plus,
  Trash2,
  Users,
  RefreshCw,
  Lock,
  LayoutDashboard,
  Package,
  ClipboardList,
  BarChart3,
  Mail,
  UserCog,
  Shield,
  Activity,
  Settings,
  Truck,
  Bell,
  Car,
  MapPin,
  Wallet,
  Receipt,
  User,
  CheckCircle,
} from 'lucide-react';
import adminService from '../../api/admin.service';
import { useAuth } from '../../context/AuthContext';
import useNotification from '../../hooks/useNotification';

const MODULO_LABELS = {
  dashboard: 'Dashboard',
  clientes: 'Clientes',
  inventario: 'Inventario',
  operaciones: 'Operaciones',
  reportes: 'Reportes',
  auditoria: 'Completar Operación',
  plantillas_email: 'Plantillas Email',
  usuarios: 'Usuarios',
  roles: 'Roles',
  configuracion: 'Configuración',
  configuracion_wms: 'Config. WMS',
  notificaciones: 'Notificaciones',
  vehiculos: 'Vehículos',
  viajes: 'Viajes',
  caja_menor: 'Caja Menor',
  movimientos: 'Movimientos',
  perfil: 'Perfil',
};

const ACCION_LABELS = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  exportar: 'Exportar',
  importar: 'Importar',
  ajustar: 'Ajustar',
  cerrar: 'Cerrar',
  anular: 'Anular',
  aprobar: 'Aprobar',
  descargar: 'Descargar',
  alertas: 'Alertas',
  reenviar_correo: 'Reenviar correo',
};

const MODULO_ICONOS = {
  dashboard: LayoutDashboard,
  clientes: Users,
  inventario: Package,
  operaciones: ClipboardList,
  reportes: BarChart3,
  plantillas_email: Mail,
  usuarios: UserCog,
  roles: Shield,
  auditoria: Activity,
  configuracion: Settings,
  configuracion_wms: Truck,
  notificaciones: Bell,
  vehiculos: Car,
  viajes: MapPin,
  caja_menor: Wallet,
  movimientos: Receipt,
  perfil: User,
};

const ModuloCard = ({ grupo, permisos, permisoSet, onToggleChip, onToggleMaestro, disabled }) => {
  const moduloPermisos = permisos.filter((p) => p.modulo === grupo.modulo);
  const activosCount = moduloPermisos.filter((p) => permisoSet.has(p.id)).length;
  const total = moduloPermisos.length;
  const todosActivos = total > 0 && activosCount === total;
  const Icono = MODULO_ICONOS[grupo.modulo] || Shield;

  return (
    <div
      className="bg-white dark:bg-centhrix-surface border border-gray-200 dark:border-slate-700"
      style={{ borderRadius: 10, overflow: 'hidden' }}
    >
      <div
        className="bg-gray-50 dark:bg-centhrix-card border-b border-gray-200 dark:border-slate-700"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
        }}
      >
        <div
          className="font-bold text-slate-800 dark:text-slate-100"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}
        >
          <Icono
            className="text-slate-400 dark:text-slate-500"
            style={{ width: 14, height: 14, flexShrink: 0 }}
          />
          {MODULO_LABELS[grupo.modulo] || grupo.modulo}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="text-slate-500" style={{ fontSize: 9 }}>
            <span style={{ color: '#E74C3C', fontWeight: 700 }}>{activosCount}</span>/{total}
          </span>
          <button
            onClick={() => !disabled && onToggleMaestro(moduloPermisos)}
            disabled={disabled}
            title={todosActivos ? 'Desactivar todos' : 'Activar todos'}
            style={{
              width: 28,
              height: 15,
              borderRadius: 8,
              position: 'relative',
              flexShrink: 0,
              border: 'none',
              outline: 'none',
              padding: 0,
              background: todosActivos ? '#E74C3C' : '#94A3B8',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1,
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: 2,
                width: 11,
                height: 11,
                borderRadius: '50%',
                background: '#fff',
                ...(todosActivos ? { right: 2 } : { left: 2 }),
              }}
            />
          </button>
        </div>
      </div>
      <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {grupo.acciones.map((accion) => {
          const permiso = moduloPermisos.find((p) => p.accion === accion.accion);
          if (!permiso) return null;
          const activo = permisoSet.has(permiso.id);
          return (
            <button
              key={permiso.id}
              onClick={() => !disabled && onToggleChip(permiso.id)}
              disabled={disabled}
              className={`border ${
                activo
                  ? 'bg-red-50 dark:bg-red-950/20 text-red-500 border-red-200 dark:border-red-900/40'
                  : 'bg-gray-100 dark:bg-centhrix-card text-slate-500 dark:text-slate-400 border-gray-200 dark:border-slate-700'
              }`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 8px',
                borderRadius: 12,
                fontSize: 10,
                fontWeight: 500,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  flexShrink: 0,
                  background: activo ? '#E74C3C' : '#94A3B8',
                }}
              />
              {ACCION_LABELS[accion.accion] || accion.accion}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const RolesList = () => {
  const { hasPermission } = useAuth();
  const canCreateRol = hasPermission('roles', 'crear');
  const canEditRol = hasPermission('roles', 'editar');
  const canDeleteRol = hasPermission('roles', 'eliminar');

  const { error: notifyError } = useNotification();

  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [permisosAgrupados, setPermisosAgrupados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewRol, setShowNewRol] = useState(false);
  const [newRol, setNewRol] = useState({
    nombre: '',
    codigo: '',
    descripcion: '',
    nivel_jerarquia: 50,
    color: '#6B7280',
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [editPermisos, setEditPermisos] = useState({}); // { rolId: Set(permisoIds) }
  const [rolActivoId, setRolActivoId] = useState(null); // ID del tab activo
  const [guardando, setGuardando] = useState(false); // bloquea chips durante PUT
  const [toastVisible, setToastVisible] = useState(false); // toast "Guardado automáticamente"
  const toastTimerRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rolesRes, permisosRes] = await Promise.all([
        adminService.getRoles(),
        adminService.getPermisos(),
      ]);

      const rolesData = rolesRes.data || [];
      const permisosData = permisosRes.data || {};

      setRoles(rolesData);
      setPermisos(permisosData.permisos || []);
      setPermisosAgrupados(permisosData.agrupados || []);

      // Inicializar editPermisos con los permisos actuales de cada rol
      const initial = {};
      rolesData.forEach(function (rol) {
        const ids = (rol.permisos || []).map(function (p) {
          return p.id;
        });
        initial[rol.id] = new Set(ids);
      });
      setEditPermisos(initial);

      setRolActivoId((prev) => prev ?? rolesData[0]?.id ?? null);
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const guardarPermisos = useCallback(
    async (rolId, nuevoSet) => {
      const setAnterior = new Set(editPermisos[rolId] || []);
      setEditPermisos((prev) => ({ ...prev, [rolId]: nuevoSet }));
      setGuardando(true);
      try {
        await adminService.actualizarRol(rolId, { permisos_ids: Array.from(nuevoSet) });
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        setToastVisible(true);
        toastTimerRef.current = setTimeout(() => setToastVisible(false), 2000);
      } catch {
        setEditPermisos((prev) => ({ ...prev, [rolId]: setAnterior }));
        notifyError('Error al guardar los permisos');
      } finally {
        setGuardando(false);
      }
    },
    [editPermisos, notifyError]
  );

  const handleToggleChip = useCallback(
    (rolId, permisoId) => {
      const currentSet = editPermisos[rolId] || new Set();
      const nuevoSet = new Set(currentSet);
      if (nuevoSet.has(permisoId)) nuevoSet.delete(permisoId);
      else nuevoSet.add(permisoId);
      guardarPermisos(rolId, nuevoSet);
    },
    [editPermisos, guardarPermisos]
  );

  const handleToggleMaestro = useCallback(
    (rolId, moduloPermisos) => {
      const currentSet = editPermisos[rolId] || new Set();
      const todosActivos = moduloPermisos.every((p) => currentSet.has(p.id));
      const nuevoSet = new Set(currentSet);
      moduloPermisos.forEach((p) => {
        if (todosActivos) nuevoSet.delete(p.id);
        else nuevoSet.add(p.id);
      });
      guardarPermisos(rolId, nuevoSet);
    },
    [editPermisos, guardarPermisos]
  );

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            aria-label="Actualizar lista"
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-xl"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
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
        {roles.map(function (rol) {
          return (
            <div
              key={rol.id}
              className="bg-white dark:bg-centhrix-card rounded-xl border border-gray-200 dark:border-slate-700 p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rol.color }} />
                <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                  {rol.nombre}
                </span>
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

      {/* Nueva matriz: tabs de rol + grid de módulos */}
      {(() => {
        const rolActual = roles.find((r) => r.id === rolActivoId);
        const esRolAdmin = rolActual?.nivel_jerarquia === 100;
        const chipDisabled = !canEditRol || esRolAdmin || guardando;
        const permisoSet = editPermisos[rolActivoId] || new Set();

        return (
          <div
            className="bg-gray-50 dark:bg-centhrix-bg"
            style={{ borderRadius: 12, padding: 16, fontFamily: "'Segoe UI', sans-serif" }}
          >
            {/* Tabs de rol */}
            <div
              className="border-b border-gray-200 dark:border-slate-700"
              style={{ display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto' }}
            >
              {roles.map((rol) => {
                const totalActivos = (editPermisos[rol.id] || new Set()).size;
                const esActivo = rolActivoId === rol.id;
                return (
                  <button
                    key={rol.id}
                    onClick={() => setRolActivoId(rol.id)}
                    className={
                      esActivo
                        ? 'text-slate-800 dark:text-slate-100 bg-gray-200 dark:bg-centhrix-card'
                        : 'text-slate-500 dark:text-slate-400 bg-transparent'
                    }
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      borderRadius: '8px 8px 0 0',
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      border: 'none',
                      outline: 'none',
                      borderBottom: esActivo ? '2px solid #E74C3C' : '2px solid transparent',
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: rol.color,
                        flexShrink: 0,
                      }}
                    />
                    {rol.nombre}
                    <span
                      className={
                        esActivo
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 dark:bg-centhrix-card text-slate-500 dark:text-slate-500'
                      }
                      style={{ fontSize: 9, padding: '1px 5px', borderRadius: 8 }}
                    >
                      {totalActivos}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Cabecera del rol activo */}
            {rolActual && (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    marginBottom: 14,
                    flexWrap: 'wrap',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: `${rolActual.color}22`,
                      color: rolActual.color,
                      border: `1px solid ${rolActual.color}55`,
                    }}
                  >
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: rolActual.color,
                        display: 'inline-block',
                      }}
                    />
                    {rolActual.nombre}
                    {esRolAdmin && <Lock style={{ width: 12, height: 12 }} />}
                  </span>
                  <span className="text-slate-500" style={{ fontSize: 11 }}>
                    {permisoSet.size} de {permisos.length} permisos activos
                  </span>
                  {toastVisible && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontSize: 10,
                        color: '#2ECC71',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <CheckCircle style={{ width: 12, height: 12 }} />
                      Guardado automáticamente
                    </span>
                  )}
                </div>

                {/* Grid de módulos 2 columnas */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {permisosAgrupados.map((grupo) => (
                    <ModuloCard
                      key={grupo.modulo}
                      grupo={grupo}
                      permisos={permisos}
                      permisoSet={permisoSet}
                      onToggleChip={(permisoId) => handleToggleChip(rolActivoId, permisoId)}
                      onToggleMaestro={(moduloPerms) =>
                        handleToggleMaestro(rolActivoId, moduloPerms)
                      }
                      disabled={chipDisabled}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })()}

      {/* Roles no sistema: delete option */}
      {roles.some(function (r) {
        return !r.es_sistema;
      }) && (
        <div className="bg-white dark:bg-centhrix-card rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
          <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">
            Roles Personalizados
          </h4>
          <div className="space-y-2">
            {roles
              .filter(function (r) {
                return !r.es_sistema;
              })
              .map(function (rol) {
                return (
                  <div
                    key={rol.id}
                    className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-centhrix-surface/30"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: rol.color }}
                      />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        {rol.nombre}
                      </span>
                      <span className="text-xs text-slate-400">({rol.codigo})</span>
                      <span className="text-xs text-slate-400">
                        {rol.total_usuarios || 0} usuarios
                      </span>
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
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl max-w-md w-full p-6">
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
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                  placeholder="Ej: Coordinador Bodega"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Código * (solo minúsculas y _)
                </label>
                <input
                  value={newRol.codigo}
                  onChange={(e) =>
                    setNewRol({
                      ...newRol,
                      codigo: e.target.value.toLowerCase().replace(/[^a-z_]/g, ''),
                    })
                  }
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                  placeholder="Ej: coordinador_bodega"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
                <input
                  value={newRol.descripcion}
                  onChange={(e) => setNewRol({ ...newRol, descripcion: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    Nivel Jerárquico (1-100)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newRol.nivel_jerarquia}
                    onChange={(e) =>
                      setNewRol({ ...newRol, nivel_jerarquia: parseInt(e.target.value) || 50 })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
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
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRol(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl"
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
          <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Eliminar Rol
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              ¿Estás seguro de eliminar el rol <strong>{showDeleteConfirm.nombre}</strong>?
              {showDeleteConfirm.total_usuarios > 0 && (
                <span className="block mt-1 text-red-500">
                  Este rol tiene {showDeleteConfirm.total_usuarios} usuario(s) asignados. Debes
                  reasignarlos antes de eliminar.
                </span>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl"
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
