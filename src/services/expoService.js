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

    const messages = expoTokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data,
    }));

    const batches = this.createBatches(messages, this.BATCH_SIZE);

    for (const batch of batches) {
      try {
        const response = await fetch(this.EXPO_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(batch),
        });

        const result = await response.json();
        logger.debug('Expo push batch sent', { 
          count: batch.length, 
          result: result 
        });
      } catch (err) {
        logger.error('Expo push error', { error: err.message });
      }
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
