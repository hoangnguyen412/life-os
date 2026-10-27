const goalService = require('../services/goalService');

async function list(req, res) {
  const result = await goalService.listGoals(req.userId, req.query);
  return res.json({ success: true, ...result });
}

async function create(req, res) {
  const data = await goalService.createGoal(req.userId, req.body);
  return res.status(201).json({ success: true, data });
}

async function get(req, res) {
  const data = await goalService.getGoal(req.userId, req.params.id);
  return res.json({ success: true, data });
}

async function update(req, res) {
  const data = await goalService.updateGoal(req.userId, req.params.id, req.body);
  return res.json({ success: true, data });
}

async function updateProgress(req, res) {
  const data = await goalService.updateManualProgress(
    req.userId,
    req.params.id,
    req.body.manualProgress,
  );
  return res.json({ success: true, data });
}

async function remove(req, res) {
  const data = await goalService.deleteGoal(req.userId, req.params.id);
  return res.json({ success: true, data });
}

module.exports = { list, create, get, update, updateProgress, remove };
