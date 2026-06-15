/**
 * ============================
 * CHAT NOTIFICATION SERVICE
 * ============================
 */

const DEFAULT_SENDER_NAME = 'Unknown sender';
const DEFAULT_SENDER_PIC = null;
const DEFAULT_MESSAGE_TEXT = '';

class ChatNotificationService {
  constructor() {
    this.dedupeCache = new Map(); // Map<messageId, timestamp>
    this.dedupeWindowMs = 5 * 60 * 1000;
  }

  buildPayload(input = {}) {
    const timestamp = this.normalizeTimestamp(input.timestamp || input.sentAt || input.createdAt);

    return {
      senderId: this.normalizeString(input.senderId || input.sender || input.fromUserId || input.from || 'unknown'),
      senderName: this.normalizeString(input.senderName || input.sender_name || DEFAULT_SENDER_NAME),
      senderPic: this.normalizeNullableString(input.senderPic || input.sender_pic || DEFAULT_SENDER_PIC),
      messageText: this.normalizeString(input.messageText || input.text || input.content || DEFAULT_MESSAGE_TEXT),
      conversationId: this.normalizeString(
        input.conversationId ||
        input.conversation_id ||
        input.threadId ||
        input.thread_id ||
        this.buildConversationId(input.senderId || input.sender, input.receiverId || input.receiver || input.toUserId)
      ),
      timestamp,
    };
  }

  buildConversationId(senderId, receiverId) {
    const first = this.normalizeString(senderId || 'unknown');
    const second = this.normalizeString(receiverId || 'unknown');
    return [first, second].sort().join('_');
  }

  getMessageId(input = {}) {
    return this.normalizeString(input.messageId || input.message_id || input.id || input.clientMessageId || '');
  }

  shouldSkipDuplicate(input = {}) {
    const messageId = this.getMessageId(input);
    if (!messageId) return false;

    const now = Date.now();
    this.pruneDedupeCache(now);

    if (this.dedupeCache.has(messageId)) {
      return true;
    }

    this.dedupeCache.set(messageId, now);
    return false;
  }

  pruneDedupeCache(now = Date.now()) {
    for (const [messageId, seenAt] of this.dedupeCache.entries()) {
      if (now - seenAt > this.dedupeWindowMs) {
        this.dedupeCache.delete(messageId);
      }
    }
  }

  normalizeTimestamp(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
  }

  normalizeString(value) {
    if (value === null || value === undefined) return '';
    return String(value);
  }

  normalizeNullableString(value) {
    if (value === undefined) return DEFAULT_SENDER_PIC;
    if (value === null) return null;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : DEFAULT_SENDER_PIC;
  }
}

module.exports = new ChatNotificationService();
