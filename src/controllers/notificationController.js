/**
 * ============================
 * NOTIFICATION CONTROLLER
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const expoService = require('../services/expoService');
const notificationService = require('../services/notificationService');

class NotificationController {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification to user
   */
  sendNotification = async (req, res) => {
    const { toUserId, notificationTitle, notificationMessage, fromUserId, senderName, senderProfileImage } = req.body;

    if (!toUserId || !notificationMessage) {
      logger.warn('Invalid notification request', req.body);
      return res.status(400).json({ error: 'Invalid payload' });
    }

    const targetSocketId = userService.getUserSocket(toUserId);
    const notification = {
      from: 'server',
      notificationTitle,
      notificationMessage,
      data: {
        type: 'GENERAL_NOTIFICATION',
        toUserId,
        fromUserId,
        senderId: fromUserId,
        senderName,
        senderProfileImage,
        senderProfileImageLowQuality: senderProfileImage,
        senderImageUrl: senderProfileImage,
        notificationMessage,
        notificationKey: fromUserId && notificationMessage
          ? `notification:${fromUserId}:${String(notificationMessage).trim()}`
          : undefined,
      },
      createdAt: new Date().toISOString(),
    };

    if (targetSocketId) {
      this.io.to(targetSocketId).emit('notification', notification);
      logger.info('Notification sent', { toUserId });
      return res.json({ success: true });
    }

    const tokens = userService.getUserExpoTokens(toUserId);
    if (tokens.length > 0) {
      try {
        await expoService.sendPush(
          tokens,
          notificationTitle || 'Frenzo',
          notificationMessage,
          notification.data
        );
        logger.info('Notification sent via Expo push', { toUserId, tokens: tokens.length });
        return res.json({ success: true, deliveredBy: 'push' });
      } catch (err) {
        logger.error('Failed to send Expo notification', { toUserId, error: err.message });
      }
    } else {
      logger.warn('Push notification skipped; target has no Expo tokens', { toUserId });
    }

    notificationService.savePendingNotification(toUserId, notification);
    logger.warn('Notification target offline; queued for socket delivery', { toUserId });
    return res.json({ success: true, queued: true });
  };

  /**
   * Broadcast Vibe Mode events into a session room and optionally to one user.
   */
  broadcastVibeEvent = (req, res) => {
    const {
      type,
      vibeId,
      sessionId,
      userId,
      targetUserId,
      participantCount,
      remainingSeconds,
      payload = {},
    } = req.body;

    if (!type || (!sessionId && !vibeId)) {
      logger.warn('Invalid vibe broadcast request', req.body);
      return res.status(400).json({ error: 'Invalid vibe event payload' });
    }

    const room = sessionId ? `vibe:session:${sessionId}` : `vibe:${vibeId}`;
    const event = {
      type,
      vibeId,
      sessionId,
      userId,
      targetUserId,
      participantCount,
      remainingSeconds,
      payload,
      timestamp: Date.now(),
    };

    this.io.to(room).emit(type, event);
    this.io.to(room).emit('vibe_event', event);

    if (targetUserId) {
      const targetSocketId = userService.getUserSocket(targetUserId);
      if (targetSocketId) {
        this.io.to(targetSocketId).emit(type, event);
        this.io.to(targetSocketId).emit('vibe_event', event);
      }
    }

    logger.info('Vibe event broadcast', { type, room, targetUserId });
    return res.json({ success: true, room });
  };
}

module.exports = NotificationController;
