/**
 * ============================================================================
 * ISTHO CRM - ContactoForm Component
 * ============================================================================
 * Modal para crear y editar contactos del Directorio.
 * Validación con React Hook Form + Controller.
 *
 * @author Coordinación TI ISTHO
 * @version 1.0.0
 * @date Junio 2026
 */

import { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { X, Save, Loader2, User, Phone, Mail, FileText, Bell, Link, Search, XCircle } from 'lucide-react';
import { FilterDropdown } from '@components/common';
import useNotification from '@hooks/useNotification';
import contactosService from '@api/contactos.service';
import adminService from '@api/admin.service';

// ============================================================================
// CONSTANTES
// ============================================================================

const TIPOS_CONTACTO = [
  { value: 'externo', label: 'Externo' },
  { value: 'istho', label: 'ISTHO' },
];

const TIPOS_NOTIFICACION = [
  { value: 'ingreso', label: 'Ingreso' },
  { value: 'salida', label: 'Salida' },
  { value: 'kardex', label: 'Kardex' },
  { value: 'todas', label: 'Todas' },
];

const VALORES_POR_DEFECTO = {
  tipo: 'externo',
  vincular_usuario: false,
  usuario_id: '',
  nombre: '',
  cargo: '',
  telefono: '',
  celular: '',
  email: '',
  recibe_notificaciones: true,
  tipos_notificacion: ['todas'],
  notas: '',
};

// ============================================================================
// HELPERS
// ============================================================================

const InputField = ({ label, icon: Icon, required, error, children }) => (
  <div className="space-y-1">
    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-4 w-4 text-slate-400" />
        </div>
      )}
      {children}
    </div>
    {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
  </div>
);

const inputCls = (hasIcon = false, hasError = false) =>
  [
    'w-full px-3 py-2',
    'bg-white dark:bg-centhrix-surface border rounded-lg',
    'text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500',
    'focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500',
    'transition-all duration-200',
    hasError ? 'border-red-300 dark:border-red-500' : 'border-slate-200 dark:border-slate-600',
    hasIcon ? 'pl-9' : '',
  ]
    .filter(Boolean)
    .join(' ');

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

// ============================================================================
// SUBCOMPONENTE: buscador de usuarios CRM
// ============================================================================

const BuscadorUsuarioCRM = ({ value, onChange, onUsuarioSeleccionado }) => {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState([]);
  const [buscando, setBuscando] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const [usuarioSel, setUsuarioSel] = useState(null);
  const debounceRef = useRef(null);
  const wrapperRef = useRef(null);

  // Carga el usuario seleccionado cuando llega un value externo (modo edición)
  useEffect(() => {
    if (value && !usuarioSel) {
      adminService.getUsuario(value).then((res) => {
        const u = res?.data ?? res;
        if (u?.id) setUsuarioSel(u);
      }).catch(() => {});
    }
    if (!value) {
      setUsuarioSel(null);
      setTexto('');
    }
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cerrar al clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const buscar = (q) => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) { setResultados([]); setAbierto(false); return; }
    debounceRef.current = setTimeout(async () => {
      setBuscando(true);
      try {
        const res = await adminService.getUsuarios({ search: q, limit: 8 });
        const rows = res?.data?.usuarios ?? res?.data?.rows ?? [];
        setResultados(Array.isArray(rows) ? rows : []);
        setAbierto(true);
      } catch {
        setResultados([]);
      } finally {
        setBuscando(false);
      }
    }, 350);
  };

  const seleccionar = (u) => {
    setUsuarioSel(u);
    setTexto('');
    setAbierto(false);
    onChange(u.id);
    onUsuarioSeleccionado?.(u);
  };

  const limpiar = () => {
    setUsuarioSel(null);
    setTexto('');
    setResultados([]);
    onChange('');
    onUsuarioSeleccionado?.(null);
  };

  if (usuarioSel) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-centhrix-surface border border-red-300 dark:border-red-600 rounded-lg">
        <div className="h-7 w-7 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-red-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{usuarioSel.nombre_completo}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{usuarioSel.username} · ID {usuarioSel.id}</p>
        </div>
        <button type="button" onClick={limpiar} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
          <XCircle className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {buscando ? <Loader2 className="h-4 w-4 text-slate-400 animate-spin" /> : <Search className="h-4 w-4 text-slate-400" />}
        </div>
        <input
          type="text"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); buscar(e.target.value); }}
          onFocus={() => resultados.length > 0 && setAbierto(true)}
          placeholder="Buscar por nombre, usuario o email..."
          className="w-full pl-9 pr-3 py-2 bg-white dark:bg-centhrix-surface border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
        />
      </div>
      {abierto && resultados.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {resultados.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => seleccionar(u)}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 dark:hover:bg-centhrix-surface text-left transition-colors"
              >
                <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">{u.nombre_completo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{u.username} · {u.email}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {abierto && !buscando && resultados.length === 0 && texto.trim().length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-centhrix-card border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
          Sin resultados para "{texto}"
        </div>
      )}
    </div>
  );
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

