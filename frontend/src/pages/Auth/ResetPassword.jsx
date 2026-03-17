import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useSnackbar } from 'notistack';
import authService from '../../api/auth.service';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { enqueueSnackbar } = useSnackbar();

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
                enqueueSnackbar('Contraseña restablecida exitosamente', { variant: 'success' });
                navigate('/login');
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

    if (!token) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Enlace Inválido</h2>
                    <p className="text-slate-600">El enlace de recuperación no es válido o ha expirado.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-fade-in">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-slate-800 mb-2">Nueva Contraseña</h1>
                        <p className="text-slate-500">
                            Por favor ingrese su nueva contraseña.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="pl-10 pr-10 block w-full rounded-lg border-slate-200 focus:border-orange-500 focus:ring-orange-500 transition-colors"
                                    placeholder="••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Confirmar Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                    <Lock size={18} />
                                </div>
                                <input
                                    name="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    className="pl-10 block w-full rounded-lg border-slate-200 focus:border-orange-500 focus:ring-orange-500 transition-colors"
                                    placeholder="••••••••"
                                    required
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
                                    Restablecer Contraseña
                                    <ArrowRight size={18} className="ml-2" />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
