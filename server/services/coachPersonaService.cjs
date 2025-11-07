/**
 * Coach Persona Service
 * Manages AI coach personas with avatar support
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

const dbPath = path.join(__dirname, '../fitness-coach.db');

class CoachPersonaService {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
  }

  /**
   * Get all personas (optionally filter by active status)
   */
  async getAll(activeOnly = false) {
    return new Promise((resolve, reject) => {
      const query = activeOnly
        ? 'SELECT * FROM coach_personas WHERE is_active = 1 ORDER BY sort_order ASC'
        : 'SELECT * FROM coach_personas ORDER BY sort_order ASC';

      this.db.all(query, [], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Convert is_active to boolean
        const personas = rows.map(row => ({
          ...row,
          is_active: Boolean(row.is_active)
        }));
        
        resolve(personas);
      });
    });
  }

  /**
   * Get persona by ID
   */
  async getById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM coach_personas WHERE id = ?',
        [id],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (!row) {
            resolve(null);
            return;
          }
          
          resolve({
            ...row,
            is_active: Boolean(row.is_active)
          });
        }
      );
    });
  }

  /**
   * Create new persona
   */
  async create(personaData) {
    const {
      id,
      name,
      style,
      description,
      tone,
      catchphrase,
      color,
      personality,
      avatar_url,
      is_active = true,
      sort_order = 0
    } = personaData;

    // Validate required fields
    if (!id || !name || !style || !tone) {
      throw new Error('Missing required fields: id, name, style, tone');
    }

    // Check if ID already exists
    const existing = await this.getById(id);
    if (existing) {
      throw new Error(`Persona with ID '${id}' already exists`);
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO coach_personas 
        (id, name, style, description, tone, catchphrase, color, personality, avatar_url, is_active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [id, name, style, description, tone, catchphrase, color, personality, avatar_url, is_active ? 1 : 0, sort_order],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ id, ...personaData });
        }
      );
    });
  }

  /**
   * Update persona
   */
  async update(id, updates) {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Persona with ID '${id}' not found`);
    }

    const allowedFields = [
      'name', 'style', 'description', 'tone', 'catchphrase',
      'color', 'personality', 'avatar_url', 'is_active', 'sort_order'
    ];

    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        // Convert boolean to integer for is_active
        values.push(key === 'is_active' ? (updates[key] ? 1 : 0) : updates[key]);
      }
    });

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = datetime(\'now\')');
    values.push(id);

    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE coach_personas SET ${fields.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ id, ...existing, ...updates });
        }
      );
    });
  }

  /**
   * Delete persona (and its avatar file if exists)
   */
  async delete(id) {
    const persona = await this.getById(id);
    if (!persona) {
      throw new Error(`Persona with ID '${id}' not found`);
    }

    // Delete avatar file if exists
    if (persona.avatar_url) {
      try {
        const avatarPath = path.join(__dirname, '..', persona.avatar_url);
        await fs.unlink(avatarPath);
        console.log(`Deleted avatar file: ${avatarPath}`);
      } catch (err) {
        console.error('Error deleting avatar file:', err);
        // Continue with deletion even if file removal fails
      }
    }

    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE FROM coach_personas WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve({ success: true, deleted: id });
        }
      );
    });
  }

  /**
   * Reorder personas
   */
  async reorder(personaIds) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const stmt = this.db.prepare(
          'UPDATE coach_personas SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ?'
        );

        personaIds.forEach((id, index) => {
          stmt.run(index + 1, id);
        });

        stmt.finalize((err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve({ success: true });
        });
      });
    });
  }

  /**
   * Get persona statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN avatar_url IS NOT NULL THEN 1 ELSE 0 END) as with_avatars
        FROM coach_personas`,
        [],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(row);
        }
      );
    });
  }

  /**
   * Close database connection
   */
  close() {
    this.db.close();
  }
}

module.exports = new CoachPersonaService();
