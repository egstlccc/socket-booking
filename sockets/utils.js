let ioRef = null;
const logger = require('../utils/logger');

// Basic per-socket, per-event deduplication to avoid rapid duplicate emits of the same booking
const lastSentBySocketEvent = new Map();
const DEDUPE_WINDOW_MS = parseInt(process.env.SOCKET_EMIT_DEDUPE_MS || '1200', 10);

function shouldSkipDuplicate(socketId, event, data) {
  try {
    const dedupeKey = data && (data.bookingId || data.id || data._id) ? String(data.bookingId || data.id || data._id) : 'no-key';
    const key = `${socketId}|${event}|${dedupeKey}`;
    const now = Date.now();
    const last = lastSentBySocketEvent.get(key);
    if (last && (now - last) < DEDUPE_WINDOW_MS) {
      return true;
    }
    lastSentBySocketEvent.set(key, now);
    return false;
  } catch (_) {
    return false;
  }
}

function setIo(io) {
  ioRef = io;
}

function getIo() {
  return ioRef;
}

function broadcast(event, data) {
  const io = ioRef;
  if (io) {
    try {
      io.emit(event, data);
    } catch (e) {
      logger.error('Failed to broadcast event', event, e);
    }
  } else {
    logger.warn('Socket.io not initialized for broadcast.');
  }
}

const sendMessageToSocketId = (socketId, messageObject) => {
  const io = ioRef;
  if (io) {
    try {
      if (shouldSkipDuplicate(socketId, messageObject.event, messageObject.data)) {
        try { logger.info('deduped duplicate emit', { socketId, event: messageObject.event }); } catch (_) {}
        return;
      }
      logger.info('message sent to: ', socketId);
      io.to(socketId).emit(messageObject.event, messageObject.data);
    } catch (e) {
      logger.error('Failed to send message to socket', socketId, e);
    }
  } else {
    logger.warn('Socket.io not initialized.');
  }
};

module.exports = { setIo, getIo, broadcast, sendMessageToSocketId, shouldSkipDuplicate };
