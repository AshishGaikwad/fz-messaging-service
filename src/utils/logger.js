/**
 * ============================
 * LOGGER UTILITY
 * ============================
 */

const logger = {
  info: (msg, meta = {}) =>
    console.log(`[INFO ] ${new Date().toISOString()} ${msg}`, meta),
  warn: (msg, meta = {}) =>
    console.warn(`[WARN ] ${new Date().toISOString()} ${msg}`, meta),
  error: (msg, meta = {}) =>
    console.error(`[ERROR] ${new Date().toISOString()} ${msg}`, meta),
  debug: (msg, meta = {}) => {
    if (process.env.DEBUG === 'true') {
      console.debug(`[DEBUG] ${new Date().toISOString()} ${msg}`, meta);
    }
  },
};

module.exports = logger;
