-- Migration 007: Fix Metric Provenance Index
-- Purpose: Remove useless plain index on metric_provenance_json TEXT column
-- Plain indexes on JSON TEXT columns are not useful for queries

-- Drop the plain index on metric_provenance_json (not useful)
DROP INDEX IF EXISTS idx_activities_provenance;

-- Note: We do NOT add expression indexes (json_extract) unless we confirm they're actually used
-- in WHERE clauses. Currently, provenance is only used for display/debugging, not filtering.
-- If future queries need to filter by specific provenance values, add expression indexes then.
