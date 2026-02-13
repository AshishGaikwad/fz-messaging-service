/**
 * ============================
 * NOTIFICATION CONTROLLER
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');

class NotificationController {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification to user
   */
  sendNotification = (req, res) => {
    const { toUserId, notificationTitle, notificationMessage } = req.body;

    if (!toUserId || !notificationMessage) {
      logger.warn('Invalid notification request', req.body);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const targetSocketId = userService.getUserSocket(toUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('notification', {
        from: 'server',
        notificationTitle,
        notificationMessage,
      });
      logger.info('Notification sent', { toUserId });
      return res.json({ success: true });
    }

    logger.warn('Notification target offline', { toUserId });
    res.status(404).json({ error: 'User not connected' });
  };
}

module.exports = NotificationController;
