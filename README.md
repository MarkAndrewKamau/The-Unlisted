# Kuzana Hidden Champions — Discovery Engine

A repeatable pipeline that surfaces **exceptional Kenyan businesses the startup
ecosystem has missed**, scores them on public fundamentals, and ranks them so the
best (and least-known) rise to the top.

> The hard part of this bounty isn't scraping — it's doing two opposite things at
> once: finding businesses with *strong fundamentals* while *excluding anything
> the ecosystem already knows about*. So ranking is a **two-axis model**.

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

## Architecture

```
run.py                  orchestrator / CLI
discovery/
  models.py             Business · Signal · Footprint · Score + signal vocabulary
  store.py              SQLite persistence (append-only evidence)
  connectors/
    base.py             Connector interface
    sample.py           offline fixtures (demo/CI)
    jumia.py            live Jumia seller connector (free public web)
  footprint.py          Obscurity axis — pluggable search backend
  dedupe.py             entity de-duplication
  score.py              the two-axis scoring model
  profile.py            profile generation (Claude Opus, or offline template)
```

## Adding a data source

1. Create `discovery/connectors/<name>.py` subclassing `Connector`; implement
   `discover()` to yield `SeedRecord(business, [signals])`.
2. Register it in `discovery/connectors/__init__.py` `REGISTRY`.
3. `python run.py seed --source <name> --sector <sector>`.

Planned connectors (free sources): KAM member directory, public tenders (PPIP),
WHOIS/Wayback for longevity, Facebook pages, BrighterMonday/Fuzu (hiring signal),
OpenStreetMap.

## Sector focus (MVP)

Two sectors, done rigorously:

- **Manufacturing / agro-processing** — most defensible "ecosystem missed them":
  B2B, no LinkedIn hustle, never at startup events. Signal from KAM, tenders,
  certifications, longevity.
- **E-commerce sellers** — cleanest *free* rating/longevity data (Jumia/Kilimall
  seller pages), proves the pipeline out fastest.

## What's a stub vs. real

- ✅ Real & runnable: schema, scoring model, gate, profiling, CLI, export, dedupe.
- 🔌 Needs wiring for live runs: `footprint.search_hits` (point at SerpAPI/Bing),
  `jumia.py` selectors (tune against live HTML), `ANTHROPIC_API_KEY` for LLM
  profiles. Each degrades safely — no key/backend just means template profiles
  and zero-footprint assumptions.

## Roadmap

- [ ] Wire a search backend for real footprint scoring
- [ ] KAM + tenders connectors (manufacturing fundamentals)
- [ ] WHOIS/Wayback longevity enrichment
- [ ] Haiku-based fuzzy dedupe across connectors
- [ ] Outreach tracker for the top-10 founder invitations (bonus deliverable)
```
