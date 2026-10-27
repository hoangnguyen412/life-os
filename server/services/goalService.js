const mongoose = require('mongoose');
const Goal = require('../models/Goal');
const Task = require('../models/Task');

async function recalculateProgress(goalId, userId) {
  const goal = await Goal.findOne({
    _id: new mongoose.Types.ObjectId(goalId),
    userId: new mongoose.Types.ObjectId(userId),
  });
  if (!goal) return null;

  if (goal.progressMode === 'task_based') {
    const taskFilter = {
      goalId: new mongoose.Types.ObjectId(goalId),
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
  await goal.save();
  return goal;
}

module.exports = { recalculateProgress };
