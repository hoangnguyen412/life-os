const { body, param, query } = require('express-validator');

function isUtcDateTime(value) {
  if (typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/);
  if (!match || Number.isNaN(Date.parse(value))) return false;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
    && hour <= 23
    && minute <= 59
    && second <= 59;
}

const title = body('title')
  .exists().withMessage('title is required').bail()
  .isString().withMessage('title must be a string').bail()
  .trim()
  .notEmpty().withMessage('title must not be blank');

const startTime = body('startTime')
  .exists().withMessage('startTime is required').bail()
  .custom(isUtcDateTime)
  .withMessage('startTime must be a valid ISO-8601 UTC date-time');

const endTime = body('endTime')
  .exists().withMessage('endTime is required').bail()
  .custom(isUtcDateTime)
  .withMessage('endTime must be a valid ISO-8601 UTC date-time').bail()
  .custom((value, { req }) => isUtcDateTime(req.body.startTime)
    && Date.parse(value) > Date.parse(req.body.startTime))
  .withMessage('endTime must be later than startTime');

const description = body('description')
  .custom((value) => value === null || typeof value === 'string')
  .withMessage('description must be a string or null')
  .customSanitizer((value) => typeof value === 'string' ? value.trim() : value);

const eventId = param('id')
  .isMongoId().withMessage('id must be a valid ObjectId');

const createEventValidation = [
  title,
  startTime,
  endTime,
  description.optional({ values: 'undefined' }),
];

const replaceEventValidation = [
  title,
  startTime,
  endTime,
  body('description').exists().withMessage('description is required').bail(),
  description,
];

const listEventsValidation = [
  query('from').optional({ values: 'undefined' }).custom(isUtcDateTime)
    .withMessage('from must be a valid ISO-8601 UTC date-time'),
  query('to').optional({ values: 'undefined' }).custom(isUtcDateTime)
    .withMessage('to must be a valid ISO-8601 UTC date-time'),
  query('to').custom((to, { req }) => {
    const from = req.query.from;
    if (from === undefined && to === undefined) return true;
    return from !== undefined && to !== undefined
      && isUtcDateTime(from)
      && isUtcDateTime(to)
      && Date.parse(from) < Date.parse(to);
  }).withMessage('from and to must be provided together, with from earlier than to'),
  query('page').optional({ values: 'undefined' }).isInt({ min: 1 })
    .withMessage('page must be an integer of at least 1').bail().toInt(),
  query('limit').optional({ values: 'undefined' }).isInt({ min: 1, max: 100 })
    .withMessage('limit must be an integer from 1 to 100').bail().toInt(),
];

module.exports = {
  eventId,
  createEventValidation,
  replaceEventValidation,
  listEventsValidation,
};
