const { Server } = require('socket.io');
const { env } = require('./config/env');

let io;

const initializeSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join organization room
    socket.on('join:org', (orgId) => {
      socket.join(`org:${orgId}`);
      console.log(`Socket ${socket.id} joined org:${orgId}`);
    });

    // Join incident-specific room
    socket.on('join:incident', (incidentId) => {
      socket.join(`incident:${incidentId}`);
      console.log(`Socket ${socket.id} joined incident:${incidentId}`);
    });

    // Leave incident room
    socket.on('leave:incident', (incidentId) => {
      socket.leave(`incident:${incidentId}`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocket first.');
  }
  return io;
};

// Emit helpers for domain events
const emitToOrg = (orgId, event, data) => {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
};

const emitToIncident = (incidentId, event, data) => {
  if (io) {
    io.to(`incident:${incidentId}`).emit(event, data);
  }
};

module.exports = {
  initializeSocket,
  getIO,
  emitToOrg,
  emitToIncident,
};
