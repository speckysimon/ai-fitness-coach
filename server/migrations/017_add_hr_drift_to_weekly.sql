-- Migration: Add HR drift to weekly rollups
-- Purpose: Add avg_hr_drift field for aerobic efficiency trend tracking
-- Date: 2026-02-17

ALTER TABLE athlete_weekly ADD COLUMN avg_hr_drift REAL;
