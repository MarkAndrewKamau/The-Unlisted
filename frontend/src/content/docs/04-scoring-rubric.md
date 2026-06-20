# Scoring Rubric

The implementation of this rubric is `discovery/score.py`. This document is the
human-readable specification it follows.

## Final rank

```
hc_rank = sqrt(Quality × Obscurity)        # geometric mean, 0..100
```

The geometric mean punishes imbalance: a business that is excellent but somewhat
known, or unknown but mediocre, ranks below one that is strong on both. Anything
that fails the [exclusion gate](03-exclusion-criteria.md) gets `hc_rank = 0`.

## Axis 1 — Quality (0..100)

Six weighted dimensions. Each dimension is reduced to one raw number per
business, **min-max normalised within its sector cohort** (you compare a dairy
to other dairies), then weighted and summed × 100.

| Dimension | Weight | Built from | Rationale |
|---|---:|---|---|
| Longevity | 0.20 | `longevity_years` | Survival filters out the fragile |
| Customer | 0.30 | `(rating/5) × log1p(review_count)` | Satisfaction weighted by proven scale |
| Consistency | 0.15 | `1 / (1 + last_activity_days/30)` | Still operating, still active |
| Growth | 0.15 | `locations + job_postings` | Expansion & hiring |
| Revenue | 0.10 | `tenders_won + locations` | Real revenue proxies |
| Validation | 0.10 | `max(certified, association_member)` | Third-party vetting |

Notes:
- **Customer** uses `log1p(reviews)` so a business with 2,000 reviews isn't
  ranked 10× above one with 200 — diminishing returns on volume, while rating
  scales it for quality.
- **Cohort normalisation** means Quality is *relative* within a sector. A score
  of 80 means "top of its cohort on fundamentals", not an absolute.
- A dimension with no spread across the cohort contributes a neutral 0.5 (no
  information) rather than skewing the result.

## Axis 2 — Obscurity (0..100)

```
obscurity = 100 / (1 + total_common_db_hits / K)     # K = 2.0
```

Driven entirely by the [exclusion check](03-exclusion-criteria.md). 0 hits → 100.

## Worked example (from the sample cohort)

| Business | Quality | Obscurity | hc_rank | Outcome |
|---|---:|---:|---:|---|
| Eldoret Agrovet Supplies | 71.9 | 100.0 | 84.8 | strong + invisible → **#1** |
| Githunguri Dairy | 78.1 | 66.7 | 72.2 | top fundamentals, light footprint |
| Twiga Foods | — | — | 0 | **disqualified** (Crunchbase) |
| Sendy | — | — | 0 | **disqualified** (Crunchbase) |

## Tuning & governance

All weights and constants are in `score.py` (`WEIGHTS`, `FOOTPRINT_DISQUALIFY`,
`OBSCURITY_K`). Treat changes as methodology changes: record them in the
quarterly changelog so two runs remain comparable. When adding a new signal
type, add it to `models.Sig`, emit it from a connector, and map it into a
dimension in `_raw_dimensions`.
