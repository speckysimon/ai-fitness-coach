const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Use admin database for ideas (database.sqlite)
const adminDbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(adminDbPath);

/**
 * Ideas Service
 * Handles CRUD operations for ideas and improvements
 * Uses admin database (database.sqlite) not main app database
 */

class IdeasService {
  /**
   * Get all ideas with optional filtering
   */
  async getAllIdeas(filters = {}) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM ideas WHERE 1=1';
      const params = [];

      if (filters.status) {
        query += ' AND status = ?';
        params.push(filters.status);
      }

      if (filters.priority) {
        query += ' AND priority = ?';
        params.push(filters.priority);
      }

      if (filters.category) {
        query += ' AND category = ?';
        params.push(filters.category);
      }

      query += ' ORDER BY created_at DESC';

      db.all(query, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          // Parse tags JSON for each idea
          const ideas = rows.map(idea => ({
            ...idea,
            tags: idea.tags ? JSON.parse(idea.tags) : []
          }));
          resolve(ideas);
        }
      });
    });
  }

  /**
   * Get a single idea by ID
   */
  async getIdeaById(id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM ideas WHERE id = ?', [id], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          resolve(null);
        } else {
          resolve({
            ...row,
            tags: row.tags ? JSON.parse(row.tags) : []
          });
        }
      });
    });
  }

  /**
   * Create a new idea
   */
  async createIdea(ideaData) {
    return new Promise((resolve, reject) => {
      const {
        title,
        description,
        category,
        priority = 'medium',
        scale = 'medium',
        status = 'backlog',
        estimated_hours,
        tags = [],
        source,
        created_by
      } = ideaData;

      const tagsJson = JSON.stringify(tags);

      const query = `
        INSERT INTO ideas (
          title, description, category, priority, scale, status,
          estimated_hours, tags, source, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        query,
        [title, description, category, priority, scale, status, estimated_hours, tagsJson, source, created_by],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ id: this.lastID });
          }
        }
      );
    });
  }

  /**
   * Update an existing idea
   */
  async updateIdea(id, ideaData) {
    return new Promise((resolve, reject) => {
      const {
        title,
        description,
        category,
        priority,
        scale,
        status,
        estimated_hours,
        tags,
        source,
        completed_at
      } = ideaData;

      const tagsJson = tags ? JSON.stringify(tags) : null;

      const query = `
        UPDATE ideas SET
          title = COALESCE(?, title),
          description = COALESCE(?, description),
          category = COALESCE(?, category),
          priority = COALESCE(?, priority),
          scale = COALESCE(?, scale),
          status = COALESCE(?, status),
          estimated_hours = COALESCE(?, estimated_hours),
          tags = COALESCE(?, tags),
          source = COALESCE(?, source),
          completed_at = COALESCE(?, completed_at),
          updated_at = datetime('now')
        WHERE id = ?
      `;

      db.run(
        query,
        [title, description, category, priority, scale, status, estimated_hours, tagsJson, source, completed_at, id],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve({ changes: this.changes });
          }
        }
      );
    });
  }

  /**
   * Delete an idea
   */
  async deleteIdea(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM ideas WHERE id = ?', [id], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  /**
   * Get statistics about ideas
   */
  async getStatistics() {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog,
          SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN priority = 'critical' THEN 1 ELSE 0 END) as critical,
          SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
          SUM(CASE WHEN scale = 'epic' THEN 1 ELSE 0 END) as epics,
          SUM(CASE WHEN scale = 'large' THEN 1 ELSE 0 END) as large
        FROM ideas
      `;

      db.get(query, [], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Bulk update idea priorities
   */
  async updatePriorities(updates) {
    return new Promise((resolve, reject) => {
      const stmt = db.prepare('UPDATE ideas SET priority = ?, updated_at = datetime(\'now\') WHERE id = ?');
      
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        try {
          updates.forEach(({ id, priority }) => {
            stmt.run(priority, id);
          });
          
          db.run('COMMIT', (err) => {
            stmt.finalize();
            if (err) {
              reject(err);
            } else {
              resolve({ success: true, updated: updates.length });
            }
          });
        } catch (err) {
          db.run('ROLLBACK');
          stmt.finalize();
          reject(err);
        }
      });
    });
  }
}

module.exports = new IdeasService();
