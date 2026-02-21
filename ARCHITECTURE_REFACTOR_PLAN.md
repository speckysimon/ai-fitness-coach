# FTP & FTHR Architecture Refactor Plan

## Problem Statement

**Critical Issue:** Inconsistent calculation usage leading to bad architecture, difficult fixes, and unreliable data.

Currently, there are **3 different FTP calculation methods** and **2 different FTHR calculation methods** scattered across the frontend, causing:
- Conflicting values displayed in different sections
- Duplicate logic that's hard to maintain
- Frontend physiology calculations (anti-pattern)
- No single source of truth

---

## FTP & FTHR Calculation & Display Locations (Revised)

### Backend Core (Single Source of Truth)

| Area | Page / File | Metric | Role | Source of Truth | Notes |
|------|-------------|--------|------|-----------------|-------|
| **Backend Core** | `/api/analytics/ftp` | FTP | Single canonical calculation | Backend (42-day method) | Implements full FTP bible logic |
| **Backend Core** | `/api/analytics/fthr` | FTHR | Single canonical calculation | Backend (42-day method) | No HR multipliers, no estimation |
| **Backend Core** | `/api/analytics/ftp-history` | FTP History | Weekly snapshot generation | Backend | Weekly medians from canonical FTP |
| **Backend Core** | `/api/analytics/fthr-history` | FTHR History | Weekly snapshot generation | Backend | Null if insufficient data |

---

### Dashboard & Pages (Display Only)

| Page | Section | Metric | Role | Calculation |
|------|---------|--------|------|-------------|
| `Dashboard.jsx` | Main FTP Card | FTP | Display | `/api/analytics/ftp` |
| `Dashboard.jsx` | FTP Confidence | FTP | Display | Included in API response |
| `RiderProfile.jsx` | FTP Card | FTP | Display | Backend or manual override |
| `RiderProfile.jsx` | FTHR Card | FTHR | Display | Backend or manual override |
| `RiderProfile.jsx` | HR Zones | Zones | Display | Derived in backend from FTHR |
| `PlanGenerator.jsx` | Plan Context | FTP / FTHR | Read-only input | Backend APIs |
| `FTPHistory.jsx` | FTP Chart | FTP History | Display | `/api/analytics/ftp-history` |
| `PerformanceMetrics.jsx` | FTP Trend | FTP History | Display | Backend history |
| `PerformanceMetrics.jsx` | FTHR Trend | FTHR History | Display | Backend history |

---

### Derived Metrics (Frontend OK)

| Metric | Formula | Allowed Location |
|--------|---------|------------------|
| W/kg | `ftp / weight` | Frontend |
| BMI | `weight / (height/100)²` | Frontend |

**Rationale:** These are pure math, not physiology — safe to keep client-side.

---

### Manual Overrides (Still Valid)

| Metric | Storage | Priority |
|--------|---------|----------|
| Manual FTP | `localStorage.manual_ftp` | Overrides backend |
| Manual FTHR | `localStorage.manual_fthr` | Overrides backend |

**Note:** Backend should still compute silently for validation warnings.

---

## What Must Be Removed or Killed Outright

### ❌ Delete These Concepts Entirely

1. **Frontend `calculateWeeklyFTP()`**
   - Location: `FTPHistory.jsx` (lines 26-84)
   - Location: `PerformanceMetrics.jsx` (lines 38-96)

2. **Frontend `calculateWeeklyFTHR()`**
   - Location: `PerformanceMetrics.jsx` (lines 98-156)

3. **Any HR duration multiplier (0.95 etc.)**
   - Found in: `FTPHistory.jsx`, `PerformanceMetrics.jsx`
   - Lines with `* 0.95`, `* 0.90`, etc.

4. **"Simple FTP" vs "Smart FTP" split**
   - Current: Dashboard uses `/api/analytics/smart-ftp`
   - Current: Other pages use `/api/analytics/ftp`
   - **Goal:** ONE FTP. ONE FTHR. MANY VIEWS.

---

## What Replaces "Smart FTP"

Your smartness now lives in:
- Effort qualification
- Weighting
- Confidence scoring

**Not in separate endpoints.**

### Action Required:
- `/api/analytics/smart-ftp` → **merged into** `/api/analytics/ftp`
- Dashboard just displays the same FTP everyone else uses

---

## Sanity Check Against the Bible

✅ **Method defined once**  
✅ **FTP and FTHR treated differently**  
✅ **No HR guessing**  
✅ **Confidence gates interpretation**  
✅ **No frontend physiology**  
✅ **No duplicate logic**

