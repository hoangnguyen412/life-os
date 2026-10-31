require('dotenv').config();

const app = require('./app');
const connectDatabase = require('./config/database');

const port = Number(process.env.PORT) || 5000;

async function startServer() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is required');
  }

  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
  }

  await connectDatabase();
  app.listen(port, () => {
    console.log(`Life OS API listening on port ${port}`);
  });
}

if (require.main === module) {
  startServer().catch((error) => {
    console.error(`Failed to start Life OS API: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = { startServer };
