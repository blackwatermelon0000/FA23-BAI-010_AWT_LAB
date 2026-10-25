const bookingService = require('../services/booking.service');

async function create(req, res) {
  const { slotId } = req.body || {};
  const booking = await bookingService.bookSlot(req.params.regNo, slotId);
  res.status(201).json(booking);
}

async function list(req, res) {
  res.json(await bookingService.listBookings(req.params.regNo));
}

async function cancel(req, res) {
  await bookingService.cancelBooking(req.params.regNo, req.params.slotId);
  res.status(204).end();
}

module.exports = { create, list, cancel };
