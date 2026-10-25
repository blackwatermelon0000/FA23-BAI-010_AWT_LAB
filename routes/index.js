const { Router } = require('express');
const roomRoutes = require('./room.routes');
const slotRoutes = require('./slot.routes');
const studentRoutes = require('./student.routes');

// Everything mounted here lives under /api/v1 (see app.js).
const router = Router();

router.use('/rooms', roomRoutes);
router.use('/slots', slotRoutes);
router.use('/students', studentRoutes);

module.exports = router;
