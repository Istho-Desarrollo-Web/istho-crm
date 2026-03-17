import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowRight, ArrowLeft } from 'lucide-react';
import { useSnackbar } from 'notistack';
import authService from '../../api/auth.service';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            enqueueSnackbar('Por favor ingrese su correo electrónico', { variant: 'warning' });
            return;
        }

        setLoading(true);

        try {
            const response = await authService.forgotPassword(email);

            if (response.success) {
                setSubmitted(true);
                enqueueSnackbar('Si el correo existe, recibirás instrucciones para restablecer tu contraseña', { variant: 'success' });
            } else {
                enqueueSnackbar(response.message || 'Error al procesar la solicitud', { variant: 'error' });
            }
        } catch (error) {
            console.error('Error en forgot password:', error);
            enqueueSnackbar('Error de conexión. Intente nuevamente', { variant: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Mail size={32} />
                    </div>

                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Correo Enviado</h2>

                    <p className="text-slate-600 mb-8">
                        Si el correo <strong>{email}</strong> está registrado en nuestro sistema, recibirás un enlace para restablecer tu contraseña.
                    </p>

                    <Link
                        to="/login"
                        className="inline-flex items-center text-orange-600 font-medium hover:text-orange-700 transition-colors"
                    >
                        <ArrowLeft size={18} className="mr-2" />
                        Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Recuperar Contraseña</h1>
                        <p className="text-slate-500">
                            Ingrese su correo electrónico y le enviaremos instrucciones para restablecer su contraseña.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Mail size={18} />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 rounded-xl border bg-gray-50
                    focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#E65100]/20 focus:border-[#E65100]
                    transition-all duration-200"
                                    placeholder="ejemplo@istho.com"
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-[0.98]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Enviar Instrucciones
                                    <ArrowRight size={18} className="ml-2" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <Link
                            to="/login"
                            className="inline-flex items-center text-sm text-slate-500 hover:text-orange-600 transition-colors"
                        >
                            <ArrowLeft size={16} className="mr-1" />
                            Volver al inicio de sesión
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
