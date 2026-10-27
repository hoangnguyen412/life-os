const path = require('node:path');
const cors = require('cors');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const goalRoutes = require('./routes/goalRoutes');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const openApiPath = path.resolve(__dirname, '..', 'docs', 'openapi.yaml');
const openApiDocument = YAML.parse(require('node:fs').readFileSync(openApiPath, 'utf8'));

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/goals', goalRoutes);

app.use((req, res, next) => {
  const error = new Error('Route not found');
  error.status = 404;
  error.code = 'NOT_FOUND';
  next(error);
});

app.use(errorHandler);

module.exports = app;
