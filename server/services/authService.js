const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../middleware/AppError');

const SALT_ROUNDS = 12;
const TOKEN_LIFETIME = '7d';

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

function createToken(user) {
  return jwt.sign({}, process.env.JWT_SECRET, {
    subject: user._id.toString(),
    expiresIn: TOKEN_LIFETIME,
  });
}

async function register({ name, email, password }) {
  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new AppError(409, 'CONFLICT', 'Email is already registered', 'email');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    name: name.trim(),
    email: normalizedEmail,
    passwordHash,
  });

  return { token: createToken(user), user: publicUser(user) };
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash');
  const validPassword = user && await bcrypt.compare(password, user.passwordHash);
  if (!validPassword) {
    throw new AppError(401, 'UNAUTHORIZED', 'Email or password is incorrect');
  }

  return { token: createToken(user), user: publicUser(user) };
}

async function getCurrentUser(userId) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication is required');
  }
  return publicUser(user);
}

module.exports = { register, login, getCurrentUser };
