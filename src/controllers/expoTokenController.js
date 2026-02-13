/**
 * ============================
 * EXPO TOKEN CONTROLLER
 * ============================
 */

const logger = require('../utils/logger');
const userService = require('../services/userService');

class ExpoTokenController {
  /**
   * Register Expo token for user
   */
  static registerExpoToken(req, res) {
    const { userId, expoToken } = req.body;

    if (!userId || !expoToken) {
      logger.warn('Missing userId or expoToken in request', req.body);
      return res.status(400).json({ error: 'userId and expoToken are required' });
    }

    userService.addExpoToken(userId, expoToken);
    res.json({ success: true });
  }
}

module.exports = ExpoTokenController;
