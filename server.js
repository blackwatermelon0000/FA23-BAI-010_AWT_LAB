const http = require('http');
const config = require('./config');
const { connectDB, disconnectDB } = require('./config/db');
const createApp = require('./app');
const { initSocket } = require('./socket');

async function start() {
  await connectDB(config.mongoUrl);

  const app = await createApp();
  const httpServer = http.createServer(app);
  const io = initSocket(httpServer, { adminKey: config.adminKey });

  httpServer.listen(config.port, () => {
    console.log(`CampusSpace API listening on http://localhost:${config.port}`);
    console.log(`  REST     http://localhost:${config.port}/api/v1`);
    console.log(`  GraphQL  http://localhost:${config.port}/graphql`);
    console.log(`  Board    http://localhost:${config.port}/board.html?room=ROOM-01`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    io.close(); // also closes the underlying HTTP server
    await disconnectDB();
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('Failed to start server:', err.message);
  process.exit(1);
});
