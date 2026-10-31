const express = require('express');
const goalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  onlyFields,
  goalId,
  createGoalValidation,
  updateGoalValidation,
  patchProgressValidation,
  listGoalsValidation,
} = require('./goalValidation');

const router = express.Router();

router.use(authMiddleware);
router.get('/', listGoalsValidation, validateRequest, goalController.list);
router.post(
  '/',
  onlyFields(['title', 'deadline', 'progressMode', 'manualProgress']),
  createGoalValidation,
  validateRequest,
  goalController.create,
);
router.patch(
  '/:id/progress',
  goalId,
  onlyFields(['manualProgress']),
  patchProgressValidation,
  validateRequest,
  goalController.updateProgress,
);
router.get('/:id', goalId, validateRequest, goalController.get);
router.put(
  '/:id',
  goalId,
  onlyFields(['title', 'deadline', 'progressMode']),
  updateGoalValidation,
  validateRequest,
  goalController.update,
);
router.delete('/:id', goalId, validateRequest, goalController.remove);

module.exports = router;
