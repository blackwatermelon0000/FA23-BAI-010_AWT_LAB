const { Router } = require('express');
const studentController = require('../controllers/student.controller');
const bookingController = require('../controllers/booking.controller');

const router = Router();

router.post('/', studentController.create);
router.get('/:regNo', studentController.getOne);

router.route('/:regNo/bookings').get(bookingController.list).post(bookingController.create);
router.delete('/:regNo/bookings/:slotId', bookingController.cancel);

module.exports = router;
