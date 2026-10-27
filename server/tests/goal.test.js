const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const YAML = require('yaml');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const goalService = require('../services/goalService');
const goalRoutes = require('../routes/goalRoutes');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const {
  onlyFields,
  goalId,
  createGoalValidation,
  updateGoalValidation,
  patchProgressValidation,
  listGoalsValidation,
} = require('../routes/goalValidation');

const USER_ID = '64f000000000000000000001';
const OTHER_USER_ID = '64f000000000000000000002';
const GOAL_ID = '64f000000000000000000021';
const JWT_SECRET = 'goal-test-secret-with-at-least-32-characters';
process.env.JWT_SECRET = JWT_SECRET;

function goalDocument(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(GOAL_ID),
    userId: new mongoose.Types.ObjectId(USER_ID),
    title: 'Complete API',
    deadline: null,
    progressMode: 'task_based',
    manualProgress: 0,
    progress: 0,
    status: 'active',
    createdAt: new Date('2026-10-20T10:00:00.000Z'),
    async save() {},
    ...overrides,
  };
}

async function validationError(chains, req) {
  for (const chain of chains) await chain.run(req);
  let result;
  validateRequest(req, {}, (error) => { result = error; });
  return result;
}

function runMiddleware(middleware, req) {
  let error;
  middleware(req, {}, (nextError) => { error = nextError; });
  return error;
}

test('all six Goal endpoints are registered behind JWT authentication', () => {
  assert.ok(goalRoutes.stack.some((layer) => layer.name === 'authMiddleware'));
  const routes = goalRoutes.stack.filter((layer) => layer.route);
  assert.deepEqual(
    routes.map((layer) => ({ path: layer.route.path, methods: Object.keys(layer.route.methods) })),
    [
      { path: '/', methods: ['get'] },
      { path: '/', methods: ['post'] },
      { path: '/:id/progress', methods: ['patch'] },
      { path: '/:id', methods: ['get'] },
      { path: '/:id', methods: ['put'] },
      { path: '/:id', methods: ['delete'] },
    ],
  );
});

test('Goal authentication rejects missing tokens and attaches the JWT owner', () => {
  const missingError = runMiddleware(authMiddleware, { get: () => undefined });
  assert.equal(missingError.status, 401);

  const req = {
    get: () => `Bearer ${jwt.sign({}, JWT_SECRET, { subject: USER_ID })}`,
  };
  assert.equal(runMiddleware(authMiddleware, req), undefined);
  assert.equal(req.userId, USER_ID);
});

test('Goal validation trims title, accepts documented manualProgress, and rejects protected fields', async () => {
  const valid = { body: { title: '  Goal  ', progressMode: 'manual', manualProgress: 50 } };
  assert.equal(await validationError(createGoalValidation, valid), undefined);
  assert.equal(valid.body.title, 'Goal');
  assert.equal(valid.body.manualProgress, 50);

  const invalidTitle = await validationError(createGoalValidation, {
    body: { title: '   ' },
  });
  assert.equal(invalidTitle.status, 400);
  assert.equal(invalidTitle.code, 'VALIDATION_ERROR');
  assert.equal(invalidTitle.field, 'title');

  let rejected;
  onlyFields(['title', 'deadline', 'progressMode', 'manualProgress'])(
    { body: { title: 'Goal', progress: 90 } },
    {},
    (error) => { rejected = error; },
  );
  assert.equal(rejected.status, 400);
  assert.equal(rejected.field, 'progress');
});

test('Goal create validation rejects invalid modes, dates, and task_based manualProgress', async () => {
  for (const body of [
    { title: 'Goal', deadline: '2026-10-20' },
    { title: 'Goal', progressMode: 'other' },
    { title: 'Goal', manualProgress: 50 },
  ]) {
    const error = await validationError(createGoalValidation, { body });
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
  }

  const dateNull = await validationError(createGoalValidation, {
    body: { title: 'Goal', deadline: null },
  });
  assert.equal(dateNull, undefined);
});

test('PUT requires title, deadline, and progressMode; progress PATCH requires a valid Goal ID', async () => {
  const missing = await validationError(updateGoalValidation, {
    body: { title: 'Goal', progressMode: 'manual' },
  });
  assert.equal(missing.status, 400);
  assert.equal(missing.field, 'deadline');

  const invalidId = await validationError([goalId], { params: { id: 'bad' } });
  assert.equal(invalidId.field, 'id');
});

test('manual progress accepts 0, 50, and 100, and rejects out-of-range or fractional values', async () => {
  for (const value of [0, 50, 100]) {
    const req = { body: { manualProgress: value } };
    assert.equal(await validationError(patchProgressValidation, req), undefined);
    assert.equal(req.body.manualProgress, value);
  }

  for (const value of [-1, 101, 50.5, 'abc']) {
    const error = await validationError(patchProgressValidation, {
      body: { manualProgress: value },
    });
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.equal(error.field, 'manualProgress');
  }
});

