/**
 * ============================
 * ROUTES
 * ============================
 */

const express = require('express');
const router = express.Router();

const ExpoTokenController = require('../controllers/expoTokenController');
const HealthController = require('../controllers/healthController');
const NotificationController = require('../controllers/notificationController');

/**
 * Initialize routes with Socket.IO instance
 */
function initializeRoutes(io) {
  const notificationController = new NotificationController(io);

  // Health check routes
  router.get('/health', HealthController.getHealth);
  router.get('/info', HealthController.getInfo);

  // Expo token routes
  router.post('/register-expo-token', ExpoTokenController.registerExpoToken);

  // Notification routes
  router.post('/send-notification', notificationController.sendNotification);

  return router;
}

module.exports = initializeRoutes;
