/**
 * useIdleTimer — cierra sesión automáticamente después de inactividad.
 *
 * Lee `user.preferencias.tiempo_sesion` (minutos). Si es 0 → nunca.
 * Muestra aviso 2 minutos antes del logout para que el usuario pueda continuar.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@context/AuthContext';

const EVENTOS_ACTIVIDAD = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
const AVISO_ANTES_MS = 2 * 60 * 1000; // 2 minutos antes del logout

const useIdleTimer = () => {
  const { user, logout } = useAuth();
  const timerLogoutRef = useRef(null);
  const timerAvisoRef = useRef(null);
  const [mostrarAviso, setMostrarAviso] = useState(false);

  const extenderSesion = useCallback(() => {
    setMostrarAviso(false);
  }, []);

  useEffect(() => {
    const minutos = user?.preferencias?.tiempo_sesion ?? 30;
    if (!minutos || minutos === 0) return;

    const ms = minutos * 60 * 1000;
    // Mostrar aviso al menos 30s antes (por si tiempo_sesion es muy corto)
    const avisoMs = Math.max(ms - AVISO_ANTES_MS, 30_000);

    const resetTimer = () => {
      setMostrarAviso(false);
      clearTimeout(timerAvisoRef.current);
      clearTimeout(timerLogoutRef.current);

      timerAvisoRef.current = setTimeout(() => {
        setMostrarAviso(true);
      }, avisoMs);

      timerLogoutRef.current = setTimeout(() => {
        logout();
      }, ms);
    };

    resetTimer();

    EVENTOS_ACTIVIDAD.forEach(ev =>
      window.addEventListener(ev, resetTimer, { passive: true })
    );

    return () => {
      clearTimeout(timerAvisoRef.current);
      clearTimeout(timerLogoutRef.current);
      EVENTOS_ACTIVIDAD.forEach(ev =>
        window.removeEventListener(ev, resetTimer)
      );
    };
  }, [user?.preferencias?.tiempo_sesion, logout]);

  return { mostrarAviso, extenderSesion };
};

export default useIdleTimer;
