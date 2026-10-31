
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Goal = require('../models/Goal');
const AppError = require('../middleware/AppError');
const goalService = require('./goalService');

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 };

function serializeTask(task) {
  const source = typeof task.toObject === 'function' ? task.toObject() : task;

  return {
    _id: source._id.toString(),
    title: source.title,
    description: source.description ?? null,
    status: source.status,
    dueDate: source.dueDate ? new Date(source.dueDate).toISOString() : null,
    goalId: source.goalId ? source.goalId.toString() : null,
    priority: source.priority,
    completedAt: source.completedAt ? new Date(source.completedAt).toISOString() : null,
    createdAt: new Date(source.createdAt).toISOString(),
    updatedAt: new Date(source.updatedAt).toISOString(),
  };
}

function buildTaskFilter(userId, query, now = new Date()) {
  const filter = { userId: new mongoose.Types.ObjectId(userId) };
  const conditions = [];

  if (query.status) {
    conditions.push({ status: query.status });
  }

  if (query.goalId === 'none') {
    // Match tasks whose goalId is null or missing.
    conditions.push({ goalId: null });
  } else if (query.goalId) {
    conditions.push({
      goalId: new mongoose.Types.ObjectId(query.goalId),
    });
  }

  if (query.overdue === true) {
    conditions.push({
      dueDate: { $lt: now },
      status: { $ne: 'done' },
    });
  } else if (query.overdue === false) {
    conditions.push({
      $or: [
        { dueDate: { $gte: now } },
        { dueDate: null },
        { status: 'done' },
      ],
    });
  }

  if (conditions.length > 0) {
    filter.$and = conditions;
  }

  return filter;
}

function priorityRankExpression() {
  return {
    $switch: {
      branches: [
        { case: { $eq: ['$priority', 'high'] }, then: PRIORITY_RANK.high },
        { case: { $eq: ['$priority', 'low'] }, then: PRIORITY_RANK.low },
      ],
      default: PRIORITY_RANK.medium,
    },
  };
}

function sortPipeline(sort) {
  if (sort === 'createdAt_desc') {
    return [{ $sort: { createdAt: -1, _id: -1 } }];
  }

  const addFields = {
    _priorityRank: priorityRankExpression(),
    _dueDateMissing: {
      $cond: [
        { $eq: [{ $ifNull: ['$dueDate', null] }, null] },
        1,
        0,
      ],
    },
  };

  if (sort === 'priority_desc') {
    return [
      { $addFields: addFields },
      {
        $sort: {
          _priorityRank: 1,
          _dueDateMissing: 1,
          dueDate: 1,
          createdAt: -1,
          _id: -1,
        },
      },
      { $project: { _priorityRank: 0, _dueDateMissing: 0 } },
    ];
  }

  return [
    { $addFields: addFields },
    {
      $sort: {
        _dueDateMissing: 1,
        dueDate: 1,
        _priorityRank: 1,
        createdAt: -1,
        _id: -1,
      },
    },
    { $project: { _priorityRank: 0, _dueDateMissing: 0 } },
  ];
}

function parsePagination(query) {
  const page = query.page === undefined || query.page === ''
    ? 1
    : Number(query.page);

  const limit = query.limit === undefined || query.limit === ''
    ? 20
    : Number(query.limit);

  if (!Number.isInteger(page) || page < 1) {
    throw new AppError(400, 'VALIDATION_ERROR', 'page must be a positive integer');
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError(400, 'VALIDATION_ERROR', 'limit must be an integer between 1 and 100');
  }

  return { page, limit };
}

async function listTasks(userId, query) {
  const { page, limit } = parsePagination(query);
  const sort = query.sort ?? 'dueDate_asc';

  const pipeline = [
    { $match: buildTaskFilter(userId, query) },
    {
      $facet: {
        data: [
          ...sortPipeline(sort),
          { $skip: (page - 1) * limit },
          { $limit: limit },
        ],
        total: [{ $count: 'count' }],
      },
    },
  ];

  const [result = { data: [], total: [] }] = await Task.aggregate(pipeline);
  const total = result.total[0]?.count ?? 0;

  return {
    data: result.data.map(serializeTask),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

async function assertGoalBelongsToUser(goalId, userId) {
  if (goalId === null || goalId === undefined) return;

  const goal = await Goal.exists({
    _id: new mongoose.Types.ObjectId(goalId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!goal) {
    throw new AppError(404, 'NOT_FOUND', 'Goal not found for this user');
  }
}

async function createTask(userId, input) {
  const fields = {
    title: input.title.trim(),
    description: input.description == null ? null : input.description.trim(),
    status: input.status ?? 'todo',
    dueDate: input.dueDate ?? null,
    goalId: input.goalId ?? null,
    priority: input.priority ?? 'medium',
  };

  await assertGoalBelongsToUser(fields.goalId, userId);

  const task = await Task.create({
    ...fields,
    userId: new mongoose.Types.ObjectId(userId),
    completedAt: fields.status === 'done' ? new Date() : null,
  });

  if (fields.goalId) {
    await goalService.recalculateProgress(fields.goalId, userId);
  }

  return serializeTask(task);
}

async function getTask(userId, taskId) {
  const task = await Task.findOne({
    _id: new mongoose.Types.ObjectId(taskId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  return serializeTask(task);
}

async function updateTask(userId, taskId, input) {
  const task = await Task.findOne({
    _id: new mongoose.Types.ObjectId(taskId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  const nextStatus = input.status;
  const nextGoalId = input.goalId ?? null;

  await assertGoalBelongsToUser(nextGoalId, userId);

  const previousStatus = task.status;
  const wasDone = previousStatus === 'done';
  const previousGoalId = task.goalId ? task.goalId.toString() : null;

  Object.assign(task, {
    title: input.title.trim(),
    description: input.description == null ? null : input.description.trim(),
    status: nextStatus,
    dueDate: input.dueDate ?? null,
    goalId: nextGoalId,
    priority: input.priority,
    completedAt: nextStatus === 'done'
      ? (wasDone ? task.completedAt : new Date())
      : null,
  });

  await task.save();

  const statusChanged = previousStatus !== nextStatus;
  const currentGoalId = task.goalId ? task.goalId.toString() : null;
  const goalChanged = previousGoalId !== currentGoalId;

  if (statusChanged || goalChanged) {
    const affectedGoalIds = new Set();

    if (previousGoalId) affectedGoalIds.add(previousGoalId);
    if (currentGoalId) affectedGoalIds.add(currentGoalId);

    for (const goalId of affectedGoalIds) {
      await goalService.recalculateProgress(goalId, userId);
    }
  }

  return serializeTask(task);
}

async function deleteTask(userId, taskId) {
  const task = await Task.findOneAndDelete({
    _id: new mongoose.Types.ObjectId(taskId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!task) {
    throw new AppError(404, 'NOT_FOUND', 'Task not found');
  }

  if (task.goalId) {
    await goalService.recalculateProgress(task.goalId.toString(), userId);
  }

  return {
    _id: task._id.toString(),
    deleted: true,
  };
}

module.exports = {
  listTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
  buildTaskFilter,
  sortPipeline,
  parsePagination,
};
