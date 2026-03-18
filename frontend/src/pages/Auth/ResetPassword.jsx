/**
 * ============================================================================
 * ISTHO CRM - Página de Restablecer Contraseña
 * ============================================================================
 * Página para establecer una nueva contraseña usando el token de recuperación.
 * Diseño moderno consistente con Login y ForgotPassword.
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 */

import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    CheckCircle,
    Loader2,
    KeyRound,
    ArrowLeft,
    Shield,
} from 'lucide-react';
import { useSnackbar } from 'notistack';
import authService from '../../api/auth.service';
import logoNegro from '../../assets/logo-negro.png';
import logoBlanco from '../../assets/logo-blanco.png';

// ============================================================================
// ESTILOS CSS (animaciones)
// ============================================================================

const styles = `
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
@keyframes slideUp {
    from { opacity: 0; transform: translateY(24px); }
    to { opacity: 1; transform: translateY(0); }
}
@keyframes scaleIn {
    from { opacity: 0; transform: scale(0.8); }
    to { opacity: 1; transform: scale(1); }
}
@keyframes pulse-glow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50% { box-shadow: 0 0 0 12px rgba(34, 197, 94, 0); }
}
.animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
.animate-slideUp { animation: slideUp 0.6s ease-out forwards; }
.animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
.animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
`;

// ============================================================================
// PASSWORD STRENGTH HELPER
// ============================================================================

const getPasswordStrength = (password) => {
    if (!password) return { score: 0, label: '', color: '' };

    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 1) return { score: 1, label: 'Débil', color: 'bg-red-500' };
    if (score <= 2) return { score: 2, label: 'Regular', color: 'bg-orange-500' };
    if (score <= 3) return { score: 3, label: 'Buena', color: 'bg-yellow-500' };
    if (score <= 4) return { score: 4, label: 'Fuerte', color: 'bg-green-400' };
    return { score: 5, label: 'Muy fuerte', color: 'bg-green-600' };
};

