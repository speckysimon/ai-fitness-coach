/**
 * Migration Service
 * Handles one-time migration of localStorage data to backend
 */

import { planService } from './planService';
import { raceAnalysisService } from './raceAnalysisService';
import { preferencesService } from './preferencesService';

export const migrationService = {
  /**
   * Check if migration is needed
   */
  needsMigration() {
    const planMigrated = localStorage.getItem('plan_migrated');
    const analysesMigrated = localStorage.getItem('analyses_migrated');
    const preferencesMigrated = localStorage.getItem('preferences_migrated');
    
    const hasPlan = localStorage.getItem('training_plan');
    const hasAnalyses = localStorage.getItem('race_analyses');
    const hasPreferences = localStorage.getItem('user_ftp') || 
                          localStorage.getItem('user_timezone') || 
                          localStorage.getItem('theme');
    
    return {
      needsPlanMigration: hasPlan && !planMigrated,
      needsAnalysesMigration: hasAnalyses && !analysesMigrated,
      needsPreferencesMigration: hasPreferences && !preferencesMigrated,
      needsAnyMigration: (hasPlan && !planMigrated) || 
                        (hasAnalyses && !analysesMigrated) || 
                        (hasPreferences && !preferencesMigrated),
    };
  },

  /**
   * Perform full migration
   */
  async migrateAll(userId) {
    const results = {
      plan: { success: false },
      analyses: { success: false },
      preferences: { success: false },
    };
    
    try {
      // Migrate training plan
      const planResult = await planService.migratePlan(userId);
      results.plan = planResult;
      
      // Migrate race analyses
      const analysesResult = await raceAnalysisService.migrateAnalyses(userId);
      results.analyses = analysesResult;
      
      // Migrate preferences
      const preferencesResult = await preferencesService.migratePreferences(userId);
      results.preferences = preferencesResult;
      
      // Mark migration as complete
      localStorage.setItem('migration_completed', new Date().toISOString());
      
      return {
        success: true,
        results,
        message: 'Migration completed successfully',
      };
    } catch (error) {
      console.error('Migration error:', error);
      return {
        success: false,
        results,
        error,
        message: 'Migration failed',
      };
    }
  },

  /**
   * Get migration status
   */
  getMigrationStatus() {
    const completed = localStorage.getItem('migration_completed');
    const needs = this.needsMigration();
    
    return {
      completed: !!completed,
      completedAt: completed,
      ...needs,
    };
  },

  /**
   * Reset migration flags (for testing)
   */
  resetMigrationFlags() {
    localStorage.removeItem('plan_migrated');
    localStorage.removeItem('analyses_migrated');
    localStorage.removeItem('preferences_migrated');
    localStorage.removeItem('migration_completed');
  },
};
