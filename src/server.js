/**
 * ============================
 * FZ MESSAGING SERVICE
 * ============================
 * Main server entry point
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bodyParser = require('body-parser');

// Configuration & Utils
const env = require('./config/environment');
const logger = require('./utils/logger');
const initializeEureka = require('./config/eureka');

// Middleware
const requestLogger = require('./middleware/requestLogger');

// Routes & Socket
const initializeRoutes = require('./routes/index');
const registerSocketHandlers = require('./socket/socketHandlers');

// Services
const messageService = require('./services/messageService');

/**
 * ============================
 * APPLICATION SETUP
 * ============================
 */

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*' },
});

// Middleware
app.use(bodyParser.json());
app.use(requestLogger);

// API host for message service
const apiHost = `${env.APP_PROTOCOL}://${env.SERVER_IP}:${env.PORT}`;
messageService.initialize(apiHost);

/**
 * ============================
 * ROUTES
 * ============================
 */
app.use('/', initializeRoutes(io));

/**
 * ============================
 * SOCKET.IO
 * ============================
 */
registerSocketHandlers(io);

/**
 * ============================
 * EUREKA REGISTRATION
 * ============================
 */
initializeEureka();

/**
 * ============================
 * START SERVER
 * ============================
 */
server.listen(env.PORT, () => {
  logger.info('Server started', { 
    url: `http://${env.SERVER_IP}:${env.PORT}`,
    environment: env.NODE_ENV,
  });
});
