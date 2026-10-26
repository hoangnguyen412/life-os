const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const taskService = require('../services/taskService');
const goalService = require('../services/goalService');
const taskRoutes = require('../routes/taskRoutes');
const authMiddleware = require('../middleware/authMiddleware');
const errorHandler = require('../middleware/errorHandler');
const validateRequest = require('../middleware/validateRequest');
const {
  taskId,
  createTaskValidation,
  replaceTaskValidation,
  listTasksValidation,
} = require('../routes/taskValidation');

const USER_ID = '64f000000000000000000001';
const OTHER_USER_ID = '64f000000000000000000002';
const TASK_ID = '64f000000000000000000011';
const GOAL_ID = '64f000000000000000000021';
const JWT_SECRET = 'task-test-secret-with-at-least-32-characters';
process.env.JWT_SECRET = JWT_SECRET;

function taskDocument(overrides = {}) {
  const now = new Date('2026-10-20T10:00:00.000Z');
  return {
    _id: new mongoose.Types.ObjectId(TASK_ID),
    userId: new mongoose.Types.ObjectId(USER_ID),
    title: 'Read docs',
    description: null,
    status: 'todo',
    dueDate: null,
    goalId: null,
    priority: 'medium',
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    async save() { this.updatedAt = new Date(); },
    ...overrides,
  };
}

async function validationError(chains, req) {
  for (const chain of chains) await chain.run(req);
  let result;
  validateRequest(req, {}, (error) => { result = error; });
  return result;
}

function errorResponse(error) {
  const res = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  errorHandler(error, {}, res, () => {});
  return res;
}

test('all Task routes share the authentication middleware', () => {
  const authLayer = taskRoutes.stack.find((layer) => layer.name === 'authMiddleware');
  assert.ok(authLayer);
  assert.deepEqual(
    taskRoutes.stack.filter((layer) => layer.route).map((layer) => layer.route.path),
    ['/', '/', '/:id', '/:id', '/:id'],
  );
});

test('Task authentication rejects missing and invalid tokens and accepts a valid token', () => {
  let error;
  authMiddleware({ get: () => undefined }, {}, (nextError) => { error = nextError; });
  assert.equal(error.status, 401);

  error = undefined;
  authMiddleware({ get: () => 'Bearer invalid' }, {}, (nextError) => { error = nextError; });
  assert.equal(errorResponse(error).statusCode, 401);

  const req = { get: () => `Bearer ${jwt.sign({}, JWT_SECRET, { subject: USER_ID })}` };
  authMiddleware(req, {}, (nextError) => { error = nextError; });
  assert.equal(error, undefined);
  assert.equal(req.userId, USER_ID);
});

test('Task create validation trims title and rejects blank title, invalid enum, date, and goal ID', async () => {
  assert.equal(await validationError(createTaskValidation, { body: { title: 'A new Task' } }), undefined);

  const validReq = { body: {
    title: '  Plan  ', status: 'todo', dueDate: null, goalId: null,
    description: null, priority: 'medium',
  } };
  assert.equal(await validationError(createTaskValidation, validReq), undefined);
  assert.equal(validReq.body.title, 'Plan');

  const invalidReq = { body: {
    title: '  ', status: 'blocked', dueDate: '2026-10-20', goalId: 'not-an-id',
    description: null, priority: 'urgent',
  } };
  const error = await validationError(createTaskValidation, invalidReq);
  assert.equal(error.status, 400);
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.field, 'title');
});

test('Task PUT requires every editable field and validates its ID', async () => {
  const missingFields = await validationError(replaceTaskValidation, {
    body: { title: 'Task' },
  });
  assert.equal(missingFields.status, 400);
  assert.equal(missingFields.field, 'description');

  const invalidId = await validationError([taskId], { params: { id: 'bad' } });
  assert.equal(invalidId.field, 'id');
});

test('Task list validation applies defaults and rejects invalid filters and pagination', async () => {
  const validReq = { query: { overdue: 'false', page: '2', limit: '10' } };
  assert.equal(await validationError(listTasksValidation, validReq), undefined);
  assert.equal(validReq.query.overdue, false);
  assert.equal(validReq.query.page, 2);
  assert.equal(validReq.query.limit, 10);

  const invalidReq = { query: { sort: 'random', page: '0', limit: '101', overdue: 'yes' } };
  const error = await validationError(listTasksValidation, invalidReq);
  assert.equal(error.status, 400);
  assert.equal(error.code, 'VALIDATION_ERROR');
  assert.equal(error.field, 'overdue');
});

