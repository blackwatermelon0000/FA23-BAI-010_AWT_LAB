const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

// Converts any thrown error into an AppError so the response shape is always the same.
function toAppError(err) {
  if (err instanceof AppError) return err;

  if (err instanceof mongoose.Error.ValidationError) {
    const details = {};
    for (const [field, e] of Object.entries(err.errors)) {
      details[field] = e instanceof mongoose.Error.CastError ? `${field} has an invalid value` : e.message;
    }
    return AppError.unprocessable('Validation failed', details);
  }
  if (err instanceof mongoose.Error.CastError) {
    return AppError.badRequest(`Invalid value for ${err.path}`);
  }
  if (err && err.code === 11000) {
    const fields = Object.keys(err.keyValue || {}).join(', ');
    return AppError.conflict(`Duplicate value for ${fields || 'a unique field'}`, 'DUPLICATE');
  }
  if (err && err.type === 'entity.parse.failed') {
    return AppError.badRequest('Request body is not valid JSON');
  }
  if (err && err.status >= 400 && err.status < 500) {
    return new AppError(err.status, err.message);
  }
  return new AppError(500, 'Internal server error', 'INTERNAL_ERROR');
}

// Must keep four arguments so Express treats it as an error handler.
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const appErr = toAppError(err);
  if (appErr.status >= 500) console.error(err);

  const body = { status: appErr.status, message: appErr.message };
  if (appErr.code) body.code = appErr.code;
  if (appErr.details) body.details = appErr.details;
  res.status(appErr.status).json({ error: body });
}

module.exports = errorHandler;
module.exports.toAppError = toAppError;
