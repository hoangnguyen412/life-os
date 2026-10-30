const mongoose = require('mongoose');
const Task = require('../models/Task');
const Goal = require('../models/Goal');

async function getSummary(userId) {
  const ownerId = new mongoose.Types.ObjectId(userId);
  const ownerFilter = { userId: ownerId };
  const now = new Date();

  const [totalTasks, completedTasks, overdueTasks, activeGoals] = await Promise.all([
    Task.countDocuments(ownerFilter),
    Task.countDocuments({ ...ownerFilter, status: 'done' }),
    Task.countDocuments({
      ...ownerFilter,
      dueDate: { $lt: now },
      status: { $ne: 'done' },
    }),
    Goal.find({ ...ownerFilter, status: 'active' }).select('progress -_id').lean(),
  ]);

  const totalProgress = activeGoals.reduce((total, goal) => total + goal.progress, 0);
  const avgGoalProgress = activeGoals.length === 0
    ? 0
    : Math.round(totalProgress / activeGoals.length);

  return { totalTasks, completedTasks, overdueTasks, avgGoalProgress };
}

module.exports = { getSummary };
