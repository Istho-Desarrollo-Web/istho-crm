/**
 * ============================================================================
 * ISTHO CRM - Modal de Cambio Obligatorio de Contraseña
 * ============================================================================
 * Se muestra cuando el usuario tiene requiere_cambio_password = true.
 * No se puede cerrar ni navegar hasta que cambie la contraseña.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { useState } from 'react';
import { Lock, Eye, EyeOff, Shield, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import authService from '../../api/auth.service';

const ForceChangePasswordModal = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    password_actual: '',
    password_nuevo: '',
    password_confirmar: '',
  });
  const [showPasswords, setShowPasswords] = useState({
    actual: false,
    nuevo: false,
    confirmar: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // No mostrar si no aplica
  if (!user?.requiere_cambio_password) return null;

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleShow = (field) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const validate = () => {
    if (!form.password_actual) return 'Ingresa tu contraseña temporal actual';
    if (!form.password_nuevo) return 'Ingresa la nueva contraseña';
    if (form.password_nuevo.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres';
    if (!/[A-Z]/.test(form.password_nuevo)) return 'Debe contener al menos una mayúscula';
    if (!/[a-z]/.test(form.password_nuevo)) return 'Debe contener al menos una minúscula';
    if (!/[0-9]/.test(form.password_nuevo)) return 'Debe contener al menos un número';
    if (form.password_nuevo !== form.password_confirmar) return 'Las contraseñas no coinciden';
    if (form.password_actual === form.password_nuevo) return 'La nueva contraseña debe ser diferente a la actual';
    return null;
  };

  const getPasswordStrength = () => {
    const pwd = form.password_nuevo;
    if (!pwd) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (pwd.length >= 12) score++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { level: score, label: 'Débil', color: 'bg-red-500' };
    if (score <= 3) return { level: score, label: 'Media', color: 'bg-amber-500' };
    return { level: score, label: 'Fuerte', color: 'bg-emerald-500' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await authService.changePassword({
        password_actual: form.password_actual,
        password_nuevo: form.password_nuevo,
        confirmar_password: form.password_confirmar,
      });

      if (result.success) {
        setSuccess(true);
        // Actualizar el estado del usuario para quitar el flag
        updateUser({ requiere_cambio_password: false });
      } else {
        setError(result.message || 'Error al cambiar la contraseña');
      }
    } catch {
      setError('Error al cambiar la contraseña. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const strength = getPasswordStrength();

  if (success) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
            Contraseña actualizada
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Tu contraseña ha sido cambiada exitosamente. Ya puedes usar el sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay - sin click para cerrar */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
        {/* Header compacto */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 text-center flex-shrink-0">
          <div className="w-10 h-10 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
            <Lock className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold text-white">
            Cambio de contraseña requerido
          </h2>
          <p className="text-orange-100 text-xs mt-0.5">
            Debes cambiar tu contraseña temporal antes de continuar
          </p>
        </div>

        {/* Formulario con scroll */}
        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto">
          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-400">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Contraseña actual */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Contraseña temporal actual
            </label>
            <div className="relative">
              <input
                type={showPasswords.actual ? 'text' : 'password'}
                value={form.password_actual}
                onChange={(e) => handleChange('password_actual', e.target.value)}
                placeholder="Ingresa la contraseña que recibiste"
                className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                autoFocus
              />
              <button
                type="button"
                onClick={() => toggleShow('actual')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPasswords.actual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Nueva contraseña */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.nuevo ? 'text' : 'password'}
                value={form.password_nuevo}
                onChange={(e) => handleChange('password_nuevo', e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => toggleShow('nuevo')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPasswords.nuevo ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {/* Indicador de fuerza */}
            {form.password_nuevo && (
              <div className="mt-1.5">
                <div className="flex gap-1 mb-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i <= strength.level ? strength.color : 'bg-slate-200 dark:bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-[11px] ${
                  strength.level <= 2 ? 'text-red-500' :
                  strength.level <= 3 ? 'text-amber-500' : 'text-emerald-500'
                }`}>
                  Seguridad: {strength.label}
                </p>
              </div>
            )}
          </div>

          {/* Confirmar contraseña */}
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Confirmar nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirmar ? 'text' : 'password'}
                value={form.password_confirmar}
                onChange={(e) => handleChange('password_confirmar', e.target.value)}
                placeholder="Repite la nueva contraseña"
                className="w-full px-3 py-2 pr-9 border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => toggleShow('confirmar')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                {showPasswords.confirmar ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {form.password_confirmar && form.password_nuevo !== form.password_confirmar && (
              <p className="text-xs text-red-500 mt-1">Las contraseñas no coinciden</p>
            )}
          </div>

          {/* Requisitos */}
          <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-2.5 space-y-0.5">
            <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-0.5">Requisitos:</p>
            {[
              { ok: form.password_nuevo.length >= 8, text: 'Mínimo 8 caracteres' },
              { ok: /[A-Z]/.test(form.password_nuevo), text: 'Al menos una mayúscula' },
              { ok: /[a-z]/.test(form.password_nuevo), text: 'Al menos una minúscula' },
              { ok: /[0-9]/.test(form.password_nuevo), text: 'Al menos un número' },
            ].map((req, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[11px]">
                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${
                  req.ok ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}>
                  {req.ok && <span className="text-white text-[7px]">✓</span>}
                </div>
                <span className={req.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}>
                  {req.text}
                </span>
              </div>
            ))}
          </div>

          {/* Botón submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-xl hover:from-orange-600 hover:to-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Cambiando...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                Cambiar contraseña
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordModal;
