/**
 * LoadingScreen — Pantalla de carga unificada con logo CenthriX
 * Se usa en:
 * - Suspense fallback (lazy loading de páginas)
 * - Estado de carga inicial de módulos
 * - Reconexión al servidor
 */
import logoCenthrix from '../../assets/Centhrix WMS - ISTHO-03.svg';

const LoadingScreen = ({
  mensaje = 'Cargando...',
  submensaje = null,
  tipo = 'default', // 'default' | 'reconectando' | 'pagina'
  fullScreen = true,
}) => {
  const isReconectando = tipo === 'reconectando';

  return (
    <div
      className={`${fullScreen ? 'min-h-screen' : 'min-h-[60vh]'} bg-gradient-to-br from-slate-50 to-slate-100 dark:from-centhrix-bg dark:to-centhrix-surface flex items-center justify-center`}
    >
      <div className="text-center">
        {/* Logo CenthriX */}
        <div className="mb-6">
          <img
            src={logoCenthrix}
            alt="CenthriX"
            className="w-32 h-auto mx-auto"
            style={{ animation: 'logoFloat 3s ease-in-out infinite' }}
          />
        </div>

        {/* Spinner */}
        <div className="relative w-12 h-12 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-slate-700" />
          <div
            className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-orange-500 border-r-orange-500"
            style={{ animation: 'spinSmooth 0.8s linear infinite' }}
          />
        </div>

        {/* Mensaje */}
        <p className="text-slate-600 dark:text-slate-300 font-medium text-sm">{mensaje}</p>

        {/* Submensaje */}
        {submensaje && (
          <p className="text-slate-400 dark:text-slate-500 text-xs mt-1.5 max-w-xs mx-auto">
            {submensaje}
          </p>
        )}

        {/* Barra de progreso para reconexión */}
        {isReconectando && (
          <div className="mt-4 w-48 mx-auto">
            <div className="h-1 bg-slate-200 dark:bg-centhrix-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-orange-500 rounded-full"
                style={{ animation: 'progressIndeterminate 1.5s ease-in-out infinite' }}
              />
            </div>
          </div>
        )}

        {/* Estilos de animación */}
        <style>{`
          @keyframes logoFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
          @keyframes spinSmooth {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          @keyframes progressIndeterminate {
            0% { width: 0%; margin-left: 0%; }
            50% { width: 60%; margin-left: 20%; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
      </div>
    </div>
  );
};

export default LoadingScreen;
