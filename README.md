# Kuzana Hidden Champions — Discovery Engine

A repeatable pipeline that surfaces **exceptional Kenyan businesses the startup
ecosystem has missed**, scores them on public fundamentals, and ranks them so the
best (and least-known) rise to the top.

> The hard part of this bounty isn't scraping — it's doing two opposite things at
> once: finding businesses with *strong fundamentals* while *excluding anything
> the ecosystem already knows about*. So ranking is a **two-axis model**, and the
> deliverable is the **Top 50 _not found in the common databases_**.

## Submission deliverables

| # | Deliverable | Where |
|---|---|---|
| 1 | Research methodology | [docs/01-methodology.md](docs/01-methodology.md) |
| 2 | Source list | [docs/02-sources.md](docs/02-sources.md) |
| 3 | Exclusion criteria ("not in common databases") | [docs/03-exclusion-criteria.md](docs/03-exclusion-criteria.md) |
| 4 | Scoring rubric | [docs/04-scoring-rubric.md](docs/04-scoring-rubric.md) |
| 5 | Candidate database | `champions.db` (built by the pipeline) |
| 6 | Top 50 profiles | `output/top50.csv` + `output/profiles/*.md` |
| 7 | Top 10 founder outreach tracker | `output/outreach_tracker.csv` ([generator](discovery/outreach.py)) |
| 8 | Interview script | [docs/05-interview-script.md](docs/05-interview-script.md) |
| 9 | Data ethics / compliance note | [docs/06-data-ethics-compliance.md](docs/06-data-ethics-compliance.md) |
| 10 | How to re-run next quarter | [docs/07-rerun-runbook.md](docs/07-rerun-runbook.md) |

## The model

```
hc_rank = geometric_mean(Quality, Obscurity)
```

A business must be **both excellent and unknown** to rank high. A hard gate
disqualifies anything with too much ecosystem footprint.

- **Quality (0–100)** — weighted, sector-normalised fundamentals:
  longevity · customer satisfaction × scale · operational consistency ·
  growth · revenue proxies · sector validation. (Weights in `discovery/score.py`.)
- **Obscurity (0–100)** — inverse of ecosystem footprint: press hits
  (TechCabal, Disrupt Africa…), Crunchbase/funding presence, LinkedIn following,
  startup-event appearances. High footprint → disqualified.

Scores are **sector-normalised** (you compare a dairy to other dairies) and every
quantitative claim **traces back to a stored signal with its source** — the
`signal`/`footprint` tables are append-only evidence logs.

## Quickstart

```bash
pip install -r requirements.txt      # optional; core runs on stdlib alone
python run.py demo                   # full offline run on bundled fixtures
```

`demo` seeds sample data → scores → profiles → writes `output/top50.csv` and
`output/profiles/*.md`. The fixtures include Twiga and Sendy specifically so you
can watch the Obscurity gate disqualify them.

## Pipeline stages

| Stage | Command | What it does |
|---|---|---|
| seed | `python run.py seed --source jumia --sector ecommerce` | pull candidates + signals from a connector |
| footprint | `python run.py footprint --sector ecommerce` | measure ecosystem visibility |
| score | `python run.py score --sector ecommerce` | compute Quality/Obscurity/rank + gate |
| profile | `python run.py profile --sector ecommerce` | write a profile per finalist |
| export | `python run.py export` | `top50.csv` + `profiles/*.md` |
| outreach | `python run.py outreach` | top-10 founder tracker (preserves CRM state) |

## Architecture

```
run.py                  orchestrator / CLI
discovery/
  models.py             Business · Signal · Footprint · Score + signal vocabulary
  store.py              SQLite persistence (append-only evidence)
  connectors/
    base.py             Connector interface
    sample.py           offline fixtures (demo/CI)
    jumia.py            Jumia sellers — e-commerce (customer signal)
    kam.py              KAM directory — manufacturing (vetted membership)
    tenders.py          public tender awards — revenue proxy
  footprint.py          exclusion vs. COMMON_DATABASES (Obscurity axis)
  dedupe.py             entity de-duplication
  score.py              the two-axis scoring model
  profile.py            profile generation (Claude Opus, or offline template)
  outreach.py           top-10 founder outreach tracker
```

Written deliverables (methodology, sources, exclusion criteria, rubric,
interview script, ethics note, quarterly runbook) live in [docs/](docs/).

## Adding a data source

1. Create `discovery/connectors/<name>.py` subclassing `Connector`; implement
   `discover()` to yield `SeedRecord(business, [signals])`.
2. Register it in `discovery/connectors/__init__.py` `REGISTRY`.
3. `python run.py seed --source <name> --sector <sector>`.

Built connectors: Jumia sellers, KAM directory, public tenders. Planned (free
sources): WHOIS/Wayback for longevity, Facebook pages, BrighterMonday/Fuzu
(hiring signal), OpenStreetMap. Full table in [docs/02-sources.md](docs/02-sources.md).

## Sector focus (MVP)

Two sectors, done rigorously:

- **Manufacturing / agro-processing** — most defensible "ecosystem missed them":
  B2B, no LinkedIn hustle, never at startup events. Signal from KAM, tenders,
  certifications, longevity.
- **E-commerce sellers** — cleanest *free* rating/longevity data (Jumia/Kilimall
  seller pages), proves the pipeline out fastest.

## What's a stub vs. real

- ✅ Real & runnable: schema, scoring model, common-database exclusion gate,
  live search backend (free DuckDuckGo default, SerpAPI optional), profiling,
  CLI, export, outreach tracker, dedupe.
- 🔌 Needs tuning for live runs: connector selectors (`jumia.py`, `kam.py`,
  `tenders.py`) against live HTML, and `ANTHROPIC_API_KEY` for LLM profiles.
  Each degrades safely — no key/network just means template profiles and
  cached/zero footprint, never a crash.

## Roadmap

- [x] Two-axis scoring + common-database exclusion gate
- [x] KAM + tenders connectors (manufacturing fundamentals)
- [x] Top-10 founder outreach tracker (bonus deliverable)
- [x] Live search backend for footprint scoring (DuckDuckGo free / SerpAPI)
- [ ] WHOIS/Wayback longevity enrichment
- [ ] Haiku-based fuzzy dedupe across connectors
```