test('Goal list validates page and limit', async () => {
  const valid = { query: { page: '2', limit: '10' } };
  assert.equal(await validationError(listGoalsValidation, valid), undefined);
  assert.equal(valid.query.page, 2);
  assert.equal(valid.query.limit, 10);

  const invalid = await validationError(listGoalsValidation, {
    query: { page: '0', limit: '101' },
  });
  assert.equal(invalid.status, 400);
  assert.equal(invalid.field, 'page');
});

test('Goal create stores only authenticated ownership and derives manual fields', async (t) => {
  let persisted;
  t.mock.method(Goal, 'create', async (input) => {
    persisted = input;
    return goalDocument({ ...input, createdAt: new Date() });
  });

  const created = await goalService.createGoal(USER_ID, {
    title: '  Manual Goal  ', progressMode: 'manual', manualProgress: 100,
    userId: OTHER_USER_ID, progress: 22, status: 'active',
  });

  assert.equal(persisted.userId.toString(), USER_ID);
  assert.equal(persisted.title, 'Manual Goal');
  assert.equal(persisted.manualProgress, 100);
  assert.equal(persisted.progress, 100);
  assert.equal(persisted.status, 'completed');
  assert.equal(created.status, 'completed');
  assert.equal(Object.hasOwn(created, 'userId'), false);
});

test('task_based Goal creation starts at zero percent and active', async (t) => {
  const goal = goalDocument();
  t.mock.method(Goal, 'create', async (input) => Object.assign(goal, input));
  t.mock.method(Goal, 'findOne', async () => goal);
  t.mock.method(Task, 'countDocuments', async () => 0);

  const created = await goalService.createGoal(USER_ID, { title: 'Task Goal' });
  assert.equal(created.progressMode, 'task_based');
  assert.equal(created.progress, 0);
  assert.equal(created.status, 'active');
});

test('Goal list scopes queries, sorts newest first, and returns pagination', async (t) => {
  let findFilter;
  let countFilter;
  let sortValue;
  let skipValue;
  let limitValue;
  const docs = [goalDocument()];
  const query = {
    sort(value) { sortValue = value; return this; },
    skip(value) { skipValue = value; return this; },
    limit(value) { limitValue = value; return this; },
    then(resolve, reject) { return Promise.resolve(docs).then(resolve, reject); },
  };
  t.mock.method(Goal, 'find', (filter) => { findFilter = filter; return query; });
  t.mock.method(Goal, 'countDocuments', async (filter) => { countFilter = filter; return 25; });

  const result = await goalService.listGoals(USER_ID, { page: 2, limit: 10 });
  assert.equal(findFilter.userId.toString(), USER_ID);
  assert.equal(countFilter.userId.toString(), USER_ID);
  assert.deepEqual(sortValue, { createdAt: -1, _id: -1 });
  assert.equal(skipValue, 10);
  assert.equal(limitValue, 10);
  assert.deepEqual(result.pagination, { page: 2, limit: 10, total: 25, totalPages: 3 });
  assert.equal(result.data[0]._id, GOAL_ID);
  assert.equal(Object.hasOwn(result.data[0], 'userId'), false);
});

test('Goal detail and update queries are user-scoped and update only editable fields', async (t) => {
  const goal = goalDocument({ progressMode: 'manual', manualProgress: 25, progress: 25 });
  const queries = [];
  t.mock.method(Goal, 'findOne', async (filter) => { queries.push(filter); return goal; });

  const detail = await goalService.getGoal(USER_ID, GOAL_ID);
  const updated = await goalService.updateGoal(USER_ID, GOAL_ID, {
    title: '  Updated  ', deadline: null, progressMode: 'manual',
    userId: OTHER_USER_ID, progress: 100, status: 'completed',
  });
  assert.equal(detail.title, 'Complete API');
  assert.equal(updated.title, 'Updated');
  assert.equal(updated.progress, 25);
  assert.equal(updated.manualProgress, 25);
  assert.equal(updated.status, 'active');
  assert.ok(queries.every((filter) => filter.userId.toString() === USER_ID));
});

test('foreign Goal reads, updates, patches, and deletes return NOT_FOUND', async (t) => {
  const queries = [];
  t.mock.method(Goal, 'findOne', async (filter) => { queries.push(filter); return null; });

  await assert.rejects(goalService.getGoal(USER_ID, GOAL_ID), (error) => error.status === 404);
  await assert.rejects(goalService.updateGoal(USER_ID, GOAL_ID, {
    title: 'Goal', deadline: null, progressMode: 'manual',
  }), (error) => error.status === 404);
  await assert.rejects(goalService.updateManualProgress(USER_ID, GOAL_ID, 50), (error) => error.status === 404);
  await assert.rejects(goalService.deleteGoal(USER_ID, GOAL_ID), (error) => error.status === 404);
  assert.ok(queries.every((filter) => filter.userId.toString() === USER_ID));
});

