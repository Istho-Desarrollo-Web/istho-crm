/**
 * ============================================================================
 * ISTHO CRM - Formulario Usuario Cliente
 * ============================================================================
 * Modal para crear o editar usuarios con acceso al portal de cliente.
 * Validación con React Hook Form + Yup.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 * @date Abril 2026
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  Key,
  Shield,
} from 'lucide-react';
import { Modal, Button } from '../../../components/common';
import { usuarioClienteSchema } from '../../../utils/validationSchemas';

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════════════════

const UsuarioClienteForm = ({
  isOpen,
  onClose,
  onSubmit,
  usuario = null,
  clienteNombre = '',
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [generarPassword, setGenerarPassword] = useState(true);

  const isEditing = Boolean(usuario);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(usuarioClienteSchema),
    defaultValues: { enviar_email: true },
  });

  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR DATOS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!isOpen) return;
    setGenerarPassword(true);

    if (usuario) {
      reset({
        nombre_completo: usuario.nombre_completo || '',
        email: usuario.email || '',
        telefono: usuario.telefono || '',
        cargo: usuario.cargo || '',
        password: '',
        enviar_email: true,
      });
    } else {
      reset({ nombre_completo: '', email: '', telefono: '', cargo: '', password: '', enviar_email: true });
    }
  }, [isOpen, usuario]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────────────
  // SUBMIT
  // ──────────────────────────────────────────────────────────────────────────

  const submitForm = async (data) => {
    // Validar contraseña manual (condicional: solo en creación con password manual)
    if (!isEditing && !generarPassword) {
      if (!data.password) {
        setError('password', { message: 'La contraseña es requerida' });
        return;
      }
      if (data.password.length < 8) {
        setError('password', { message: 'La contraseña debe tener al menos 8 caracteres' });
        return;
      }
    }

    const dataToSubmit = {
      nombre_completo: data.nombre_completo.trim(),
      email: data.email.trim().toLowerCase(),
      telefono: data.telefono?.trim() || null,
      cargo: data.cargo?.trim() || null,
      enviar_email: data.enviar_email,
    };

    if (!isEditing && !generarPassword && data.password) {
      dataToSubmit.password = data.password;
    }

    await onSubmit(dataToSubmit);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  const inputCls = (hasError) => `
    w-full px-4 py-2.5 pl-10 border rounded-xl text-sm
    focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500
    dark:bg-centhrix-card/50 dark:text-slate-100
    ${hasError ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700'}
  `.trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Usuario' : 'Crear Usuario de Portal'}
      size="md"
    >
      <form onSubmit={handleSubmit(submitForm)} className="space-y-5" noValidate>

        {/* Info del cliente */}
        {clienteNombre && (
          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800/30 rounded-xl">
            <p className="text-sm text-orange-700">
              <strong>Cliente:</strong> {clienteNombre}
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* INFORMACIÓN BÁSICA */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <User className="w-4 h-4" />
            Información del Usuario
          </h4>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('nombre_completo')}
                type="text"
                placeholder="Ej: María García López"
                className={inputCls(!!errors.nombre_completo)}
              />
            </div>
            {errors.nombre_completo && (
              <p className="text-xs text-red-500 mt-1">{errors.nombre_completo.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                {...register('email')}
                type="email"
                placeholder="usuario@empresa.com"
                disabled={isEditing}
                className={`${inputCls(!!errors.email)} ${isEditing ? 'bg-slate-50 dark:bg-centhrix-card cursor-not-allowed' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
            )}
            {isEditing && (
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                El email no se puede modificar
              </p>
            )}
          </div>

          {/* Teléfono y Cargo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('telefono')}
                  type="tel"
                  placeholder="300 123 4567"
                  className={inputCls(false)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Cargo
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  {...register('cargo')}
                  type="text"
                  placeholder="Ej: Coordinador Logístico"
                  className={inputCls(false)}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CONTRASEÑA (solo en creación) */}
        {/* ════════════════════════════════════════════════════════════════ */}

        {!isEditing && (
          <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-slate-700">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Acceso al Portal
            </h4>

            {/* Toggle generar automático */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-centhrix-surface/30">
              <input
                type="checkbox"
                checked={generarPassword}
                onChange={(e) => setGenerarPassword(e.target.checked)}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Generar contraseña automáticamente
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Se enviará una contraseña segura por email
                </p>
              </div>
            </label>

            {/* Campo contraseña manual */}
            {!generarPassword && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 8 caracteres"
                    className={`${inputCls(!!errors.password)} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>
            )}

            {/* Enviar email */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-50 dark:hover:bg-centhrix-surface/30">
              <input
                {...register('enviar_email')}
                type="checkbox"
                className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
              />
              <div>
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Enviar email de bienvenida
                </span>
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  El usuario recibirá sus credenciales por correo
                </p>
              </div>
            </label>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* NOTA INFORMATIVA */}
        {/* ════════════════════════════════════════════════════════════════ */}

        {!isEditing && (
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Permisos del usuario</p>
                <p className="mt-1 text-blue-600">
                  Por defecto, el usuario tendrá permisos básicos de visualización.
                  Podrás personalizar los permisos después de crear el usuario.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* ACCIONES */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>
            {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UsuarioClienteForm;
