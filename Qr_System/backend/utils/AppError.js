/**
 * Custom Error class to identify operational errors versus programming bugs.
 */
class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    // Capture the stack trace, excluding the constructor call from it.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
