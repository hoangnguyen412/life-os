const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const taskController = require('../controllers/taskController');

const uri = process.env.MONGODB_TEST_URI;

test('linked Task creation rolls back on a Goal save failure and succeeds once on retry', {
  skip: uri ? false : 'Set MONGODB_TEST_URI to a dedicated test replica set',
}, async (t) => {
  const dbName = `life_os_task_test_${randomUUID().replaceAll('-', '')}`;
  t.after(async () => {
    try {
      if (mongoose.connection.readyState === 1 && mongoose.connection.name === dbName) {
        await mongoose.connection.dropDatabase();
      }
    } finally {
      await mongoose.disconnect();
    }
  });
  await mongoose.connect(uri, { dbName, serverSelectionTimeoutMS: 5000 });
  await Goal.init();
  await Task.init();

  const userId = new mongoose.Types.ObjectId();
  const goal = await Goal.create({ userId, title: 'Learn MongoDB' });
  const taskFilter = { userId, goalId: goal._id };
  await Task.create({ ...taskFilter, title: 'First step', status: 'todo' });
  const initialCount = await Task.countDocuments(taskFilter);
  const req = {
    userId: userId.toString(),
    body: { title: 'Second step', goalId: goal.id, status: 'done' },
  };
  const res = {
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; },
  };
  let countAtFailure;
  const save = t.mock.method(Goal.prototype, 'save', async function (options) {
    countAtFailure = await Task.countDocuments(taskFilter, { session: options?.session });
    throw new Error('Injected Goal save failure');
  });

  try {
    await assert.rejects(taskController.create(req, res), /Injected Goal save failure/);
  } finally {
    save.mock.restore();
  }
  assert.equal(countAtFailure, initialCount + 1, 'the Task insert ran before the Goal save failed');
  assert.equal(res.body, undefined);
  const afterFailure = await Goal.findById(goal._id);
  assert.equal(afterFailure.progress, goal.progress);
  assert.equal(afterFailure.status, goal.status);
  assert.equal(await Task.countDocuments(taskFilter), initialCount, 'failed creation left a Task in MongoDB');

  await taskController.create(req, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.success, true);
  assert.equal(await Task.countDocuments(taskFilter), initialCount + 1);
  assert.equal(await Task.countDocuments({ ...taskFilter, title: req.body.title }), 1);
  const afterRetry = await Goal.findById(goal._id);
  assert.equal(afterRetry.progress, 50);
  assert.equal(afterRetry.status, 'active');
});
