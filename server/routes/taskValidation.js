const { body, param, query } = require('express-validator');

const dateOrNull = (field) => body(field)
  .custom((value) => value === null || (
    typeof value === 'string'
    && /T.*Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
  ))
  .withMessage((_, { path }) => `${path} must be an ISO-8601 UTC date-time or null`);

const goalIdOrNull = (field) => body(field)
  .custom((value) => value === null || (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value)))
  .withMessage('goalId must be a valid ObjectId or null');

const descriptionOrNull = (field) => body(field)
  .custom((value) => value === null || typeof value === 'string')
  .withMessage('description must be a string or null')
  .customSanitizer((value) => typeof value === 'string' ? value.trim() : value);

const title = (required) => {
  const validator = body('title');
  if (required) validator.exists().withMessage('title is required').bail();
  return validator
    .isString().withMessage('title must be a string').bail()
    .trim()
    .notEmpty().withMessage('title must not be blank');
};

const taskId = param('id')
  .isMongoId().withMessage('id must be a valid ObjectId');

const createTaskValidation = [
  title(true),
  descriptionOrNull('description').optional({ values: 'undefined' }),
  body('status').optional({ values: 'undefined' }).isIn(['todo', 'in_progress', 'done'])
    .withMessage('status must be todo, in_progress, or done'),
  dateOrNull('dueDate').optional({ values: 'undefined' }),
  goalIdOrNull('goalId').optional({ values: 'undefined' }),
  body('priority').optional({ values: 'undefined' }).isIn(['low', 'medium', 'high'])
    .withMessage('priority must be low, medium, or high'),
];

const replaceTaskValidation = [
  title(true),
  descriptionOrNull('description'),
  body('status').isIn(['todo', 'in_progress', 'done'])
    .withMessage('status must be todo, in_progress, or done'),
  dateOrNull('dueDate'),
  goalIdOrNull('goalId'),
  body('priority').isIn(['low', 'medium', 'high'])
    .withMessage('priority must be low, medium, or high'),
];

const listTasksValidation = [
  query('status').optional({ values: 'undefined' }).isIn(['todo', 'in_progress', 'done'])
    .withMessage('status must be todo, in_progress, or done'),
  query('goalId').optional({ values: 'undefined' }).custom((value) => (
    value === 'none' || (typeof value === 'string' && /^[0-9a-fA-F]{24}$/.test(value))
  )).withMessage('goalId must be a valid ObjectId or none'),
  query('overdue').optional({ values: 'undefined' }).isIn(['true', 'false'])
    .withMessage('overdue must be true or false').bail().toBoolean(),
  query('sort').optional({ values: 'undefined' })
    .isIn(['dueDate_asc', 'priority_desc', 'createdAt_desc'])
    .withMessage('sort must be dueDate_asc, priority_desc, or createdAt_desc'),
  query('page').optional({ values: 'undefined' }).isInt({ min: 1 })
    .withMessage('page must be an integer of at least 1').bail().toInt(),
  query('limit').optional({ values: 'undefined' }).isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer from 1 to 100').bail().toInt(),
];

module.exports = { taskId, createTaskValidation, replaceTaskValidation, listTasksValidation };
