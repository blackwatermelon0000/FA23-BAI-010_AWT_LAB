const path = require('path');
const express = require('express');
const requestLogger = require('./middleware/requestLogger');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');
const healthRoutes = require('./routes/health.routes');
const apiRoutes = require('./routes');
const { createGraphQLMiddleware } = require('./graphql');

// Builds the Express app. It is async because Apollo Server must be started
// before its middleware can be mounted. The app does not listen; server.js does.
async function createApp() {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());
  app.use(express.static(path.join(__dirname, 'public')));

  app.use(healthRoutes);
  app.use('/api/v1', apiRoutes);
  app.use('/graphql', await createGraphQLMiddleware());

  // Must stay last: unknown routes, then the single error handler.
  app.use(notFound);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
