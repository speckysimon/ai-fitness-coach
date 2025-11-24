const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const adminService = require('./adminService.cjs');
const emailService = require('./emailService.js').default;
const adminDb = require('../adminDb.cjs');

/**
 * Admin Password Reset Service
 * Handles password reset token generation, validation, and password updates for admin users
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
 * Create password reset token for admin
 * @param {number} adminId - Admin user ID
 * @param {string} ipAddress - Request IP address
 * @param {string} userAgent - Request user agent
 * @returns {Promise<string>} Plain text token (send via email)
 */
async function createResetToken(adminId, ipAddress, userAgent) {
    try {
        // Invalidate any existing unused tokens for this admin
        adminDb.prepare(`
      UPDATE admin_password_resets 
      SET used_at = CURRENT_TIMESTAMP
      WHERE admin_id = ? AND used_at IS NULL
    `).run(adminId);

        // Generate new token
        const token = generateToken();
        const tokenHash = await hashToken(token);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now

        // Store token in database
        adminDb.prepare(`
      INSERT INTO admin_password_resets (admin_id, token_hash, expires_at, request_ip, user_agent)
      VALUES (?, ?, ?, ?, ?)
    `).run(adminId, tokenHash, expiresAt, ipAddress, userAgent);

        console.log(`Admin password reset token created for admin ${adminId}`);
        return token;
    } catch (error) {
        console.error('Error creating admin reset token:', error);
        throw new Error('Failed to create reset token');
    }
}

/**
 * Validate reset token
 * @param {string} token - Plain text token from URL
 * @returns {Promise<Object|null>} Token data if valid, null otherwise
 */
async function validateResetToken(token) {
    try {
        // Get all unused, non-expired tokens
        const tokens = adminDb.prepare(`
      SELECT * FROM admin_password_resets
      WHERE used_at IS NULL 
        AND datetime(expires_at) > datetime('now')
      ORDER BY created_at DESC
    `).all();

        // Find matching token (compare against hash)
        for (const tokenData of tokens) {
            const isMatch = await compareToken(token, tokenData.token_hash);
            if (isMatch) {
                console.log(`Valid admin reset token found for admin ${tokenData.admin_id}`);
                return tokenData;
            }
        }

        console.warn('Invalid or expired admin reset token provided');
        return null;
    } catch (error) {
        console.error('Error validating admin reset token:', error);
        throw new Error('Failed to validate reset token');
    }
}

/**
 * Reset admin password using token
 * @param {string} token - Plain text token from URL
 * @param {string} newPassword - New password
 * @returns {Promise<boolean>} True if successful
 */
async function resetPassword(token, newPassword) {
    try {
        // Validate token
        const tokenData = await validateResetToken(token);
        if (!tokenData) {
            throw new Error('Invalid or expired token');
        }

        const adminId = tokenData.admin_id;

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update admin password
        adminDb.prepare('UPDATE admin_users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(hashedPassword, adminId);

        // Mark token as used
        adminDb.prepare('UPDATE admin_password_resets SET used_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(tokenData.id);

        // Note: Admin sessions are JWT-based, they will automatically expire
        // No need to revoke sessions as they're stateless

        console.log(`Admin password reset successful for admin ${adminId}`);
        return true;
    } catch (error) {
        console.error('Error resetting admin password:', error);
        throw error;
    }
}

/**
 * Request password reset (generate token and send email)
 * @param {string} email - Admin email
 * @param {string} ipAddress - Request IP
 * @param {string} userAgent - Request user agent
 * @param {string} frontendUrl - Frontend base URL for reset link
 * @returns {Promise<boolean>} True if successful (always returns true to prevent email enumeration)
 */
async function requestPasswordReset(email, ipAddress, userAgent, frontendUrl) {
    try {
        // Find admin by email
        const admin = await adminService.getAdminByEmail(email);

        // IMPORTANT: Always return success to prevent email enumeration
        if (!admin) {
            console.log(`Admin password reset requested for non-existent email: ${email}`);
            return true; // Still return true - don't reveal that email doesn't exist
        }

        // Generate reset token
        const token = await createResetToken(admin.id, ipAddress, userAgent);

        // Create reset URL
        const resetUrl = `${frontendUrl}/admin/reset-password?token=${token}`;

        // Send email
        await emailService.sendAdminPasswordResetEmail(email, resetUrl, admin.name);

        console.log(`Admin password reset email sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error requesting admin password reset:', error);
        // Still return true to prevent email enumeration
        return true;
    }
}

/**
 * Clean up expired tokens (cron job)
 * Removes tokens older than 24 hours
 */
async function cleanupExpiredTokens() {
    try {
        const result = adminDb.prepare(`
      DELETE FROM admin_password_resets
      WHERE datetime(created_at) < datetime('now', '-24 hours')
    `).run();

        console.log(`Cleaned up ${result.changes} expired admin password reset tokens`);
        return result.changes;
    } catch (error) {
        console.error('Error cleaning up expired admin tokens:', error);
        throw error;
    }
}

module.exports = {
    createResetToken,
    validateResetToken,
    resetPassword,
    requestPasswordReset,
    cleanupExpiredTokens,
};
