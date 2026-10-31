const taskService = require('../services/taskService');

async function list(req, res) {
  const result = await taskService.listTasks(req.userId, req.query);
  return res.json({ success: true, ...result });
}

async function create(req, res) {
  const data = await taskService.createTask(req.userId, req.body);
  return res.status(201).json({ success: true, data });
}

async function get(req, res) {
  const data = await taskService.getTask(req.userId, req.params.id);
  return res.json({ success: true, data });
}

async function update(req, res) {
  const data = await taskService.updateTask(req.userId, req.params.id, req.body);
  return res.json({ success: true, data });
}

async function remove(req, res) {
  const data = await taskService.deleteTask(req.userId, req.params.id);
  return res.json({ success: true, data });
}

module.exports = { list, create, get, update, remove };
