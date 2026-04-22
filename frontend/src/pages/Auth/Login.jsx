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
import logoCenthrix from '../../assets/Centhrix WMS - ISTHO-03.svg';
import LoadingScreen from '../../components/common/LoadingScreen';
import PoliticaDatosModal from '../../components/common/PoliticaDatosModal';
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
    Shield,
    ArrowRight,
    Smartphone,
    ChevronLeft,
    CheckCircle2,
} from 'lucide-react';

// ============================================================================
// ANIMACIONES
// ============================================================================

const fadeIn = { animation: 'fadeIn 0.6s ease-out' };
const slideUp = { animation: 'slideUp 0.5s ease-out' };

// ============================================================================
// ESQUEMA DE VALIDACIÓN
// ============================================================================

const POLITICA_VERSION = 'v1-2026';

const loginSchema = yup.object({
    email: yup
        .string()
        .required('El usuario o email es requerido'),
    password: yup
        .string()
        .required('La contraseña es requerida')
        .min(6, 'La contraseña debe tener al menos 6 caracteres'),
    aceptaPolitica: yup
        .boolean()
        .oneOf([true], 'Debes aceptar la política de tratamiento de datos'),
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
    const { login, validarTotp, isAuthenticated, isLoading: authLoading, error: authError, clearError, user } = useAuth();

    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [mensajePendiente, setMensajePendiente] = useState(null);
    const [politicaOpen, setPoliticaOpen] = useState(false);

    // Estado para el paso de 2FA
    const [paso2FA, setPaso2FA] = useState(null); // { temp_token, usuario_nombre }
    const [codigoTotp, setCodigoTotp] = useState('');
    const [error2FA, setError2FA] = useState(null);
    const [submitting2FA, setSubmitting2FA] = useState(false);

    // Estado para configuración inicial de 2FA
    const [pasoSetup2FA, setPasoSetup2FA] = useState(false);
    const [setupData, setSetupData] = useState(null); // { secret, qr_code }
    const [backupCodes, setBackupCodes] = useState([]);
    const [verificandoSetup, setVerificandoSetup] = useState(false);
    const [errorSetup, setErrorSetup] = useState(null);

    // Obtener la ruta de origen (si viene de una redirección)
    const getDefaultRoute = (rol) => {
        switch (rol) {
            case 'admin': return '/dashboard';
            case 'supervisor': return '/dashboard';
            case 'financiera': return '/dashboard';
            case 'conductor': return '/dashboard';
            case 'operador': return '/dashboard';
            case 'cliente': return '/dashboard';
            default: return '/dashboard';
        }
    };

    // Siempre redirigir a la página principal del rol para evitar conflictos entre sesiones
    const getDestino = (rol) => getDefaultRoute(rol);

    // React Hook Form
    const yaAcepto = localStorage.getItem('politica_aceptada') === POLITICA_VERSION;

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
            aceptaPolitica: yaAcepto,
        },
    });

    // ──────────────────────────────────────────────────────────────────────────
    // EFECTOS
    // ──────────────────────────────────────────────────────────────────────────

    // Redirigir si ya está autenticado
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            const destino = getDestino(user?.rol);
            navigate(destino, { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, user]);

    // Focus en email al montar
    useEffect(() => {
        setFocus('email');
    }, [setFocus]);

    // Limpiar errores al desmontar
    useEffect(() => {
        return () => clearError();
    }, [clearError]);

    // Leer mensaje pendiente (sesión cerrada / cuenta desactivada)
    useEffect(() => {
        const stored = sessionStorage.getItem('auth_mensaje_pendiente');
        if (stored) {
            try { setMensajePendiente(JSON.parse(stored)); } catch { /* ignorado intencionalmente */ }
            sessionStorage.removeItem('auth_mensaje_pendiente');
        }
    }, []);

    // ──────────────────────────────────────────────────────────────────────────
    // HANDLERS
    // ──────────────────────────────────────────────────────────────────────────

    const [serverWaking, setServerWaking] = useState(false);

    const onSubmit2FA = async (e) => {
        e.preventDefault();
        if (!codigoTotp.trim()) return;
        setSubmitting2FA(true);
        setError2FA(null);

        try {
            const result = await validarTotp(paso2FA.temp_token, codigoTotp.replace(/\s/g, ''));

            if (result.success) {
                localStorage.setItem('politica_aceptada', POLITICA_VERSION);
                const destino = getDestino(result.data?.user?.rol);
                navigate(destino, { replace: true });
            } else if (result.code === 'TEMP_TOKEN_EXPIRED') {
                setPaso2FA(null);
                setCodigoTotp('');
                setError2FA(null);
            } else {
                setError2FA(result.message || 'Código incorrecto');
            }
        } catch (err) {
            setError2FA(err.message || 'Error al verificar el código');
        } finally {
            setSubmitting2FA(false);
        }
    };

    const handleConfirmarSetup = async (e) => {
        e.preventDefault();
        const code = codigoTotp.replace(/\s/g, '');
        if (code.length !== 6) return;

        setVerificandoSetup(true);
        setErrorSetup(null);
        try {
            const res = await authService.activar2FA({ codigo: code });
            if (res.success) {
                setBackupCodes(res.data.backup_codes || []);
                // Redirigir será manual después de mostrar códigos
            } else {
                setErrorSetup(res.message || 'Código incorrecto');
            }
        } catch (err) {
            setErrorSetup('Error al verificar el código');
        } finally {
            setVerificandoSetup(false);
        }
    };

    const handleFinalizarSetup = () => {
        window.location.reload(); 
    };

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setServerWaking(false);

        try {
            const result = await login(data.email, data.password);

            if (result.requiere_2fa) {
                setIsSubmitting(false);
                setPaso2FA({ temp_token: result.temp_token, usuario_nombre: result.usuario_nombre });
                return;
            }

            if (result.requiere_setup_2fa) {
                setIsSubmitting(false);
                setPasoSetup2FA(true);
                // Iniciar el setup automáticamente
                const setupRes = await authService.setup2FA();
                if (setupRes.success) {
                    setSetupData(setupRes.data);
                } else {
                    setErrorSetup(setupRes.message || 'Error al iniciar configuración de 2FA');
                }
                return;
            }

            if (result.success) {
                localStorage.setItem('politica_aceptada', POLITICA_VERSION);
                const destino = getDestino(result.data?.user?.rol);
                navigate(destino, { replace: true });
            } else if (result.code === 'NETWORK_ERROR' || result.code === 'TIMEOUT') {
                // Servidor dormido — intentar despertar
                setServerWaking(true);
                setIsSubmitting(false);

                // Retry automático: intentar 3 veces con espera
                for (let i = 0; i < 3; i++) {
                    await new Promise(r => setTimeout(r, 3000));
                    try {
                        const retry = await login(data.email, data.password);
                        if (retry.success) {
                            setServerWaking(false);
                            const destino = getDestino(retry.data?.user?.rol);
                            navigate(destino, { replace: true });
                            return;
                        }
                        if (retry.code !== 'NETWORK_ERROR' && retry.code !== 'TIMEOUT') {
                            setServerWaking(false);
                            return;
                        }
                    } catch { /* retry */ }
                }
                setServerWaking(false);
            }
        } catch (error) {
            console.error('Error en login:', error);
        } finally {
            if (!serverWaking) setIsSubmitting(false);
        }
    };

    const togglePassword = () => setShowPassword(prev => !prev);

    // ──────────────────────────────────────────────────────────────────────────
    // RENDER
    // ──────────────────────────────────────────────────────────────────────────

    // Mostrar loading si está verificando autenticación
    if (authLoading) {
        return <LoadingScreen mensaje="Verificando sesion..." />;
    }

    // Mostrar pantalla de reconexión si el servidor está despertando
    if (serverWaking) {
        return <LoadingScreen
            tipo="reconectando"
            mensaje="Conectando con el servidor..."
            submensaje="El servidor se esta iniciando. Esto puede tomar unos segundos."
        />;
    }

    // ── Pantalla de verificación 2FA ──────────────────────────────────────────
    if (paso2FA) {
        return (
            <div className="h-screen flex items-center justify-center bg-white dark:bg-centhrix-bg" style={fadeIn}>
                <div className="w-full max-w-sm px-6" style={slideUp}>
                    {/* Icono */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 rounded-2xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mb-4 shadow-lg">
                            <Smartphone className="w-8 h-8 text-orange-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white text-center">
                            Verificación de dos factores
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-2 text-center">
                            Hola <strong>{paso2FA.usuario_nombre}</strong>. Ingresa el código de tu aplicación autenticadora o un código de respaldo.
                        </p>
                    </div>

                    {/* Error */}
                    {error2FA && (
                        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-2xl flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-300">{error2FA}</p>
                        </div>
                    )}

                    {/* Formulario TOTP */}
                    <form onSubmit={onSubmit2FA} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                Código de verificación
                            </label>
                            <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                maxLength={8}
                                autoFocus
                                value={codigoTotp}
                                onChange={(e) => { setCodigoTotp(e.target.value); setError2FA(null); }}
                                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-centhrix-card dark:text-white text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20 focus:border-[#E74C3C] transition-all"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={submitting2FA || !codigoTotp.trim()}
                            className="w-full py-3 px-4 rounded-2xl font-semibold text-white bg-gradient-to-r from-[#E74C3C] to-[#C0392B] hover:from-[#C0392B] hover:to-orange-800 focus:outline-none focus:ring-2 focus:ring-[#E74C3C] transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                        >
                            {submitting2FA ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /><span>Verificando...</span></>
                            ) : (
                                <><span>Verificar</span><ArrowRight className="w-5 h-5" /></>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={() => { setPaso2FA(null); setCodigoTotp(''); setError2FA(null); }}
                            className="w-full py-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Volver al inicio de sesión
                        </button>
                    </form>

                    <p className="mt-6 text-center text-xs text-gray-400 dark:text-slate-500">
                        ¿Sin acceso al autenticador? Usa uno de tus códigos de respaldo.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            <PoliticaDatosModal isOpen={politicaOpen} onClose={() => setPoliticaOpen(false)} />
            <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
                .feature-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
                .feature-card:hover { transform: translateY(-4px) scale(1.02); background: rgba(255,255,255,0.25) !important; box-shadow: 0 8px 25px rgba(0,0,0,0.15); }
                .feature-card:hover .feature-icon { transform: scale(1.15) rotate(-5deg); }
                .feature-icon { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

                /* Panel derecho hover effects */
                .right-panel { transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
                .right-panel:hover .float-shape { animation-duration: 3s !important; }
                .right-panel:hover .geo-shape { opacity: 0.5; transform: scale(1.2); }
                .geo-shape { transition: opacity 0.5s ease, transform 0.5s ease; opacity: 0.3; }
                .right-panel:hover .panel-content { transform: translateY(-4px); }
                .panel-content { transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1); }
                .right-panel:hover .panel-glow { opacity: 1; }
                .panel-glow { opacity: 0; transition: opacity 0.6s ease; }

                /* CenthriX title animation */
                .centhrix-title .letter-x { display: inline-block; transition: all 0.3s ease; }
                .centhrix-title:hover .letter-x { transform: scale(1.2) rotate(12deg); filter: drop-shadow(0 0 8px rgba(46, 204, 113, 0.6)); }
            `}</style>

            <div className="h-screen flex relative bg-white dark:bg-centhrix-bg overflow-hidden" style={fadeIn}>
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

                        {/* Mensaje pendiente: sesión cerrada / cuenta desactivada */}
                        {mensajePendiente && (
                            <div
                                className={`mb-6 p-4 rounded-2xl flex items-start gap-3 border ${
                                    mensajePendiente.tipo === 'desactivado'
                                        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/50'
                                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
                                }`}
                                style={slideUp}
                            >
                                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                                    mensajePendiente.tipo === 'desactivado'
                                        ? 'text-orange-500 dark:text-orange-400'
                                        : 'text-amber-500 dark:text-amber-400'
                                }`} />
                                <div>
                                    <p className={`text-sm font-semibold ${
                                        mensajePendiente.tipo === 'desactivado'
                                            ? 'text-orange-800 dark:text-orange-300'
                                            : 'text-amber-800 dark:text-amber-300'
                                    }`}>
                                        {mensajePendiente.tipo === 'desactivado' ? 'Cuenta desactivada' : 'Sesión cerrada'}
                                    </p>
                                    <p className={`text-sm mt-0.5 ${
                                        mensajePendiente.tipo === 'desactivado'
                                            ? 'text-orange-700 dark:text-orange-400'
                                            : 'text-amber-700 dark:text-amber-400'
                                    }`}>
                                        {mensajePendiente.mensaje}
                                    </p>
                                </div>
                            </div>
                        )}

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
                                            w-full pl-12 pr-4 py-3.5 rounded-2xl border bg-gray-50 dark:bg-centhrix-card dark:text-white dark:placeholder-slate-500
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
                                            w-full pl-12 pr-12 py-3.5 rounded-2xl border bg-gray-50 dark:bg-centhrix-card dark:text-white dark:placeholder-slate-500
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
                                        className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-[#E74C3C] focus:ring-[#E74C3C] dark:bg-centhrix-surface"
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

                            {/* Política de tratamiento de datos — Ley 1581 */}
                            <div>
                                <label className="flex items-start gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        {...register('aceptaPolitica')}
                                        className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-[#E74C3C] focus:ring-[#E74C3C] dark:bg-centhrix-surface flex-shrink-0"
                                    />
                                    <span className="text-sm text-gray-600 dark:text-slate-400 leading-snug">
                                        Acepto la{' '}
                                        <button
                                            type="button"
                                            onClick={() => setPoliticaOpen(true)}
                                            className="text-[#E74C3C] hover:text-[#C0392B] dark:text-red-400 font-medium underline underline-offset-2 transition-colors"
                                        >
                                            Política de Tratamiento de Datos Personales
                                        </button>
                                        {' '}(Ley 1581 de 2012)
                                    </span>
                                </label>
                                {errors.aceptaPolitica && (
                                    <p className="mt-1.5 text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                                        {errors.aceptaPolitica.message}
                                    </p>
                                )}
                            </div>

                            {/* Botón Submit */}
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className={`
                                    w-full py-3 px-4 rounded-2xl font-semibold text-white
                                    bg-gradient-to-r from-[#E74C3C] to-[#C0392B]
                                    hover:from-[#C0392B] hover:to-orange-800
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
                <div className="right-panel hidden lg:flex lg:flex-1 bg-gradient-to-br from-[#1A1A2E] via-[#2C3E50] to-[#1A1A2E] dark:from-[#0F1023] dark:via-[#151631] dark:to-[#0F1023] relative overflow-hidden">
                    {/* Glow effect on hover */}
                    <div
                        className="panel-glow absolute inset-0 pointer-events-none"
                        style={{ background: 'radial-gradient(circle at 50% 50%, rgba(46, 204, 113, 0.08) 0%, transparent 70%)' }}
                    />

                    {/* Formas flotantes decorativas con colores CENTHRIX */}
                    <div
                        className="float-shape absolute top-16 right-16 w-72 h-72 rounded-full blur-3xl"
                        style={{ background: 'rgba(46, 204, 113, 0.12)', animation: 'float 6s ease-in-out infinite' }}
                    />
                    <div
                        className="float-shape absolute bottom-24 left-12 w-96 h-96 rounded-full blur-3xl"
                        style={{ background: 'rgba(231, 76, 60, 0.1)', animation: 'float 8s ease-in-out infinite 1s' }}
                    />
                    <div
                        className="float-shape absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-2xl"
                        style={{ background: 'rgba(52, 152, 219, 0.08)', animation: 'float 7s ease-in-out infinite 0.5s' }}
                    />

                    {/* Formas geométricas sutiles con colores */}
                    <div
                        className="geo-shape absolute top-32 left-16 w-16 h-16 rounded-xl rotate-12"
                        style={{ border: '2px solid rgba(46, 204, 113, 0.3)', animation: 'float 5s ease-in-out infinite 0.3s' }}
                    />
                    <div
                        className="geo-shape absolute bottom-40 right-24 w-12 h-12 rounded-full"
                        style={{ border: '2px solid rgba(243, 156, 18, 0.3)', animation: 'float 6s ease-in-out infinite 1.5s' }}
                    />
                    <div
                        className="geo-shape absolute top-1/3 right-12 w-8 h-8 rounded-lg rotate-45"
                        style={{ background: 'rgba(46, 204, 113, 0.15)', animation: 'float 4s ease-in-out infinite 0.8s' }}
                    />

                    {/* Contenido */}
                    <div className="panel-content relative z-10 flex flex-col items-center justify-center p-12 text-white w-full" style={fadeIn}>
                        {/* Logo Centhrix */}
                        <div className="mb-8" style={{ animation: 'float 6s ease-in-out infinite' }}>
                            <img
                                src={logoCenthrix}
                                alt="CenthriX"
                                className="w-48 h-auto drop-shadow-2xl"
                            />
                        </div>

                        <h2 className="centhrix-title text-4xl font-bold mb-3 text-center cursor-default select-none">
                            CRM Centhri<span className="letter-x" style={{ color: '#2ECC71' }}>X</span>
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

            {/* SECCIÓN CONFIGURACIÓN OBLIGATORIA 2FA */}
            {pasoSetup2FA && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm" style={fadeIn}>
                    <div className="bg-white dark:bg-centhrix-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700" style={slideUp}>
                        <div className="p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                                    <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Seguridad Obligatoria</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Configura tu autenticador para continuar</p>
                                </div>
                            </div>

                            {backupCodes.length > 0 ? (
                                <div className="space-y-6" style={fadeIn}>
                                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                                        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 mb-2">
                                            <CheckCircle2 className="w-5 h-5" />
                                            <span className="font-semibold text-sm">¡2FA Activado correctamente!</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400">
                                            Guarda estos códigos de respaldo. Son la única forma de acceder si pierdes tu celular.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {backupCodes.map((code, idx) => (
                                            <div key={idx} className="bg-slate-50 dark:bg-centhrix-bg border border-slate-200 dark:border-slate-700 rounded-xl py-2 px-3 text-center font-mono text-sm dark:text-slate-200">
                                                {code}
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleFinalizarSetup}
                                        className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        Comenzar a usar el CRM <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-600 dark:text-slate-400">
                                            1. Escanea este código con <b>Google Authenticator</b> o <b>Authy</b>.
                                        </p>
                                        <div className="flex justify-center bg-white p-4 rounded-2xl border border-slate-100 shadow-inner">
                                            {setupData?.qr_code ? (
                                                <img src={setupData.qr_code} alt="QR Setup" className="w-48 h-48" />
                                            ) : (
                                                <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-xl animate-pulse">
                                                    <Loader2 className="w-8 h-8 text-slate-300 animate-spin" />
                                                </div>
                                            )}
                                        </div>
                                        {setupData?.secret && (
                                            <div className="p-3 bg-slate-50 dark:bg-centhrix-bg rounded-xl border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-between">
                                                <code className="text-xs text-slate-500 font-mono">{setupData.secret}</code>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(setupData.secret);
                                                        // Podríamos mostrar un toast si está disponible
                                                    }}
                                                    className="text-xs text-emerald-600 hover:underline font-medium"
                                                >
                                                    Copiar
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <form onSubmit={handleConfirmarSetup} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">
                                                Código de 6 dígitos
                                            </label>
                                            <input
                                                type="text"
                                                maxLength={6}
                                                placeholder="000 000"
                                                value={codigoTotp}
                                                onChange={(e) => setCodigoTotp(e.target.value.replace(/\D/g, ''))}
                                                className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 bg-slate-50 dark:bg-centhrix-bg border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all dark:text-white"
                                                autoFocus
                                            />
                                            {errorSetup && (
                                                <div className="mt-2 flex items-center gap-2 text-red-500 text-xs font-medium" style={fadeIn}>
                                                    <AlertCircle className="w-4 h-4" /> {errorSetup}
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={codigoTotp.length !== 6 || verificandoSetup}
                                            className="w-full py-4 bg-slate-900 dark:bg-red-600 hover:bg-slate-800 dark:hover:bg-red-700 text-white rounded-2xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {verificandoSetup ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Activar y Entrar'}
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ============================================================================
// EXPORT
// ============================================================================

export default LoginPage;
