const AppError = require('../utils/AppError');
const { ZodError } = require('zod');

/**
 * Validation middleware using Zod schemas
 * @param {import('zod').ZodObject} schema
 */
const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    if (err instanceof ZodError) {
      // Format the error issues elegantly
      const issues = err.issues || err.errors || [];
      const errorMessage = issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return next(new AppError(`Validation failed: ${errorMessage}`, 400));
    }
    next(err);
  }
};

module.exports = validateRequest;
