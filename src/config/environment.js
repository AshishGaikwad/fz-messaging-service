/**
 * ============================
 * ENVIRONMENT CONFIGURATION
 * ============================
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment based on NODE_ENV
const envFile = process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev';
dotenv.config({ path: path.join(__dirname, '../../', envFile) });

module.exports = {
  PORT: process.env.PORT || 9093,
  NODE_ENV: process.env.NODE_ENV || 'development',
  SERVER_IP: process.env.SERVER_IP || 'localhost',
  APP_PROTOCOL: process.env.PROTOCOL || 'http',
  DEBUG: process.env.DEBUG === 'true',
  EUREKA_HOST: process.env.EUREKA_HOST || 'localhost',
  EUREKA_PORT: process.env.EUREKA_PORT || 7070,
  EUREKA_SERVICE_PATH: process.env.EUREKA_SERVICE_PATH || '/eureka/apps/',
};
