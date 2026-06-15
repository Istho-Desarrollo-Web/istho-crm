/**
 * ============================================================================
 * ISTHO CRM - Forgot Password Page
 * ============================================================================
 * Pagina de recuperacion de contrasena con diseno corporativo ISTHO.
 * Matching Login page style with centered card on gradient background.
 *
 * @author Coordinacion TI ISTHO
 * @version 2.0.0
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Send, AlertCircle, CheckCircle, Loader2, KeyRound } from 'lucide-react';
import useNotification from '../../hooks/useNotification';
import authService from '../../api/auth.service';
import logoIstho from '../../assets/logo-istho.png';

// ============================================================================
// CSS ANIMATIONS (injected inline)
// ============================================================================

const animationStyles = `
@keyframes forgotFadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes forgotSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes forgotCheckBounce {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes forgotPulseRing {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 0.2; }
  100% { transform: scale(0.8); opacity: 0.5; }
}
`;

// ============================================================================
// COMPONENT
// ============================================================================

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { success, error: notifyError, warning } = useNotification();

  // ────────────────────────────────────────────────────────────────────────
  // HANDLER
  // ────────────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!email) {
      warning('Por favor ingresa tu correo electrónico');
      return;
    }

    setLoading(true);

    try {
      const response = await authService.forgotPassword(email);

      if (response.success) {
        setSubmitted(true);
        success('Si el correo existe, recibirás las instrucciones para restablecer tu contraseña');
      } else {
        notifyError(response.message || 'Error al procesar la solicitud');
      }
    } catch (err) {
      console.error('Error en forgot password:', err);
      notifyError('Error de conexión. Intenta nuevamente');
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // SUCCESS STATE
  // ────────────────────────────────────────────────────────────────────────

  if (submitted) {
    return (
      <>
        <style>{animationStyles}</style>
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#E74C3C] via-[#FF6B5A] to-[#F39C12] dark:from-[#0F1023] dark:via-[#151631] dark:to-[#1A1B3A] relative overflow-hidden">
          {/* Background decorations */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid-success" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid-success)" />
            </svg>
          </div>
          <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

          <div
            className="relative z-10 w-full max-w-md bg-white dark:bg-centhrix-bg rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700/50 p-8 text-center"
            style={{ animation: 'forgotFadeIn 0.4s ease-out' }}
          >
            {/* Animated checkmark */}
            <div className="relative mx-auto mb-6 w-20 h-20">
              <div
                className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full"
                style={{ animation: 'forgotPulseRing 2s ease-in-out infinite' }}
              ></div>
              <div
                className="relative w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                style={{ animation: 'forgotCheckBounce 0.5s ease-out 0.2s both' }}
              >
                <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
              </div>
            </div>

            <h2
              className="text-2xl font-bold text-gray-900 dark:text-white mb-2"
              style={{ animation: 'forgotSlideUp 0.4s ease-out 0.3s both' }}
            >
              Correo Enviado
            </h2>

            <p
              className="text-gray-500 dark:text-slate-400 mb-8 leading-relaxed"
              style={{ animation: 'forgotSlideUp 0.4s ease-out 0.4s both' }}
            >
              Si el correo <strong className="text-gray-700 dark:text-slate-300">{email}</strong>{' '}
              esta registrado en nuestro sistema, recibiras un enlace para restablecer tu
              contrasena.
            </p>

            <div style={{ animation: 'forgotSlideUp 0.4s ease-out 0.5s both' }}>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-[#E74C3C] dark:text-red-400 font-medium hover:text-orange-800 dark:hover:text-red-300 transition-colors"
              >
                <ArrowLeft size={18} />
                Volver al inicio de sesion
              </Link>
            </div>
          </div>

          {/* Footer */}
          <div className="absolute bottom-0 left-0 right-0 text-center py-4">
            <p className="text-white/70 dark:text-slate-500 text-xs">
              ISTHO S.A.S. &copy; {new Date().getFullYear()} - Centro Logistico Industrial del Norte
            </p>
            <p className="text-white/50 dark:text-slate-600 text-[11px] mt-0.5">
              Girardota, Antioquia &bull; ISO 9001:2015
            </p>
          </div>
        </div>
      </>
    );
  }

  // ────────────────────────────────────────────────────────────────────────
  // FORM STATE
  // ────────────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{animationStyles}</style>
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#E74C3C] via-[#FF6B5A] to-[#F39C12] dark:from-[#0F1023] dark:via-[#151631] dark:to-[#1A1B3A] relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="grid-form" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#grid-form)" />
          </svg>
        </div>

        {/* Decorative blurs */}
        <div className="absolute top-20 right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>

        {/* Card */}
        <div
          className="relative z-10 w-full max-w-md bg-white dark:bg-centhrix-bg rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700/50 overflow-hidden"
          style={{ animation: 'forgotFadeIn 0.4s ease-out' }}
        >
          <div className="p-8">
            {/* Logo */}
            <div
              className="text-center mb-6"
              style={{ animation: 'forgotSlideUp 0.4s ease-out 0.1s both' }}
            >
              <img
                src={logoIstho}
                alt="ISTHO"
                className="h-14 w-auto max-w-[140px] object-contain mb-4 mx-auto drop-shadow-[0_2px_8px_rgba(0,0,0,0.35)] dark:drop-shadow-none dark:brightness-0 dark:invert"
              />
            </div>

            {/* Header icon & title */}
            <div
              className="text-center mb-8"
              style={{ animation: 'forgotSlideUp 0.4s ease-out 0.2s both' }}
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound size={28} className="text-[#E74C3C] dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Recuperar Contrasena
              </h1>
              <p className="text-gray-500 dark:text-slate-400 text-sm leading-relaxed">
                Ingrese su correo electronico y le enviaremos instrucciones para restablecer su
                contrasena.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              style={{ animation: 'forgotSlideUp 0.4s ease-out 0.3s both' }}
            >
              {/* Email input */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2"
                >
                  Correo Electronico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail size={18} className="text-gray-400 dark:text-slate-500" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-centhrix-card dark:text-white dark:placeholder-slate-500
                                            focus:bg-white dark:focus:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[#E74C3C]/20 focus:border-[#E74C3C]
                                            transition-all duration-200"
                    placeholder="ejemplo@istho.com"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-semibold text-white
                                    bg-gradient-to-r from-[#E74C3C] to-[#C0392B]
                                    hover:from-[#C0392B] hover:to-orange-800
                                    focus:outline-none focus:ring-2 focus:ring-[#E74C3C] focus:ring-offset-2
                                    transition-all duration-200
                                    disabled:opacity-70 disabled:cursor-not-allowed
                                    flex items-center justify-center gap-2
                                    shadow-lg shadow-red-500/25
                                    transform active:scale-[0.98]"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send size={18} />
                    <span>Enviar Instrucciones</span>
                  </>
                )}
              </button>
            </form>

            {/* Back link */}
            <div
              className="mt-6 text-center"
              style={{ animation: 'forgotSlideUp 0.4s ease-out 0.4s both' }}
            >
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-slate-400 hover:text-[#E74C3C] dark:hover:text-red-400 font-medium transition-colors"
              >
                <ArrowLeft size={16} />
                Volver al inicio de sesion
              </Link>
            </div>

            {/* Support contact */}
            <div
              className="mt-4 text-center"
              style={{ animation: 'forgotSlideUp 0.4s ease-out 0.5s both' }}
            >
              <p className="text-xs text-gray-400 dark:text-slate-500 flex items-center justify-center gap-1">
                <AlertCircle size={12} />
                Si no recibes el correo, revisa tu carpeta de spam
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 text-center py-4">
          <p className="text-white/70 dark:text-slate-500 text-xs">
            ISTHO S.A.S. &copy; {new Date().getFullYear()} - Centro Logistico Industrial del Norte
          </p>
          <p className="text-white/50 dark:text-slate-600 text-[11px] mt-0.5">
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

export default ForgotPassword;
