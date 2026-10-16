const authService = require('../services/authService');

async function register(req, res) {
  const data = await authService.register(req.body);
  return res.status(201).json({ success: true, data });
}

async function login(req, res) {
  const data = await authService.login(req.body);
  return res.json({ success: true, data });
}

async function me(req, res) {
  const user = await authService.getCurrentUser(req.userId);
  return res.json({ success: true, data: user });
}

module.exports = { register, login, me };
