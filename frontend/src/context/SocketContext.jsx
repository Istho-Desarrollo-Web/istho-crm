/**
 * ISTHO CRM - Contexto de WebSocket
 *
 * Gestiona la conexión Socket.IO para notificaciones en tiempo real.
 * Se conecta automáticamente cuando el usuario está autenticado.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const listenersRef = useRef(new Map());

  useEffect(() => {
    if (!isAuthenticated) {
      // Desconectar si no está autenticado
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('istho_token');
    if (!token) return;

    // En desarrollo: conectar via proxy de Vite (misma URL del frontend)
    // En producción: conectar al backend directamente
    const serverUrl = import.meta.env.PROD
      ? (import.meta.env.VITE_API_URL?.replace('/api/v1', '') || window.location.origin)
      : undefined; // undefined = misma URL (proxy de Vite)

    const socket = io(serverUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
    });

    socket.on('connect', () => {
      setConnected(true);
      if (import.meta.env.DEV) {
        console.log('[WS] Conectado:', socket.id);
      }
    });

    socket.on('disconnect', (reason) => {
      setConnected(false);
      if (import.meta.env.DEV) {
        console.log('[WS] Desconectado:', reason);
      }
    });

    socket.on('connect_error', (err) => {
      if (import.meta.env.DEV) {
        console.warn('[WS] Error de conexión:', err.message);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated]);

  /**
   * Suscribirse a un evento
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Handler
   */
  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
    // Guardar para re-attach en reconexión
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);
  };

  /**
   * Desuscribirse de un evento
   */
  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
    listenersRef.current.get(event)?.delete(callback);
  };

  return (
    <SocketContext.Provider value={{ connected, on, off, socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
};
