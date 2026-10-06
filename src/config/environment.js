/**
 * ============================
 * ENVIRONMENT CONFIGURATION
 * ============================
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment based on NODE_ENV, with .env as the local default.
const rootDir = path.join(__dirname, '../../');
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
const primaryEnvPath = path.join(rootDir, envFile);
const fallbackEnvPath = path.join(rootDir, '.env');
const loaded = dotenv.config({ path: primaryEnvPath });
if (loaded.error && process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: fallbackEnvPath });
}

module.exports = {
  PORT: process.env.PORT || 9093,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVER_IP: process.env.SERVER_IP || 'localhost',
  APP_PROTOCOL: process.env.APP_PROTOCOL || 'http',
  DEBUG: process.env.DEBUG === 'true',
  EUREKA_HOST: process.env.EUREKA_HOST || 'localhost',
  EUREKA_PORT: process.env.EUREKA_PORT || 7070,
  EUREKA_SERVICE_PATH: process.env.EUREKA_SERVICE_PATH || '/eureka/apps/',
  CHAT_API_BASE_URL: process.env.CHAT_API_BASE_URL || `http://${process.env.SERVER_IP || 'localhost'}:9092`,
  USER_API_BASE_URL: process.env.USER_API_BASE_URL || `http://${process.env.SERVER_IP || 'localhost'}:9090`,
};