This table is now structurally consistent, testable, and maintainable.

---

## Strong Recommendation for Next Step

### Before Touching Code:

1. **Delete frontend calculation functions**
   - Remove `calculateWeeklyFTP()` from `FTPHistory.jsx` and `PerformanceMetrics.jsx`
   - Remove `calculateWeeklyFTHR()` from `PerformanceMetrics.jsx`
   - Remove all duration multipliers (0.95, 0.90, etc.)

2. **Stub backend history endpoints** (even if fake initially)
   - Create `/api/analytics/ftp-history` endpoint
   - Create `/api/analytics/fthr-history` endpoint
   - Return weekly snapshots from canonical calculations

3. **Make frontend consume only backend metrics**
   - Update `Dashboard.jsx` to use `/api/analytics/ftp` instead of `/api/analytics/smart-ftp`
   - Update `FTPHistory.jsx` to use `/api/analytics/ftp-history`
   - Update `PerformanceMetrics.jsx` to use `/api/analytics/ftp-history` and `/api/analytics/fthr-history`
   - All pages display backend-calculated values only

---

## Current State Analysis

### Files with Frontend FTP/FTHR Calculations (TO BE REMOVED):

1. **`FTPHistory.jsx`**
   - Lines 26-84: `calculateWeeklyFTP()` with duration multipliers
   - Lines 293-307: Calls backend `/api/analytics/ftp` (KEEP)
   - Lines 310-360: Uses frontend `calculateWeeklyFTP()` for history (REPLACE with backend endpoint)

2. **`PerformanceMetrics.jsx`**
   - Lines 38-96: `calculateWeeklyFTP()` with duration multipliers
   - Lines 98-156: `calculateWeeklyFTHR()` with duration multipliers
   - Lines 367-381: Calls backend `/api/analytics/ftp` (KEEP)
   - Lines 433-452: Calls backend `/api/analytics/fthr` (KEEP)
   - Lines 384-427: Uses frontend `calculateWeeklyFTP()` for history (REPLACE)
   - Lines 455-499: Uses frontend `calculateWeeklyFTHR()` for history (REPLACE)

3. **`Dashboard.jsx`**
   - Lines 604-624: Calls `/api/analytics/smart-ftp` (REPLACE with `/api/analytics/ftp`)

4. **`RiderProfile.jsx`**
   - Lines 54-72: Loads FTP from cache or manual override (KEEP)
   - Lines 260-284: Calls backend `/api/analytics/fthr` (KEEP)

5. **`PlanGenerator.jsx`**
   - Lines 599-605: Calls backend `/api/analytics/ftp` (KEEP)
   - Lines 607-614: Calls backend `/api/analytics/fthr` (KEEP)

---

## Implementation Phases

### Phase 1: Backend Consolidation
- [ ] Merge Smart FTP logic into `/api/analytics/ftp`
- [ ] Create `/api/analytics/ftp-history` endpoint
- [ ] Create `/api/analytics/fthr-history` endpoint
- [ ] Implement 42-day calculation logic per bible
- [ ] Add confidence scoring to responses

### Phase 2: Frontend Cleanup
- [ ] Remove `calculateWeeklyFTP()` from `FTPHistory.jsx`
- [ ] Remove `calculateWeeklyFTP()` from `PerformanceMetrics.jsx`
- [ ] Remove `calculateWeeklyFTHR()` from `PerformanceMetrics.jsx`
- [ ] Update `Dashboard.jsx` to use `/api/analytics/ftp`
- [ ] Update `FTPHistory.jsx` to use `/api/analytics/ftp-history`
- [ ] Update `PerformanceMetrics.jsx` to use history endpoints

### Phase 3: Testing & Validation
- [ ] Verify all pages show consistent FTP/FTHR values
- [ ] Test manual override functionality
- [ ] Validate confidence scoring display
- [ ] Check historical data accuracy

---

## Success Criteria

1. **Single Source of Truth:** All FTP/FTHR calculations happen in backend only
2. **Consistent Values:** Same FTP/FTHR displayed across all pages
3. **No Frontend Physiology:** Zero calculation logic in frontend components
4. **Maintainable:** Changes to calculation logic only require backend updates
5. **Testable:** Backend endpoints can be unit tested independently

---

## References

- `FTP_and_FTHR_calculations_logic.md` - Exact calculation algorithms
- `FTP_FTHR_CALCULATION_EXPLAINED.md` - Current implementation explanation
- `RIDER_PROFILE_FIX.md` - Previous normalization fix documentation
