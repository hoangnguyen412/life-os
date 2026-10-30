const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  deadline: {
    type: Date,
    default: null,
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
    validate: Number.isInteger,
    default: undefined,
  },
  progress: {
    type: Number,
    min: 0,
    max: 100,
    validate: Number.isInteger,
    default: 0,
  },
  status: {
    type: String,
    enum: ['active', 'completed'],
    default: 'active',
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
});

module.exports = mongoose.model('Goal', goalSchema);
