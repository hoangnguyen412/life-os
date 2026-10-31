const express = require('express');
const eventController = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  eventId,
  createEventValidation,
  replaceEventValidation,
  listEventsValidation,
} = require('./eventValidation');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listEventsValidation, validateRequest, eventController.list);
router.post('/', createEventValidation, validateRequest, eventController.create);
router.get('/:id', eventId, validateRequest, eventController.get);
router.put('/:id', eventId, replaceEventValidation, validateRequest, eventController.update);
router.delete('/:id', eventId, validateRequest, eventController.remove);

module.exports = router;
