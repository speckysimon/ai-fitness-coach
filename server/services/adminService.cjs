/**
 * Admin Service
 * Handles admin user management, authentication, and activity logging
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create database connection for admin operations
const dbPath = path.join(__dirname, '../fitness-coach.db');
const db = new sqlite3.Database(dbPath);

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'your-admin-secret-key-change-in-production';
const JWT_EXPIRY = '24h';

class AdminService {
  /**
   * Create a new admin user
   */
  async createAdmin({ email, password, name, isSuperAdmin = false }) {
    const passwordHash = await bcrypt.hash(password, 10);

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO admin_users (email, password_hash, name, is_super_admin) 
         VALUES (?, ?, ?, ?)`,
        [email, passwordHash, name, isSuperAdmin ? 1 : 0],
        function (err) {
          if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
              reject(new Error('Admin with this email already exists'));
            } else {
              reject(err);
            }
          } else {
            resolve({ id: this.lastID, email, name });
          }
        }
      );
    });
  }

  /**
   * Authenticate admin user
   */
  async authenticate(email, password) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT * FROM admin_users WHERE email = ?`,
        [email],
        async (err, admin) => {
          if (err) {
            reject(err);
          } else if (!admin) {
            reject(new Error('Invalid credentials'));
          } else {
            const isValid = await bcrypt.compare(password, admin.password_hash);
            if (!isValid) {
              reject(new Error('Invalid credentials'));
            } else {
              // Update last login
              db.run(
                `UPDATE admin_users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [admin.id]
              );

              // Generate JWT token
              const token = jwt.sign(
                {
                  id: admin.id,
                  email: admin.email,
                  role: admin.role,
                  isSuperAdmin: admin.is_super_admin === 1,
                },
                JWT_SECRET,
                { expiresIn: JWT_EXPIRY }
              );

              resolve({
                token,
                admin: {
                  id: admin.id,
                  email: admin.email,
                  name: admin.name,
                  role: admin.role,
                  isSuperAdmin: admin.is_super_admin === 1,
                },
              });
            }
          }
        }
      );
    });
  }

  /**
   * Verify admin JWT token
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Get admin by ID
   */
  async getAdminById(id) {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT id, email, name, role, is_super_admin, last_login_at, created_at 
         FROM admin_users WHERE id = ?`,
        [id],
        (err, admin) => {
          if (err) reject(err);
          else if (!admin) reject(new Error('Admin not found'));
          else {
            resolve({
              ...admin,
              isSuperAdmin: admin.is_super_admin === 1,
            });
          }
        }
      );
    });
  }

  /**
   * List all admins
   */
  async listAdmins() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, email, name, role, is_super_admin, last_login_at, created_at 
         FROM admin_users ORDER BY created_at DESC`,
        [],
        (err, admins) => {
          if (err) reject(err);
          else {
            resolve(
              admins.map((admin) => ({
                ...admin,
                isSuperAdmin: admin.is_super_admin === 1,
              }))
            );
          }
        }
      );
    });
  }

  /**
   * Update admin
   */
  async updateAdmin(id, updates) {
    const allowedFields = ['name', 'email'];
    const fields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(id);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE admin_users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else if (this.changes === 0) reject(new Error('Admin not found'));
          else resolve({ id, ...updates });
        }
      );
    });
  }

  /**
   * Delete admin
   */
  async deleteAdmin(id) {
    return new Promise((resolve, reject) => {
      db.run(`DELETE FROM admin_users WHERE id = ?`, [id], function (err) {
        if (err) reject(err);
        else if (this.changes === 0) reject(new Error('Admin not found'));
        else resolve({ id });
      });
    });
  }

  /**
   * Log admin activity
   */
  async logActivity({ adminId, action, resourceType, resourceId, details, ipAddress }) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO admin_activity_log 
         (admin_id, action, resource_type, resource_id, details, ip_address) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [adminId, action, resourceType, resourceId, JSON.stringify(details), ipAddress],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });
  }

  /**
   * Get admin activity log
   */
  async getActivityLog({ limit = 100, offset = 0, adminId = null }) {
    const query = adminId
      ? `SELECT al.*, au.name as admin_name, au.email as admin_email 
         FROM admin_activity_log al 
         JOIN admin_users au ON al.admin_id = au.id 
         WHERE al.admin_id = ? 
         ORDER BY al.created_at DESC 
         LIMIT ? OFFSET ?`
      : `SELECT al.*, au.name as admin_name, au.email as admin_email 
         FROM admin_activity_log al 
         JOIN admin_users au ON al.admin_id = au.id 
         ORDER BY al.created_at DESC 
         LIMIT ? OFFSET ?`;

    const params = adminId ? [adminId, limit, offset] : [limit, offset];

    return new Promise((resolve, reject) => {
      db.all(query, params, (err, logs) => {
        if (err) reject(err);
        else {
          resolve(
            logs.map((log) => ({
              ...log,
              details: log.details ? JSON.parse(log.details) : null,
            }))
          );
        }
      });
    });
  }
}

module.exports = new AdminService();
