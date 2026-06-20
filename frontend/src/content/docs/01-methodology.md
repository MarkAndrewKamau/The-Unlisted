# Research Methodology

> How we find exceptional Kenyan businesses the startup ecosystem has missed —
> and prove they belong on the list. Designed to be **repeatable**: a different
> researcher running these steps next quarter should reach a comparable list.

## Operating principle

The goal is the intersection of two things that rarely travel together:

```
HIDDEN CHAMPION = strong fundamentals  ∩  absent from the common databases
```

Most "best businesses" lists optimise only the first and end up re-listing
companies everyone already knows. We treat **obscurity as a first-class,
measured criterion**, not an afterthought (see [03-exclusion-criteria](03-exclusion-criteria.md)).

## The funnel

```
  SEED        cast wide across free public sources          ── thousands
   │          (registries, directories, marketplaces, maps)
   ▼
  DEDUPE      collapse the same business across sources      ── ~ unique set
   │
   ▼
  ENRICH      attach fundamentals signals per candidate      ── evidence-backed
   │          (longevity, ratings, locations, tenders…)
   ▼
  EXCLUDE     check each against the common databases;       ── hidden only
   │          anything "already known" is gated out
   ▼
  SCORE       two-axis: Quality × Obscurity (geometric)      ── ranked
   │
   ▼
  VERIFY      human review of the top finalists              ── Top 50
   │
   ▼
  PROFILE +   write profiles; invite top-10 founders         ── deliverables
  OUTREACH
```

## Stage detail

1. **Seed.** Run every connector for the in-scope sectors. Connectors are
   source-specific (`discovery/connectors/`) and each emits candidates with raw
   signals. Breadth here is the whole game — favour sources the ecosystem ignores
   (physical-market directories, association rosters, marketplace seller pages)
   over sources it watches.
2. **Dedupe.** Normalise names (strip legal suffixes, casing, punctuation) to
   merge the same business seen via multiple sources; flag fuzzy near-matches for
   review. See `discovery/dedupe.py`.
3. **Enrich.** Every quantitative claim must trace to a stored `signal` row with
   a source and timestamp. No signal, no credit. This is what makes the score
   auditable and the process repeatable.
4. **Exclude.** Look each candidate up in the common databases
   ([03-exclusion-criteria](03-exclusion-criteria.md)). Presence in a strong
   excluder (Crunchbase, Briter Bridges, VC4A) is an automatic drop; lighter
   press/LinkedIn presence reduces the Obscurity score.
5. **Score.** Apply the [scoring rubric](04-scoring-rubric.md). Quality is
   normalised *within sector cohorts*; the final rank is the geometric mean of
   Quality and Obscurity so a business must be both excellent and unknown.
6. **Verify.** A human spot-checks the top finalists: confirm the business is
   real, currently operating, Kenyan-owned/-operating, and genuinely under the
   radar. This catches data artefacts the automated gate misses.
7. **Profile & outreach.** Generate profiles (template or Claude-assisted) and
   build the [outreach tracker](../discovery/outreach.py) for the top 10.

## What counts as "exceptional"

Strong fundamentals visible from public signals:
- **Longevity** — years operating (survival is itself a filter)
- **Customer retention/satisfaction** — rating × review volume, still accruing
- **Operational consistency** — recent activity, consistent presence across sources
- **Growth** — new locations, active hiring, rising review velocity
- **Revenue proxies** — tender awards, branch count, export/membership tier

## What counts as "missed by the ecosystem"

Absent from the [common databases](03-exclusion-criteria.md): no funding-database
profile, no startup-press coverage, no startup-event roster appearance, negligible
LinkedIn following. B2B manufacturers and regional operators score highest here.

## Reproducibility contract

- All sources are free/public and listed in [02-sources](02-sources.md).
- All thresholds and weights live in code (`score.py`, `footprint.py`), not in
  anyone's head.
- The candidate database (`champions.db`) is the durable artefact; re-running a
  stage updates derived tables without destroying evidence.
- Quarterly refresh procedure: [07-rerun-runbook](07-rerun-runbook.md).
