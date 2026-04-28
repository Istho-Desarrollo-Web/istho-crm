/**
 * ISTHO CRM - Servicio de WebSocket (Socket.IO)
 *
 * Gestiona conexiones WebSocket para notificaciones en tiempo real.
 * Soporta Redis adapter para despliegues multi-instancia (App Runner).
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 2.0.0
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

let io = null;

// Map local: userId → Set<socketId> (usado solo en modo single-instance como fallback)
const userSockets = new Map();

// ─────────────────────────────────────────────────────────────────────────────
// REDIS ADAPTER (opcional, para multi-instancia)
// ─────────────────────────────────────────────────────────────────────────────

async function _setupRedis() {
  const { createAdapter } = require('@socket.io/redis-adapter');
  const { Redis } = require('ioredis');

  const pubClient = new Redis(process.env.REDIS_URL, {
    lazyConnect: false,
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    enableOfflineQueue: false,
  });
  const subClient = pubClient.duplicate();

  await Promise.all([
    new Promise((resolve, reject) => {
      pubClient.once('ready', resolve);
      pubClient.once('error', reject);
    }),
    new Promise((resolve, reject) => {
      subClient.once('ready', resolve);
      subClient.once('error', reject);
    }),
  ]);

  io.adapter(createAdapter(pubClient, subClient));
  logger.info('[WS] Redis adapter configurado — modo multi-instancia activo');
}

// ─────────────────────────────────────────────────────────────────────────────
// INICIALIZAR
// ─────────────────────────────────────────────────────────────────────────────

const inicializar = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Conectar Redis adapter de forma no bloqueante
  if (process.env.REDIS_URL) {
    _setupRedis().catch((err) => {
      logger.warn('[WS] Redis no disponible, modo single-instance:', err.message);
    });
  }

  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) return next(new Error('Token requerido'));

    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
      socket.userId = decoded.id;
      socket.userRol = decoded.rol;
      // Guardar en socket.data para que fetchSockets() lo exponga entre instancias
      socket.data.userId = decoded.id;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  // Conexiones
  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Unirse a sala personal — permite emitir al usuario desde cualquier instancia
    socket.join(`user:${userId}`);

    // Mapa local (fallback sin Redis)
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    logger.info(
      `[WS] Usuario ${userId} conectado (socket: ${socket.id}, total local: ${userSockets.get(userId).size})`
    );

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      logger.debug(`[WS] Usuario ${userId} desconectado (socket: ${socket.id})`);
    });
  });

  logger.info('[WS] Socket.IO inicializado');
  return io;
};

// ─────────────────────────────────────────────────────────────────────────────
// EMISIÓN DE EVENTOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emitir evento a un usuario específico (funciona en multi-instancia con Redis)
 */
const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emitir evento a múltiples usuarios
 */
const emitToUsers = (userIds, event, data) => {
  if (!io) return;
  userIds.forEach((userId) => io.to(`user:${userId}`).emit(event, data));
};

/**
 * Emitir evento a todos los usuarios conectados
 */
const emitToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSULTAS DE ESTADO (async para soporte multi-instancia)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtener IDs de todos los usuarios conectados (incluye otras instancias si hay Redis)
 * @returns {Promise<number[]>}
 */
const getConnectedUserIds = async () => {
  if (!io) return [];
  try {
    const sockets = await io.fetchSockets();
    const ids = new Set(sockets.map((s) => s.data?.userId).filter(Boolean));
    return Array.from(ids).map(Number);
  } catch {
    // Fallback al mapa local si fetchSockets falla
    return Array.from(userSockets.keys()).map(Number);
  }
};

/**
 * Obtener cantidad de usuarios conectados (incluye otras instancias si hay Redis)
 * @returns {Promise<number>}
 */
const getConnectedCount = async () => {
  const ids = await getConnectedUserIds();
  return ids.length;
};

// ─────────────────────────────────────────────────────────────────────────────
// DESCONEXIÓN FORZADA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Forzar desconexión de un usuario en cualquier instancia
 * @param {number|string} userId
 * @param {object} options - { mensaje, tipo }
 * @returns {Promise<boolean>}
 */
const disconnectUser = async (userId, options = {}) => {
  if (!io) return false;

  const payload = {
    mensaje: options.mensaje || 'Tu sesión fue cerrada por un administrador',
    tipo: options.tipo || 'admin_logout',
  };

  // Notificar al usuario (funciona cross-instance con Redis)
  io.to(`user:${userId}`).emit('session:cerrada', payload);

  // Desconectar todos los sockets del usuario después de que reciban el evento
  setTimeout(async () => {
    try {
      await io.in(`user:${userId}`).disconnectSockets(true);
    } catch (_) {}
  }, 500);

  // Limpiar mapa local
  userSockets.delete(userId);
  userSockets.delete(String(userId));
  return true;
};

/**
 * Forzar desconexión de todos los usuarios conectados (excepto uno)
 * @param {number} exceptUserId
 * @returns {Promise<number>} cantidad de usuarios desconectados
 */
const disconnectAllUsers = async (exceptUserId) => {
  if (!io) return 0;

  const payload = {
    mensaje: 'Tu sesión fue cerrada por un administrador',
    tipo: 'admin_logout',
  };

  let count = 0;
  try {
    const sockets = await io.fetchSockets();
    const usersToDisconnect = new Set();

    sockets.forEach((socket) => {
      const uid = socket.data?.userId;
      if (uid && Number(uid) !== Number(exceptUserId)) {
        usersToDisconnect.add(uid);
      }
    });

    for (const uid of usersToDisconnect) {
      io.to(`user:${uid}`).emit('session:cerrada', payload);
      count++;
    }

    // Desconectar después de que los clientes reciban el evento
    setTimeout(async () => {
      try {
        for (const uid of usersToDisconnect) {
          await io.in(`user:${uid}`).disconnectSockets(true);
          userSockets.delete(uid);
          userSockets.delete(String(uid));
        }
      } catch (_) {}
    }, 500);
  } catch {
    // Fallback al mapa local si fetchSockets falla
    const toDelete = [];
    userSockets.forEach((_, userId) => {
      if (Number(userId) === Number(exceptUserId)) return;
      io.to(`user:${userId}`).emit('session:cerrada', payload);
      toDelete.push(userId);
      count++;
    });
    setTimeout(() => {
      toDelete.forEach((uid) => {
        try { io.in(`user:${uid}`).disconnectSockets(true); } catch (_) {}
        userSockets.delete(uid);
      });
    }, 500);
  }

  return count;
};

/**
 * Obtener instancia de IO
 */
const getIO = () => io;

module.exports = {
  inicializar,
  emitToUser,
  emitToUsers,
  emitToAll,
  getConnectedCount,
  getConnectedUserIds,
  disconnectUser,
  disconnectAllUsers,
  getIO,
};
