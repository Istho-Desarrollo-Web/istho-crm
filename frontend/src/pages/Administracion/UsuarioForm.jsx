/**
 * ISTHO CRM - Formulario de Usuario (Modal)
 *
 * Crear/editar usuarios del sistema.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import adminService from '../../api/admin.service';
import clientesService from '../../api/clientes.service';

const UsuarioForm = ({ usuario, roles, onSave, onClose }) => {
  const isEdit = !!usuario;

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
    clientesService.getAll({ limit: 100, estado: 'activo' }).then(res => {
      // res.data es array directo de clientes (paginated response)
      const lista = Array.isArray(res.data) ? res.data : (res.data?.clientes || []);
      setClientes(lista);
    }).catch(() => {});
  }, []);

  const selectedRol = roles.find(r => r.id === Number(form.rol_id));
  const showClienteSelector = selectedRol?.es_cliente;

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
      // Don't send empty password on edit
      if (isEdit && !data.password) delete data.password;
      if (!showClienteSelector) delete data.cliente_id;

      if (isEdit) {
        delete data.username; // username can't be changed
        delete data.password; // use reset-password instead
        await adminService.actualizarUsuario(usuario.id, data);
      } else {
        await adminService.crearUsuario(data);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Error al guardar');
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
            {isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-5 h-5 text-slate-500" />
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
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Usuario *</label>
              <input
                name="username"
                value={form.username}
                onChange={handleChange}
                disabled={isEdit}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                placeholder="usuario123"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Email *</label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                placeholder="correo@ejemplo.com"
              />
            </div>
          </div>

          {/* Password (solo en creación) */}
          {!isEdit && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Contraseña *</label>
              <input
                name="password"
                type="text"
                value={form.password}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Nombre</label>
              <input
                name="nombre"
                value={form.nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Apellido</label>
              <input
                name="apellido"
                value={form.apellido}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Teléfono</label>
              <input
                name="telefono"
                value={form.telefono}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cargo</label>
              <input
                name="cargo"
                value={form.cargo}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Rol */}
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Rol *</label>
            <select
              name="rol_id"
              value={form.rol_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
            >
              <option value="">Seleccionar rol...</option>
              {roles.filter(r => r.activo).map(r => (
                <option key={r.id} value={r.id}>{r.nombre} (Nivel {r.nivel_jerarquia})</option>
              ))}
            </select>
          </div>

          {/* Cliente (solo si el rol es de tipo cliente) */}
          {showClienteSelector && (
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Cliente asociado *</label>
              <select
                name="cliente_id"
                value={form.cliente_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200"
              >
                <option value="">Seleccionar cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.razon_social} ({c.codigo_cliente})</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl disabled:opacity-50 transition-colors"
            >
              {saving ? 'Guardando...' : (isEdit ? 'Actualizar' : 'Crear Usuario')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UsuarioForm;
