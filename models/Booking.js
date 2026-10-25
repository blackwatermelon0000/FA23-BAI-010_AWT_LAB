const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    slot: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true },
  },
  { timestamps: true }
);

// A student cannot book the same slot twice. The database enforces it too.
bookingSchema.index({ student: 1, slot: 1 }, { unique: true });

module.exports = mongoose.model('Booking', bookingSchema);
