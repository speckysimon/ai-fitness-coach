import { addDays, differenceInDays, format, parseISO } from 'date-fns';

class PlanModificationService {
  
  /**
   * Apply adjustment to training plan
   */
  async applyAdjustment(plan, adjustment, event) {
    console.log('📝 Applying adjustment to training plan...');
    
    // Validate plan structure - can be either flat sessions or weeks.sessions
    if (!plan) {
      console.error('Invalid plan: plan is null or undefined');
      throw new Error('Training plan is required');
    }
    
    // Check if plan has weeks array (standard format)
    const hasWeeksFormat = plan.weeks && Array.isArray(plan.weeks);
    // Check if plan has flat sessions array (alternative format)
    const hasFlatSessions = plan.sessions && Array.isArray(plan.sessions);
    
    if (!hasWeeksFormat && !hasFlatSessions) {
      console.error('Invalid plan structure:', JSON.stringify(plan, null, 2));
      throw new Error('Training plan must have either a weeks array or a sessions array');
    }
    
    console.log(`Plan format detected: ${hasWeeksFormat ? 'weeks.sessions' : 'flat sessions'}`);
    
    const modifiedPlan = JSON.parse(JSON.stringify(plan)); // Deep clone
    
    // Determine adjustment type
    switch (adjustment.adjustment_type) {
      case 'recovery_week':
        return this.applyRecoveryWeek(modifiedPlan, adjustment, event);
      
      case 'adjust_plan':
        return this.applyPlanAdjustment(modifiedPlan, adjustment, event);
      
      case 'increase_load':
        return this.applyLoadIncrease(modifiedPlan, adjustment);
      
      case 'compress_plan':
        return this.compressPlan(modifiedPlan, adjustment, event);
      
      default:
        console.log('Unknown adjustment type:', adjustment.adjustment_type);
        return modifiedPlan;
    }
  }
  
  /**
   * Apply recovery week adjustment (illness/injury)
   */
  applyRecoveryWeek(plan, adjustment, event) {
    if (!event || !event.start_date) {
      console.log('No event data, skipping recovery week adjustment');
      return plan;
    }
    
    const startDate = parseISO(event.start_date);
    const endDate = event.end_date ? parseISO(event.end_date) : new Date();
    const daysOff = differenceInDays(endDate, startDate) + 1;
    
    console.log(`Marking ${daysOff} days as cancelled due to ${event.event_type}`);
    
    // 1. Mark affected sessions as cancelled
    this.forEachSession(plan, (session) => {
      const sessionDate = parseISO(session.date);
      
      if (sessionDate >= startDate && sessionDate <= endDate) {
        session.status = 'cancelled';
        session.cancellationReason = `${event.event_type} - ${event.category || 'recovery needed'}`;
        session.originalTss = session.tss;
        session.tss = 0;
      }
    });
    
    // 2. Adjust upcoming weeks based on severity
    const changes = typeof adjustment.changes === 'string' 
      ? JSON.parse(adjustment.changes) 
      : adjustment.changes;
    
    if (changes && changes.length > 0) {
      changes.forEach(change => {
        this.applyWeeklyChange(plan, change, endDate);
      });
    }
    
    // 3. Recalculate plan metrics
    this.recalculatePlanMetrics(plan);
    
    return plan;
  }
  
  /**
   * Apply general plan adjustment
   */
  applyPlanAdjustment(plan, adjustment, event) {
    const changes = typeof adjustment.changes === 'string' 
      ? JSON.parse(adjustment.changes) 
      : adjustment.changes;
    
    if (!changes || changes.length === 0) {
      return plan;
    }
    
    const referenceDate = event?.end_date 
      ? parseISO(event.end_date) 
      : new Date();
    
    changes.forEach(change => {
      this.applyWeeklyChange(plan, change, referenceDate);
    });
    
    this.recalculatePlanMetrics(plan);
    
    return plan;
  }
  
  /**
   * Apply weekly change to plan
   */
  applyWeeklyChange(plan, change, referenceDate) {
    const weekOffset = this.getWeekOffset(change.week);
    const targetWeekStart = addDays(referenceDate, weekOffset * 7);
    const targetWeekEnd = addDays(targetWeekStart, 6);
    
    console.log(`Applying change to week: ${change.week} (${format(targetWeekStart, 'MMM dd')} - ${format(targetWeekEnd, 'MMM dd')})`);
    
    // Parse adjustment description for specific changes
    const adjustment = change.adjustment.toLowerCase();
    
    let tssMultiplier = 1.0;
    let intensityMultiplier = 1.0;
    
    // Detect TSS/volume changes
    if (adjustment.includes('reduce') || adjustment.includes('recovery')) {
      if (adjustment.includes('40%') || adjustment.includes('50%')) {
        tssMultiplier = 0.5;
      } else if (adjustment.includes('20%') || adjustment.includes('30%')) {
        tssMultiplier = 0.7;
      } else {
        tssMultiplier = 0.8; // Default reduction
      }
    } else if (adjustment.includes('increase')) {
      if (adjustment.includes('10%')) {
        tssMultiplier = 1.1;
      } else if (adjustment.includes('20%')) {
        tssMultiplier = 1.2;
      }
    }
    
    // Detect intensity changes
    if (adjustment.includes('easy') || adjustment.includes('zone 1') || adjustment.includes('zone 2')) {
      intensityMultiplier = 0.7;
    }
    
    // Apply changes to sessions in this week
    this.forEachSession(plan, (session) => {
      const sessionDate = parseISO(session.date);
      
      if (sessionDate >= targetWeekStart && sessionDate <= targetWeekEnd) {
        const newTss = Math.round(session.tss * tssMultiplier);
        const newDuration = Math.round(session.duration * tssMultiplier);
        
        session.tss = newTss;
        session.duration = newDuration;
        session.intensity = session.intensity ? session.intensity * intensityMultiplier : session.intensity;
        session.modified = true;
        session.modificationReason = change.adjustment;
      }
    });
  }
  
