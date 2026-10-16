const { validationResult } = require('express-validator');
const AppError = require('./AppError');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  const firstError = errors.array({ onlyFirstError: true })[0];
  return next(new AppError(400, 'VALIDATION_ERROR', firstError.msg, firstError.path));
}

module.exports = validateRequest;
