/**
 * Race Analysis Service
 * Handles saving/loading race analyses from backend with localStorage fallback
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5001';

export const raceAnalysisService = {
  /**
   * Save race analysis to backend (and localStorage as backup)
   */
  async saveAnalysis(userId, activityId, analysisData) {
    try {
      // Save to localStorage first (immediate)
      const localAnalyses = JSON.parse(localStorage.getItem('race_analyses') || '[]');
      const existingIndex = localAnalyses.findIndex(a => a.activityId === activityId);
      
      if (existingIndex >= 0) {
        localAnalyses[existingIndex] = analysisData;
      } else {
        localAnalyses.push(analysisData);
      }
      
      localStorage.setItem('race_analyses', JSON.stringify(localAnalyses));
      
      // Then save to backend
      const response = await fetch(`${API_BASE}/api/race/analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          activityId,
          raceName: analysisData.raceName,
          raceDate: analysisData.raceDate,
          raceType: analysisData.raceType,
          overallScore: analysisData.scores?.overall,
          pacingScore: analysisData.scores?.pacing,
          executionScore: analysisData.scores?.execution,
          tacticalScore: analysisData.scores?.tactical,
          analysisData,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to save analysis to backend');
        return { success: false, source: 'localStorage' };
      }
      
      const result = await response.json();
      return { success: true, analysisId: result.analysisId, source: 'backend' };
    } catch (error) {
      console.error('Error saving analysis:', error);
      return { success: false, source: 'localStorage', error };
    }
  },

  /**
   * Load all race analyses from backend (with localStorage fallback)
   */
  async loadAnalyses(userId) {
    try {
      const response = await fetch(`${API_BASE}/api/race/analyses/${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load analyses from backend');
      }
      
      const { analyses } = await response.json();
      
      if (analyses && analyses.length > 0) {
        // Convert backend format to frontend format
        const formattedAnalyses = analyses.map(a => ({
          activityId: a.activity_id,
          raceName: a.race_name,
          raceDate: a.race_date,
          raceType: a.race_type,
          scores: {
            overall: a.overall_score,
            pacing: a.pacing_score,
            execution: a.execution_score,
            tactical: a.tactical_score,
          },
          ...a.analysis_data,
        }));
        
        // Save to localStorage as cache
        localStorage.setItem('race_analyses', JSON.stringify(formattedAnalyses));
        
        return { 
          analyses: formattedAnalyses, 
          source: 'backend' 
        };
      }
      
      // No analyses in backend, try localStorage
      const localAnalyses = localStorage.getItem('race_analyses');
      if (localAnalyses) {
        return { 
          analyses: JSON.parse(localAnalyses), 
          source: 'localStorage',
          needsMigration: true 
        };
      }
      
      return { analyses: [], source: null };
    } catch (error) {
      console.error('Error loading analyses from backend, using localStorage:', error);
      
      // Fallback to localStorage
      const localAnalyses = localStorage.getItem('race_analyses');
      if (localAnalyses) {
        return { 
          analyses: JSON.parse(localAnalyses), 
          source: 'localStorage',
          error 
        };
      }
      
      return { analyses: [], source: null, error };
    }
  },

  /**
   * Migrate localStorage analyses to backend
   */
  async migrateAnalyses(userId) {
    try {
      const localAnalyses = localStorage.getItem('race_analyses');
      if (!localAnalyses) {
        return { success: false, message: 'No analyses to migrate' };
      }
      
      const analyses = JSON.parse(localAnalyses);
      let migratedCount = 0;
      
      for (const analysis of analyses) {
        const result = await this.saveAnalysis(userId, analysis.activityId, analysis);
        if (result.success) {
          migratedCount++;
        }
      }
      
      if (migratedCount > 0) {
        localStorage.setItem('analyses_migrated', 'true');
        return { success: true, count: migratedCount };
      }
      
      return { success: false, message: 'Migration failed' };
    } catch (error) {
      console.error('Error migrating analyses:', error);
      return { success: false, error };
    }
  },
};