test('create uses authenticated owner, defaults, timestamps, and ignores client userId', async (t) => {
  let persisted;
  t.mock.method(Task, 'create', async (fields) => {
    persisted = fields;
    return taskDocument({ ...fields, createdAt: new Date(), updatedAt: new Date() });
  });
  const result = await taskService.createTask(USER_ID, {
    title: ' New task ', userId: OTHER_USER_ID,
  });

  assert.equal(persisted.userId.toString(), USER_ID);
  assert.notEqual(persisted.userId.toString(), OTHER_USER_ID);
  assert.equal(result.title, 'New task');
  assert.equal(result.description, null);
  assert.equal(result.status, 'todo');
  assert.equal(result.priority, 'medium');
  assert.equal(result.goalId, null);
  assert.equal(result.completedAt, null);
  assert.equal(Object.hasOwn(result, 'userId'), false);
});

test('creating a done Task sets completedAt', async (t) => {
  let persisted;
  t.mock.method(Task, 'create', async (fields) => {
    persisted = fields;
    return taskDocument({ ...fields, createdAt: new Date(), updatedAt: new Date() });
  });
  const before = Date.now();
  const result = await taskService.createTask(USER_ID, { title: 'Done', status: 'done' });
  assert.ok(new Date(result.completedAt).getTime() >= before);
  assert.equal(persisted.status, 'done');
});

test('create rejects a Goal that is missing or belongs to another user', async (t) => {
  let goalQuery;
  let taskCreated = false;
  t.mock.method(Goal, 'exists', async (query) => { goalQuery = query; return null; });
  t.mock.method(Task, 'create', async () => { taskCreated = true; });

  await assert.rejects(
    taskService.createTask(USER_ID, { title: 'Linked', goalId: GOAL_ID }),
    (error) => error.status === 404 && error.code === 'NOT_FOUND',
  );
  assert.equal(goalQuery._id.toString(), GOAL_ID);
  assert.equal(goalQuery.userId.toString(), USER_ID);
  assert.equal(taskCreated, false);
});

test('task-based Goal recalculation uses only its owner’s Tasks and derives status', async (t) => {
  const goal = {
    progressMode: 'task_based',
    progress: 0,
    status: 'active',
    async save() {},
  };
  let goalQuery;
  const taskQueries = [];
  t.mock.method(Goal, 'findOne', async (query) => { goalQuery = query; return goal; });
  t.mock.method(Task, 'countDocuments', async (query) => {
    taskQueries.push(query);
    return query.status === 'done' ? 4 : 5;
  });

  await goalService.recalculateProgress(GOAL_ID, USER_ID);
  assert.equal(goalQuery._id.toString(), GOAL_ID);
  assert.equal(goalQuery.userId.toString(), USER_ID);
  assert.equal(goal.progress, 80);
  assert.equal(goal.status, 'active');
  assert.ok(taskQueries.every((query) => query.userId.toString() === USER_ID));
  assert.ok(taskQueries.every((query) => query.goalId.toString() === GOAL_ID));
});

test('manual Goal progress is preserved and controls completed status', async (t) => {
  const goal = {
    progressMode: 'manual',
    manualProgress: 100,
    progress: 20,
    status: 'active',
    async save() {},
  };
  t.mock.method(Goal, 'findOne', async () => goal);
  t.mock.method(Task, 'countDocuments', async () => {
    assert.fail('manual Goal must not count Tasks');
  });

  await goalService.recalculateProgress(GOAL_ID, USER_ID);
  assert.equal(goal.progress, 100);
  assert.equal(goal.status, 'completed');
});

test('get, update, and delete queries are scoped by the authenticated user', async (t) => {
  const queries = [];
  const doc = taskDocument({ title: 'Before' });
  t.mock.method(Task, 'findOne', async (query) => { queries.push(query); return doc; });
  t.mock.method(Task, 'findOneAndDelete', async (query) => { queries.push(query); return doc; });

  const read = await taskService.getTask(USER_ID, TASK_ID);
  const updated = await taskService.updateTask(USER_ID, TASK_ID, {
    title: 'After', description: null, status: 'in_progress', dueDate: null,
    goalId: null, priority: 'high', userId: OTHER_USER_ID,
  });
  const deleted = await taskService.deleteTask(USER_ID, TASK_ID);

  assert.equal(read.title, 'Before');
  assert.equal(updated.title, 'After');
  assert.equal(doc.userId.toString(), USER_ID);
  assert.equal(deleted.deleted, true);
  for (const query of queries) {
    assert.equal(query._id.toString(), TASK_ID);
    assert.equal(query.userId.toString(), USER_ID);
  }
});

test('foreign Task reads and deletes return NOT_FOUND', async (t) => {
  const queries = [];
  t.mock.method(Task, 'findOne', async (query) => { queries.push(query); return null; });
  t.mock.method(Task, 'findOneAndDelete', async (query) => { queries.push(query); return null; });

  await assert.rejects(taskService.getTask(USER_ID, TASK_ID), (error) => error.status === 404);
  await assert.rejects(taskService.deleteTask(USER_ID, TASK_ID), (error) => error.status === 404);
  assert.ok(queries.every((query) => query.userId.toString() === USER_ID));
});

