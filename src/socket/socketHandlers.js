/**
 * ============================
 * SOCKET.IO HANDLERS
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const messageService = require('../services/messageService');
const expoService = require('../services/expoService');

const previewText = (text = '') => {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > 80 ? `${value.slice(0, 77)}...` : value;
};

/**
 * Register all Socket.IO event handlers
 */
function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    logger.info('Socket connected', { socketId: socket.id });

    /**
     * Register user and send pending messages
     */
    socket.on('register', async (userId) => {
      userService.registerUserSocket(userId, socket.id);

      try {
        const messages = await messageService.getPendingMessages(userId);
        const filteredMessages = await userService.filterBlockedMessages(userId, messages);
        if (filteredMessages.length > 0) {
          socket.emit('pending_messages', { message: filteredMessages });
          logger.info('Offline messages delivered', { userId, count: filteredMessages.length });
        }
      } catch (err) {
        logger.error('Failed to fetch offline messages', { userId, error: err.message });
      }
    });

    /**
     * Handle private messages
     */
    socket.on('private_message', async ({ toUserId, message }) => {
      logger.info('Private message received', { fromSocketId: socket.id, toUserId });

      if (!toUserId || !message) {
        logger.warn('Invalid private message payload', { socketId: socket.id });
        return;
      }

      if (await userService.isBlockedBetween(message.sender, toUserId)) {
        logger.warn('Blocked private message blocked', { fromUserId: message.sender, toUserId });
        socket.emit('private_message_blocked', {
          toUserId,
          reason: 'BLOCKED_USER',
        });
        return;
      }

      const senderProfile = await userService.getUserProfile(message.sender);
      const createdAt = new Date(message.timestamp || Date.now()).toISOString();
      const enrichedMessage = {
        ...message,
        receiver: toUserId,
        timestamp: message.timestamp || Date.now(),
        createdAt,
        senderName: message.senderName || senderProfile?.fullName || 'Frenzo user',
        senderProfileImage: message.senderProfileImage || senderProfile?.profileImage || null,
        messagePreview: previewText(message.text),
      };
      const targetSocketId = userService.getUserSocket(toUserId);

      // OFFLINE -> save to database + send push notification
      if (!targetSocketId) {
        logger.info('User offline, persisting message', { toUserId });

        const messageData = {
          sender: enrichedMessage.sender,
          receiver: toUserId,
          content: enrichedMessage,
        };

        await messageService.saveOfflineMessage(messageData);

        try {
          const tokens = userService.getUserExpoTokens(toUserId);
          if (tokens.length > 0) {
            await expoService.sendPush(tokens, enrichedMessage.senderName, enrichedMessage.messagePreview, {
              type: 'CHAT_MESSAGE',
              conversationId: enrichedMessage.conversationId || [String(enrichedMessage.sender), String(toUserId)].sort().join('_'),
              messageId: enrichedMessage.id || enrichedMessage.messageId || enrichedMessage.clientMessageId,
              senderId: enrichedMessage.sender,
              senderName: enrichedMessage.senderName,
              senderProfileImage: enrichedMessage.senderProfileImage || '',
              messagePreview: enrichedMessage.messagePreview,
              createdAt,
            });
            logger.info('Expo push sent', { toUserId, tokens: tokens.length });
          }
        } catch (err) {
          logger.error('Failed to send Expo push', { toUserId, error: err.message });
        }

        return;
      }

      // ONLINE -> deliver via socket
      io.to(targetSocketId).emit('private_message', {
        from: socket.id,
        message: enrichedMessage,
        timestamp: Date.now(),
      });
      logger.info('Message delivered via socket', { fromSocketId: socket.id, toSocketId: targetSocketId });
    });

    /**
     * Handle notifications
     */
    socket.on('notification', ({ toUserId, message }) => {
      const targetSocketId = userService.getUserSocket(toUserId);
      logger.info('Notification event', { toUserId, delivered: !!targetSocketId });

      if (targetSocketId) {
        io.to(targetSocketId).emit('notification', { from: socket.id, message });
      }
    });

    /**
     * Vibe Mode rooms. The matching service owns persistence; this server
     * handles the low-latency fanout to active mobile clients.
     */
    socket.on('vibe_subscribe', ({ vibeId, sessionId } = {}) => {
      if (!vibeId && !sessionId) {
        logger.warn('Invalid vibe_subscribe payload', { socketId: socket.id });
        return;
      }

      const room = sessionId ? `vibe:session:${sessionId}` : `vibe:${vibeId}`;
      socket.join(room);
      socket.emit('vibe_subscribed', { room, vibeId, sessionId });
      logger.info('Socket joined vibe room', { socketId: socket.id, room });
    });

    socket.on('vibe_unsubscribe', ({ vibeId, sessionId } = {}) => {
      if (!vibeId && !sessionId) return;

      const room = sessionId ? `vibe:session:${sessionId}` : `vibe:${vibeId}`;
      socket.leave(room);
      logger.info('Socket left vibe room', { socketId: socket.id, room });
    });

    /**
     * Temporary Vibe chat messages. These are live-only and are not persisted
     * as normal chat messages when the receiver is offline.
     */
    socket.on('vibe_message', async ({ toUserId, sessionId, message } = {}) => {
      if (!toUserId || !sessionId || !message) {
        logger.warn('Invalid vibe message payload', { socketId: socket.id });
        return;
      }

      const targetSocketId = userService.getUserSocket(toUserId);
      if (await userService.isBlockedBetween(message.sender, toUserId)) {
        logger.warn('Blocked vibe message blocked', { fromUserId: message.sender, toUserId, sessionId });
        socket.emit('vibe_message_blocked', {
          toUserId,
          sessionId,
          reason: 'BLOCKED_USER',
        });
        return;
      }

      if (!targetSocketId) {
        try {
          const tokens = userService.getUserExpoTokens(toUserId);
          if (tokens.length > 0) {
            await expoService.sendPush(
              tokens,
              'New Vibe message',
              'You have a new message in Vibe Mode.',
              {
                type: 'VIBE_MESSAGE',
                sessionId,
                senderId: message.sender,
              }
            );
            logger.info('Vibe Expo push sent', { toUserId, sessionId, tokens: tokens.length });
          }
        } catch (err) {
          logger.error('Failed to send vibe Expo push', { toUserId, sessionId, error: err.message });
        }

        socket.emit('vibe_message_failed', {
          toUserId,
          sessionId,
          reason: 'USER_OFFLINE',
          messageId: message.id,
        });
        logger.info('Vibe message target offline', { toUserId, sessionId });
        return;
      }

      const payload = {
        sessionId,
        from: socket.id,
        message: {
          ...message,
          sessionId,
          receiver: toUserId,
          timestamp: message.timestamp || Date.now(),
        },
      };

      io.to(targetSocketId).emit('vibe_message', payload);
      logger.info('Vibe message delivered', { toUserId, sessionId });
    });

    /**
     * Handle disconnect
     */
    socket.on('disconnect', (reason) => {
      const userId = userService.unregisterUser(socket.id);
      if (userId) {
        logger.info('User disconnected', { userId, reason });
      }
    });
  });
}

module.exports = registerSocketHandlers;