test('manual PATCH updates 0, 50, and 100 and derives status', async (t) => {
  const goal = goalDocument({ progressMode: 'manual' });
  t.mock.method(Goal, 'findOne', async () => goal);

  for (const value of [0, 50, 100]) {
    const updated = await goalService.updateManualProgress(USER_ID, GOAL_ID, value);
    assert.equal(updated.manualProgress, value);
    assert.equal(updated.progress, value);
    assert.equal(updated.status, value === 100 ? 'completed' : 'active');
  }
});

test('manual PATCH is rejected for task_based Goals', async (t) => {
  let saved = false;
  const goal = goalDocument({ async save() { saved = true; } });
  t.mock.method(Goal, 'findOne', async () => goal);

  await assert.rejects(goalService.updateManualProgress(USER_ID, GOAL_ID, 50), (error) => (
    error.status === 400
    && error.code === 'VALIDATION_ERROR'
    && error.field === 'progressMode'
  ));
  assert.equal(saved, false);
});

test('task_based Goals recalculate to zero with no Tasks and round completed ratios', async (t) => {
  const goal = goalDocument();
  const taskFilters = [];
  let totalTasks = 3;
  let completedTasks = 2;
  t.mock.method(Goal, 'findOne', async (filter) => {
    assert.equal(filter.userId.toString(), USER_ID);
    return goal;
  });
  t.mock.method(Task, 'countDocuments', async (filter) => {
    taskFilters.push(filter);
    return filter.status === 'done' ? completedTasks : totalTasks;
  });

  await goalService.recalculateProgress(GOAL_ID, USER_ID);
  assert.equal(goal.progress, 67);
  assert.equal(goal.status, 'active');
  assert.ok(taskFilters.every((filter) => filter.userId.toString() === USER_ID));

  taskFilters.length = 0;
  totalTasks = 0;
  completedTasks = 0;
  goal.progress = 100;
  await goalService.recalculateProgress(GOAL_ID, USER_ID);
  assert.equal(goal.progress, 0);
  assert.equal(goal.status, 'active');
});

test('PUT switching to manual copies current task progress; switching back recalculates', async (t) => {
  const goal = goalDocument({ progress: 60, status: 'active' });
  const taskFilters = [];
  t.mock.method(Goal, 'findOne', async () => goal);
  t.mock.method(Task, 'countDocuments', async (filter) => {
    taskFilters.push(filter);
    return filter.status === 'done' ? 1 : 2;
  });

  const manual = await goalService.updateGoal(USER_ID, GOAL_ID, {
    title: 'Goal', deadline: null, progressMode: 'manual',
  });
  assert.equal(manual.manualProgress, 50);
  assert.equal(manual.progress, 50);
  assert.equal(manual.status, 'active');

  taskFilters.length = 0;
  const taskBased = await goalService.updateGoal(USER_ID, GOAL_ID, {
    title: 'Goal', deadline: null, progressMode: 'task_based',
  });
  assert.equal(taskBased.progress, 50);
  assert.equal(taskBased.status, 'active');
  assert.ok(taskFilters.length > 0);
  assert.ok(taskFilters.every((filter) => filter.userId.toString() === USER_ID));
});

test('deleting a Goal unlinks only this user’s Tasks and preserves the Task records', async (t) => {
  const goal = goalDocument();
  let taskUpdate;
  let goalDelete;
  t.mock.method(Goal, 'findOne', async () => goal);
  t.mock.method(Task, 'updateMany', async (...args) => { taskUpdate = args; return { modifiedCount: 2 }; });
  t.mock.method(Goal, 'deleteOne', async (filter) => { goalDelete = filter; return { deletedCount: 1 }; });

  const result = await goalService.deleteGoal(USER_ID, GOAL_ID);
  assert.deepEqual(taskUpdate[0], {
    goalId: goal._id,
    userId: new mongoose.Types.ObjectId(USER_ID),
  });
  assert.deepEqual(taskUpdate[1], { $set: { goalId: null } });
  assert.equal(goalDelete.userId.toString(), USER_ID);
  assert.deepEqual(result, { _id: GOAL_ID, deleted: true });
});

test('OpenAPI documents all Goal operations and the documented manualProgress field', () => {
  const specPath = path.resolve(__dirname, '..', '..', 'docs', 'openapi.yaml');
  const spec = YAML.parse(fs.readFileSync(specPath, 'utf8'));
  assert.deepEqual(Object.keys(spec.paths['/goals']).sort(), ['get', 'post']);
  assert.deepEqual(Object.keys(spec.paths['/goals/{id}']).sort(), ['delete', 'get', 'parameters', 'put']);
  assert.deepEqual(Object.keys(spec.paths['/goals/{id}/progress']).sort(), ['parameters', 'patch']);
  assert.deepEqual(spec.security, [{ bearerAuth: [] }]);
  assert.ok(spec.components.schemas.GoalProgressInput.required.includes('manualProgress'));
  assert.equal(spec.components.schemas.GoalProgressInput.properties.progress, undefined);
});
