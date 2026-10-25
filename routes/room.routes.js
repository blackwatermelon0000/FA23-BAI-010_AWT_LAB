const { Router } = require('express');
const roomController = require('../controllers/room.controller');

const router = Router();

router.route('/').get(roomController.list).post(roomController.create);

router
  .route('/:roomCode')
  .get(roomController.getOne)
  .put(roomController.replace)
  .patch(roomController.update)
  .delete(roomController.remove);

module.exports = router;
