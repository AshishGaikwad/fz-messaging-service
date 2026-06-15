/**
 * ============================
 * NOTIFICATION CONTROLLER
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const expoService = require('../services/expoService');

class NotificationController {
  constructor(io) {
    this.io = io;
  }

  /**
   * Send notification to user
   */
  sendNotification = async (req, res) => {
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

    const tokens = userService.getUserExpoTokens(toUserId);
    if (tokens.length > 0) {
      try {
        await expoService.sendPush(
          tokens,
          notificationTitle || 'Frenzo',
          notificationMessage,
          {
            type: 'GENERAL_NOTIFICATION',
            toUserId,
          }
        );
        logger.info('Notification sent via Expo push', { toUserId, tokens: tokens.length });
        return res.json({ success: true, deliveredBy: 'push' });
      } catch (err) {
        logger.error('Failed to send Expo notification', { toUserId, error: err.message });
      }
    }

    logger.warn('Notification target offline and has no Expo tokens', { toUserId });
    res.status(404).json({ error: 'User not connected' });
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
