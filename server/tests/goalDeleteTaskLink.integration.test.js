const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const goalService = require('../services/goalService');
const taskService = require('../services/taskService');

const uri = process.env.MONGODB_TEST_URI;
const options = {
  skip: uri ? false : 'Set MONGODB_TEST_URI to a dedicated test replica set',
  timeout: 20000,
};

async function connectTestDatabase(t) {
  const dbName = `life_os_goal_race_${randomUUID().replaceAll('-', '')}`;
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
}

// Pause only the first call so a transaction retry can proceed.
async function interleave(t, model, method, start, during, { afterCall = false } = {}) {
  const reached = Promise.withResolvers();
  const resume = Promise.withResolvers();
  const original = model[method];
  let first = true;
  const hook = t.mock.method(model, method, async function (...args) {
    if (!first) return original.apply(this, args);
    first = false;
    const result = afterCall ? await original.apply(this, args) : undefined;
    reached.resolve();
    await resume.promise;
    return afterCall ? result : original.apply(this, args);
  });

  const operation = start();
  try {
    await Promise.race([
      reached.promise,
      operation.then(() => assert.fail(`Operation finished before reaching ${method}`)),
    ]);
    return await during();
  } finally {
    resume.resolve();
    try {
      await operation;
    } finally {
      hook.mock.restore();
    }
  }
}

for (const progressMode of ['manual', 'task_based']) {
  test(`deleting a ${progressMode} Goal unlinks a Task created after the unlink query`, options, async (t) => {
    await connectTestDatabase(t);
    const owner = new mongoose.Types.ObjectId();
    const otherOwner = new mongoose.Types.ObjectId();
    const goal = await goalService.createGoal(owner, {
      title: 'Deleting', progressMode, ...(progressMode === 'manual' ? { manualProgress: 40 } : {}),
    });
    const existing = await Task.create({ userId: owner, goalId: goal._id, title: 'Existing Task' });
    const otherGoal = await Goal.create({ userId: otherOwner, title: 'Other Goal' });
    const otherTask = await Task.create({ userId: otherOwner, goalId: otherGoal._id, title: 'Other Task' });

    // Deletion has already run updateMany when it reaches deleteOne.
    const created = await interleave(t, Goal, 'deleteOne',
      () => goalService.deleteGoal(owner, goal._id),
      async () => {
        const task = await taskService.createTask(owner, { title: 'New Task', goalId: goal._id });
        assert.equal(task.goalId, goal._id);
        assert.equal((await Goal.findById(goal._id)).progress, goal.progress);
        return task;
      });

    assert.equal(await Goal.exists({ _id: goal._id }), null);
    assert.equal(await Task.countDocuments({ goalId: goal._id }), 0, 'a Task still references the deleted Goal');
    assert.equal((await Task.findById(existing._id)).goalId, null);
    assert.equal((await Task.findById(created._id)).goalId, null);
    assert.equal((await Task.findById(otherTask._id)).goalId.toString(), otherGoal.id);
    assert.ok(await Goal.exists({ _id: otherGoal._id, userId: otherOwner }));
  });
}

async function setupReassignment(t) {
  await connectTestDatabase(t);
  const owner = new mongoose.Types.ObjectId();
  const goalA = await goalService.createGoal(owner, { title: 'Source Goal' });
  const goalB = await goalService.createGoal(owner, {
    title: 'Destination Goal', progressMode: 'manual', manualProgress: 40,
  });
  await taskService.createTask(owner, { title: 'Still to do', goalId: goalA._id });
  const task = await taskService.createTask(owner, {
    title: 'Move this Task', goalId: goalA._id, status: 'done',
  });
  assert.equal((await Goal.findById(goalA._id)).progress, 50);

  return {
    goalA,
    goalB,
    task,
    moveTask: () => taskService.updateTask(owner, task._id, {
      title: task.title, description: null, status: task.status,
      dueDate: null, goalId: goalB._id, priority: task.priority,
    }),
    deleteDestination: () => goalService.deleteGoal(owner, goalB._id),
  };
}

test('deleting Goal B before reassignment writes leaves the Task and progress on Goal A', options, async (t) => {
  const { goalA, goalB, task, moveTask, deleteDestination } = await setupReassignment(t);

  // Take the reassignment snapshot before deleting B, then let the write run.
  await assert.rejects(
    interleave(t, Task, 'findOne', moveTask, deleteDestination, { afterCall: true }),
    { status: 404, code: 'NOT_FOUND' },
  );

  assert.equal(await Goal.exists({ _id: goalB._id }), null);
  assert.equal(await Task.countDocuments({ goalId: goalB._id }), 0);
  assert.equal((await Task.findById(task._id)).goalId.toString(), goalA._id);
  assert.equal((await Goal.findById(goalA._id)).progress, 50);
});

test('reassignment before Goal B deletion preserves the Task and recalculates Goal A', options, async (t) => {
  const { goalA, goalB, task, moveTask, deleteDestination } = await setupReassignment(t);

  await interleave(t, Goal, 'deleteOne', deleteDestination, async () => {
    const moved = await moveTask();
    assert.equal(moved.goalId, goalB._id);
    assert.equal((await Goal.findById(goalA._id)).progress, 0);
    assert.equal((await Goal.findById(goalB._id)).progress, 40);
  });

  assert.equal(await Goal.exists({ _id: goalB._id }), null);
  assert.equal(await Task.countDocuments({ goalId: goalB._id }), 0);
  const saved = await Task.findById(task._id);
  assert.equal(saved.goalId, null);
  assert.equal(saved.status, 'done');
  assert.equal(saved.completedAt.toISOString(), task.completedAt);
  assert.equal((await Goal.findById(goalA._id)).progress, 0);
});
