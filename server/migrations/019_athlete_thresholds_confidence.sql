-- Migration 019: Add confidence + computed_at columns to athlete_thresholds
-- These columns are needed by the unified getUserThresholds resolver.

ALTER TABLE athlete_thresholds ADD COLUMN ftp_confidence REAL NULL;
ALTER TABLE athlete_thresholds ADD COLUMN fthr_confidence REAL NULL;
ALTER TABLE athlete_thresholds ADD COLUMN computed_at TEXT NULL;
