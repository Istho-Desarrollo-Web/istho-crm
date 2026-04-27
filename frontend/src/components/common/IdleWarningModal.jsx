import { useEffect, useRef, useState } from 'react';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAuth } from '@context/AuthContext';

const AVISO_SEGUNDOS = 120;

const IdleWarningModal = ({ isOpen, onExtender }) => {
  const { logout } = useAuth();
  const [segundos, setSegundos] = useState(AVISO_SEGUNDOS);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!isOpen) {
      setSegundos(AVISO_SEGUNDOS);
      clearInterval(intervalRef.current);
      return;
    }
    setSegundos(AVISO_SEGUNDOS);
    intervalRef.current = setInterval(() => {
      setSegundos((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [isOpen]);

  if (!isOpen) return null;

  const mins = Math.floor(segundos / 60);
  const secs = segundos % 60;
  const tiempo = mins > 0 ? `${mins}:${String(secs).padStart(2, '0')} min` : `${secs} seg`;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="idle-titulo"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white dark:bg-centhrix-card rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4">
        <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-2xl flex items-center justify-center">
          <Clock className="w-7 h-7 text-amber-500" aria-hidden="true" />
        </div>

        <div className="text-center">
          <h2
            id="idle-titulo"
            className="text-base font-semibold text-slate-800 dark:text-slate-100"
          >
            ¿Sigues ahí?
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tu sesión expirará en <span className="font-semibold text-amber-500">{tiempo}</span> por
            inactividad.
          </p>
        </div>

        <div className="flex gap-3 w-full">
          <button
            onClick={() => logout()}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
            Cerrar sesión
          </button>
          <button
            onClick={onExtender}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#E74C3C] to-[#C0392B] text-white text-sm font-semibold hover:from-[#C0392B] hover:to-orange-800 transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#E74C3C] focus:ring-offset-2 dark:focus:ring-offset-centhrix-card"
            autoFocus
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

export default IdleWarningModal;
