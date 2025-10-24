/**
 * Server-side logging utility with environment-aware levels
 * Only logs debug/info in development, always logs warnings/errors
 */

const isDevelopment = process.env.NODE_ENV !== 'production';

const logger = {
  /**
   * Debug-level logging (verbose, development only)
   */
  debug: (...args) => {
    if (isDevelopment) {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Info-level logging (general information, development only)
   */
  info: (...args) => {
    if (isDevelopment) {
      console.info('[INFO]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Warning-level logging (potential issues, always shown)
   */
  warn: (...args) => {
    console.warn('[WARN]', new Date().toISOString(), ...args);
  },

  /**
   * Error-level logging (critical errors, always shown)
   */
  error: (...args) => {
    console.error('[ERROR]', new Date().toISOString(), ...args);
  },

  /**
   * Request logging (development only)
   */
  request: (method, path, status) => {
    if (isDevelopment) {
      console.log(`[REQUEST] ${method} ${path} - ${status}`);
    }
  }
};

export default logger;
