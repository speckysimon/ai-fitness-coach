# RiderLabs – Data Contracts and Build Gates

## Why this exists
Prevent scope creep into AI/prompt work before deterministic foundations exist.

## Gates
### Gate A — Retention + Aggregation ✅
- athlete_monthly_summary
- athlete_monthly_bests
- prune rules
- /api/retention/context (tiered context)

### Gate B — Interpretation Engine (current)
- activity_interpretation v1 table
- backfill script
- deterministic flags (drift/decoupling proxies allowed but explicit)

### Gate C — Persona Bias Engine
- CoachBiasProfile schema
- 3 persona profiles
- persona influences thresholds and planning reactions

### Gate D — AI Narrative Layer
- AI only narrates decisions from Gate B/C outputs
- structured JSON I/O
- caching by (activity_id, persona_version, interpretation_version)

## Contracts
### Tiered Context (/api/retention/context)
- recentDetailed (90d full activity objects)
- recentContext (180d weekly rollups)
- longTerm (12mo monthly summaries + bests)

### Interpretation (activity_interpretation payload v1)
- stable keys, versioned
- no streams
- safe nulls + explicit flags
