import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

/**
 * Email Service
 * Handles sending emails via SMTP (Gmail) for password reset functionality
 */

class EmailService {
  constructor() {
    this.transporter = null;
  }

  /**
   * Get email configuration from environment variables
   * Called lazily to ensure dotenv has loaded
   */
  getConfig() {
    return {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 10,
    };
  }

  /**
   * Get from email details
   */
  getFromEmail() {
    return {
      address: process.env.EMAIL_FROM_ADDRESS || process.env.EMAIL_USER,
      name: process.env.EMAIL_FROM_NAME || 'RiderLabs Support',
    };
  }

  /**
   * Initialize email transporter
   */
  async initialize() {
    const config = this.getConfig();

    if (!config.auth.user || !config.auth.pass) {
      logger.warn('Email service not configured. Skipping initialization.');
      return false;
    }

    try {
      this.transporter = nodemailer.createTransport(config);

      // Verify connection
      await this.transporter.verify();
      logger.info('Email service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize email service:', error);
      this.transporter = null;
      return false;
    }
  }

  /**
   * Ensure transporter is initialized
   */
  async ensureInitialized() {
    if (!this.transporter) {
      await this.initialize();
    }
    return !!this.transporter;
  }

  /**
   * Send password reset email for user app
   */
  async sendPasswordResetEmail(email, resetUrl, userName = 'User') {
    if (!(await this.ensureInitialized())) {
      throw new Error('Email service is not configured');
    }

    const htmlContent = this.getPasswordResetHtml(resetUrl, userName, false);
    const textContent = this.getPasswordResetText(resetUrl, userName, false);

    const fromEmail = this.getFromEmail();
    const mailOptions = {
      from: `"${fromEmail.name}" <${fromEmail.address}>`,
      to: email,
      subject: 'Reset Your RiderLabs Password',
      text: textContent,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Password reset email sent to ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send password reset email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Send password reset email for admin portal
   */
  async sendAdminPasswordResetEmail(email, resetUrl, adminName = 'Admin') {
    if (!(await this.ensureInitialized())) {
      throw new Error('Email service is not configured');
    }

    const htmlContent = this.getPasswordResetHtml(resetUrl, adminName, true);
    const textContent = this.getPasswordResetText(resetUrl, adminName, true);

    const fromEmail = this.getFromEmail();
    const mailOptions = {
      from: `"${fromEmail.name}" <${fromEmail.address}>`,
      to: email,
      subject: '🔐 Reset Your RiderLabs Admin Password',
      text: textContent,
      html: htmlContent,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Admin password reset email sent to ${email}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send admin password reset email to ${email}:`, error);
      throw error;
    }
  }

  /**
   * Get HTML template for password reset email
   */
  getPasswordResetHtml(resetUrl, name, isAdmin = false) {
    const portalType = isAdmin ? 'Admin' : 'User';
    const accentColor = isAdmin ? '#6366f1' : '#3b82f6';
    const greeting = isAdmin ? 'Admin' : 'there';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 30px; text-align: center; background: linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%); border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">🔬 RiderLabs</h1>
              <p style="margin: 8px 0 0; color: #e0e7ff; font-size: 14px;">${portalType} Portal</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #111827; font-size: 24px; font-weight: 600;">Reset Your Password</h2>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.5;">
                Hi ${name},
              </p>
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 16px; line-height: 1.5;">
                We received a request to reset the password for your RiderLabs ${portalType.toLowerCase()} account. Click the button below to create a new password:
              </p>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding: 10px 0 30px;">
                    <a href="${resetUrl}" 
                       style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, ${accentColor} 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 16px; color: #6b7280; font-size: 14px; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 24px; padding: 12px; background-color: #f9fafb; border-radius: 4px; word-break: break-all;">
                <a href="${resetUrl}" style="color: ${accentColor}; text-decoration: none; font-size: 14px;">${resetUrl}</a>
              </p>

              <!-- Security Notice -->
              <div style="margin: 24px 0 0; padding: 16px; background-color: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px; font-weight: 600;">⚠️ Security Notice</p>
                <p style="margin: 8px 0 0; color: #92400e; font-size: 14px; line-height: 1.5;">
                  This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #9ca3af; font-size: 14px;">
                Where Performance is Engineered
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                RiderLabs © ${new Date().getFullYear()} • All rights reserved
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  }

  /**
   * Get plain text template for password reset email
   */
  getPasswordResetText(resetUrl, name, isAdmin = false) {
    const portalType = isAdmin ? 'Admin' : 'User';

    return `
RiderLabs - Reset Your Password

Hi ${name},

We received a request to reset the password for your RiderLabs ${portalType.toLowerCase()} account.

To reset your password, please click on the following link (or copy and paste it into your browser):

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, please ignore this email or contact support if you have concerns about your account security.

---
Where Performance is Engineered
RiderLabs © ${new Date().getFullYear()}
    `.trim();
  }

  /**
   * Send test email (for verifying email configuration)
   */
  async sendTestEmail(recipientEmail) {
    if (!(await this.ensureInitialized())) {
      throw new Error('Email service is not configured');
    }

    const fromEmail = this.getFromEmail();
    const mailOptions = {
      from: `"${fromEmail.name}" <${fromEmail.address}>`,
      to: recipientEmail,
      subject: 'RiderLabs Email Service Test',
      text: 'This is a test email from RiderLabs. If you received this, the email service is working correctly!',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>✅ Email Service Test</h2>
          <p>This is a test email from RiderLabs.</p>
          <p>If you received this, the email service is <strong>working correctly</strong>!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">RiderLabs © ${new Date().getFullYear()}</p>
        </div>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Test email sent to ${recipientEmail}`, { messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error(`Failed to send test email to ${recipientEmail}:`, error);
      throw error;
    }
  }

  /**
   * Close transporter gracefully
   */
  async close() {
    if (this.transporter) {
      this.transporter.close();
      this.transporter = null;
      logger.info('Email service closed');
    }
  }
}

// Export singleton instance
export default new EmailService();
