/**
 * ============================
 * SOCKET.IO HANDLERS
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');
const messageService = require('../services/messageService');
const expoService = require('../services/expoService');
const chatNotificationService = require('../services/chatNotificationService');

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

      if (chatNotificationService.shouldSkipDuplicate(message)) {
        logger.warn('Duplicate message ignored', {
          socketId: socket.id,
          messageId: chatNotificationService.getMessageId(message),
        });
        return;
      }

      const notificationPayload = chatNotificationService.buildPayload({
        ...message,
        receiverId: toUserId,
      });

      const targetSocketId = userService.getUserSocket(toUserId);

      // OFFLINE -> save to database + send push notification
      if (!targetSocketId) {
        logger.info('User offline, persisting message', { toUserId });

        const messageData = {
          sender: notificationPayload.senderId,
          receiver: toUserId,
          content: {
            ...message,
            ...notificationPayload,
          },
        };

        const saveResult = await messageService.saveOfflineMessage(messageData);

        try {
          const tokens = userService.getUserExpoTokens(toUserId);
          if (tokens.length > 0) {
            await expoService.sendPush(tokens, notificationPayload.senderName, notificationPayload.messageText, {
              ...notificationPayload,
              unreadCount: saveResult.unreadCount ?? null,
              lastMessageTimestamp: saveResult.lastMessageTimestamp ?? notificationPayload.timestamp,
            });
            logger.info('Expo push sent', { toUserId, tokens: tokens.length });
          }
        } catch (err) {
          logger.error('Failed to send Expo push', { toUserId, error: err.message });
        }

        io.to(socket.id).emit('private_message_status', {
          messageId: chatNotificationService.getMessageId(message),
          ...notificationPayload,
          unreadCount: saveResult.unreadCount ?? null,
          lastMessageTimestamp: saveResult.lastMessageTimestamp ?? notificationPayload.timestamp,
        });

        return;
      }

      // ONLINE -> deliver via socket
      io.to(targetSocketId).emit('private_message', {
        from: socket.id,
        ...notificationPayload,
      });
      io.to(socket.id).emit('private_message_status', {
        messageId: chatNotificationService.getMessageId(message),
        ...notificationPayload,
        unreadCount: null,
        lastMessageTimestamp: notificationPayload.timestamp,
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
        io.to(targetSocketId).emit('notification', {
          from: socket.id,
          ...chatNotificationService.buildPayload({
            ...message,
            receiverId: toUserId,
          }),
        });
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
