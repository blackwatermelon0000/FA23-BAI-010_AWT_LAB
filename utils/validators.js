const mongoose = require('mongoose');
const AppError = require('./AppError');

const ROOM_CODE = /^ROOM-\d{2,}$/;
const REG_NO = /^[A-Z]{2}\d{2}-[A-Z]{2,4}-\d{3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const START_HOURS = [8, 10, 12, 14, 16];

function normalizeCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

// Throws 400 when the id is not a valid MongoDB ObjectId.
function assertObjectId(id, name = 'id') {
  if (!id) throw AppError.badRequest(`${name} is required`);
  if (!mongoose.isValidObjectId(id)) throw AppError.badRequest(`${name} "${id}" is not a valid id`);
}

// Accepts only real calendar dates written as YYYY-MM-DD.
function isValidDate(value) {
  if (typeof value !== 'string' || !DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

module.exports = {
  ROOM_CODE,
  REG_NO,
  DATE,
  START_HOURS,
  normalizeCode,
  assertObjectId,
  isValidDate,
};
