/**
 * ============================================================================
 * ISTHO CRM - Formulario Usuario Cliente
 * ============================================================================
 * Modal para crear o editar usuarios con acceso al portal de cliente.
 * 
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 * @date Enero 2026
 */

import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Eye,
  EyeOff,
  Key,
  Shield,
  AlertCircle,
} from 'lucide-react';

// Components
import { Modal, Button, Input } from '../../../components/common';

// ════════════════════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════════════════════

const PERMISOS_DEFAULT = {
  inventario: { ver: true, exportar: false, alertas: true },
  despachos: { ver: true, crear_solicitud: false, descargar_documentos: true },
  reportes: { ver: true, descargar: false },
  facturacion: { ver: true, descargar: true },
  perfil: { editar: true, cambiar_password: true }
};

const INITIAL_FORM_STATE = {
  nombre_completo: '',
  email: '',
  telefono: '',
  cargo: '',
  password: '',
  enviar_email: true,
  permisos_cliente: PERMISOS_DEFAULT
};

// ════════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ════════════════════════════════════════════════════════════════════════════

const UsuarioClienteForm = ({
  isOpen,
  onClose,
  onSubmit,
  usuario = null,
  clienteNombre = ''
}) => {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generarPassword, setGenerarPassword] = useState(true);

  const isEditing = Boolean(usuario);

  // ──────────────────────────────────────────────────────────────────────────
  // EFFECTS
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      if (usuario) {
        // Modo edición
        setFormData({
          nombre_completo: usuario.nombre_completo || '',
          email: usuario.email || '',
          telefono: usuario.telefono || '',
          cargo: usuario.cargo || '',
          password: '',
          enviar_email: true,
          permisos_cliente: usuario.permisos_cliente || PERMISOS_DEFAULT
        });
        setGenerarPassword(true);
      } else {
        // Modo creación
        setFormData(INITIAL_FORM_STATE);
        setGenerarPassword(true);
      }
      setErrors({});
    }
  }, [isOpen, usuario]);

  // ──────────────────────────────────────────────────────────────────────────
  // HANDLERS
  // ──────────────────────────────────────────────────────────────────────────

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Limpiar error del campo
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nombre_completo.trim()) {
      newErrors.nombre_completo = 'El nombre es requerido';
    } else if (formData.nombre_completo.length < 3) {
      newErrors.nombre_completo = 'El nombre debe tener al menos 3 caracteres';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'El email es requerido';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (!isEditing && !generarPassword && !formData.password) {
      newErrors.password = 'La contraseña es requerida';
    } else if (!isEditing && !generarPassword && formData.password.length < 8) {
      newErrors.password = 'La contraseña debe tener al menos 8 caracteres';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const dataToSubmit = {
        nombre_completo: formData.nombre_completo.trim(),
        email: formData.email.trim().toLowerCase(),
        telefono: formData.telefono.trim() || null,
        cargo: formData.cargo.trim() || null,
        enviar_email: formData.enviar_email
      };

      // Solo enviar password si no es autogenerado y es creación
      if (!isEditing && !generarPassword && formData.password) {
        dataToSubmit.password = formData.password;
      }

      await onSubmit(dataToSubmit);
    } catch (err) {
      // El error lo maneja el componente padre
    } finally {
      setLoading(false);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Editar Usuario' : 'Crear Usuario de Portal'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Info del cliente */}
        {clienteNombre && (
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl">
            <p className="text-sm text-orange-700">
              <strong>Cliente:</strong> {clienteNombre}
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* INFORMACIÓN BÁSICA */}
        {/* ════════════════════════════════════════════════════════════════ */}

        <div className="space-y-4">
          <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4" />
            Información del Usuario
          </h4>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                name="nombre_completo"
                value={formData.nombre_completo}
                onChange={handleChange}
                placeholder="Ej: María García López"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.nombre_completo ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
              />
            </div>
            {errors.nombre_completo && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.nombre_completo}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="usuario@empresa.com"
                disabled={isEditing} // No permitir cambiar email en edición
                className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  } ${isEditing ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.email}
              </p>
            )}
            {isEditing && (
              <p className="text-xs text-slate-400 mt-1">
                El email no se puede modificar
              </p>
            )}
          </div>

          {/* Teléfono y Cargo en grid */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Teléfono
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChange}
                  placeholder="300 123 4567"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Cargo
              </label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChange}
                  placeholder="Ej: Coordinador Logístico"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════ */}
        {/* CONTRASEÑA (solo en creación) */}
        {/* ════════════════════════════════════════════════════════════════ */}

        {!isEditing && (
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h4 className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Acceso al Portal
            </h4>

            {/* Toggle generar automático */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={generarPassword}
                onChange={(e) => setGenerarPassword(e.target.checked)}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">
                  Generar contraseña automáticamente
                </span>
                <p className="text-xs text-slate-400">
                  Se enviará una contraseña segura por email
                </p>
              </div>
            </label>

            {/* Campo contraseña manual */}
            {!generarPassword && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Contraseña <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Mínimo 8 caracteres"
                    className={`w-full pl-10 pr-12 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {errors.password}
                  </p>
                )}
              </div>
            )}

            {/* Enviar email */}
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                name="enviar_email"
                checked={formData.enviar_email}
                onChange={handleChange}
                className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
              />
              <div>
                <span className="text-sm font-medium text-slate-700">
                  Enviar email de bienvenida
                </span>
                <p className="text-xs text-slate-400">
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
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
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

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UsuarioClienteForm;