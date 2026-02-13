/**
 * ============================
 * HEALTH CHECK CONTROLLER
 * ============================
 */

class HealthController {
  /**
   * Health check endpoint
   */
  static getHealth(req, res) {
    res.json({ status: 'UP' });
  }

  /**
   * Service info endpoint
   */
  static getInfo(req, res) {
    res.json({ service: 'FZ-MESSAGING-SERVICE', version: '1.0.0' });
  }
}

module.exports = HealthController;
