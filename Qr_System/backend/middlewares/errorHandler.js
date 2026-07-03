const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found`;
    error = new AppError(message, 404);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = `Duplicate field value entered`;
    error = new AppError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = new AppError(message, 400);
  }

  // Log error
  if (!error.isOperational) {
    logger.error(`❌ Unexpected Error: ${err.message}`, err);
  }

  const statusCode = error.statusCode || err.statusCode || 500;

  res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
  });
};

module.exports = errorHandler;
