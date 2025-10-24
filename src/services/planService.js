/**
 * Training Plan Service
 * Handles saving/loading plans from backend with localStorage fallback
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const planService = {
  /**
   * Save training plan to backend (and localStorage as backup)
   */
  async savePlan(userId, planData) {
    try {
      // Save to localStorage first (immediate)
      localStorage.setItem('training_plan', JSON.stringify(planData));
      
      // Then save to backend
      const response = await fetch(`${API_BASE}/api/training/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          planData,
          eventType: planData.eventType,
          durationWeeks: planData.weeks?.length || 0,
          daysPerWeek: planData.daysPerWeek,
          maxHoursPerWeek: planData.maxHoursPerWeek,
          goals: planData.goals,
          generatedAt: planData.generatedAt || new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save plan to backend');
        return { success: false, source: 'localStorage' };
      }
      
      const result = await response.json();
      
      // Store plan ID for future updates
      localStorage.setItem('current_plan_id', result.planId);
      
      return { success: true, planId: result.planId, source: 'backend' };
    } catch (error) {
      console.error('Error saving plan:', error);
      return { success: false, source: 'localStorage', error };
    }
  },

  /**
   * Load training plan from backend (with localStorage fallback)
   */
  async loadPlan(userId) {
    try {
      const response = await fetch(`${API_BASE}/api/training/plan/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load plan from backend');
      }
      
      const { plan } = await response.json();
      
      if (plan) {
        // Save to localStorage as cache
        localStorage.setItem('training_plan', JSON.stringify(plan.plan_data));
        localStorage.setItem('current_plan_id', plan.id);
        
        return { 
          plan: plan.plan_data, 
          planId: plan.id,
          source: 'backend' 
        };
      }
      
      // No plan in backend, try localStorage
      const localPlan = localStorage.getItem('training_plan');
      if (localPlan) {
        return { 
          plan: JSON.parse(localPlan), 
          source: 'localStorage',
          needsMigration: true 
        };
      }
      
      return { plan: null, source: null };
    } catch (error) {
      console.error('Error loading plan from backend, using localStorage:', error);
      
      // Fallback to localStorage
      const localPlan = localStorage.getItem('training_plan');
      if (localPlan) {
        return { 
          plan: JSON.parse(localPlan), 
          source: 'localStorage',
          error 
        };
      }
      
      return { plan: null, source: null, error };
    }
  },

  /**
   * Update existing training plan
   */
  async updatePlan(planId, planData) {
    try {
      // Update localStorage first (immediate)
      localStorage.setItem('training_plan', JSON.stringify(planData));
      
      // Then update backend
      const response = await fetch(`${API_BASE}/api/training/plan/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planData }),
      });
      
      if (!response.ok) {
        console.error('Failed to update plan in backend');
        return { success: false, source: 'localStorage' };
      }
      
      return { success: true, source: 'backend' };
    } catch (error) {
      console.error('Error updating plan:', error);
      return { success: false, source: 'localStorage', error };
    }
  },

  /**
   * Migrate localStorage plan to backend
   */
  async migratePlan(userId) {
    try {
      const localPlan = localStorage.getItem('training_plan');
      if (!localPlan) {
        return { success: false, message: 'No plan to migrate' };
      }
      
      const planData = JSON.parse(localPlan);
      const result = await this.savePlan(userId, planData);
      
      if (result.success) {
        localStorage.setItem('plan_migrated', 'true');
        return { success: true, planId: result.planId };
      }
      
      return { success: false, message: 'Migration failed' };
    } catch (error) {
      console.error('Error migrating plan:', error);
      return { success: false, error };
    }
  },
};
