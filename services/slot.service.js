const Room = require('../models/Room');
const Slot = require('../models/Slot');
const AppError = require('../utils/AppError');
const { normalizeCode, assertObjectId, isValidDate } = require('../utils/validators');

const SORT = { date: 1, startHour: 1, roomCode: 1 };
const MAX_LIMIT = 100;

// Turns { roomCode, date, hasSeats } into a MongoDB filter. Bad values are 400s.
function buildFilter({ roomCode, date, hasSeats } = {}) {
  const filter = {};
  if (roomCode) filter.roomCode = normalizeCode(roomCode);
  if (date) {
    if (!isValidDate(date)) throw AppError.badRequest('date must be a valid date in YYYY-MM-DD format');
    filter.date = date;
  }
  if (hasSeats !== undefined && hasSeats !== null && hasSeats !== '') {
    const v = String(hasSeats).toLowerCase();
    if (v === 'true') filter.$expr = { $lt: ['$booked', '$seats'] };
    else if (v === 'false') filter.$expr = { $gte: ['$booked', '$seats'] };
    else throw AppError.badRequest('hasSeats must be true or false');
  }
  return filter;
}

function parsePositiveInt(value, name, fallback) {
  if (value === undefined || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw AppError.badRequest(`${name} must be a positive whole number`);
  return n;
}

async function createSlot(body) {
  const { roomCode, date, startHour } = body;
  if (!roomCode) throw AppError.unprocessable('Validation failed', { roomCode: 'roomCode is required' });
  const code = normalizeCode(roomCode);
  const room = await Room.findOne({ roomCode: code });
  if (!room) throw AppError.notFound(`Room ${code} not found`);

  // seats is copied from the room; booked always starts at 0 whatever the client sends.
  try {
    return await Slot.create({ roomCode: code, date, startHour, seats: room.seats, booked: 0 });
  } catch (err) {
    if (err.code === 11000) {
      throw AppError.conflict(`${code} already has a slot on ${date} at ${startHour}:00`, 'SLOT_EXISTS');
    }
    throw err;
  }
}

async function getSlot(id) {
  assertObjectId(id, 'slot id');
  const slot = await Slot.findById(id);
  if (!slot) throw AppError.notFound(`Slot ${id} not found`);
  return slot;
}

// Paginated list used by GET /api/v1/slots.
async function listSlots(query = {}) {
  const filter = buildFilter(query);
  const page = parsePositiveInt(query.page, 'page', 1);
  const limit = Math.min(parsePositiveInt(query.limit, 'limit', 10), MAX_LIMIT);

  const [data, total] = await Promise.all([
    Slot.find(filter).sort(SORT).skip((page - 1) * limit).limit(limit),
    Slot.countDocuments(filter),
  ]);
  return { data, page, limit, total, totalPages: Math.ceil(total / limit) };
}

// Unpaginated list used by GraphQL and the Socket.IO board.
async function findSlots(filters = {}) {
  return Slot.find(buildFilter(filters)).sort(SORT);
}

module.exports = { createSlot, getSlot, listSlots, findSlots };
