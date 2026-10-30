const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const YAML = require('yaml');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const dashboardService = require('../services/dashboardService');
const dashboardController = require('../controllers/dashboardController');
const dashboardRoutes = require('../routes/dashboardRoutes');
const authMiddleware = require('../middleware/authMiddleware');

const USER_ID = '64f000000000000000000001';
const JWT_SECRET = 'dashboard-test-secret-with-at-least-32-characters';
process.env.JWT_SECRET = JWT_SECRET;

function responseRecorder() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function goalQuery(progressValues) {
  return {
    select(fields) {
      this.selectedFields = fields;
      return this;
    },
    lean() {
      return Promise.resolve(progressValues.map((progress) => ({ progress })));
    },
  };
}

test('Dashboard summary route is protected and mounted before the 404 handler', () => {
  const app = require('../app');
  assert.ok(dashboardRoutes.stack.some((layer) => layer.name === 'authMiddleware'));
  assert.deepEqual(
    dashboardRoutes.stack.filter((layer) => layer.route)
      .map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) })),
    [{ path: '/summary', methods: ['get'] }],
  );

  const dashboardMountIndex = app.router.stack.findIndex((layer) => layer.handle === dashboardRoutes);
  const notFoundIndex = app.router.stack.findIndex((layer) => (
    layer.handle.toString().includes("Error('Route not found')")
  ));
  assert.ok(dashboardMountIndex >= 0);
  assert.ok(notFoundIndex > dashboardMountIndex);
});

test('Dashboard route rejects requests without a JWT and gets the user from a valid JWT', () => {
  let error;
  authMiddleware({ get: () => undefined }, {}, (nextError) => { error = nextError; });
  assert.equal(error.status, 401);

  const req = {
    get: () => `Bearer ${jwt.sign({}, JWT_SECRET, { subject: USER_ID })}`,
  };
  authMiddleware(req, {}, (nextError) => { error = nextError; });
  assert.equal(error, undefined);
  assert.equal(req.userId, USER_ID);
});

test('Dashboard summary counts owned Tasks and averages only owned active Goals', async (t) => {
  const taskFilters = [];
  let goalFilter;
  let selectedGoalFields;
  t.mock.method(Task, 'countDocuments', async (filter) => {
    taskFilters.push(filter);
    if (filter.dueDate) return 2;
    if (filter.status === 'done') return 4;
    return 11;
  });
  t.mock.method(Goal, 'find', (filter) => {
    goalFilter = filter;
    const query = goalQuery([50, 60, 61]);
    const select = query.select.bind(query);
    query.select = (fields) => {
      selectedGoalFields = fields;
      return select(fields);
    };
    return query;
  });

  const summary = await dashboardService.getSummary(USER_ID);

  assert.deepEqual(summary, {
    totalTasks: 11,
    completedTasks: 4,
    overdueTasks: 2,
    avgGoalProgress: 57,
  });
  assert.ok(taskFilters.every((filter) => filter.userId.toString() === USER_ID));
  assert.equal(taskFilters.find((filter) => filter.status === 'done').userId.toString(), USER_ID);
  const overdueFilter = taskFilters.find((filter) => filter.dueDate);
  assert.equal(overdueFilter.userId.toString(), USER_ID);
  assert.ok(overdueFilter.dueDate.$lt instanceof Date);
  assert.equal(overdueFilter.status.$ne, 'done');
  assert.equal(goalFilter.userId.toString(), USER_ID);
  assert.equal(goalFilter.status, 'active');
  assert.equal(selectedGoalFields, 'progress -_id');
});

test('Dashboard average Goal progress is zero when there are no active Goals', async (t) => {
  t.mock.method(Task, 'countDocuments', async () => 0);
  t.mock.method(Goal, 'find', (filter) => {
    assert.equal(filter.userId.toString(), USER_ID);
    assert.equal(filter.status, 'active');
    return goalQuery([]);
  });

  assert.deepEqual(await dashboardService.getSummary(USER_ID), {
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    avgGoalProgress: 0,
  });
});

test('Dashboard controller returns the standard envelope using only req.userId', async (t) => {
  let requestedUserId;
  t.mock.method(dashboardService, 'getSummary', async (userId) => {
    requestedUserId = userId;
    return { totalTasks: 3, completedTasks: 1, overdueTasks: 1, avgGoalProgress: 70 };
  });
  const res = responseRecorder();

  await dashboardController.summary({ userId: USER_ID, body: { userId: 'client-value' } }, res);

  assert.equal(requestedUserId, USER_ID);
  assert.deepEqual(res.body, {
    success: true,
    data: { totalTasks: 3, completedTasks: 1, overdueTasks: 1, avgGoalProgress: 70 },
  });
});

test('OpenAPI documents the Dashboard response fields and bearer authentication', () => {
  const specPath = path.resolve(__dirname, '..', '..', 'docs', 'openapi.yaml');
  const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
  const operation = spec.paths['/dashboard/summary'].get;
  assert.deepEqual(spec.security, [{ bearerAuth: [] }]);
  assert.equal(operation.responses['200'].content['application/json'].schema.$ref,
    '#/components/schemas/DashboardResponse');
  assert.deepEqual(Object.keys(spec.components.schemas.DashboardSummary.properties).sort(), [
    'avgGoalProgress', 'completedTasks', 'overdueTasks', 'totalTasks',
  ]);
});
