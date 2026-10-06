/**
 * ============================
 * NOTIFICATION SERVICE
 * ============================
 */

const logger = require('../utils/logger');

class NotificationService {
  constructor() {
    this.pendingNotifications = new Map();
    this.maxPendingPerUser = 100;
  }

  savePendingNotification(toUserId, notification) {
    const key = String(toUserId);
    const pending = this.pendingNotifications.get(key) || [];
    const entry = {
      id: notification.id || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from: notification.from || 'server',
      notificationTitle: notification.notificationTitle || 'Frenzo',
      notificationMessage: notification.notificationMessage,
      data: notification.data || {},
      createdAt: notification.createdAt || new Date().toISOString(),
    };

    pending.push(entry);
    if (pending.length > this.maxPendingPerUser) {
      pending.splice(0, pending.length - this.maxPendingPerUser);
    }

    this.pendingNotifications.set(key, pending);
    logger.info('Pending notification saved', { toUserId: key, pendingCount: pending.length });
    return entry;
  }

  drainPendingNotifications(toUserId) {
    const key = String(toUserId);
    const pending = this.pendingNotifications.get(key) || [];
    this.pendingNotifications.delete(key);
    return pending;
  }
}

module.exports = new NotificationService();
