const { test } = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { loginRateLimit, registerRateLimit } = require('../middleware/authRateLimit');
const authRoutes = require('../routes/authRoutes');

test('authentication limits protect routes and return retry information', async (t) => {
  for (const [path, limiter] of [['/login', loginRateLimit], ['/register', registerRateLimit]]) {
    const route = authRoutes.stack.find((entry) => entry.route?.path === path).route;
    assert.equal(route.stack[0].handle, limiter);
  }

  const app = express();
  app.set('trust proxy', 1);
  app.post('/login', loginRateLimit, (req, res) => {
    res.status(req.query.ok ? 200 : 401).json({ success: Boolean(req.query.ok) });
  });
  app.post('/register', registerRateLimit, (req, res) => res.status(201).json({ success: true }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, ip) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'X-Forwarded-For': ip },
  });

  await t.test('successful logins do not consume the failed-login allowance', async () => {
    for (let index = 0; index < 22; index += 1) {
      assert.equal((await request('/login?ok=1', '192.0.2.1')).status, 200);
    }
    for (let index = 0; index < 20; index += 1) {
      assert.equal((await request('/login', '192.0.2.1')).status, 401);
    }
    const response = await request('/login', '192.0.2.1');
    assert.equal(response.status, 429);
    const body = await response.json();
    assert.equal(body.success, false);
    assert.equal(body.error.code, 'RATE_LIMITED');
    assert.ok(Number.isInteger(body.error.retryAfter));
    assert.ok(body.error.retryAfter > 0 && body.error.retryAfter <= 900);
    assert.equal(Number(response.headers.get('retry-after')), body.error.retryAfter);
    assert.ok(response.headers.has('ratelimit'));
  });

  await t.test('another client IP has its own login allowance', async () => {
    assert.equal((await request('/login', '192.0.2.2')).status, 401);
  });

  await t.test('registration has a separate allowance and counts successful requests', async () => {
    for (let index = 0; index < 10; index += 1) {
      assert.equal((await request('/register', '192.0.2.1')).status, 201);
    }
    assert.equal((await request('/register', '192.0.2.1')).status, 429);
  });
});
