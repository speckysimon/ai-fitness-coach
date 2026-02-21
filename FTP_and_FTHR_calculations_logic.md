# FTP — Exact Calculation Logic

## 1. Analysis Window

- Use last 42 days of activities
- Do not shorten the window
- Apply recency weighting later, not hard exclusion

## 2. Candidate Effort Extraction

From all rides with power data:

**Rolling Efforts**

Compute rolling mean power for durations:
- 20, 30, 40, 50, 60 minutes
(you may use continuous rolling windows or best segment extraction)

Keep an effort only if:
- Duration ∈ [20, 60] minutes
- ≥95% of samples have power > 0
- Coasting time ≤5%
- Power variability:
  - CV = std(power) / mean(power)
  - Require CV ≤ 0.10 (you can tune later)

Each qualifying effort becomes one FTP candidate.

## 3. Per-Effort FTP Estimate

For each candidate effort:

```python
if duration >= 60:
    ftp_i = avg_power
elif duration >= 40:
    ftp_i = avg_power * 0.98
elif duration >= 30:
    ftp_i = avg_power * 0.97
else:  # 20–29 min
    ftp_i = avg_power * 0.95
```

Store for each effort:
- ftp_i
- duration
- days_ago
- cv

## 4. Effort Weighting (for aggregation only)

Define a weight per effort:

```python
recency_weight = exp(-days_ago / 21)
duration_weight = min(duration / 60, 1.0)
steadiness_weight = clamp(1 - (cv / 0.10), 0, 1)

total_weight = recency_weight * duration_weight * steadiness_weight
```

(Weights are not used to scale power — only to rank importance.)

## 5. Final FTP Value

- Sort efforts by total_weight (descending)
- Take the top 3 efforts
- Compute:

```python
FTP = median(ftp_i of top 3 efforts)
```

**Why median:**
- Robust to one bad effort
- Stable across datasets
- Matches your "accuracy over completeness" principle

## 6. FTP Confidence Score (0–100)

Start at 0, add:
- +40 → ≥1 effort ≥40 min
- +20 → ≥2 qualifying efforts
- +20 → std dev of ftp_i (top 3) ≤5%
- +10 → best effort ≤14 days old
- +10 → ≥1 effort ≥50 min

Cap at 100.

**Rules:**
- Confidence <40 → show FTP but mark Low confidence
- Confidence <25 → recommend test prominently

## 7. Manual Override

- Manual FTP replaces calculated FTP
- Still compute confidence in background (for warnings)

---

# FTHR — Exact Calculation Logic

## 1. Analysis Window

- Same 42-day window
- HR data required
- No estimation from max HR

## 2. Candidate Effort Extraction

From rides with HR and power data:

**Rolling Efforts**

Durations: 30, 40, 50, 60 minutes

Keep an effort only if:
- Duration ≥30 minutes
- ≥95% HR samples present
- Power CV ≤0.10 (steady effort proxy)
- HR drift check:

```python
hr_first_half = mean(HR[0 → 50%])
hr_second_half = mean(HR[50% → 100%])

abs(hr_second_half - hr_first_half) ≤ 5 bpm
```

This removes tempo-with-drift junk.

## 3. Per-Effort FTHR Estimate

For each qualifying effort:

```python
fthr_i = avg_heart_rate
```

**No multipliers. Ever.**

Store:
- fthr_i
- duration
- days_ago
- hr_drift

## 4. Effort Weighting

```python
recency_weight = exp(-days_ago / 21)
duration_weight = min(duration / 60, 1.0)
drift_weight = clamp(1 - (abs(hr_drift) / 5), 0, 1)

total_weight = recency_weight * duration_weight * drift_weight
```

## 5. Final FTHR Value

**Minimum requirement:**
- At least 1 qualifying effort ≥40 min
- If not met → FTHR = null (Not established)

If requirement met:
- Sort efforts by total_weight
- Take top 3
- Compute:

```python
FTHR = median(fthr_i of top 3 efforts)
```

## 6. FTHR Confidence Score (0–100)

- +50 → ≥1 effort ≥40 min
- +20 → ≥2 qualifying efforts
- +15 → hr_drift ≤3 bpm on best effort
- +10 → best effort ≤14 days old
- +5 → ≥1 effort ≥50 min

Cap at 100.

**Rules:**
- Confidence <50 → show value but mark Low confidence
- No qualifying ≥40 min effort → do not show a value

## 7. Manual Override

- Manual FTHR always wins
- Auto-calculation continues silently for validation hints

---

# Non-Negotiable Rules (Bake These In)

- FTP can be estimated cautiously
- FTHR must not be guessed
- HR ≠ power → no shared multipliers
- Median beats mean
- Confidence gates interpretation, not existence

---

# Final sanity check

If a rider:
- only does Zwift races → FTP works, FTHR likely null
- only rides Z2 → both stay unset
- does one long steady climb → both establish cleanly
- gets sick or tapers → recency weighting softens decay
