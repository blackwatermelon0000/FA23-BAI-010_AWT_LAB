const AppError = require('../utils/AppError');

function notFound(req, res, next) {
  next(new AppError(404, 'Route not found', 'ROUTE_NOT_FOUND'));
}

module.exports = notFound;
