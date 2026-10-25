const roomService = require('../services/room.service');
const slotService = require('../services/slot.service');
const studentService = require('../services/student.service');
const bookingService = require('../services/booking.service');
const Room = require('../models/Room');

// Resolvers are thin: every query and mutation delegates to the same service
// functions used by the REST controllers, so the business rules live in one place.
const resolvers = {
  Query: {
    rooms: () => roomService.listRooms(),
    slots: (_, { roomCode, date }) => slotService.findSlots({ roomCode, date }),
    student: (_, { regNo }) => studentService.findStudent(regNo),
  },

  Mutation: {
    bookSlot: (_, { regNo, slotId }) => bookingService.bookSlot(regNo, slotId),
    cancelBooking: (_, { regNo, slotId }) => bookingService.cancelBooking(regNo, slotId),
  },

  Slot: {
    // exec() returns a real promise; graphql-js may call then() on a Mongoose query more than once.
    room: (slot) => Room.findOne({ roomCode: slot.roomCode }).exec(),
  },

  Student: {
    bookings: (student) => bookingService.bookingsOf(student),
  },

  Booking: {
    bookedAt: (booking) => new Date(booking.bookedAt).toISOString(),
  },
};

module.exports = resolvers;
