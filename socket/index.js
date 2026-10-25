const crypto = require('crypto');
const { Server } = require('socket.io');
const events = require('../utils/events');
const roomService = require('../services/room.service');
const slotService = require('../services/slot.service');

const MAX_ANNOUNCEMENT_LENGTH = 300;

function toBoardSlot(slot) {
  return {
    id: String(slot._id),
    date: slot.date,
    startHour: slot.startHour,
    seats: slot.seats,
    booked: slot.booked,
    seatsLeft: slot.seats - slot.booked,
  };
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// Default namespace: the board pages.
function registerBoardNamespace(io) {
  io.on('connection', (socket) => {
    socket.on('join:room', async (roomCode, ack) => {
      if (typeof ack !== 'function') return;
      try {
        const room = await roomService.getRoom(roomCode);

        // A board watches one room at a time, so leave any room joined before.
        for (const joined of socket.rooms) if (joined !== socket.id) socket.leave(joined);
        socket.join(room.roomCode);

        const slots = await slotService.findSlots({ roomCode: room.roomCode });
        ack({
          ok: true,
          room: { roomCode: room.roomCode, name: room.name, building: room.building, seats: room.seats },
          slots: slots.map(toBoardSlot),
        });
      } catch (err) {
        ack({ ok: false, error: err.message });
      }
    });
  });

  // Booking and cancelling happen through REST/GraphQL; the service publishes
  // the change and only sockets in that roomCode's Socket.IO room receive it.
  events.on('slot:updated', (slot) => {
    io.to(slot.roomCode).emit('slot:updated', {
      slotId: String(slot._id),
      seatsLeft: slot.seats - slot.booked,
    });
  });
}

// /admin namespace: needs the adminKey from .env, can broadcast announcements to every board.
function registerAdminNamespace(io, adminKey) {
  const admin = io.of('/admin');

  admin.use((socket, next) => {
    const key = socket.handshake.auth && socket.handshake.auth.adminKey;
    if (!adminKey) return next(new Error('Admin namespace is disabled: ADMIN_KEY is not configured on the server'));
    if (!key) return next(new Error('Admin key is required to connect to /admin'));
    if (!safeEqual(key, adminKey)) return next(new Error('Invalid admin key: connection refused'));
    next();
  });

  admin.on('connection', (socket) => {
    socket.on('announce', (message, ack) => {
      const reply = typeof ack === 'function' ? ack : () => {};
      const text = typeof message === 'string' ? message.trim() : '';
      if (!text) return reply({ ok: false, error: 'Announcement message cannot be empty' });
      if (text.length > MAX_ANNOUNCEMENT_LENGTH) {
        return reply({ ok: false, error: `Announcement must be at most ${MAX_ANNOUNCEMENT_LENGTH} characters` });
      }

      io.of('/').emit('announce', { message: text, at: new Date().toISOString() });
      reply({ ok: true, boards: io.of('/').sockets.size });
    });
  });
}

function initSocket(httpServer, { adminKey }) {
  const io = new Server(httpServer);
  registerBoardNamespace(io);
  registerAdminNamespace(io, adminKey);
  return io;
}

module.exports = { initSocket };
