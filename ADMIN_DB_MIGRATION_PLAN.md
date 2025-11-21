# Admin Database Migration Plan (sqlite3 → better-sqlite3)

## 1. Inventory & Architecture Alignment
- Catalogue every module that touches `server/database.sqlite` (routes, services, cron jobs).
  - Confirmed services: `aiConfigService`, `globalSettingsService`, `planTemplateService`, `ideasService`, feedback/plan templates, admin auth, token tracking, etc.
- Document current data flow: Express routes → service → sqlite3 instance.
- Goal: centralize admin DB access through a single `better-sqlite3` helper (mirrors `server/db.js`).

## 2. Shared Admin DB Helper
- Create `server/adminDb.cjs` (CommonJS) that:
  - Imports `better-sqlite3`.
  - Resolves DB path via `process.env.ADMIN_DATABASE_PATH || path.join(__dirname, 'database.sqlite')`.
  - Applies pragmas (`foreign_keys = ON`, `journal_mode = WAL`).
  - Exports a singleton connection plus helper functions if needed (transactions, prepared statements).
- Ensure compatibility with CommonJS callers (most admin services are `.cjs`).

## 3. Incremental Refactor
1. **Low-risk modules first:** services already isolated (e.g., `ideasService` already using `better-sqlite3`, use as reference).
2. **Core services:**
   - `aiConfigService`, `globalSettingsService`, `planTemplateService`, `tokenTrackingService`, admin auth (`adminService` but ensure it points to correct DB).
   - Replace per-file `sqlite3` connections with the shared helper.
   - Convert callback-style queries to synchronous `.prepare().get()/all()/run()` while preserving Promise-based function signatures so frontend API contracts remain unchanged.
3. **Routes/cron jobs:** update any direct `sqlite3` usage (e.g., in `server/routes/admin.cjs`).
4. **Feature flag (optional but recommended):** allow fallback to old driver via ENV until rollout is validated.

## 4. Data Safety & Rollout
- **Backups:** run `./scripts/backup-db.sh` (copies `.sqlite + WAL`). Store off-host backup before deployment.
- **Local dry run:** duplicate `database.sqlite`, run refactored services/tests against the copy.
- **Staged deployment:**
  1. Ship new helper + refactored services behind flag.
  2. Enable flag in staging/local.
  3. After verification, enable in production (ENV toggle) and monitor.

## 5. Testing Checklist
- Automated/unit tests if available; otherwise manual regression:
  - Admin login/logout, token refresh.
  - API Keys CRUD + encryption/decryption.
  - Global settings list/update.
  - Ideas/feedback/plan templates CRUD.
  - Model pricing cron + token tracking.
- Admin UI smoke test (API Keys, Settings, Ideas, Feedback pages).
- Monitor logs for SQL errors after deployment.

## 6. Documentation & SOP Updates
- Update `README.md`, `PRODUCTION_DEPLOY_SOP.md`, `DEPLOYMENT_GUIDE_V2.md` to note both databases now use `better-sqlite3` with shared helpers.
- Document new ENV (`ADMIN_DATABASE_PATH`) and migration steps.
- Add section to `DEPLOYMENT_RECOVERY_PLAN.md` summarizing the change and rollback procedure.

## 7. Rollback Plan
- Keep pre-change backup of `database.sqlite` + WAL.
- If issues arise:
  1. Flip feature flag back to old driver.
  2. Restore DB backup if necessary.
  3. Revert code to previous commit.
- Ensure rollback instructions are added to deployment docs.

## 8. Estimated Effort
- Audit & shared helper: ~1h
- Service refactors & testing: ~4–5h
- Documentation + deployment: ~1h

**Outcome:** Admin DB uses the same `better-sqlite3` stack as the main DB, eliminating driver mismatch, simplifying code, and improving reliability without frontend changes or data loss. 
