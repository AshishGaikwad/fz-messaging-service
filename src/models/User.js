/**
 * ============================
 * USER MODEL
 * ============================
 */

class User {
  constructor(userId) {
    this.userId = String(userId);
    this.socketId = null;
    this.expoTokens = new Set();
  }

  addExpoToken(token) {
    this.expoTokens.add(token);
  }

  getExpoTokens() {
    return Array.from(this.expoTokens);
  }

  setSocketId(socketId) {
    this.socketId = socketId;
  }

  clearSocketId() {
    this.socketId = null;
  }

  isOnline() {
    return this.socketId !== null;
  }
}

module.exports = User;
