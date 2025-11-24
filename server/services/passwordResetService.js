import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { userDb, sessionDb, getDb } from '../db.js';
import emailService from './emailService.js';
import logger from '../utils/logger.js';

/**
 * Password Reset Service (User App)
 * Handles password reset token generation, validation, and password updates
 */

/**
 * Generate secure random token
 * @returns {string} 48-character random token
 */
function generateToken() {
    return crypto.randomBytes(24).toString('hex');
}

/**
 * Hash token for storage
 * @param {string} token - Plain text token
 * @returns {Promise<string>} Hashed token
 */
async function hashToken(token) {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(token, salt);
}

/**
 * Compare token with hash
 * @param {string} token - Plain text token
 * @param {string} hash - Hashed token from database
 * @returns {Promise<boolean>} True if match
 */
async function compareToken(token, hash) {
    return bcrypt.compare(token, hash);
}

/**
 * Create password reset token for user
 * @param {number} userId - User ID
 * @param {string} ipAddress - Request IP address
 * @param {string} userAgent - Request user agent
 * @returns {Promise<string>} Plain text token (send via email)
 */
export async function createResetToken(userId, ipAddress, userAgent) {
    try {
        // Invalidate any existing unused tokens for this user
        const db = getDb();
        db.prepare(`
      UPDATE password_resets 
      SET used_at = datetime('now')
      WHERE user_id = ? AND used_at IS NULL
    `).run(userId);

        // Generate new token
        const token = generateToken();
        const tokenHash = await hashToken(token);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

        // Store token in database
        db.prepare(`
      INSERT INTO password_resets (user_id, token_hash, expires_at, request_ip, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, tokenHash, expiresAt, ipAddress, userAgent);

        logger.info(`Password reset token created for user ${userId}`);
        return token;
    } catch (error) {
        logger.error('Error creating reset token:', error);
        throw new Error('Failed to create reset token');
    }
}

/**
 * Validate reset token
 * @param {string} token - Plain text token from URL
 * @returns {Promise<Object|null>} Token data if valid, null otherwise
 */
export async function validateResetToken(token) {
    try {
        const db = getDb();

        // Get all unused, non-expired tokens
        const tokens = db.prepare(`
      SELECT * FROM password_resets
      WHERE used_at IS NULL 
        AND datetime(expires_at) > datetime('now')
      ORDER BY created_at DESC
    `).all();

        // Find matching token (compare against hash)
        for (const tokenData of tokens) {
            const isMatch = await compareToken(token, tokenData.token_hash);
            if (isMatch) {
                logger.info(`Valid reset token found for user ${tokenData.user_id}`);
                return tokenData;
            }
        }

        logger.warn('Invalid or expired reset token provided');
        return null;
    } catch (error) {
        logger.error('Error validating reset token:', error);
        throw new Error('Failed to validate reset token');
    }
}

/**
 * Reset user password using token
 * @param {string} token - Plain text token from URL
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} True if successful
 */
export async function resetPassword(token, newPassword) {
    try {
        // Validate token
        const tokenData = await validateResetToken(token);
        if (!tokenData) {
            throw new Error('Invalid or expired token');
        }

        const userId = tokenData.user_id;
        const db = getDb();

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(hashedPassword, userId);

        // Mark token as used
        db.prepare('UPDATE password_resets SET used_at = datetime(\'now\') WHERE id = ?')
            .run(tokenData.id);

        // Revoke all existing sessions for this user (security measure)
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);

        logger.info(`Password reset successful for user ${userId}`);
        return true;
    } catch (error) {
        logger.error('Error resetting password:', error);
        throw error;
    }
}

/**
 * Request password reset (generate token and send email)
 * @param {string} email - User email
 * @param {string} ipAddress - Request IP
 * @param {string} userAgent - Request user agent
 * @param {string} frontendUrl - Frontend base URL for reset link
 * @returns {Promise<boolean>} True if successful (always returns true to prevent email enumeration)
 */
export async function requestPasswordReset(email, ipAddress, userAgent, frontendUrl) {
    try {
        // Find user by email
        const user = userDb.findByEmail(email);

        // IMPORTANT: Always return success to prevent email enumeration
        if (!user) {
            logger.info(`Password reset requested for non-existent email: ${email}`);
            return true; // Still return true - don't reveal that email doesn't exist
        }

        // Generate reset token
        const token = await createResetToken(user.id, ipAddress, userAgent);

        // Create reset URL
        const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

        // Send email
        await emailService.sendPasswordResetEmail(email, resetUrl, user.name);

        logger.info(`Password reset email sent to ${email}`);
        return true;
    } catch (error) {
        logger.error('Error requesting password reset:', error);
        // Still return true to prevent email enumeration
        return true;
    }
}

/**
 * Clean up expired tokens (cron job)
 * Removes tokens older than 24 hours
 */
export async function cleanupExpiredTokens() {
    try {
        const db = getDb();
        const result = db.prepare(`
      DELETE FROM password_resets
      WHERE datetime(created_at) < datetime('now', '-24 hours')
    `).run();

        logger.info(`Cleaned up ${result.changes} expired password reset tokens`);
        return result.changes;
    } catch (error) {
        logger.error('Error cleaning up expired tokens:', error);
        throw error;
    }
}

export default {
    createResetToken,
    validateResetToken,
    resetPassword,
    requestPasswordReset,
    cleanupExpiredTokens,
};