// ============================================================================
// COMPONENTE
// ============================================================================

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const passwordStrength = useMemo(
        () => getPasswordStrength(formData.password),
        [formData.password]
    );

    const passwordsMatch =
        formData.confirmPassword.length > 0 &&
        formData.password === formData.confirmPassword;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!token) {
            enqueueSnackbar('Token inválido o expirado', { variant: 'error' });
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            enqueueSnackbar('Las contraseñas no coinciden', { variant: 'error' });
            return;
        }

        if (formData.password.length < 6) {
            enqueueSnackbar('La contraseña debe tener al menos 6 caracteres', { variant: 'warning' });
            return;
        }

        setLoading(true);

        try {
            const response = await authService.resetPassword(token, formData.password);

            if (response.success) {
                setSuccess(true);
                enqueueSnackbar('Contraseña restablecida exitosamente', { variant: 'success' });
                setTimeout(() => navigate('/login'), 3000);
            } else {
                enqueueSnackbar(response.message || 'Error al restablecer la contraseña', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error en reset password:', error);
            enqueueSnackbar('Error de conexión. Intente nuevamente', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // TOKEN INVÁLIDO
    // ──────────────────────────────────────────────────────────────────────────

    if (!token) {
        return (
            <>
                <style>{styles}</style>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 border border-gray-100 dark:border-slate-800 p-8 text-center animate-slideUp">
                        {/* Logo */}
                        <div className="mb-6">
                            <img
                                src={logoNegro}
                                alt="ISTHO"
                                className="w-14 h-14 rounded-2xl shadow-lg mx-auto dark:hidden"
                            />
                            <img
                                src={logoBlanco}
                                alt="ISTHO"
                                className="w-14 h-14 rounded-2xl shadow-lg mx-auto hidden dark:block"
                            />
                        </div>

                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle size={32} />
                        </div>

                        <h2 className="text-xl font-bold text-red-600 dark:text-red-400 mb-2">
                            Enlace Inválido
                        </h2>
                        <p className="text-gray-600 dark:text-slate-400 mb-6">
                            El enlace de recuperación no es válido o ha expirado. Por favor, solicita uno nuevo.
                        </p>

                        <Link
                            to="/forgot-password"
                            className="inline-flex items-center text-[#E65100] dark:text-orange-400 font-medium hover:text-[#BF360C] dark:hover:text-orange-300 transition-colors"
                        >
                            <ArrowLeft size={18} className="mr-2" />
                            Solicitar nuevo enlace
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-gray-400 dark:text-slate-600 text-xs">
                            ISTHO S.A.S. &copy; {new Date().getFullYear()} - Centro Logístico Industrial del Norte
                        </p>
                    </div>
                </div>
            </>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // ÉXITO
    // ──────────────────────────────────────────────────────────────────────────

    if (success) {
        return (
            <>
                <style>{styles}</style>
                <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
                    <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 border border-gray-100 dark:border-slate-800 p-8 text-center animate-slideUp">
                        {/* Logo */}
                        <div className="mb-6">
                            <img
                                src={logoNegro}
                                alt="ISTHO"
                                className="w-14 h-14 rounded-2xl shadow-lg mx-auto dark:hidden"
                            />
                            <img
                                src={logoBlanco}
                                alt="ISTHO"
                                className="w-14 h-14 rounded-2xl shadow-lg mx-auto hidden dark:block"
                            />
                        </div>

                        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-scaleIn animate-pulse-glow">
                            <CheckCircle size={40} />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Contraseña Actualizada
                        </h2>
                        <p className="text-gray-600 dark:text-slate-400 mb-2">
                            Tu contraseña ha sido restablecida exitosamente.
                        </p>
                        <p className="text-sm text-gray-500 dark:text-slate-500 mb-8">
                            Serás redirigido al inicio de sesión en unos segundos...
                        </p>

                        <Link
                            to="/login"
                            className="inline-flex items-center justify-center w-full py-3 px-4 rounded-xl font-semibold text-white
                                bg-gradient-to-r from-[#E65100] to-[#FF6D00] hover:from-[#BF360C] hover:to-[#E65100]
                                focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:ring-offset-2
                                transition-all duration-200 shadow-lg shadow-orange-500/25"
                        >
                            Ir al Inicio de Sesión
                        </Link>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-gray-400 dark:text-slate-600 text-xs">
                            ISTHO S.A.S. &copy; {new Date().getFullYear()} - Centro Logístico Industrial del Norte
                        </p>
                        <p className="text-gray-400 dark:text-slate-700 text-[11px] mt-0.5">
                            Girardota, Antioquia &bull; ISO 9001:2015
                        </p>
                    </div>
                </div>
            </>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // FORMULARIO PRINCIPAL
    // ──────────────────────────────────────────────────────────────────────────

    return (
        <>
            <style>{styles}</style>
            <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-gray-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/20 border border-gray-100 dark:border-slate-800 overflow-hidden animate-slideUp">
                    <div className="p-8">
                        {/* Logo */}
                        <div className="text-center mb-6">
                            <img
                                src={logoNegro}
                                alt="ISTHO"
                                className="w-14 h-14 rounded-2xl shadow-lg mx-auto mb-4 dark:hidden"
                            />
                            <img
                                src={logoBlanco}
                                alt="ISTHO"
                                className="w-14 h-14 rounded-2xl shadow-lg mx-auto mb-4 hidden dark:block"
                            />
                        </div>

                        {/* Icon + Title */}
                        <div className="text-center mb-8">
                            <div className="w-14 h-14 bg-orange-100 dark:bg-orange-900/30 text-[#E65100] dark:text-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <KeyRound size={28} />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                                Nueva Contraseña
                            </h1>
                            <p className="text-gray-500 dark:text-slate-400">
                                Ingresa y confirma tu nueva contraseña para restablecer el acceso a tu cuenta.
                            </p>
                        </div>

                        {/* Security note */}
                        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-start gap-3">
                            <Shield size={18} className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                Tu contraseña debe tener al menos 6 caracteres. Te recomendamos usar mayúsculas, números y caracteres especiales.
                            </p>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* New Password */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                                >
                                    Nueva Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-400 dark:text-slate-500" />
                                    </div>
                                    <input
                                        id="password"
                                        name="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="w-full pl-12 pr-12 py-3 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500
                                            focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 focus:border-[#E65100]
                                            transition-all duration-200 border-gray-200 dark:border-slate-700"
                                        placeholder="••••••••"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Password Strength Indicator */}
                                {formData.password.length > 0 && (
                                    <div className="mt-2 animate-fadeIn">
                                        <div className="flex gap-1 mb-1">
                                            {[1, 2, 3, 4, 5].map((level) => (
                                                <div
                                                    key={level}
                                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                        level <= passwordStrength.score
                                                            ? passwordStrength.color
                                                            : 'bg-gray-200 dark:bg-slate-700'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                        <p className={`text-xs transition-colors ${
                                            passwordStrength.score <= 1
                                                ? 'text-red-500'
                                                : passwordStrength.score <= 2
                                                    ? 'text-orange-500'
                                                    : passwordStrength.score <= 3
                                                        ? 'text-yellow-600 dark:text-yellow-400'
                                                        : 'text-green-600 dark:text-green-400'
                                        }`}>
                                            Seguridad: {passwordStrength.label}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label
                                    htmlFor="confirmPassword"
                                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                                >
                                    Confirmar Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock size={18} className="text-gray-400 dark:text-slate-500" />
                                    </div>
                                    <input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={`w-full pl-12 pr-12 py-3 rounded-xl border bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500
                                            focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 focus:border-[#E65100]
                                            transition-all duration-200
                                            ${formData.confirmPassword.length > 0 && !passwordsMatch
                                                ? 'border-red-300 dark:border-red-700'
                                                : passwordsMatch
                                                    ? 'border-green-300 dark:border-green-700'
                                                    : 'border-gray-200 dark:border-slate-700'
                                            }`}
                                        placeholder="••••••••"
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>

                                {/* Match indicator */}
                                {formData.confirmPassword.length > 0 && (
                                    <div className="mt-2 flex items-center gap-1 animate-fadeIn">
                                        {passwordsMatch ? (
                                            <>
                                                <CheckCircle size={14} className="text-green-500" />
                                                <span className="text-xs text-green-600 dark:text-green-400">Las contraseñas coinciden</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertCircle size={14} className="text-red-500" />
                                                <span className="text-xs text-red-600 dark:text-red-400">Las contraseñas no coinciden</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 px-4 rounded-xl font-semibold text-white
                                    bg-gradient-to-r from-[#E65100] to-[#FF6D00]
                                    hover:from-[#BF360C] hover:to-[#E65100]
                                    focus:outline-none focus:ring-2 focus:ring-[#E65100] focus:ring-offset-2
                                    transition-all duration-200
                                    disabled:opacity-70 disabled:cursor-not-allowed
                                    flex items-center justify-center gap-2
                                    shadow-lg shadow-orange-500/25
                                    active:scale-[0.98]"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Restableciendo...</span>
                                    </>
                                ) : (
                                    <>
                                        <KeyRound size={18} />
                                        <span>Restablecer Contraseña</span>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Back to login */}
                        <div className="mt-6 text-center">
                            <Link
                                to="/login"
                                className="inline-flex items-center text-sm text-gray-500 dark:text-slate-500 hover:text-[#E65100] dark:hover:text-orange-400 transition-colors"
                            >
                                <ArrowLeft size={16} className="mr-1" />
                                Volver al inicio de sesión
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-gray-400 dark:text-slate-600 text-xs">
                        ISTHO S.A.S. &copy; {new Date().getFullYear()} - Centro Logístico Industrial del Norte
                    </p>
                    <p className="text-gray-400 dark:text-slate-700 text-[11px] mt-0.5">
                        Girardota, Antioquia &bull; ISO 9001:2015
                    </p>
                </div>
            </div>
        </>
    );
};

export default ResetPassword;