const ContactoForm = ({ open, onClose, contacto = null, onSuccess }) => {
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [vincularUsuario, setVincularUsuario] = useState(false);

  const isEditing = !!contacto;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: VALORES_POR_DEFECTO,
  });

  const recibeNotificaciones = watch('recibe_notificaciones');
  const tiposNotificacion = watch('tipos_notificacion') || [];

  // ──────────────────────────────────────────────────────────────────────────
  // EFECTOS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) return;

    if (contacto) {
      setVincularUsuario(!!contacto.usuario_id);
      reset({
        tipo: contacto.tipo || 'externo',
        vincular_usuario: !!contacto.usuario_id,
        usuario_id: contacto.usuario_id ?? '',
        nombre: contacto.nombre || '',
        cargo: contacto.cargo || '',
        telefono: contacto.telefono || '',
        celular: contacto.celular || '',
        email: contacto.email || '',
        recibe_notificaciones: contacto.recibe_notificaciones ?? true,
        tipos_notificacion: Array.isArray(contacto.tipos_notificacion)
          ? contacto.tipos_notificacion
          : ['todas'],
        notas: contacto.notas || '',
      });
    } else {
      setVincularUsuario(false);
      reset(VALORES_POR_DEFECTO);
    }
  }, [open, contacto]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // MANEJADORES
  // ──────────────────────────────────────────────────────────────────────────

  const handleToggleVincular = () => {
    const next = !vincularUsuario;
    setVincularUsuario(next);
    if (!next) {
      setValue('usuario_id', '');
    }
  };

  const handleUsuarioSeleccionado = (u) => {
    if (!u) return;
    if (u.nombre_completo) setValue('nombre', u.nombre_completo);
    if (u.cargo)           setValue('cargo', u.cargo);
    if (u.telefono)        setValue('telefono', u.telefono);
    if (u.celular)         setValue('celular', u.celular);
    if (u.email)           setValue('email', u.email);
  };

  const handleToggleNotificacion = (valor) => {
    const actuales = tiposNotificacion || [];
    if (actuales.includes(valor)) {
      setValue('tipos_notificacion', actuales.filter((v) => v !== valor));
    } else {
      setValue('tipos_notificacion', [...actuales, valor]);
    }
  };

  const onSubmit = async (data) => {
    // Limpiar campos no relevantes
    const payload = {
      tipo: data.tipo,
      nombre: data.nombre,
      cargo: data.cargo || null,
      telefono: data.telefono || null,
      celular: data.celular || null,
      email: data.email || null,
      recibe_notificaciones: data.recibe_notificaciones,
      tipos_notificacion: data.recibe_notificaciones ? data.tipos_notificacion : [],
      notas: data.notas || null,
      usuario_id: vincularUsuario && data.usuario_id ? Number(data.usuario_id) : null,
    };

    try {
      const resultado = isEditing
        ? await contactosService.update(contacto.id, payload)
        : await contactosService.create(payload);

      notifySuccess(isEditing ? 'Contacto actualizado' : 'Contacto guardado');
      onSuccess?.(resultado);
      onClose();
    } catch (err) {
      notifyError(err.message || 'Error al guardar');
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div
        className="bg-white dark:bg-centhrix-card rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contacto-form-title"
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700 shrink-0">
          <div>
            <h2
              id="contacto-form-title"
              className="text-base font-semibold text-slate-800 dark:text-slate-100"
            >
              {isEditing ? 'Editar contacto' : 'Nuevo contacto'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isEditing ? `Editando: ${contacto.nombre}` : 'Complete los datos del contacto'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <form
          id="contacto-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="px-6 py-5 flex-1 space-y-4"
        >
          {/* 1. Tipo */}
          <InputField label="Tipo de contacto">
            <Controller
              name="tipo"
              control={control}
              render={({ field }) => (
                <FilterDropdown
                  options={TIPOS_CONTACTO}
                  value={field.value || 'externo'}
                  onChange={(v) => field.onChange(v)}
                />
              )}
            />
          </InputField>

          {/* 2. Toggle vincular usuario CRM */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-centhrix-surface rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Link className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Vincular a usuario CRM
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleVincular}
              className={`
                relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                ${vincularUsuario ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}
              `}
              aria-pressed={vincularUsuario}
            >
              <span
                className={`
                  inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                  ${vincularUsuario ? 'translate-x-[18px]' : 'translate-x-0.5'}
                `}
              />
            </button>
          </div>

          {/* 2b. Buscador de usuario CRM si el toggle está activo */}
          {vincularUsuario && (
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Usuario CRM vinculado
              </label>
              <Controller
                name="usuario_id"
                control={control}
                render={({ field }) => (
                  <BuscadorUsuarioCRM
                    value={field.value}
                    onChange={(v) => field.onChange(v)}
                    onUsuarioSeleccionado={handleUsuarioSeleccionado}
                  />
                )}
              />
            </div>
          )}

          {/* 3. Nombre */}
          <InputField
            label="Nombre completo"
            icon={User}
            required
            error={errors.nombre?.message}
          >
            <input
              {...register('nombre', {
                required: 'El nombre es requerido',
                minLength: { value: 2, message: 'Mínimo 2 caracteres' },
              })}
              type="text"
              placeholder="Nombre completo"
              maxLength={150}
              className={inputCls(true, !!errors.nombre)}
            />
          </InputField>

          {/* 4. Cargo */}
          <InputField label="Cargo" icon={FileText} error={errors.cargo?.message}>
            <input
              {...register('cargo')}
              type="text"
              placeholder="Cargo o posición"
              maxLength={100}
              className={inputCls(true, !!errors.cargo)}
            />
          </InputField>

          {/* 5–6. Teléfono y celular en fila */}
          <div className="grid grid-cols-2 gap-3">
            <InputField label="Teléfono" icon={Phone} error={errors.telefono?.message}>
              <input
                {...register('telefono')}
                type="text"
                placeholder="Teléfono fijo"
                maxLength={20}
                className={inputCls(true, !!errors.telefono)}
              />
            </InputField>

            <InputField label="Celular" icon={Phone} error={errors.celular?.message}>
              <input
                {...register('celular')}
                type="text"
                placeholder="Celular / WhatsApp"
                maxLength={20}
                className={inputCls(true, !!errors.celular)}
              />
            </InputField>
          </div>

          {/* 7. Email */}
          <InputField label="Email" icon={Mail} error={errors.email?.message}>
            <input
              {...register('email')}
              type="email"
              placeholder="correo@empresa.com"
              maxLength={150}
              className={inputCls(true, !!errors.email)}
            />
          </InputField>

          {/* 8. Recibe notificaciones */}
          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-centhrix-surface rounded-lg border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-500" />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Recibe notificaciones
              </span>
            </div>
            <Controller
              name="recibe_notificaciones"
              control={control}
              render={({ field }) => (
                <button
                  type="button"
                  onClick={() => field.onChange(!field.value)}
                  className={`
                    relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none
                    ${field.value ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600'}
                  `}
                  aria-pressed={field.value}
                >
                  <span
                    className={`
                      inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
                      ${field.value ? 'translate-x-[18px]' : 'translate-x-0.5'}
                    `}
                  />
                </button>
              )}
            />
          </div>

          {/* 9. Tipos de notificación (solo si recibe_notificaciones = true) */}
          {recibeNotificaciones && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Tipos de notificación
              </label>
              <div className="flex flex-wrap gap-2">
                {TIPOS_NOTIFICACION.map((tipo) => {
                  const seleccionado = tiposNotificacion.includes(tipo.value);
                  return (
                    <button
                      key={tipo.value}
                      type="button"
                      onClick={() => handleToggleNotificacion(tipo.value)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium border transition-all
                        ${
                          seleccionado
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-white dark:bg-centhrix-surface text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-600 hover:border-red-400'
                        }
                      `}
                      aria-pressed={seleccionado}
                    >
                      {tipo.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 10. Notas */}
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Notas
            </label>
            <textarea
              {...register('notas')}
              rows={3}
              placeholder="Observaciones adicionales..."
              maxLength={500}
              className={inputCls(false, false) + ' resize-none'}
            />
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-centhrix-surface border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="contacto-form"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#E74C3C] hover:bg-[#C0392B] rounded-lg transition-colors disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSubmitting ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContactoForm;
