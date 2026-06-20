# Exclusion Criteria — "Not Found in the Common Databases"

The deliverable is explicitly the **Top 50 businesses _not found in the common
databases_** the startup ecosystem already watches. This document defines that
test precisely so it is repeatable and defensible.

## The common databases

The canonical list lives in code as `COMMON_DATABASES` in
`discovery/footprint.py` (so it is versioned and auditable). It currently covers
three tiers:

1. **Funding / startup databases** — Crunchbase, Briter Bridges, VC4A, The Big Deal
2. **Ecosystem press** — TechCabal, Techpoint Africa, Disrupt Africa, Business Daily startup desk
3. **Ecosystem-scale social presence** — LinkedIn company following

## How presence is detected

For each candidate we run a site-scoped lookup per database (`"<name>"
site:<domain>`) and record the hit count as a `footprint` row with its source.
The search backend is pluggable (`footprint.search_hits`); until one is wired it
returns 0 (treated as "not found"), so the pipeline never *invents* footprint.

## The gate (hard exclusions)

A candidate is **disqualified outright** if either:

- it appears in any **strong excluder** — Crunchbase, Briter Bridges, VC4A, or
  The Big Deal. Presence here means the ecosystem already profiles/funds it.
- its **total footprint hits exceed `FOOTPRINT_DISQUALIFY`** (default 8) across
  all common databases combined.

Disqualified businesses are kept in the database with a recorded `reason` (for
auditability) but never appear in the Top 50.

## The penalty (soft signal → Obscurity score)

Anything not gated out still earns an **Obscurity score** that decays with
footprint:

```
obscurity = 100 / (1 + total_hits / K)        # K = 2.0
```

Zero hits → 100 (fully invisible). A handful of light press mentions pulls it
down without removing it. Obscurity is then multiplied with Quality
(geometric mean) so the final rank rewards businesses that are both excellent
**and** unknown.

## Additional disqualifiers (applied at human-verify)

The automated gate is necessary but not sufficient. During verification we also
drop a candidate if:

- it is a **subsidiary/brand of a large/listed group** (the parent is known);
- it is **not Kenyan-owned or Kenya-operating**;
- it is **defunct or dormant** (no activity signal in ~18 months);
- it is a **pure intermediary/reseller** with no real operating business;
- it has clearly **attended major startup/accelerator events** (roster check),
  even if it dodged the database lookups.

## Tuning

Thresholds (`FOOTPRINT_DISQUALIFY`, `OBSCURITY_K`) and the `STRONG_EXCLUDERS`
set are constants in `score.py` / `footprint.py`. Changing them re-defines
"hidden" — so any change should be recorded in the changelog when you re-run the
pipeline ([07-rerun-runbook](07-rerun-runbook.md)).
