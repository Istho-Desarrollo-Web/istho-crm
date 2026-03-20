/**
 * ============================================================================
 * ISTHO CRM - Página de Login
 * ============================================================================
 * Página de inicio de sesión con diseño corporativo ISTHO.
 * Incluye validación de formulario con React Hook Form + Yup.
 *
 * @author Coordinación TI ISTHO
 * @version 2.0.0
 * @date Marzo 2026
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useAuth } from '../../context/AuthContext';
import { getGreeting } from '../../utils/greeting';
import logoNegro from '../../assets/logo-negro.png';
import logoBlanco from '../../assets/logo-blanco.png';
import {
    User,
    Lock,
    Eye,
    EyeOff,
    AlertCircle,
    Loader2,
    Truck,
    Package,
    BarChart3,
    Users,
    Shield,
    ArrowRight,
} from 'lucide-react';

// ============================================================================
// ANIMACIONES
// ============================================================================

const fadeIn = { animation: 'fadeIn 0.6s ease-out' };
const slideUp = { animation: 'slideUp 0.5s ease-out' };

// ============================================================================
// ESQUEMA DE VALIDACIÓN
// ============================================================================

const loginSchema = yup.object({
    email: yup
        .string()
        .required('El usuario o email es requerido'),
    password: yup
        .string()
        .required('La contraseña es requerida')
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

// ============================================================================
// FEATURES DEL PANEL DERECHO
// ============================================================================

const features = [
    { icon: Truck, text: 'Gestión de Transporte', color: '#2ECC71', bgColor: 'rgba(46, 204, 113, 0.2)' },
    { icon: Package, text: 'Control de Inventario', color: '#3498DB', bgColor: 'rgba(52, 152, 219, 0.2)' },
    { icon: BarChart3, text: 'Reportes en Tiempo Real', color: '#F39C12', bgColor: 'rgba(243, 156, 18, 0.2)' },
    { icon: Shield, text: 'Seguridad Avanzada', color: '#E74C3C', bgColor: 'rgba(231, 76, 60, 0.2)' },
];

// ============================================================================
// COMPONENTE
// ============================================================================

const LoginPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login, isAuthenticated, isLoading: authLoading, error: authError, clearError } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Obtener la ruta de origen (si viene de una redirección)
    const from = location.state?.from || '/dashboard';

    // React Hook Form
    const {
        register,
        handleSubmit,
        formState: { errors },
        setFocus,
    } = useForm({
        resolver: yupResolver(loginSchema),
        defaultValues: {
            email: '',
            password: '',
        },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // EFECTOS
    // ──────────────────────────────────────────────────────────────────────────

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, from]);

    // Focus en email al montar
    useEffect(() => {
        setFocus('email');
    }, [setFocus]);

    // Limpiar errores al desmontar
    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    // ──────────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ──────────────────────────────────────────────────────────────────────────

    const onSubmit = async (data) => {
        setIsSubmitting(true);

        try {
            const result = await login(data.email, data.password);

            if (result.success) {
                // Redirigir a la página original o dashboard
                navigate(from, { replace: true });
            }
        } catch (error) {
            console.error('Error en login:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePassword = () => setShowPassword(prev => !prev);

    // ──────────────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────────────

    // Mostrar loading si está verificando autenticación
    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                <Loader2 className="w-10 h-10 text-[#E74C3C] animate-spin" />
            </div>
        );
    }

    return (
        <>
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .feature-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .feature-card:hover { transform: translateY(-4px) scale(1.02); background: rgba(255,255,255,0.25) !important; box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
                .feature-card:hover .feature-icon { transform: scale(1.15) rotate(-5deg); background: rgba(255,255,255,0.35) !important; }
                .feature-icon { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            `}</style>

            <div className="h-screen flex relative bg-white dark:bg-slate-900 overflow-hidden" style={fadeIn}>
                {/* ════════════════════════════════════════════════════════════════════ */}
                {/* LADO IZQUIERDO - Formulario */}
                {/* ════════════════════════════════════════════════════════════════════ */}
                <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-10">
                    <div className="w-full max-w-md" style={slideUp}>
                        {/* Logo y Título */}
                        <div className="text-center mb-6">
                            <img
                                src={logoNegro}
                                alt="ISTHO"
                                className="w-16 h-16 rounded-2xl shadow-lg mb-4 mx-auto dark:hidden"
                            />
                            <img
                                src={logoBlanco}
                                alt="ISTHO"
                                className="w-16 h-16 rounded-2xl shadow-lg mb-4 mx-auto hidden dark:block"
                            />
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                                {getGreeting()}
                            </h1>
                            <p className="text-gray-500 dark:text-slate-400 mt-1 text-sm">
                                Ingresa tus credenciales para continuar
                            </p>
                        </div>

                        {/* Mensaje de error */}
                        {authError && (
                            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3" style={slideUp}>
                                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-sm font-medium text-red-800 dark:text-red-300">
                                        Error de autenticación
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                        {authError}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Formulario */}
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            {/* Campo Email / Username */}
                            <div>
                                <label
                                    htmlFor="email"
                                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                                >
                                    Usuario o correo electrónico
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                                    </div>
                                    <input
                                        id="email"
                                        type="text"
                                        autoComplete="username"
                                        placeholder="usuario o correo@istho.com.co"
                                        {...register('email')}
                                        className={`
                                            w-full pl-12 pr-4 py-3.5 rounded-2xl border bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500
                                            focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20 focus:border-[#E74C3C]
                                            transition-all duration-300 ease-in-out
                                            ${errors.email
                                                ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20'
                                                : 'border-gray-200 dark:border-slate-700'
                                            }
                                        `}
                                    />
                                </div>
                                {errors.email && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Campo Contraseña */}
                            <div>
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                                >
                                    Contraseña
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="w-5 h-5 text-gray-400 dark:text-slate-500" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        placeholder="••••••••"
                                        {...register('password')}
                                        className={`
                                            w-full pl-12 pr-12 py-3.5 rounded-2xl border bg-gray-50 dark:bg-slate-800 dark:text-white dark:placeholder-slate-500
                                            focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20 focus:border-[#E74C3C]
                                            transition-all duration-300 ease-in-out
                                            ${errors.password
                                                ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-500/20'
                                                : 'border-gray-200 dark:border-slate-700'
                                            }
                                        `}
                                    />
                                    <button
                                        type="button"
                                        onClick={togglePassword}
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors duration-200"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-5 h-5" />
                                        ) : (
                                            <Eye className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Recordar / Olvidé contraseña */}
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-[#E74C3C] focus:ring-[#E74C3C] dark:bg-slate-700"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-slate-400">Recordarme</span>
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-sm text-[#E74C3C] hover:text-[#C0392B] dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors duration-200"
                                >
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            {/* Botón Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`
                                    w-full py-3 px-4 rounded-2xl font-semibold text-white
                                    bg-gradient-to-r from-[#E74C3C] to-[#C0392B]
                                    hover:from-[#C0392B] hover:to-[#A93226]
                                    focus:outline-none focus:ring-2 focus:ring-[#E74C3C] focus:ring-offset-2 dark:focus:ring-offset-slate-900
                                    transition-all duration-300 ease-in-out
                                    disabled:opacity-70 disabled:cursor-not-allowed
                                    flex items-center justify-center gap-2
                                    shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30
                                    transform hover:-translate-y-0.5 active:translate-y-0
                                `}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        <span>Iniciando sesión...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Iniciar Sesión</span>
                                        <ArrowRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Soporte */}
                        <div className="mt-5 text-center">
                            <p className="text-sm text-gray-500 dark:text-slate-500">
                                ¿Problemas para acceder?{' '}
                                <a
                                    href="mailto:soporte@istho.com.co"
                                    className="text-[#E74C3C] hover:text-[#C0392B] dark:text-red-400 dark:hover:text-red-300 font-medium transition-colors duration-200"
                                >
                                    Contactar soporte
                                </a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* ════════════════════════════════════════════════════════════════════ */}
                {/* LADO DERECHO - Branding */}
                {/* ════════════════════════════════════════════════════════════════════ */}
                <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#1A1A2E] via-[#2C3E50] to-[#1A1A2E] dark:from-[#0F1023] dark:via-[#151631] dark:to-[#0F1023] relative overflow-hidden">
                    {/* Formas flotantes decorativas con colores CENTHRIX */}
                    <div
                        className="absolute top-16 right-16 w-72 h-72 rounded-full blur-3xl"
                        style={{ background: 'rgba(46, 204, 113, 0.12)', animation: 'float 6s ease-in-out infinite' }}
                    />
                    <div
                        className="absolute bottom-24 left-12 w-96 h-96 rounded-full blur-3xl"
                        style={{ background: 'rgba(231, 76, 60, 0.1)', animation: 'float 8s ease-in-out infinite 1s' }}
                    />
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-2xl"
                        style={{ background: 'rgba(52, 152, 219, 0.08)', animation: 'float 7s ease-in-out infinite 0.5s' }}
                    />

                    {/* Formas geométricas sutiles con colores */}
                    <div
                        className="absolute top-32 left-16 w-16 h-16 rounded-xl rotate-12"
                        style={{ border: '2px solid rgba(46, 204, 113, 0.2)', animation: 'float 5s ease-in-out infinite 0.3s' }}
                    />
                    <div
                        className="absolute bottom-40 right-24 w-12 h-12 rounded-full"
                        style={{ border: '2px solid rgba(243, 156, 18, 0.2)', animation: 'float 6s ease-in-out infinite 1.5s' }}
                    />
                    <div
                        className="absolute top-1/3 right-12 w-8 h-8 rounded-lg rotate-45"
                        style={{ background: 'rgba(46, 204, 113, 0.15)', animation: 'float 4s ease-in-out infinite 0.8s' }}
                    />

                    {/* Contenido */}
                    <div className="relative z-10 flex flex-col items-center justify-center p-12 text-white w-full" style={fadeIn}>
                        {/* Logo grande */}
                        <div className="mb-8" style={{ animation: 'float 6s ease-in-out infinite' }}>
                            <img
                                src={logoNegro}
                                alt="ISTHO"
                                className="w-28 h-28 rounded-3xl shadow-2xl dark:hidden"
                            />
                            <img
                                src={logoBlanco}
                                alt="ISTHO"
                                className="w-28 h-28 rounded-3xl shadow-2xl hidden dark:block dark:ring-1 dark:ring-slate-700"
                            />
                        </div>

                        <h2 className="text-4xl font-bold mb-3 text-center">
                            Sistema <span style={{ color: '#2ECC71' }}>CRM</span>
                        </h2>

                        <p className="text-lg text-white/70 text-center max-w-sm mb-10">
                            Gestión integral de clientes, inventario y operaciones logísticas
                        </p>

                        {/* Features */}
                        <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                            {features.map((feature, index) => {
                                const IconComponent = feature.icon;
                                return (
                                    <div
                                        key={index}
                                        className="feature-card flex items-center gap-3 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-4 border border-white/20 dark:border-slate-700/50 cursor-pointer"
                                        style={{ animation: `slideUp 0.5s ease-out ${index * 0.1}s both` }}
                                    >
                                        <div
                                            className="feature-icon w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                                            style={{ backgroundColor: feature.bgColor }}
                                        >
                                            <IconComponent className="w-5 h-5" style={{ color: feature.color }} />
                                        </div>
                                        <span className="text-sm font-medium text-white">{feature.text}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer - posicionado dentro del flujo del lado izquierdo */}
                <div className="absolute bottom-2 left-0 lg:w-1/2 w-full text-center pointer-events-none">
                    <p className="text-gray-400 dark:text-slate-500 text-[11px]">
                        ISTHO S.A.S. &copy; {new Date().getFullYear()} - Centro Logístico Industrial del Norte
                    </p>
                    <p className="text-gray-400 dark:text-slate-500 text-[10px]">
                        Girardota, Antioquia &bull; ISO 9001:2015
                    </p>
                </div>
            </div>
        </>
    );
};

// ============================================================================
// EXPORT
// ============================================================================

export default LoginPage;
