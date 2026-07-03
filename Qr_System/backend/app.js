const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const AppError = require('./utils/AppError');

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// API Routes
app.use('/api/v1', routes);

// Handle unhandled routes
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
