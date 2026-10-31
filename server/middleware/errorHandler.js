function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || 500;
  let code = error.code || 'SERVER_ERROR';
  let message = status === 500 ? 'An unexpected error occurred' : error.message;
  let field = error.field;

  if (error.name === 'ValidationError' || error.type === 'entity.parse.failed') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = error.type === 'entity.parse.failed' ? 'Request body must be valid JSON' : error.message;
  } else if (error.code === 11000) {
    status = 409;
    code = 'CONFLICT';
    field = Object.keys(error.keyPattern || {})[0];
    message = field === 'email' ? 'Email is already registered' : 'Resource already exists';
  } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    status = 401;
    code = 'UNAUTHORIZED';
    message = 'Authentication is required';
  } else if (status === 401) {
    code = 'UNAUTHORIZED';
  } else if (status === 404) {
    code = 'NOT_FOUND';
  }

  const details = { code, message };
  if (field) details.field = field;

  if (status === 500) {
    console.error(error);
  }

  return res.status(status).json({ success: false, error: details });
}

module.exports = errorHandler;
