/**
 * Analytics Request Parameter Parsing and Validation
 * 
 * Centralized parsing and validation for analytics endpoints.
 * Reduces foot-guns around userId and standardizes input handling.
 */

/**
 * Parse and validate userId from request
 * 
 * Priority:
 * 1. If req.user?.id exists, use that (authenticated)
 * 2. If ALLOW_QUERY_USER_ID=true, allow req.query.userId (dev mode)
 * 3. Otherwise, throw USER_ID_REQUIRED error
 * 
 * @param {Object} req - Express request object
 * @returns {number} User ID
 * @throws {Object} { status: 400, code: 'USER_ID_REQUIRED' }
 */
export function parseUserId(req) {
  // Priority 1: Authenticated user
  if (req.user?.id) {
    return parseInt(req.user.id);
  }
  
  // Priority 2: Query param (only if explicitly allowed)
  if (process.env.ALLOW_QUERY_USER_ID === 'true') {
    const userId = req.query.userId;
    if (userId) {
      const parsed = parseInt(userId);
      if (isNaN(parsed) || parsed <= 0) {
        throw {
          status: 400,
          code: 'INVALID_USER_ID',
          message: 'userId must be a positive integer'
        };
      }
      return parsed;
    }
  }
  
  // No valid userId found
  throw {
    status: 400,
    code: 'USER_ID_REQUIRED',
    message: 'userId is required. Authenticate or set ALLOW_QUERY_USER_ID=true for development.'
  };
}

/**
 * Parse and clamp weeksBack parameter
 * 
 * @param {Object} req - Express request object
 * @param {number} defaultValue - Default value (default: 16)
 * @returns {number} Weeks back (clamped 8-52)
 */
export function parseWeeksBack(req, defaultValue = 16) {
  const weeksBack = req.query.weeksBack;
  
  if (!weeksBack) {
    return defaultValue;
  }
  
  const parsed = parseInt(weeksBack);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  
  // Clamp to 8-52 weeks
  return Math.max(8, Math.min(52, parsed));
}

/**
 * Parse and clamp limit parameter
 * 
 * @param {Object} req - Express request object
 * @param {number} defaultValue - Default value (default: 12)
 * @returns {number} Limit (clamped 1-104)
 */
export function parseLimit(req, defaultValue = 12) {
  const limit = req.query.limit;
  
  if (!limit) {
    return defaultValue;
  }
  
  const parsed = parseInt(limit);
  if (isNaN(parsed)) {
    return defaultValue;
  }
  
  // Clamp to 1-104 weeks (2 years)
  return Math.max(1, Math.min(104, parsed));
}

/**
 * Parse and validate date range parameters
 * 
 * @param {Object} req - Express request object
 * @returns {Object} { after?: string, before?: string }
 * @throws {Object} { status: 400, code: 'INVALID_DATE_FORMAT' }
 */
export function parseDateRange(req) {
  const { after, before } = req.query;
  const result = {};
  
  // Validate after date
  if (after) {
    if (!isValidDate(after)) {
      throw {
        status: 400,
        code: 'INVALID_DATE_FORMAT',
        message: 'after must be in YYYY-MM-DD or ISO date format'
      };
    }
    result.after = normalizeDate(after);
  }
  
  // Validate before date
  if (before) {
    if (!isValidDate(before)) {
      throw {
        status: 400,
        code: 'INVALID_DATE_FORMAT',
        message: 'before must be in YYYY-MM-DD or ISO date format'
      };
    }
    result.before = normalizeDate(before);
  }
  
  // Validate range order
  if (result.after && result.before && result.after > result.before) {
    throw {
      status: 400,
      code: 'INVALID_DATE_RANGE',
      message: 'after date must be before or equal to before date'
    };
  }
  
  return result;
}

/**
 * Check if string is a valid date
 * 
 * @param {string} dateStr - Date string
 * @returns {boolean} True if valid
 */
function isValidDate(dateStr) {
  // Check YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  }
  
  // Check ISO format
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Normalize date to YYYY-MM-DD format
 * 
 * @param {string} dateStr - Date string
 * @returns {string} Normalized date
 */
function normalizeDate(dateStr) {
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

/**
 * Send standardized error response
 * 
 * @param {Object} res - Express response object
 * @param {Object} err - Error object
 */
export function sendError(res, err) {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const message = err.message || 'An unexpected error occurred';
  
  res.status(status).json({
    ok: false,
    error: {
      code,
      message
    }
  });
}

/**
 * Create structured warning object
 * 
 * @param {string} code - Warning code
 * @param {string} severity - Severity level ('warn' | 'info')
 * @param {number} value - Current value
 * @param {number} threshold - Threshold value
 * @param {string} message - Human-readable message
 * @returns {Object} Structured warning
 */
export function createWarning(code, severity, value, threshold, message) {
  return {
    code,
    severity,
    value,
    threshold,
    message
  };
}

/**
 * Check coverage and create warning if below threshold
 * 
 * @param {string} code - Warning code
 * @param {number} value - Current value (0-1 ratio)
 * @param {number} threshold - Threshold (0-1 ratio, default: 0.9)
 * @param {string} metricName - Metric name for message
 * @returns {Object|null} Warning object or null
 */
export function checkCoverage(code, value, threshold = 0.9, metricName) {
  if (value < threshold) {
    return createWarning(
      code,
      'warn',
      value,
      threshold,
      `Low ${metricName} coverage: ${(value * 100).toFixed(0)}% (threshold: ${(threshold * 100).toFixed(0)}%)`
    );
  }
  return null;
}

export default {
  parseUserId,
  parseWeeksBack,
  parseLimit,
  parseDateRange,
  sendError,
  createWarning,
  checkCoverage
};
