const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const YAML = require('yaml');

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters';

const app = require('../app');
const authRoutes = require('../routes/authRoutes');
const authMiddleware = require('../middleware/authMiddleware');
const errorHandler = require('../middleware/errorHandler');

function responseRecorder() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('health endpoint returns the standard success envelope', () => {
  const layer = app.router.stack.find((entry) => entry.route?.path === '/health');
  const res = responseRecorder();
  layer.route.stack[0].handle({}, res);
  assert.deepEqual(res.body, { success: true, data: { status: 'ok' } });
});

test('Swagger UI is mounted and its OpenAPI source parses', () => {
  assert.ok(app.router.stack.some((entry) => entry.name === 'swaggerInitFn'));
  const specPath = path.resolve(__dirname, '..', '..', 'docs', 'openapi.yaml');
  const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
  assert.ok(spec.paths['/auth/register']);
  assert.ok(spec.paths['/auth/login']);
  assert.ok(spec.paths['/auth/me']);
});

test('authentication routes expose register, login, and protected current-user handlers', () => {
  const routePaths = authRoutes.stack.map((entry) => entry.route?.path);
  assert.deepEqual(routePaths, ['/register', '/login', '/me']);
  const meRoute = authRoutes.stack.find((entry) => entry.route?.path === '/me').route;
  assert.equal(meRoute.stack[0].handle, authMiddleware);
});

test('current-user middleware rejects requests without a bearer token', () => {
  let receivedError;
  authMiddleware({ get: () => undefined }, {}, (error) => { receivedError = error; });
  const res = responseRecorder();
  errorHandler(receivedError, {}, res, () => {});
  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, {
    success: false,
    error: { code: 'UNAUTHORIZED', message: 'Authentication is required' },
  });
});

test('unknown routes return the standard not-found envelope', () => {
  const res = responseRecorder();
  const error = Object.assign(new Error('Route not found'), { status: 404, code: 'NOT_FOUND' });
  errorHandler(error, {}, res, () => {});
  assert.equal(res.statusCode, 404);
  assert.deepEqual(res.body, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});
