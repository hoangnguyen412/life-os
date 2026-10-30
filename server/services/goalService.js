const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Task = require('../models/Task');
const AppError = require('../middleware/AppError');

function serializeGoal(goal) {
  const source = typeof goal.toObject === 'function' ? goal.toObject() : goal;
  return {
    _id: source._id.toString(),
    title: source.title,
    deadline: source.deadline ? new Date(source.deadline).toISOString() : null,
    progressMode: source.progressMode,
    ...(source.progressMode === 'manual' ? { manualProgress: source.manualProgress } : {}),
    progress: source.progress,
    status: source.status,
    createdAt: new Date(source.createdAt).toISOString(),
  };
}

function parsePagination(query) {
  const page = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'page must be an integer of at least 1', 'page');
  }
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'limit must be an integer from 1 to 100', 'limit');
  }

  return { page, limit };
}

async function calculateProgress(goal, userId) {
  if (goal.progressMode === 'task_based') {
    const taskFilter = {
      goalId: goal._id,
      userId: new mongoose.Types.ObjectId(userId),
    };
    const [total, completed] = await Promise.all([
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: 'done' }),
    ]);
    goal.progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  } else {
    goal.progress = goal.manualProgress;
  }

  goal.status = goal.progress === 100 ? 'completed' : 'active';
  return goal;
}

async function recalculateProgress(goalId, userId) {
  const goal = await Goal.findOne({
    _id: new mongoose.Types.ObjectId(goalId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!goal) return null;

  await calculateProgress(goal, userId);
  await goal.save();
  return goal;
}

async function listGoals(userId, query) {
  const { page, limit } = parsePagination(query);
  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  const [goals, total] = await Promise.all([
    Goal.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Goal.countDocuments(filter),
  ]);

  return {
    data: goals.map(serializeGoal),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

async function createGoal(userId, input) {
  const progressMode = input.progressMode ?? 'task_based';
  const manualProgress = progressMode === 'manual' ? (input.manualProgress ?? 0) : 0;
  const goalFields = {
    userId: new mongoose.Types.ObjectId(userId),
    title: input.title.trim(),
    deadline: input.deadline ?? null,
    progressMode,
    progress: progressMode === 'manual' ? manualProgress : 0,
    status: manualProgress === 100 && progressMode === 'manual' ? 'completed' : 'active',
  };
  if (progressMode === 'manual') goalFields.manualProgress = manualProgress;

  const goal = await Goal.create(goalFields);

  const currentGoal = progressMode === 'task_based'
    ? (await recalculateProgress(goal._id, userId) ?? goal)
    : goal;
  return serializeGoal(currentGoal);
}

async function findOwnedGoal(userId, goalId) {
  const goal = await Goal.findOne({
    _id: new mongoose.Types.ObjectId(goalId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!goal) throw new AppError(404, 'NOT_FOUND', 'Goal not found');
  return goal;
}

async function getGoal(userId, goalId) {
  return serializeGoal(await findOwnedGoal(userId, goalId));
}

async function updateGoal(userId, goalId, input) {
  const goal = await findOwnedGoal(userId, goalId);
  const previousMode = goal.progressMode;
  const nextMode = input.progressMode;

  if (previousMode === 'task_based' && nextMode === 'manual') {
    await calculateProgress(goal, userId);
    goal.manualProgress = goal.progress;
  }

  goal.title = input.title.trim();
  goal.deadline = input.deadline ?? null;
  goal.progressMode = nextMode;
  if (nextMode === 'task_based') goal.manualProgress = undefined;
  await calculateProgress(goal, userId);
  await goal.save();
  return serializeGoal(goal);
}

async function updateManualProgress(userId, goalId, manualProgress) {
  const goal = await findOwnedGoal(userId, goalId);
  if (goal.progressMode !== 'manual') {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Progress can only be changed for a manual-mode Goal',
      'progressMode',
    );
  }

  goal.manualProgress = manualProgress;
  await calculateProgress(goal, userId);
  await goal.save();
  return serializeGoal(goal);
}

async function deleteGoal(userId, goalId) {
  const goal = await findOwnedGoal(userId, goalId);
  await Task.updateMany(
    { goalId: goal._id, userId: new mongoose.Types.ObjectId(userId) },
    { $set: { goalId: null } },
  );
  const deletion = await Goal.deleteOne({
    _id: goal._id,
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (deletion.deletedCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Goal not found');
  }

  return { _id: goal._id.toString(), deleted: true };
}

module.exports = {
  listGoals,
  createGoal,
  getGoal,
  updateGoal,
  updateManualProgress,
  deleteGoal,
  recalculateProgress,
  serializeGoal,
  parsePagination,
};
