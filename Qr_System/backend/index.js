const app = require('./app');
const connectDB = require('./config/db');
const config = require('./config/config');
const logger = require('./utils/logger');

// Handle uncaught exceptions
process.on('uncaughtException', err => {
  logger.error('❌ UNCAUGHT EXCEPTION! Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});

// Connect to database
connectDB();

const server = app.listen(config.PORT, () => {
  logger.info(`✅ Server running in \${config.NODE_ENV} mode on port \${config.PORT}`);
  
  // Anti-sleep mechanism for Render free tier
  const RENDER_URL = process.env.RENDER_EXTERNAL_URL;
  if (RENDER_URL) {
    const keepAliveMinutes = 14; 
    setInterval(() => {
      const pingUrl = `\${RENDER_URL}/api/v1/health`;
      const httpModule = pingUrl.startsWith('https') ? require('https') : require('http');
      
      httpModule.get(pingUrl, (res) => {
        if (res.statusCode === 200) {
          logger.info('💓 Keep-alive ping successful');
        } else {
          logger.warn(`⚠️ Keep-alive ping responded with status: \${res.statusCode}`);
        }
      }).on('error', (err) => {
        logger.error(`❌ Keep-alive ping failed: \${err.message}`);
      });
    }, keepAliveMinutes * 60 * 1000);
    logger.info(`🕒 Anti-sleep self-ping activated (Interval: \${keepAliveMinutes}m) targeting \${RENDER_URL}`);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', err => {
  logger.error('❌ UNHANDLED REJECTION! Shutting down...');
  logger.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
