// An error that already knows which HTTP status (and optional machine code) it maps to.
class AppError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (code) this.code = code;
    if (details) this.details = details;
  }

  static badRequest(message, details) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }

  static notFound(message) {
    return new AppError(404, message, 'NOT_FOUND');
  }

  static conflict(message, code = 'CONFLICT') {
    return new AppError(409, message, code);
  }

  static unprocessable(message, details) {
    return new AppError(422, message, 'VALIDATION_ERROR', details);
  }
}

module.exports = AppError;
