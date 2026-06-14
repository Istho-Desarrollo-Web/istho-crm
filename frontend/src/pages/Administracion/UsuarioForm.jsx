/**
 * ISTHO CRM - Formulario de Usuario (Modal)
 *
 * Crear/editar usuarios del sistema.
 * Incluye asignación de clientes para roles supervisor/operador.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';
import adminService from '../../api/admin.service';
import clientesService from '../../api/clientes.service';
import { FilterDropdown } from '../../components/common';
import useNotification from '../../hooks/useNotification';

const ROLES_CON_FILTRO = ['supervisor', 'operador'];

const UsuarioForm = ({ usuario, roles, onSave, onClose }) => {
  const isEdit = !!usuario;
  const { success, error: notifyError } = useNotification();

  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    nombre: '',
    apellido: '',
    telefono: '',
    cargo: '',
    departamento: 'Operaciones',
    rol_id: '',
    cliente_id: '',
  });
  const [clientes, setClientes] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Estado para clientes asignados (supervisor/operador)
  const [clientesAsignados, setClientesAsignados] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [loadingAsignados, setLoadingAsignados] = useState(false);
  const [savingAsignacion, setSavingAsignacion] = useState(false);

  useEffect(() => {
    if (usuario) {
      setForm({
        username: usuario.username || '',
        email: usuario.email || '',
        password: '',
        nombre: usuario.nombre || '',
        apellido: usuario.apellido || '',
        telefono: usuario.telefono || '',
        cargo: usuario.cargo || '',
        departamento: usuario.departamento || 'Operaciones',
        rol_id: usuario.rol_id || '',
        cliente_id: usuario.cliente_id ? String(usuario.cliente_id) : '',
      });
    }
  }, [usuario]);

  useEffect(() => {
    clientesService
      .getAll({ limit: 200, estado: 'activo' })
      .then((res) => {
        const lista = res?.data?.rows || res?.data || [];
        setClientes(Array.isArray(lista) ? lista : []);
      })
      .catch(() => {});
  }, []);

  const selectedRol = roles.find((r) => r.id === Number(form.rol_id));
  const showClienteSelector = selectedRol?.es_cliente;
  const showAsignacionClientes = ROLES_CON_FILTRO.includes(selectedRol?.codigo);

  const cargarClientesAsignados = useCallback(async () => {
    if (!isEdit || !usuario?.id) return;
    setLoadingAsignados(true);
    try {
      const res = await adminService.getClientesAsignados(usuario.id);
      setClientesAsignados(res?.data || []);
    } catch {
      setClientesAsignados([]);
    } finally {
      setLoadingAsignados(false);
    }
  }, [isEdit, usuario?.id]);

  useEffect(() => {
    if (showAsignacionClientes) {
      cargarClientesAsignados();
    } else {
      setClientesAsignados([]);
    }
  }, [showAsignacionClientes, cargarClientesAsignados]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const data = { ...form, rol_id: Number(form.rol_id) };
      if (!isEdit && !data.password) {
        setError('La contraseña es requerida');
        setSaving(false);
        return;
      }
      if (isEdit && !data.password) delete data.password;
      if (!showClienteSelector) delete data.cliente_id;

      if (isEdit) {
        delete data.password;
        await adminService.actualizarUsuario(usuario.id, data);
        success('Usuario actualizado correctamente');
      } else {
        await adminService.crearUsuario(data);
        success('Usuario creado correctamente');
      }
      onSave();
    } catch (err) {
      const msg = err.message || 'Error al guardar';
      setError(msg);
      notifyError(msg);
    }
    setSaving(false);
  };

  const handleAsignarCliente = async () => {
    if (!clienteSeleccionado || !usuario?.id) return;
    setSavingAsignacion(true);
    try {
      await adminService.asignarCliente(usuario.id, Number(clienteSeleccionado));
      success('Cliente asignado');
      setClienteSeleccionado('');
      await cargarClientesAsignados();
    } catch (err) {
      notifyError(err.message || 'Error al asignar cliente');
    } finally {
      setSavingAsignacion(false);
    }
  };

  const handleRemoverCliente = async (clienteId) => {
    if (!usuario?.id) return;
    try {
      await adminService.removerClienteAsignado(usuario.id, clienteId);
      success('Asignación removida');
      await cargarClientesAsignados();
    } catch (err) {
      notifyError(err.message || 'Error al remover asignación');
    }
  };

  // Clientes disponibles para asignar (los que no están asignados aún)
  const asignadosIds = new Set(clientesAsignados.map((c) => c.cliente_id));
  const clientesDisponibles = clientes.filter((c) => !asignadosIds.has(c.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-centhrix-card rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-centhrix-surface"
          >
            <X className="w-5 h-5 text-slate-500" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Usuario *
              </label>
              <input
                name="username"
                aria-label="Usuario"
                value={form.username}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                placeholder="usuario123"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                aria-label="Email"
                value={form.email}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          {/* Password (solo en creación) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Contraseña *
              </label>
              <input
                name="password"
                type="text"
                aria-label="Contraseña"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Nombre
              </label>
              <input
                name="nombre"
                aria-label="Nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Apellido
              </label>
              <input
                name="apellido"
                aria-label="Apellido"
                value={form.apellido}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Teléfono
              </label>
              <input
                name="telefono"
                aria-label="Teléfono"
                value={form.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Cargo
              </label>
              <input
                name="cargo"
                aria-label="Cargo"
                value={form.cargo}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-centhrix-bg text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Rol *
            </label>
            <FilterDropdown
              options={[
                { value: '', label: 'Seleccionar rol...' },
                ...roles
                  .filter((r) => r.activo)
                  .map((r) => ({
                    value: String(r.id),
                    label: `${r.nombre} (Nivel ${r.nivel_jerarquia})`,
                  })),
              ]}
              value={String(form.rol_id || '')}
              onChange={(v) => {
                setForm((prev) => ({ ...prev, rol_id: v }));
                setError('');
              }}
            />
          </div>

          {/* Cliente (solo si el rol es de tipo cliente) */}
          {showClienteSelector && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                Cliente asociado *
              </label>
              <FilterDropdown
                options={[
                  { value: '', label: 'Seleccionar cliente...' },
                  ...clientes.map((c) => ({
                    value: String(c.id),
                    label: `${c.razon_social} (${c.codigo_cliente})`,
                  })),
                ]}
                value={String(form.cliente_id || '')}
                onChange={(v) => {
                  setForm((prev) => ({ ...prev, cliente_id: v }));
                  setError('');
                }}
              />
            </div>
          )}

          {/* Clientes asignados (supervisor / operador, solo en edición) */}
          {showAsignacionClientes && isEdit && (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" aria-hidden="true" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  Clientes asignados
                </span>
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  (solo verá datos de estos clientes)
                </span>
              </div>

              {/* Lista de asignados */}
              {loadingAsignados ? (
                <p className="text-xs text-slate-400 py-1">Cargando...</p>
              ) : clientesAsignados.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 py-1">
                  Sin restricción — ve todos los clientes
                </p>
              ) : (
                <ul className="space-y-1.5 max-h-36 overflow-y-auto">
                  {clientesAsignados.map((c) => (
                    <li
                      key={c.asignacion_id || c.cliente_id}
                      className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-centhrix-surface rounded-lg text-sm"
                    >
                      <span className="text-slate-700 dark:text-slate-200 truncate">
                        {c.razon_social}
                        <span className="ml-1.5 text-xs text-slate-400">({c.codigo_cliente})</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoverCliente(c.cliente_id)}
                        className="ml-2 p-1 text-red-400 hover:text-red-600 rounded"
                        aria-label={`Remover ${c.razon_social}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {/* Agregar cliente */}
              <div className="flex gap-2 items-center pt-1">
                <div className="flex-1">
                  <FilterDropdown
                    options={[
                      { value: '', label: 'Agregar cliente...' },
                      ...clientesDisponibles.map((c) => ({
                        value: String(c.id),
                        label: `${c.razon_social} (${c.codigo_cliente})`,
                      })),
                    ]}
                    value={clienteSeleccionado}
                    onChange={setClienteSeleccionado}
                    compact
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAsignarCliente}
                  disabled={!clienteSeleccionado || savingAsignacion}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-40 rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Asignar
                </button>
              </div>
            </div>
          )}

          {showAsignacionClientes && !isEdit && (
            <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-centhrix-surface px-3 py-2 rounded-lg">
              Podrás asignar clientes a este usuario después de crearlo.
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-centhrix-surface rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuarioForm;
