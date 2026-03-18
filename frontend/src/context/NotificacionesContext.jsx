/**
 * ============================================================================
 * ISTHO CRM - Contexto de Notificaciones
 * ============================================================================
 * Provee estado global de notificaciones con polling automático.
 * Usado por la campana del header y la página de notificaciones.
 *
 * CORRECCIÓN v1.2.0:
 * - Polling ahora también actualiza notificaciones recientes (no solo count)
 * - Fetch inicial incluye count + recientes para que el badge y dropdown
 *   estén listos desde el primer render
 * - Retry más agresivo en la carga inicial
 *
 * @author Coordinación TI ISTHO
 * @version 1.2.0
 * @date Marzo 2026
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useSocket } from './SocketContext';
import notificacionesService from '../api/notificacionesService';

const NotificacionesContext = createContext();

const POLLING_INTERVAL = 30000; // 30 segundos
const INITIAL_RETRY_DELAY = 2000; // 2 segundos para retry inicial

/**
 * Genera un sonido de notificación con Web Audio API (sin archivo externo)
 * Dos tonos cortos: ding-ding
 */
const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playTone = (freq, startTime, duration) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = ctx.currentTime;
    playTone(880, now, 0.12);       // A5 — primer ding
    playTone(1174.66, now + 0.15, 0.15); // D6 — segundo ding (más alto)

    // Cerrar contexto después
    setTimeout(() => ctx.close().catch(() => {}), 500);
  } catch {
    // Web Audio API no disponible o bloqueada
  }
};

export const useNotificaciones = () => {
  const context = useContext(NotificacionesContext);
  if (!context) {
    throw new Error('useNotificaciones must be used within a NotificacionesProvider');
  }
  return context;
};

export const NotificacionesProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const socket = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificaciones, setNotificaciones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ultimaNotificacion, setUltimaNotificacion] = useState(null);
  const intervalRef = useRef(null);
  const retryRef = useRef(null);
  const mountedRef = useRef(true);

  // Fetch combinado: count + recientes en una sola función
  const fetchAll = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    try {
      // Ejecutar ambas peticiones en paralelo
      const [countResult, listResult] = await Promise.allSettled([
        notificacionesService.getCount(),
        notificacionesService.getAll({ page: 1, limit: 5 }),
      ]);

      if (!mountedRef.current) return;

      // Actualizar conteo
      if (countResult.status === 'fulfilled') {
        const count = countResult.value;
        if (typeof count === 'number') {
          setUnreadCount(count);
        }
      }

      // Actualizar lista reciente
      if (listResult.status === 'fulfilled') {
        const result = listResult.value;
        const data = Array.isArray(result?.data) ? result.data : [];
        setNotificaciones(data);

        // Si el count falló, intentar derivarlo de la lista
        if (countResult.status !== 'fulfilled' && data.length > 0) {
          const unread = data.filter(n => !n.leida).length;
          setUnreadCount(prev => Math.max(prev, unread));
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NotificacionesContext] Error en fetchAll:', err);
      }
    }
  }, [user, isAuthenticated]);

  // Obtener conteo de no leídas (ligero, para polling rápido)
  const fetchCount = useCallback(async () => {
    if (!user || !isAuthenticated) return;
    try {
      const count = await notificacionesService.getCount();
      if (mountedRef.current && typeof count === 'number') {
        setUnreadCount(count);
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NotificacionesContext] Error en fetchCount:', err);
      }
    }
  }, [user, isAuthenticated]);

  // Obtener últimas notificaciones (para el dropdown)
  const fetchRecientes = useCallback(async () => {
    if (!user || !isAuthenticated) return [];
    setLoading(true);
    try {
      const result = await notificacionesService.getAll({ page: 1, limit: 5 });
      const data = Array.isArray(result?.data) ? result.data : [];
      if (mountedRef.current) {
        setNotificaciones(data);
      }
      // También actualizar el conteo
      try {
        const count = await notificacionesService.getCount();
        if (mountedRef.current && typeof count === 'number') {
          setUnreadCount(count);
        }
      } catch {
        // Silenciar error de count si la lista ya se cargó
      }
      return data;
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn('[NotificacionesContext] Error en fetchRecientes:', err);
      }
      return [];
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [user, isAuthenticated]);

  // Marcar una como leída
  const marcarLeida = useCallback(async (id) => {
    try {
      await notificacionesService.marcarLeida(id);
      setNotificaciones(prev =>
        prev.map(n => n.id === id ? { ...n, leida: true, fecha_lectura: new Date() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error al marcar leída:', err);
    }
  }, []);

  // Marcar todas como leídas
  const marcarTodasLeidas = useCallback(async () => {
    try {
      await notificacionesService.marcarTodasLeidas();
      setNotificaciones(prev =>
        prev.map(n => ({ ...n, leida: true, fecha_lectura: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error al marcar todas leídas:', err);
    }
  }, []);

  // Refrescar todo (conteo + lista)
  const refresh = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  // Polling automático: count + recientes al inicio, count en polling regular
  useEffect(() => {
    mountedRef.current = true;

    if (!user || !isAuthenticated) {
      setUnreadCount(0);
      setNotificaciones([]);
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
      return;
    }

    // Fetch inicial completo (count + recientes)
    fetchAll();

    // Retry agresivo para captar notificaciones tras login
    retryRef.current = setTimeout(() => {
      fetchAll();
    }, INITIAL_RETRY_DELAY);

    // Polling regular: alterna entre fetchCount (ligero) y fetchAll (completo)
    let pollCycle = 0;
    intervalRef.current = setInterval(() => {
      pollCycle++;
      if (pollCycle % 3 === 0) {
        // Cada 3 ciclos (~90s), refrescar también la lista
        fetchAll();
      } else {
        // Ciclos normales: solo count
        fetchCount();
      }
    }, POLLING_INTERVAL);

    return () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (retryRef.current) clearTimeout(retryRef.current);
    };
  }, [user, isAuthenticated, fetchAll, fetchCount]);

  // Escuchar notificaciones en tiempo real via WebSocket
  const socketConnected = socket?.connected;
  useEffect(() => {
    if (!socket?.on || !socketConnected) return;

    const handleNuevaNotificacion = (data) => {
      if (!mountedRef.current) return;

      // Actualizar contador
      setUnreadCount(prev => prev + 1);

      // Agregar al inicio de la lista
      setNotificaciones(prev => [
        { ...data, leida: false, id: data.id || Date.now() },
        ...prev.slice(0, 4), // Mantener máximo 5
      ]);

      // Reproducir sonido si está habilitado en preferencias
      const sonidoHabilitado = user?.preferencias?.notificaciones_sonido !== false;
      if (sonidoHabilitado) {
        playNotificationSound();
      }

      // Guardar última para toast
      setUltimaNotificacion(data);
    };

    socket.on('notificacion:nueva', handleNuevaNotificacion);

    return () => {
      socket.off('notificacion:nueva', handleNuevaNotificacion);
    };
  }, [socket, socketConnected]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NotificacionesContext.Provider
      value={{
        unreadCount,
        notificaciones,
        loading,
        ultimaNotificacion,
        fetchCount,
        fetchRecientes,
        marcarLeida,
        marcarTodasLeidas,
        refresh,
      }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
};