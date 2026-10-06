/**
 * ============================
 * USER SERVICE
 * ============================
 */

const logger = require('../utils/logger');
const env = require('../config/environment');
const fs = require('fs');
const path = require('path');

const TOKEN_STORE_PATH = path.join(__dirname, '../../data/expo-tokens.json');

class UserService {
  constructor() {
    this.userSocketMap = new Map(); // Map<userId, socketId>
    this.userExpoTokens = new Map(); // Map<userId, Set<ExpoToken>>
    this.userApiBaseUrl = env.USER_API_BASE_URL;
    this.loadExpoTokens();
  }

  loadExpoTokens() {
    try {
      if (!fs.existsSync(TOKEN_STORE_PATH)) {
        return;
      }
      const raw = fs.readFileSync(TOKEN_STORE_PATH, 'utf8');
      const parsed = raw ? JSON.parse(raw) : {};
      Object.entries(parsed).forEach(([userId, tokens]) => {
        if (Array.isArray(tokens) && tokens.length > 0) {
          this.userExpoTokens.set(String(userId), new Set(tokens.filter(Boolean)));
        }
      });
      logger.info('Expo tokens loaded', { users: this.userExpoTokens.size });
    } catch (error) {
      logger.warn('Failed to load Expo tokens', { error: error.message });
    }
  }

  persistExpoTokens() {
    try {
      const dir = path.dirname(TOKEN_STORE_PATH);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {};
      this.userExpoTokens.forEach((tokens, userId) => {
        data[userId] = Array.from(tokens);
      });
      fs.writeFileSync(TOKEN_STORE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
      logger.warn('Failed to persist Expo tokens', { error: error.message });
    }
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
    this.persistExpoTokens();
    logger.info('Expo token registered', { userId: key, expoToken });
  }

  removeExpoToken(userId, expoToken) {
    const key = String(userId);
    if (!this.userExpoTokens.has(key)) return false;

    const removed = this.userExpoTokens.get(key).delete(expoToken);
    if (this.userExpoTokens.get(key).size === 0) {
      this.userExpoTokens.delete(key);
    }
    this.persistExpoTokens();
    logger.info('Expo token removed', { userId: key, removed });
    return removed;
  }

  /**
   * Get all Expo tokens for a user
   */
  getUserExpoTokens(userId) {
    const key = String(userId);
    const tokens = this.userExpoTokens.has(key) ? Array.from(this.userExpoTokens.get(key)) : [];
    if (tokens.length === 0) {
      logger.warn('No Expo tokens registered for user', { userId: key });
    }
    return tokens;
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

  async getUserProfile(userId) {
    if (!userId) return null;

    try {
      const response = await fetch(`${this.userApiBaseUrl}/internal/users/${userId}/summary`);
      if (!response.ok) {
        logger.warn('User profile lookup failed', { userId, status: response.status });
        return null;
      }

      const payload = await response.json();
      const user = payload?.body || payload;
      const fullName = typeof user?.fullName === 'string' ? user.fullName.trim() : null;
      return {
        id: String(user?.id || userId),
        fullName: fullName || null,
        profileImage: user?.profilePicUrl || user?.profileImageUrl || null,
      };
    } catch (error) {
      logger.warn('Failed to fetch user profile', { userId, error: error.message });
      return null;
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
