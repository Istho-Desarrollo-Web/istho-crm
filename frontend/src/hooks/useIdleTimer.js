/**
 * useIdleTimer — cierra sesión automáticamente después de inactividad.
 *
 * Lee `user.preferencias.tiempo_sesion` (minutos). Si es 0 → nunca.
 * Resetea el timer con cualquier interacción del usuario.
 */

import { useEffect, useRef } from 'react';
import { useAuth } from '@context/AuthContext';

const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];

const useIdleTimer = () => {
  const { user, logout } = useAuth();
  const timerRef = useRef(null);

  useEffect(() => {
    const minutos = user?.preferencias?.tiempo_sesion ?? 30;
    if (!minutos || minutos === 0) return; // 0 = nunca

    const ms = minutos * 60 * 1000;

    const resetTimer = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
      }, ms);
    };

    // Arrancar timer inicial
    resetTimer();

    // Registrar eventos de actividad
    EVENTOS_ACTIVIDAD.forEach(ev =>
      window.addEventListener(ev, resetTimer, { passive: true })
    );

    return () => {
      clearTimeout(timerRef.current);
      EVENTOS_ACTIVIDAD.forEach(ev =>
        window.removeEventListener(ev, resetTimer)
      );
    };
  }, [user?.preferencias?.tiempo_sesion, logout]);
};

export default useIdleTimer;
