const bookingSocket = require('./bookingSocket');
const driverSocket = require('./driverSocket');
const passengerSocket = require('./passengerSocket');
const liveSocket = require('./liveSocket');
const { socketAuth } = require('../utils/jwt');
const { setIo } = require('./utils');
const logger = require('../utils/logger');
const registerDriverSocketHandlers = require('../modules/driver/driverSocketHandlers');

function attachSocketHandlers(io) {
  setIo(io);
  try { io.setMaxListeners && io.setMaxListeners(50); } catch (_) {}
  io.use(socketAuth);
  io.on('connection', (socket) => {
    try { logger.info('[socket] connected', { sid: socket.id, user: socket.user && { id: socket.user.id, type: socket.user.type } }); } catch (_) {}
    try { socket.setMaxListeners && socket.setMaxListeners(50); } catch (_) {}
    bookingSocket(io, socket);
    driverSocket(io, socket);
    passengerSocket(io, socket);
    liveSocket(io, socket);
    // Attach any modular driver handlers here to avoid nested connection registration elsewhere
    try { registerDriverSocketHandlers && registerDriverSocketHandlers(io, socket); } catch (_) {}
    socket.on('disconnect', (reason) => {
      try { logger.info('[socket] disconnected', { sid: socket.id, reason }); } catch (_) {}
    });
  });
}

module.exports = { attachSocketHandlers };

