/**
 * Plan Template Service
 * Manages pre-built training plan templates
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

class PlanTemplateService {
  /**
   * Get all plan templates (optionally filter by active status)
   */
  async listTemplates(activeOnly = false) {
    return new Promise((resolve, reject) => {
      const query = activeOnly
        ? 'SELECT * FROM plan_templates WHERE is_active = 1 ORDER BY featured DESC, duration_weeks ASC, name ASC'
        : 'SELECT * FROM plan_templates ORDER BY featured DESC, duration_weeks ASC, name ASC';
      
      db.all(query, [], (err, templates) => {
        if (err) reject(err);
        else {
          resolve(
            templates.map((template) => ({
              ...template,
              plan_data: JSON.parse(template.plan_data),
              tags: template.tags ? JSON.parse(template.tags) : [],
              isActive: template.is_active === 1,
              featured: template.featured === 1,
            }))
          );
        }
      });
    });
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id) {
    return new Promise((resolve, reject) => {
      db.get(
        'SELECT * FROM plan_templates WHERE id = ?',
        [id],
        (err, template) => {
          if (err) reject(err);
          else if (!template) reject(new Error(`Template not found: ${id}`));
          else {
            resolve({
              ...template,
              plan_data: JSON.parse(template.plan_data),
              tags: template.tags ? JSON.parse(template.tags) : [],
              isActive: template.is_active === 1,
              featured: template.featured === 1,
            });
          }
        }
      );
    });
  }

  /**
   * Create a new plan template
   */
  async createTemplate(templateData) {
    return new Promise((resolve, reject) => {
      const {
        name,
        description,
        author,
        duration_weeks,
        event_type,
        difficulty_level,
        days_per_week,
        hours_per_week_min,
        hours_per_week_max,
        plan_data,
        is_active = 1,
        featured = 0,
        tags = []
      } = templateData;

      db.run(
        `INSERT INTO plan_templates (
          name, description, author, duration_weeks, event_type, difficulty_level,
          days_per_week, hours_per_week_min, hours_per_week_max, plan_data,
          is_active, featured, tags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          name,
          description,
          author,
          duration_weeks,
          event_type,
          difficulty_level,
          days_per_week,
          hours_per_week_min,
          hours_per_week_max,
          JSON.stringify(plan_data),
          is_active ? 1 : 0,
          featured ? 1 : 0,
          JSON.stringify(tags)
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, success: true });
        }
      );
    });
  }

  /**
   * Update an existing plan template
   */
  async updateTemplate(id, updates) {
    const allowedFields = [
      'name',
      'description',
      'author',
      'duration_weeks',
      'event_type',
      'difficulty_level',
      'days_per_week',
      'hours_per_week_min',
      'hours_per_week_max',
      'plan_data',
      'is_active',
      'featured',
      'tags'
    ];

    const updateFields = [];
    const values = [];

    Object.keys(updates).forEach((key) => {
      if (allowedFields.includes(key)) {
        updateFields.push(`${key} = ?`);
        
        // Handle JSON fields
        if (key === 'plan_data' || key === 'tags') {
          values.push(JSON.stringify(updates[key]));
        } else if (key === 'is_active' || key === 'featured') {
          values.push(updates[key] ? 1 : 0);
        } else {
          values.push(updates[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return Promise.reject(new Error('No valid fields to update'));
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE plan_templates SET ${updateFields.join(', ')} WHERE id = ?`,
        values,
        function (err) {
          if (err) reject(err);
          else resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  /**
   * Delete a plan template
   */
  async deleteTemplate(id) {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM plan_templates WHERE id = ?', [id], function (err) {
        if (err) reject(err);
        else resolve({ success: true, changes: this.changes });
      });
    });
  }

  /**
   * Toggle template active status
   */
  async toggleActive(id) {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE plan_templates SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id],
        function (err) {
          if (err) reject(err);
          else resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  /**
   * Get templates filtered by criteria
   */
  async filterTemplates(filters) {
    const { duration_weeks, event_type, difficulty_level, days_per_week } = filters;
    const conditions = ['is_active = 1'];
    const params = [];

    if (duration_weeks) {
      conditions.push('duration_weeks = ?');
      params.push(duration_weeks);
    }
    if (event_type) {
      conditions.push('event_type = ?');
      params.push(event_type);
    }
    if (difficulty_level) {
      conditions.push('difficulty_level = ?');
      params.push(difficulty_level);
    }
    if (days_per_week) {
      conditions.push('days_per_week = ?');
      params.push(days_per_week);
    }

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM plan_templates WHERE ${conditions.join(' AND ')} ORDER BY featured DESC, name ASC`,
        params,
        (err, templates) => {
          if (err) reject(err);
          else {
            resolve(
              templates.map((template) => ({
                ...template,
                plan_data: JSON.parse(template.plan_data),
                tags: template.tags ? JSON.parse(template.tags) : [],
                isActive: template.is_active === 1,
                featured: template.featured === 1,
              }))
            );
          }
        }
      );
    });
  }

  /**
   * Get statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      db.get(
        `SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured
        FROM plan_templates`,
        [],
        (err, stats) => {
          if (err) reject(err);
          else resolve(stats);
        }
      );
    });
  }
}

module.exports = new PlanTemplateService();