  /**
   * Get week offset from change.week value
   */
  getWeekOffset(week) {
    if (week === 'current') return 0;
    if (week === 'next') return 1;
    if (week === '+2') return 2;
    if (week === '+3') return 3;
    
    // Try to parse as number
    const num = parseInt(week);
    return isNaN(num) ? 0 : num;
  }
  
  /**
   * Apply load increase (performing well)
   */
  applyLoadIncrease(plan, adjustment) {
    const changes = typeof adjustment.changes === 'string' 
      ? JSON.parse(adjustment.changes) 
      : adjustment.changes;
    
    if (!changes || changes.length === 0) {
      return plan;
    }
    
    const referenceDate = new Date();
    
    changes.forEach(change => {
      this.applyWeeklyChange(plan, change, referenceDate);
    });
    
    this.recalculatePlanMetrics(plan);
    
    return plan;
  }
  
  /**
   * Compress plan (race moved up)
   */
  compressPlan(plan, adjustment, event) {
    console.log('Compressing plan for earlier race date');
    
    // This would require regenerating the entire plan
    // For now, just apply the weekly changes
    return this.applyPlanAdjustment(plan, adjustment, event);
  }
  
  /**
   * Helper to iterate over all sessions regardless of plan format
   */
  forEachSession(plan, callback) {
    if (plan.weeks && Array.isArray(plan.weeks)) {
      // weeks.sessions format
      plan.weeks.forEach(week => {
        if (week.sessions && Array.isArray(week.sessions)) {
          week.sessions.forEach(callback);
        }
      });
    } else if (plan.sessions && Array.isArray(plan.sessions)) {
      // flat sessions format
      plan.sessions.forEach(callback);
    }
  }
  
  /**
   * Helper to get all sessions as flat array
   */
  getAllSessions(plan) {
    const sessions = [];
    this.forEachSession(plan, (session) => sessions.push(session));
    return sessions;
  }
  
  /**
   * Recalculate plan metrics (total TSS, weekly TSS, etc.)
   */
  recalculatePlanMetrics(plan) {
    // Calculate total TSS
    let totalTss = 0;
    this.forEachSession(plan, (session) => {
      if (session.status !== 'cancelled') {
        totalTss += session.tss || 0;
      }
    });
    plan.totalTss = totalTss;
    
    // Calculate weekly TSS
    const weeklyTss = {};
    this.forEachSession(plan, (session) => {
      if (session.status === 'cancelled') return;
      
      const sessionDate = parseISO(session.date);
      const weekKey = format(sessionDate, 'yyyy-ww');
      
      if (!weeklyTss[weekKey]) {
        weeklyTss[weekKey] = 0;
      }
      
      weeklyTss[weekKey] += session.tss || 0;
    });
    
    plan.weeklyTss = weeklyTss;
    
    // Calculate average weekly TSS
    const weeks = Object.keys(weeklyTss).length;
    plan.avgWeeklyTss = weeks > 0 ? Math.round(plan.totalTss / weeks) : 0;
    
    console.log(`✅ Plan recalculated: ${plan.totalTss} total TSS, ${plan.avgWeeklyTss} avg weekly TSS`);
  }
  
  /**
   * Get plan summary for user
   */
  getPlanSummary(originalPlan, modifiedPlan) {
    const allSessions = this.getAllSessions(modifiedPlan);
    const cancelledSessions = allSessions.filter(s => s.status === 'cancelled').length;
    const modifiedSessions = allSessions.filter(s => s.modified).length;
    
    const originalTss = originalPlan.totalTss || 0;
    const newTss = modifiedPlan.totalTss || 0;
    const tssChange = newTss - originalTss;
    const tssChangePercent = originalTss > 0 ? Math.round((tssChange / originalTss) * 100) : 0;
    
    return {
      cancelledSessions,
      modifiedSessions,
      originalTss,
      newTss,
      tssChange,
      tssChangePercent,
      summary: `${cancelledSessions} sessions cancelled, ${modifiedSessions} sessions adjusted. Total TSS: ${originalTss} → ${newTss} (${tssChangePercent > 0 ? '+' : ''}${tssChangePercent}%)`
    };
  }
}

export default new PlanModificationService();
