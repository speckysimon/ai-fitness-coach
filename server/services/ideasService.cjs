const Database = require('better-sqlite3');
const path = require('path');

// Use admin database for ideas (database.sqlite)
const adminDbPath = path.join(__dirname, '../database.sqlite');
const db = new Database(adminDbPath);

/**
 * Ideas Service
 * Handles CRUD operations for ideas and improvements
 * Uses admin database (database.sqlite) not main app database
 * Refactored to use better-sqlite3 for consistency with seed script
 */

class IdeasService {
  /**
   * Get all ideas with optional filtering
   */
  getAllIdeas(filters = {}) {
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

    const rows = db.prepare(query).all(...params);
    
    // Parse tags JSON for each idea
    return rows.map(idea => ({
      ...idea,
      tags: idea.tags ? JSON.parse(idea.tags) : []
    }));
  }

  /**
   * Get a single idea by ID
   */
  getIdeaById(id) {
    const row = db.prepare('SELECT * FROM ideas WHERE id = ?').get(id);
    
    if (!row) return null;
    
    return {
      ...row,
      tags: row.tags ? JSON.parse(row.tags) : []
    };
  }

  /**
   * Create a new idea
   */
  createIdea(ideaData) {
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

    const result = db.prepare(query).run(
      title, description, category, priority, scale, status, 
      estimated_hours, tagsJson, source, created_by
    );

    return { id: result.lastInsertRowid };
  }

  /**
   * Update an existing idea
   */
  updateIdea(id, ideaData) {
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

    const result = db.prepare(query).run(
      title, description, category, priority, scale, status, 
      estimated_hours, tagsJson, source, completed_at, id
    );

    return { changes: result.changes };
  }

  /**
   * Delete an idea
   */
  deleteIdea(id) {
    const result = db.prepare('DELETE FROM ideas WHERE id = ?').run(id);
    return { changes: result.changes };
  }

  /**
   * Get statistics about ideas
   */
  getStatistics() {
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

    return db.prepare(query).get();
  }

  /**
   * Bulk update idea priorities
   */
  updatePriorities(updates) {
    const stmt = db.prepare('UPDATE ideas SET priority = ?, updated_at = datetime(\'now\') WHERE id = ?');
    
    const transaction = db.transaction((updates) => {
      for (const { id, priority } of updates) {
        stmt.run(priority, id);
      }
    });
    
    transaction(updates);
    
    return { success: true, updated: updates.length };
  }
}

module.exports = new IdeasService();
