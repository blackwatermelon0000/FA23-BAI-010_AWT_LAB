const Room = require('../models/Room');
const Slot = require('../models/Slot');
const AppError = require('../utils/AppError');
const { normalizeCode } = require('../utils/validators');

const EDITABLE_FIELDS = ['name', 'building', 'seats'];

function pick(body, fields) {
  const out = {};
  for (const f of fields) if (body[f] !== undefined) out[f] = body[f];
  return out;
}

// roomCode is the identity of a room and can never be changed after creation.
function assertRoomCodeUnchanged(roomCode, body) {
  if (body.roomCode !== undefined && normalizeCode(body.roomCode) !== roomCode) {
    throw AppError.unprocessable('roomCode cannot be changed after the room is created', {
      roomCode: `expected "${roomCode}" or no roomCode at all`,
    });
  }
}

async function listRooms() {
  return Room.find().sort({ roomCode: 1 });
}

async function getRoom(roomCode) {
  const code = normalizeCode(roomCode);
  const room = await Room.findOne({ roomCode: code });
  if (!room) throw AppError.notFound(`Room ${code} not found`);
  return room;
}

async function createRoom(body) {
  const data = pick(body, ['roomCode', ...EDITABLE_FIELDS]);
  if (data.roomCode && (await Room.exists({ roomCode: normalizeCode(data.roomCode) }))) {
    throw AppError.conflict(`Room ${normalizeCode(data.roomCode)} already exists`, 'ROOM_EXISTS');
  }
  return Room.create(data);
}

// PUT: replaces every editable field, so all of them must be sent.
async function replaceRoom(roomCode, body) {
  const room = await getRoom(roomCode);
  assertRoomCodeUnchanged(room.roomCode, body);
  for (const f of EDITABLE_FIELDS) room.set(f, body[f]);
  return room.save();
}

// PATCH: changes only the fields that were sent.
async function updateRoom(roomCode, body) {
  const room = await getRoom(roomCode);
  assertRoomCodeUnchanged(room.roomCode, body);
  const changes = pick(body, EDITABLE_FIELDS);
  if (Object.keys(changes).length === 0) {
    throw AppError.badRequest(`Send at least one of: ${EDITABLE_FIELDS.join(', ')}`);
  }
  room.set(changes);
  return room.save();
}

async function deleteRoom(roomCode) {
  const room = await getRoom(roomCode);
  if (await Slot.exists({ roomCode: room.roomCode, booked: { $gt: 0 } })) {
    throw AppError.conflict(
      `Room ${room.roomCode} has slots with bookings and cannot be deleted`,
      'ROOM_HAS_BOOKINGS'
    );
  }
  await Slot.deleteMany({ roomCode: room.roomCode });
  await room.deleteOne();
}

module.exports = { listRooms, getRoom, createRoom, replaceRoom, updateRoom, deleteRoom };