test('updating to done sets completedAt, remaining done preserves it, and leaving done clears it', async (t) => {
  const completedAt = new Date('2026-10-18T10:00:00.000Z');
  const doc = taskDocument({ status: 'in_progress', completedAt: null });
  t.mock.method(Task, 'findOne', async () => doc);

  const input = { title: 'Task', description: null, status: 'done', dueDate: null, goalId: null, priority: 'medium' };
  const done = await taskService.updateTask(USER_ID, TASK_ID, input);
  assert.ok(done.completedAt);
  const firstCompletion = done.completedAt;

  doc.completedAt = completedAt;
  await taskService.updateTask(USER_ID, TASK_ID, input);
  assert.equal(doc.completedAt.toISOString(), completedAt.toISOString());

  await taskService.updateTask(USER_ID, TASK_ID, { ...input, status: 'todo' });
  assert.equal(doc.completedAt, null);
  assert.notEqual(firstCompletion, null);
});

test('changing a linked Task status or Goal recalculates each affected Goal once', async (t) => {
  const oldGoalId = '64f000000000000000000031';
  const newGoalId = '64f000000000000000000032';
  const doc = taskDocument({
    status: 'todo',
    goalId: new mongoose.Types.ObjectId(oldGoalId),
  });
  const recalculated = [];
  t.mock.method(Task, 'findOne', async () => doc);
  t.mock.method(Goal, 'exists', async () => ({ _id: newGoalId }));
  t.mock.method(goalService, 'recalculateProgress', async (goalId) => { recalculated.push(goalId); });

  await taskService.updateTask(USER_ID, TASK_ID, {
    title: 'Task', description: null, status: 'done', dueDate: null,
    goalId: newGoalId, priority: 'medium',
  });

  assert.deepEqual(recalculated.sort(), [oldGoalId, newGoalId].sort());
});

test('deleting a linked Task recalculates its Goal', async (t) => {
  const doc = taskDocument({ goalId: new mongoose.Types.ObjectId(GOAL_ID) });
  let recalculated;
  t.mock.method(Task, 'findOneAndDelete', async () => doc);
  t.mock.method(goalService, 'recalculateProgress', async (goalId, userId) => {
    recalculated = { goalId, userId };
  });

  await taskService.deleteTask(USER_ID, TASK_ID);
  assert.deepEqual(recalculated, { goalId: GOAL_ID, userId: USER_ID });
});

test('list filtering, sorting, and pagination include owner and exact overdue rules', async (t) => {
  let pipeline;
  const row = taskDocument();
  t.mock.method(Task, 'aggregate', async (value) => {
    pipeline = value;
    return [{ data: [row], total: [{ count: 21 }] }];
  });

  const result = await taskService.listTasks(USER_ID, {
    status: 'todo', goalId: 'none', overdue: true, sort: 'dueDate_asc', page: 2, limit: 10,
  });
  const filter = pipeline[0].$match;
  assert.equal(filter.userId.toString(), USER_ID);
  assert.deepEqual(filter.$and[0], { status: 'todo' });
  assert.deepEqual(filter.$and[1], { goalId: null });
  assert.ok(filter.$and[2].dueDate.$lt instanceof Date);
  assert.equal(filter.$and[2].status.$ne, 'done');
  assert.deepEqual(pipeline[1].$facet.data.at(-2), { $skip: 10 });
  assert.deepEqual(pipeline[1].$facet.data.at(-1), { $limit: 10 });
  assert.deepEqual(result.pagination, { page: 2, limit: 10, total: 21, totalPages: 3 });
  assert.equal(result.data[0]._id, TASK_ID);

  const notOverdue = taskService.buildTaskFilter(USER_ID, { overdue: false });
  const nonOverdueConditions = notOverdue.$and[0].$or;
  assert.ok(nonOverdueConditions[0].dueDate.$gte instanceof Date);
  assert.deepEqual(nonOverdueConditions.slice(1), [{ dueDate: null }, { status: 'done' }]);
  assert.deepEqual(taskService.sortPipeline('createdAt_desc'), [{ $sort: { createdAt: -1, _id: -1 } }]);
  assert.deepEqual(taskService.sortPipeline('priority_desc')[1].$sort, {
    _priorityRank: 1, _dueDateMissing: 1, dueDate: 1, createdAt: -1, _id: -1,
  });
});

test('empty Task lists return zero pages', async (t) => {
  t.mock.method(Task, 'aggregate', async () => [{ data: [], total: [] }]);
  const result = await taskService.listTasks(USER_ID, {});
  assert.deepEqual(result, {
    data: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
  });
});
