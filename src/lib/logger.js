/**
 * Logging utility with environment-aware levels
 * Only logs in development mode, silent in production
 */

const isDevelopment = import.meta.env.MODE === 'development';

const logger = {
  /**
   * Debug-level logging (verbose, development only)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info-level logging (general information, development only)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  /**
   * Warning-level logging (potential issues, always shown)
   */
  warn: (...args) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error-level logging (critical errors, always shown)
   */
  error: (...args) => {
    console.error('[ERROR]', ...args);
  },

  /**
   * Group logging for related messages
   */
  group: (label, callback) => {
    if (isDevelopment) {
      console.group(label);
      callback();
      console.groupEnd();
    }
  },

  /**
   * Table logging for structured data
   */
  table: (data) => {
    if (isDevelopment) {
      console.table(data);
    }
  }
};

export default logger;
