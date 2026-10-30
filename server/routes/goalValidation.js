const { body, param, query } = require('express-validator');
const AppError = require('../middleware/AppError');

function onlyFields(allowed) {
  return (req, res, next) => {
    const payload = req.body ?? {};
    if (typeof payload !== 'object' || Array.isArray(payload)) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Request body must be an object', 'body'));
    }

    const invalidField = Object.keys(payload).find((field) => !allowed.includes(field));
    if (invalidField) {
      return next(new AppError(
        400,
        'VALIDATION_ERROR',
        `${invalidField} is not an editable Goal field`,
        invalidField,
      ));
    }
    return next();
  };
}

const title = body('title')
  .exists().withMessage('title is required').bail()
  .isString().withMessage('title must be a string').bail()
  .trim()
  .notEmpty().withMessage('title must not be blank');

const deadlineOrNull = () => body('deadline')
  .custom((value) => value === null || (
    typeof value === 'string'
    && /T.*Z$/.test(value)
    && !Number.isNaN(Date.parse(value))
  ))
  .withMessage('deadline must be an ISO-8601 UTC date-time or null');

const progressMode = () => body('progressMode')
  .isIn(['task_based', 'manual'])
  .withMessage('progressMode must be task_based or manual');

const manualProgress = () => body('manualProgress')
  .isInt({ min: 0, max: 100 })
  .withMessage('manualProgress must be an integer from 0 to 100')
  .bail()
  .toInt();

const goalId = param('id')
  .isMongoId().withMessage('id must be a valid ObjectId');

const createGoalValidation = [
  title,
  deadlineOrNull().optional({ values: 'undefined' }),
  progressMode().optional({ values: 'undefined' }),
  manualProgress().optional({ values: 'undefined' }),
  body('manualProgress').custom((value, { req }) => (
    value === undefined || (req.body.progressMode ?? 'task_based') === 'manual'
  )).withMessage('manualProgress is only accepted for manual-mode Goals'),
];

const updateGoalValidation = [
  title,
  deadlineOrNull(),
  progressMode(),
];

const patchProgressValidation = [manualProgress()];

const listGoalsValidation = [
  query('page').optional({ values: 'undefined' }).isInt({ min: 1 })
    .withMessage('page must be an integer of at least 1').bail().toInt(),
  query('limit').optional({ values: 'undefined' }).isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer from 1 to 100').bail().toInt(),
];

module.exports = {
  onlyFields,
  goalId,
  createGoalValidation,
  updateGoalValidation,
  patchProgressValidation,
  listGoalsValidation,
};
