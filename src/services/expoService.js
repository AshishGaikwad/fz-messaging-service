/**
 * ============================
 * EXPO PUSH NOTIFICATION SERVICE
 * ============================
 */

const logger = require('../utils/logger');

class ExpoService {
  constructor() {
    this.EXPO_API_URL = 'https://exp.host/--/api/v2/push/send';
    this.BATCH_SIZE = 100;
  }

  /**
   * Send push notification via Expo
   */
  async sendPush(expoTokens, title, body, data = {}) {
    if (!expoTokens || expoTokens.length === 0) {
      logger.debug('No Expo tokens provided, skipping push');
      return;
    }

    const image = data.senderProfileImageLowQuality || data.senderProfileImage || data.senderImageUrl || data.image;
    const categoryId = data.categoryId || data.categoryIdentifier;

    const messages = expoTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: {
        ...data,
        ...(image ? { image } : {}),
        ...(categoryId ? { categoryId } : {}),
      },
      ...(categoryId ? { categoryId } : {}),
      ...(image ? { richContent: { image } } : {}),
    }));

    const batches = this.createBatches(messages, this.BATCH_SIZE);

    for (const batch of batches) {
      try {
        const response = await fetch(this.EXPO_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });

        const responseText = await response.text();
        const result = this.parseExpoResponse(responseText);
        if (!response.ok) {
          logger.error('Expo push request failed', {
            status: response.status,
            statusText: response.statusText,
            body: result || responseText,
          });
          continue;
        }

        logger.debug('Expo push batch sent', { 
          count: batch.length, 
          result: result 
        });
      } catch (err) {
        logger.error('Expo push error', { error: err.message });
      }
    }
  }

  parseExpoResponse(responseText = '') {
    const text = String(responseText || '').trim();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch (error) {
      logger.warn('Expo returned non-JSON response', {
        body: text.slice(0, 300),
      });
      return text;
    }
  }

  /**
   * Create batches from array
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

module.exports = new ExpoService();
