const mongoose = require('mongoose');
const { ROOM_CODE, START_HOURS, isValidDate } = require('../utils/validators');

const slotSchema = new mongoose.Schema(
  {
    roomCode: {
      type: String,
      required: [true, 'roomCode is required'],
      uppercase: true,
      trim: true,
      match: [ROOM_CODE, 'roomCode must look like ROOM-01'],
    },
    // Stored as YYYY-MM-DD so filtering by ?date= is an exact string match.
    date: {
      type: String,
      required: [true, 'date is required'],
      validate: { validator: isValidDate, message: 'date must be a valid date in YYYY-MM-DD format' },
    },
    startHour: {
      type: Number,
      required: [true, 'startHour is required'],
      enum: { values: START_HOURS, message: `startHour must be one of ${START_HOURS.join(', ')}` },
    },
    seats: { type: Number, required: true, min: 1 },
    booked: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// A room can only have one slot at a given date and hour.
slotSchema.index({ roomCode: 1, date: 1, startHour: 1 }, { unique: true });

slotSchema.virtual('seatsLeft').get(function seatsLeft() {
  return this.seats - this.booked;
});

slotSchema.virtual('endHour').get(function endHour() {
  return this.startHour + 2;
});

// Lets a slot be populated with its room through the shared roomCode.
slotSchema.virtual('room', {
  ref: 'Room',
  localField: 'roomCode',
  foreignField: 'roomCode',
  justOne: true,
});

slotSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => {
    ret.id = String(ret._id);
    delete ret._id;
    return ret;
  },
});

module.exports = mongoose.model('Slot', slotSchema);
