const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
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
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
    validate: {
      validator(endTime) {
        return !this.startTime || endTime > this.startTime;
      },
      message: 'endTime must be later than startTime',
    },
  },
  description: {
    type: String,
    default: null,
    trim: true,
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

calendarEventSchema.index({ userId: 1, startTime: 1, _id: 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
