const express = require('express');
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  taskId,
  createTaskValidation,
  replaceTaskValidation,
  listTasksValidation,
} = require('./taskValidation');

const router = express.Router();

router.use(authMiddleware);

router.get('/', listTasksValidation, validateRequest, taskController.list);
router.post('/', createTaskValidation, validateRequest, taskController.create);
router.get('/:id', taskId, validateRequest, taskController.get);
router.put('/:id', taskId, replaceTaskValidation, validateRequest, taskController.update);
router.delete('/:id', taskId, validateRequest, taskController.remove);

module.exports = router;