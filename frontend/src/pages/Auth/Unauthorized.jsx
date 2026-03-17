/**
 * ISTHO CRM - Página de Acceso No Autorizado
 *
 * Se muestra cuando un usuario autenticado intenta acceder
 * a un módulo para el cual no tiene permisos según su rol.
 *
 * @author Coordinación TI ISTHO
 * @date Marzo 2026
 */

import { useNavigate } from 'react-router-dom';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Unauthorized = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const rolLabel = {
    admin: 'Administrador',
    administrador: 'Administrador',
    supervisor: 'Supervisor',
    operador: 'Operador',
    cliente: 'Portal Cliente',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icono */}
        <div className="w-24 h-24 mx-auto mb-6 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
          <ShieldX className="w-12 h-12 text-red-500 dark:text-red-400" />
        </div>

        {/* Título */}
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
          Acceso Restringido
        </h1>

        {/* Mensaje */}
        <p className="text-slate-500 dark:text-slate-400 mb-2">
          No tienes permisos para acceder a este módulo.
        </p>

        {user && (
          <p className="text-sm text-slate-400 dark:text-slate-500 mb-8">
            Tu rol actual es <span className="font-semibold text-slate-600 dark:text-slate-300">{rolLabel[user.rol] || user.rol}</span>.
            Contacta al administrador si necesitas acceso.
          </p>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 rounded-xl transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Ir al Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
