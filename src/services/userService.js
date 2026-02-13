/**
 * ============================
 * USER SERVICE
 * ============================
 */

const logger = require('../utils/logger');
const User = require('../models/User');

class UserService {
  constructor() {
    this.userSocketMap = new Map(); // Map<userId, socketId>
    this.userExpoTokens = new Map(); // Map<userId, Set<ExpoToken>>
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
}

module.exports = new UserService();
