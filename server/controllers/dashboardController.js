const dashboardService = require('../services/dashboardService');

async function summary(req, res) {
  const data = await dashboardService.getSummary(req.userId);
  return res.json({ success: true, data });
}

module.exports = { summary };
