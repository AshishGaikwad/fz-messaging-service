/**
 * ============================
 * SOCKET.IO HANDLERS
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const messageService = require('../services/messageService');
const expoService = require('../services/expoService');

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

      // Send pending offline messages
      try {
        const messages = await messageService.getPendingMessages(userId);
        if (messages.length > 0) {
          socket.emit('pending_messages', { message: messages });
          logger.info('Offline messages delivered', { userId, count: messages.length });
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

      const targetSocketId = userService.getUserSocket(toUserId);

      // OFFLINE → save to database + send push notification
      if (!targetSocketId) {
        logger.info('User offline, persisting message', { toUserId });
        
        const messageData = {
          sender: message.sender,
          receiver: toUserId,
          content: message,
        };
        
        await messageService.saveOfflineMessage(messageData);

        try {
          const tokens = userService.getUserExpoTokens(toUserId);
          if (tokens.length > 0) {
            await expoService.sendPush(tokens, 'New Message', message.text, {
              senderId: message.sender,
            });
            logger.info('Expo push sent', { toUserId, tokens: tokens.length });
          }
        } catch (err) {
          logger.error('Failed to send Expo push', { toUserId, error: err.message });
        }

        return;
      }

      // ONLINE → deliver via socket
      io.to(targetSocketId).emit('private_message', {
        from: socket.id,
        message,
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
