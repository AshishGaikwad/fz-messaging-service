/**
 * ============================
 * USER SERVICE
 * ============================
 */

const logger = require('../utils/logger');
const User = require('../models/User');
const env = require('../config/environment');

class UserService {
  constructor() {
    this.userSocketMap = new Map(); // Map<userId, socketId>
    this.userExpoTokens = new Map(); // Map<userId, Set<ExpoToken>>
    this.userApiBaseUrl = env.USER_API_BASE_URL;
  }

  /**
   * Register a user socket
   */
  registerUserSocket(userId, socketId) {
    const key = String(userId);
    this.userSocketMap.set(key, socketId);
    logger.info('User registered', { 
      userId: key, 
      socketId, 
      onlineUsers: this.userSocketMap.size 
    });
  }

  /**
   * Add Expo token for user
   */
  addExpoToken(userId, expoToken) {
    const key = String(userId);
    if (!this.userExpoTokens.has(key)) {
      this.userExpoTokens.set(key, new Set());
    }
    this.userExpoTokens.get(key).add(expoToken);
    logger.info('Expo token registered', { userId: key, expoToken });
  }

  /**
   * Get all Expo tokens for a user
   */
  getUserExpoTokens(userId) {
    const key = String(userId);
    if (!this.userExpoTokens.has(key)) return [];
    return Array.from(this.userExpoTokens.get(key));
  }

  /**
   * Get socket ID for a user
   */
  getUserSocket(userId) {
    return this.userSocketMap.get(String(userId)) || null;
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId) {
    return this.userSocketMap.has(String(userId));
  }

  /**
   * Unregister user
   */
  unregisterUser(socketId) {
    for (const [userId, sid] of this.userSocketMap.entries()) {
      if (sid === socketId) {
        this.userSocketMap.delete(userId);
        logger.warn('User disconnected', { 
          userId, 
          socketId, 
          onlineUsers: this.userSocketMap.size 
        });
        return userId;
      }
    }
    return null;
  }

  /**
   * Get all online users count
   */
  getOnlineUsersCount() {
    return this.userSocketMap.size;
  }

  /**
   * Check whether a pair is blocked in either direction.
   */
  async isBlockedBetween(userId, candidateUserId) {
    try {
      const response = await fetch(`${this.userApiBaseUrl}/internal/safety/blocks/check-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          candidateUserIds: [candidateUserId],
        }),
      });

      if (!response.ok) {
        return false;
      }

      const payload = await response.json();
      const blockedIds = payload?.body?.blockedUserIds || [];
      return blockedIds.includes(Number(candidateUserId));
    } catch (error) {
      logger.warn('Block check failed', { userId, candidateUserId, error: error.message });
      return false;
    }
  }

  /**
   * Filter blocked senders from a message list.
   */
  async filterBlockedMessages(userId, messages = []) {
    if (!Array.isArray(messages) || messages.length === 0) {
      return messages;
    }

    const senderIds = [...new Set(messages.map((message) => Number(message.senderId || message.sender || 0)).filter(Boolean))];
    if (senderIds.length === 0) {
      return messages;
    }

    try {
      const response = await fetch(`${this.userApiBaseUrl}/internal/safety/blocks/check-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          candidateUserIds: senderIds,
        }),
      });

      if (!response.ok) {
        return messages;
      }

      const payload = await response.json();
      const blockedIds = new Set(payload?.body?.blockedUserIds || []);
      return messages.filter((message) => !blockedIds.has(Number(message.senderId || message.sender || 0)));
    } catch (error) {
      logger.warn('Failed to filter blocked messages', { userId, error: error.message });
      return messages;
    }
  }
}

module.exports = new UserService();
