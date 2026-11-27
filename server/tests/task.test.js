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

function mockTaskTransaction(t) {
  const session = {};
  t.mock.method(mongoose.connection, 'transaction', async (work) => work(session));
  return session;
}

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

test('deadline range validation accepts paired UTC bounds and rejects incomplete or invalid ranges', async () => {
  const dueFrom = '2026-10-31T17:00:00.000Z';
  const dueTo = '2026-11-30T17:00:00.000Z';
  assert.equal(await validationError(listTasksValidation, { query: {} }), undefined);
  assert.equal(await validationError(listTasksValidation, { query: { dueFrom, dueTo } }), undefined);
  for (const query of [
    { dueFrom }, { dueTo }, { dueFrom, dueTo: dueFrom },
    { dueFrom: dueTo, dueTo: dueFrom },
    { dueFrom: '2026-11-01', dueTo },
    { dueFrom: '2026-02-30T00:00:00Z', dueTo },
    { dueFrom: '2026-11-01T00:00:00+07:00', dueTo },
    { dueFrom: '', dueTo }, { dueFrom: [dueFrom, dueFrom], dueTo },
  ]) {
    const error = await validationError(listTasksValidation, { query });
    assert.equal(error.status, 400);
    assert.equal(error.code, 'VALIDATION_ERROR');
    assert.ok(['dueFrom', 'dueTo'].includes(error.field));
  }
});

test('deadline range reaches the database with inclusive start, exclusive end and existing filters', async (t) => {
  let pipeline;
  t.mock.method(Task, 'aggregate', async (value) => {
    pipeline = value;
    return [{ data: [], total: [] }];
  });
  const dueFrom = '2026-10-31T17:00:00.000Z';
  const dueTo = '2026-11-30T17:00:00.000Z';
  await taskService.listTasks(USER_ID, {
    dueFrom, dueTo, status: 'todo', goalId: 'none', overdue: true, page: 2, limit: 8,
  });
  const filter = pipeline[0].$match;
  assert.equal(filter.userId.toString(), USER_ID);
  assert.deepEqual(filter.$and, [
    { dueDate: { $gte: new Date(dueFrom), $lt: new Date(dueTo) } },
    { status: 'todo' },
    { goalId: null },
    { dueDate: { $lt: filter.$and[3].dueDate.$lt }, status: { $ne: 'done' } },
  ]);
  assert.deepEqual(pipeline[1].$facet.data.slice(-2), [{ $skip: 8 }, { $limit: 8 }]);
  assert.deepEqual(taskService.buildTaskFilter(USER_ID, {}), {
    userId: new mongoose.Types.ObjectId(USER_ID),
  });
});

