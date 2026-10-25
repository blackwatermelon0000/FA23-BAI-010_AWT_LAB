const { ApolloServer } = require('@apollo/server');
const { unwrapResolverError } = require('@apollo/server/errors');
const { expressMiddleware } = require('@as-integrations/express5');
const typeDefs = require('./typeDefs');
const resolvers = require('./resolvers');
const { toAppError } = require('../middleware/errorHandler');

// Gives GraphQL errors the same status/code information the REST API uses.
function formatError(formattedError, error) {
  const original = unwrapResolverError(error);
  if (!original || original === error || original.name === 'GraphQLError') return formattedError;

  const appErr = toAppError(original);
  if (appErr.status >= 500) console.error(original);
  return {
    message: appErr.message,
    locations: formattedError.locations,
    path: formattedError.path,
    extensions: {
      code: appErr.code,
      status: appErr.status,
      ...(appErr.details && { details: appErr.details }),
    },
  };
}

async function createGraphQLMiddleware() {
  const server = new ApolloServer({ typeDefs, resolvers, formatError });
  await server.start();
  return expressMiddleware(server);
}

module.exports = { createGraphQLMiddleware };
