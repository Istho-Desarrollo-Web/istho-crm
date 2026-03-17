/**
 * ISTHO CRM - Servicio de WebSocket (Socket.IO)
 *
 * Gestiona conexiones WebSocket para notificaciones en tiempo real.
 * Autenticación via JWT en el handshake.
 *
 * @author Coordinación TI - ISTHO S.A.S.
 * @version 1.0.0
 */

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const logger = require('../utils/logger');

let io = null;

// Map: userId → Set<socketId>
const userSockets = new Map();

/**
 * Inicializar Socket.IO en el servidor HTTP
 */
const inicializar = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : ['http://localhost:5173'],
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Middleware de autenticación
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Token requerido'));
    }

    try {
      const decoded = jwt.verify(token, jwtConfig.secret, {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
      });
      socket.userId = decoded.id;
      socket.userRol = decoded.rol;
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  // Conexiones
  io.on('connection', (socket) => {
    const userId = socket.userId;

    // Registrar socket del usuario
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    logger.info(`[WS] Usuario ${userId} conectado (socket: ${socket.id}, total: ${userSockets.get(userId).size})`);

    // Desconexión
    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          userSockets.delete(userId);
        }
      }
      logger.debug(`[WS] Usuario ${userId} desconectado (socket: ${socket.id})`);
    });
  });

  logger.info('[WS] Socket.IO inicializado');
  return io;
};

/**
 * Emitir evento a un usuario específico
 */
const emitToUser = (userId, event, data) => {
  if (!io) return;
  const sockets = userSockets.get(userId);
  if (sockets && sockets.size > 0) {
    sockets.forEach(socketId => {
      io.to(socketId).emit(event, data);
    });
  }
};

/**
 * Emitir evento a múltiples usuarios
 */
const emitToUsers = (userIds, event, data) => {
  if (!io) return;
  userIds.forEach(userId => emitToUser(userId, event, data));
};

/**
 * Emitir evento a todos los usuarios conectados
 */
const emitToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

/**
 * Obtener cantidad de usuarios conectados
 */
const getConnectedCount = () => userSockets.size;

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
  getIO,
};