test('create uses authenticated owner, defaults, timestamps, and ignores client userId', async (t) => {
  const session = mockTaskTransaction(t);
  let persisted;
  t.mock.method(Task, 'create', async ([fields], options) => {
    assert.equal(options.session, session);
    persisted = fields;
    return [taskDocument({ ...fields, createdAt: new Date(), updatedAt: new Date() })];
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
  mockTaskTransaction(t);
  let persisted;
  t.mock.method(Task, 'create', async ([fields]) => {
    persisted = fields;
    return [taskDocument({ ...fields, createdAt: new Date(), updatedAt: new Date() })];
  });
  const before = Date.now();
  const result = await taskService.createTask(USER_ID, { title: 'Done', status: 'done' });
  assert.ok(new Date(result.completedAt).getTime() >= before);
  assert.equal(persisted.status, 'done');
});

test('create rejects a Goal that is missing or belongs to another user', async (t) => {
  const session = mockTaskTransaction(t);
  let goalQuery;
  let taskCreated = false;
  t.mock.method(Goal, 'exists', async (query, options) => {
    assert.equal(options.session, session);
    goalQuery = query;
    return null;
  });
  t.mock.method(Task, 'create', async () => { taskCreated = true; });

  await assert.rejects(
    taskService.createTask(USER_ID, { title: 'Linked', goalId: GOAL_ID }),
    (error) => error.status === 404 && error.code === 'NOT_FOUND',
  );
  assert.equal(goalQuery._id.toString(), GOAL_ID);
  assert.equal(goalQuery.userId.toString(), USER_ID);
  assert.equal(taskCreated, false);
});

test('creating a Task with an owned Goal recalculates its progress', async (t) => {
  const session = mockTaskTransaction(t);
  let recalculated;
  t.mock.method(Goal, 'exists', async (query, options) => {
    assert.equal(options.session, session);
    assert.equal(query.userId.toString(), USER_ID);
    return { _id: new mongoose.Types.ObjectId(GOAL_ID) };
  });
  t.mock.method(Task, 'create', async ([input], options) => {
    assert.equal(options.session, session);
    return [taskDocument({
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    })];
  });
  t.mock.method(goalService, 'recalculateProgress', async (goalId, userId, optionsSession) => {
    assert.equal(optionsSession, session);
    recalculated = { goalId, userId };
  });

  const created = await taskService.createTask(USER_ID, { title: 'Linked', goalId: GOAL_ID });
  assert.equal(created.goalId, GOAL_ID);
  assert.deepEqual(recalculated, { goalId: GOAL_ID, userId: USER_ID });
});

test('Goal save failure rejects the Task creation transaction and all queries share its session', async (t) => {
  const session = mockTaskTransaction(t);
  const failure = new Error('Goal save failed');
  let taskCreated = false;
  let goalSaved = false;
  let countInProgress = false;
  t.mock.method(Goal, 'exists', async (filter, options) => {
    assert.equal(options.session, session);
    return { _id: new mongoose.Types.ObjectId(GOAL_ID) };
  });
  t.mock.method(Task, 'create', async ([fields], options) => {
    assert.equal(options.session, session);
    taskCreated = true;
    return [taskDocument(fields)];
  });
  t.mock.method(Goal, 'findOneAndUpdate', async (filter, update, options) => {
    assert.equal(options.session, session);
    assert.deepEqual(update, { $inc: { taskRevision: 1 } });
    assert.equal(options.new, true);
    assert.equal(taskCreated, true);
    return {
      _id: new mongoose.Types.ObjectId(GOAL_ID),
      progressMode: 'task_based',
      async save(saveOptions) {
        assert.equal(saveOptions.session, session);
        assert.equal(this.progress, 0);
        goalSaved = true;
        throw failure;
      },
    };
  });
  t.mock.method(Task, 'countDocuments', async (filter, options) => {
    assert.equal(options.session, session);
    assert.equal(countInProgress, false, 'transaction queries must run sequentially');
    countInProgress = true;
    await Promise.resolve();
    countInProgress = false;
    return filter.status === 'done' ? 0 : 1;
  });

  await assert.rejects(
    taskService.createTask(USER_ID, { title: 'Linked', goalId: GOAL_ID }),
    (error) => error === failure,
  );
  assert.equal(goalSaved, true);
});

test('updating a Task rejects a Goal that belongs to another user', async (t) => {
  mockTaskTransaction(t);
  const doc = taskDocument();
  let saved = false;
  let goalQuery;
  doc.save = async () => { saved = true; };
  t.mock.method(Task, 'findOne', async () => doc);
  t.mock.method(Goal, 'exists', async (query) => { goalQuery = query; return null; });

  await assert.rejects(taskService.updateTask(USER_ID, TASK_ID, {
    title: 'Task', description: null, status: 'todo', dueDate: null,
    goalId: GOAL_ID, priority: 'medium',
  }), (error) => error.status === 404 && error.code === 'NOT_FOUND');

  assert.equal(goalQuery.userId.toString(), USER_ID);
  assert.equal(saved, false);
  assert.equal(doc.goalId, null);
});

test('task-based Goal recalculation uses only its owner’s Tasks and derives status', async (t) => {
  const goal = {
    _id: new mongoose.Types.ObjectId(GOAL_ID),
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
  mockTaskTransaction(t);
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
  const session = mockTaskTransaction(t);
  const queries = [];
  t.mock.method(Task, 'findOne', async (query) => { queries.push(query); return null; });
  t.mock.method(Task, 'findOneAndDelete', async (query, options) => {
    assert.equal(options.session, session);
    queries.push(query);
    return null;
  });

  await assert.rejects(taskService.getTask(USER_ID, TASK_ID), (error) => error.status === 404);
  await assert.rejects(taskService.deleteTask(USER_ID, TASK_ID), (error) => error.status === 404);
  assert.ok(queries.every((query) => query.userId.toString() === USER_ID));
});

test('updating to done sets completedAt, remaining done preserves it, and leaving done clears it', async (t) => {
  mockTaskTransaction(t);
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
  const session = mockTaskTransaction(t);
  const oldGoalId = '64f000000000000000000031';
  const newGoalId = '64f000000000000000000032';
  const doc = taskDocument({
    status: 'todo',
    goalId: new mongoose.Types.ObjectId(oldGoalId),
  });
  const recalculated = [];
  t.mock.method(Task, 'findOne', async (filter, projection, options) => {
    assert.equal(options.session, session);
    return doc;
  });
  doc.save = async (options) => { assert.equal(options.session, session); };
  t.mock.method(Goal, 'exists', async (filter, options) => {
    assert.equal(options.session, session);
    return { _id: newGoalId };
  });
  t.mock.method(goalService, 'recalculateProgress', async (goalId, userId, goalSession) => {
    assert.equal(goalSession, session);
    assert.equal(userId, USER_ID);
    recalculated.push(goalId);
  });

  await taskService.updateTask(USER_ID, TASK_ID, {
    title: 'Task', description: null, status: 'done', dueDate: null,
    goalId: newGoalId, priority: 'medium',
  });

  assert.deepEqual(recalculated.sort(), [oldGoalId, newGoalId].sort());
});

test('updating a missing Task rejects the transaction before saving', async (t) => {
  const session = mockTaskTransaction(t);
  t.mock.method(Task, 'findOne', async (filter, projection, options) => {
    assert.equal(options.session, session);
    assert.equal(filter.userId.toString(), USER_ID);
    return null;
  });
  t.mock.method(goalService, 'recalculateProgress', async () => {
    assert.fail('a missing Task must not update Goal progress');
  });

  await assert.rejects(
    taskService.updateTask(USER_ID, TASK_ID, {
      title: 'Missing', description: null, status: 'todo',
      dueDate: null, goalId: null, priority: 'medium',
    }),
    (error) => error.status === 404,
  );
});

test('failure updating the destination Goal rejects the whole Task update transaction', async (t) => {
  const session = mockTaskTransaction(t);
  const oldGoalId = GOAL_ID;
  const newGoalId = '64f000000000000000000032';
  const doc = taskDocument({ goalId: new mongoose.Types.ObjectId(oldGoalId) });
  const failure = new Error('Destination Goal save failed');
  const writes = [];
  t.mock.method(Task, 'findOne', async (filter, projection, options) => {
    assert.equal(options.session, session);
    return doc;
  });
  t.mock.method(Goal, 'exists', async (filter, options) => {
    assert.equal(options.session, session);
    return { _id: newGoalId };
  });
  doc.save = async (options) => {
    assert.equal(options.session, session);
    writes.push('task');
  };
  t.mock.method(goalService, 'recalculateProgress', async (goalId, userId, goalSession) => {
    assert.equal(goalSession, session);
    assert.equal(userId, USER_ID);
    writes.push(goalId);
    if (goalId === newGoalId) throw failure;
  });

  await assert.rejects(
    taskService.updateTask(USER_ID, TASK_ID, {
      title: 'Moved', description: null, status: 'done',
      dueDate: null, goalId: newGoalId, priority: 'medium',
    }),
    (error) => error === failure,
  );
  assert.deepEqual(writes, ['task', oldGoalId, newGoalId]);
});

test('deleting a linked Task recalculates its Goal', async (t) => {
  const session = mockTaskTransaction(t);
  const doc = taskDocument({ goalId: new mongoose.Types.ObjectId(GOAL_ID) });
  let recalculated;
  t.mock.method(Task, 'findOneAndDelete', async (query, options) => {
    assert.equal(options.session, session);
    assert.equal(query._id.toString(), TASK_ID);
    assert.equal(query.userId.toString(), USER_ID);
    return doc;
  });
  t.mock.method(goalService, 'recalculateProgress', async (goalId, userId, goalSession) => {
    assert.equal(goalSession, session);
    recalculated = { goalId, userId };
  });

  const result = await taskService.deleteTask(USER_ID, TASK_ID);
  assert.deepEqual(result, { _id: TASK_ID, deleted: true });
  assert.deepEqual(recalculated, { goalId: GOAL_ID, userId: USER_ID });
});

test('Goal recalculation failure rejects the Task deletion transaction', async (t) => {
  const session = mockTaskTransaction(t);
  const doc = taskDocument({ goalId: new mongoose.Types.ObjectId(GOAL_ID) });
  const failure = new Error('Goal update failed after Task deletion');
  let deletionAttempted = false;
  t.mock.method(Task, 'findOneAndDelete', async (query, options) => {
    assert.equal(options.session, session);
    deletionAttempted = true;
    return doc;
  });
  t.mock.method(goalService, 'recalculateProgress', async (goalId, userId, goalSession) => {
    assert.equal(deletionAttempted, true);
    assert.equal(goalSession, session);
    assert.equal(goalId, GOAL_ID);
    assert.equal(userId, USER_ID);
    throw failure;
  });

  await assert.rejects(taskService.deleteTask(USER_ID, TASK_ID), (error) => error === failure);
});

test('deleting a Task without a Goal skips progress recalculation', async (t) => {
  const session = mockTaskTransaction(t);
  t.mock.method(Task, 'findOneAndDelete', async (query, options) => {
    assert.equal(options.session, session);
    return taskDocument();
  });
  t.mock.method(goalService, 'recalculateProgress', async () => {
    assert.fail('An unlinked Task has no Goal to recalculate');
  });

  const result = await taskService.deleteTask(USER_ID, TASK_ID);
  assert.deepEqual(result, { _id: TASK_ID, deleted: true });
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
