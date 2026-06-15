/**
 * ============================
 * NOTIFICATION CONTROLLER
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const chatNotificationService = require('../services/chatNotificationService');

class NotificationController {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification to user
   */
  sendNotification = (req, res) => {
    const { toUserId, notificationTitle, notificationMessage, message } = req.body;

    if (!toUserId && !notificationMessage && !message) {
      logger.warn('Invalid notification request', req.body);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const notificationPayload = chatNotificationService.buildPayload({
      ...message,
      senderName: notificationTitle,
      messageText: notificationMessage,
      receiverId: toUserId,
    });

    const targetSocketId = userService.getUserSocket(toUserId);
    if (targetSocketId) {
      this.io.to(targetSocketId).emit('notification', {
        from: 'server',
        ...notificationPayload,
      });
      logger.info('Notification sent', { toUserId });
      return res.json({ success: true, notification: notificationPayload });
    }

    logger.warn('Notification target offline', { toUserId });
    res.status(404).json({ error: 'User not connected', notification: notificationPayload });
  };
}

module.exports = NotificationController;
