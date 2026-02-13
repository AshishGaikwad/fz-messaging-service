/**
 * ============================
 * MESSAGE SERVICE
 * ============================
 */

const logger = require('../utils/logger');

class MessageService {
  constructor() {
    this.apiHost = null;
  }

  /**
   * Initialize message service with API host
   */
  initialize(apiHost) {
    this.apiHost = apiHost;
  }

  /**
   * Fetch pending offline messages for user
   */
  async getPendingMessages(userId) {
    try {
      const response = await fetch(`${this.apiHost}/chat/api/messages/pending/${userId}`);
      if (response.ok) {
        const messages = await response.json();
        logger.info('Pending messages fetched', { userId, count: messages.length });
        return messages;
      } else {
        logger.warn('No pending messages', { userId });
        return [];
      }
    } catch (err) {
      logger.error('Failed to fetch pending messages', { userId, error: err.message });
      return [];
    }
  }

  /**
   * Save offline message to database
   */
  async saveOfflineMessage({ sender, receiver, content }) {
    logger.info('Saving offline message', { sender, receiver });

    try {
      const response = await fetch(`${this.apiHost}/chat/api/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender,
          recipient: receiver,
          content: JSON.stringify(content),
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Failed to save offline message', { errorText });
        return false;
      } else {
        logger.info('Offline message saved', { receiver });
        return true;
      }
    } catch (err) {
      logger.error('Message API error', { error: err.message });
      return false;
    }
  }
}

module.exports = new MessageService();
