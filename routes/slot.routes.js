const { Router } = require('express');
const slotController = require('../controllers/slot.controller');

const router = Router();

router.route('/').get(slotController.list).post(slotController.create);
router.get('/:id', slotController.getOne);

module.exports = router;
