const eventService = require('../services/eventService');

async function list(req, res) {
  const result = await eventService.listEvents(req.userId, req.query);
  return res.json({ success: true, ...result });
}

async function create(req, res) {
  const data = await eventService.createEvent(req.userId, req.body);
  return res.status(201).json({ success: true, data });
}

async function get(req, res) {
  const data = await eventService.getEvent(req.userId, req.params.id);
  return res.json({ success: true, data });
}

async function update(req, res) {
  const data = await eventService.updateEvent(req.userId, req.params.id, req.body);
  return res.json({ success: true, data });
}

async function remove(req, res) {
  const data = await eventService.deleteEvent(req.userId, req.params.id);
  return res.json({ success: true, data });
}

module.exports = { list, create, get, update, remove };
