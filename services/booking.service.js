const Booking = require('../models/Booking');
const Room = require('../models/Room');
const Slot = require('../models/Slot');
const AppError = require('../utils/AppError');
const events = require('../utils/events');
const { assertObjectId } = require('../utils/validators');
const studentService = require('./student.service');

function toBookingView(booking, slot, room, regNo) {
  return {
    id: String(booking._id),
    regNo,
    slotId: String(slot._id),
    roomCode: slot.roomCode,
    roomName: room ? room.name : null,
    date: slot.date,
    startHour: slot.startHour,
    endHour: slot.startHour + 2,
    bookedAt: booking.createdAt,
  };
}

// Lists the bookings of an already-loaded student with room name, date and start hour.
async function bookingsOf(student) {
  const bookings = await Booking.find({ student: student._id }).populate({
    path: 'slot',
    populate: { path: 'room', select: 'name' },
  });
  return bookings
    .filter((b) => b.slot) // ignore bookings whose slot was removed
    .map((b) => toBookingView(b, b.slot, b.slot.room, student.regNo))
    .sort((a, b) => a.date.localeCompare(b.date) || a.startHour - b.startHour);
}

async function listBookings(regNo) {
  const student = await studentService.getStudent(regNo);
  return bookingsOf(student);
}

async function bookSlot(regNo, slotId) {
  assertObjectId(slotId, 'slotId');
  const student = await studentService.getStudent(regNo);
  const slot = await Slot.findById(slotId);
  if (!slot) throw AppError.notFound(`Slot ${slotId} not found`);

  // A slot cannot be booked once its scheduled start time has passed.
  // Slot dates and hours are interpreted in the campus server's local timezone.
  const slotStart = new Date(`${slot.date}T${String(slot.startHour).padStart(2, '0')}:00:00`);
  if (Number.isFinite(slotStart.getTime()) && slotStart.getTime() <= Date.now()) {
    throw AppError.conflict('This time slot has already started', 'SLOT_STARTED');
  }

  if (await Booking.exists({ student: student._id, slot: slot._id })) {
    throw AppError.conflict('Student has already booked this slot', 'ALREADY_BOOKED');
  }

  // Take a seat atomically: the filter only matches while booked < seats, so two
  // concurrent requests can never both get the last seat.
  const updated = await Slot.findOneAndUpdate(
    { _id: slot._id, $expr: { $lt: ['$booked', '$seats'] } },
    { $inc: { booked: 1 } },
    { new: true }
  );
  if (!updated) throw AppError.conflict('Slot is full', 'SLOT_FULL');

  let booking;
  try {
    booking = await Booking.create({ student: student._id, slot: slot._id });
  } catch (err) {
    // Give the seat back if the booking could not be stored (e.g. a parallel duplicate).
    await Slot.updateOne({ _id: slot._id, booked: { $gt: 0 } }, { $inc: { booked: -1 } });
    if (err.code === 11000) throw AppError.conflict('Student has already booked this slot', 'ALREADY_BOOKED');
    throw err;
  }

  events.emit('slot:updated', updated);
  const room = await Room.findOne({ roomCode: updated.roomCode }, 'name');
  return { ...toBookingView(booking, updated, room, student.regNo), seatsLeft: updated.seats - updated.booked };
}

async function cancelBooking(regNo, slotId) {
  assertObjectId(slotId, 'slotId');
  const student = await studentService.getStudent(regNo);
  const booking = await Booking.findOneAndDelete({ student: student._id, slot: slotId });
  if (!booking) throw AppError.notFound(`Student ${student.regNo} has no booking for slot ${slotId}`);

  const updated = await Slot.findOneAndUpdate(
    { _id: slotId, booked: { $gt: 0 } },
    { $inc: { booked: -1 } },
    { new: true }
  );
  if (updated) events.emit('slot:updated', updated);
  return true;
}

module.exports = { bookSlot, cancelBooking, listBookings, bookingsOf };
