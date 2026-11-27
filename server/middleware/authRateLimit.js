const { rateLimit } = require('express-rate-limit');

function tooManyAttempts(req, res) {
  const retryAfter = Math.max(1, Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000));
  res.set('Retry-After', String(retryAfter));
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many attempts. Please try again later.',
      retryAfter,
    },
  });
}

const options = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: tooManyAttempts,
};

const loginRateLimit = rateLimit({
  ...options,
  limit: 20,
  skipSuccessfulRequests: true,
});

const registerRateLimit = rateLimit({ ...options, limit: 10 });

module.exports = { loginRateLimit, registerRateLimit };
