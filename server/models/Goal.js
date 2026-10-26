const mongoose = require('mongoose');

// Task CRUD uses the owner reference to validate links and the progress fields
// to maintain Goal progress when linked Tasks change. Goal CRUD remains a later phase.
const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  progressMode: {
    type: String,
    enum: ['task_based', 'manual'],
    default: 'task_based',
  },
  manualProgress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
}, { strict: false, versionKey: false });

module.exports = mongoose.model('Goal', goalSchema);
