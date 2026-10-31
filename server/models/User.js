const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
    select: false,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
}, {
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    transform(_document, result) {
      delete result.passwordHash;
      delete result.__v;
      return result;
    },
  },
});

module.exports = mongoose.model('User', userSchema);
