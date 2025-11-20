/**
 * Plan Template Service
 * Manages pre-built training plan templates
 * Uses better-sqlite3 via adminDb helper (migrated from sqlite3)
 */

const adminDb = require('../adminDb.cjs');

class PlanTemplateService {
  /**
   * Get all plan templates (optionally filter by active status)
   */
  async listTemplates(activeOnly = false) {
    return new Promise((resolve, reject) => {
      try {
        const query = activeOnly
          ? 'SELECT * FROM plan_templates WHERE is_active = 1 ORDER BY featured DESC, duration_weeks ASC, name ASC'
          : 'SELECT * FROM plan_templates ORDER BY featured DESC, duration_weeks ASC, name ASC';
        
        const templates = adminDb.all(query);
        
        resolve(
          templates.map((template) => ({
            ...template,
            plan_data: JSON.parse(template.plan_data),
            tags: template.tags ? JSON.parse(template.tags) : [],
            isActive: template.is_active === 1,
            featured: template.featured === 1,
          }))
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get a single template by ID
   */
  async getTemplate(id) {
    return new Promise((resolve, reject) => {
      try {
        const template = adminDb.get(
          'SELECT * FROM plan_templates WHERE id = ?',
          [id]
        );
        
        if (!template) {
          reject(new Error(`Template not found: ${id}`));
        } else {
          resolve({
            ...template,
            plan_data: JSON.parse(template.plan_data),
            tags: template.tags ? JSON.parse(template.tags) : [],
            isActive: template.is_active === 1,
            featured: template.featured === 1,
          });
        }
      } catch (err) {
        reject(err);
      }
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

      try {
        const result = adminDb.run(
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
          ]
        );
        
        resolve({ id: result.lastInsertRowid, success: true });
      } catch (err) {
        reject(err);
      }
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
      try {
        const result = adminDb.run(
          `UPDATE plan_templates SET ${updateFields.join(', ')} WHERE id = ?`,
          values
        );
        
        resolve({ success: true, changes: result.changes });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Delete a plan template
   */
  async deleteTemplate(id) {
    return new Promise((resolve, reject) => {
      try {
        const result = adminDb.run(
          'DELETE FROM plan_templates WHERE id = ?',
          [id]
        );
        
        resolve({ success: true, changes: result.changes });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Toggle template active status
   */
  async toggleActive(id) {
    return new Promise((resolve, reject) => {
      try {
        const result = adminDb.run(
          'UPDATE plan_templates SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [id]
        );
        
        resolve({ success: true, changes: result.changes });
      } catch (err) {
        reject(err);
      }
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
      try {
        const templates = adminDb.all(
          `SELECT * FROM plan_templates WHERE ${conditions.join(' AND ')} ORDER BY featured DESC, name ASC`,
          params
        );
        
        resolve(
          templates.map((template) => ({
            ...template,
            plan_data: JSON.parse(template.plan_data),
            tags: template.tags ? JSON.parse(template.tags) : [],
            isActive: template.is_active === 1,
            featured: template.featured === 1,
          }))
        );
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * Get statistics
   */
  async getStats() {
    return new Promise((resolve, reject) => {
      try {
        const stats = adminDb.get(
          `SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active,
            SUM(CASE WHEN featured = 1 THEN 1 ELSE 0 END) as featured
          FROM plan_templates`
        );
        
        resolve(stats);
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new PlanTemplateService();
