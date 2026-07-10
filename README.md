# The Unlisted — Kuzana Hidden Champions Discovery Engine

> *"The best Kenyan businesses you've never heard of — found, scored, and ranked."*

A full-stack discovery platform that surfaces exceptional Kenyan businesses the startup ecosystem has systematically missed. It combines a repeatable data pipeline, a two-axis scoring model, and a dashboard UI so analysts can run quarterly discovery cycles, review evidence-backed candidates, track founder outreach, and export ranked profiles — all without depending on paid data sources.

---

## Table of Contents

1. [The Problem](#1-the-problem)
2. [The Solution](#2-the-solution)
3. [The Two-Axis Model](#3-the-two-axis-model)
4. [Features](#4-features)
5. [Architecture](#5-architecture)
6. [Tech Stack](#6-tech-stack)
7. [Pipeline Stages](#7-pipeline-stages)
8. [Scoring Model (Deep Dive)](#8-scoring-model-deep-dive)
9. [Data Sources](#9-data-sources)
10. [Exclusion Gate](#10-exclusion-gate)
11. [Getting Started](#11-getting-started)
12. [API Reference](#12-api-reference)
13. [Monetisation Strategy](#13-monetisation-strategy)
14. [Roadmap](#14-roadmap)
15. [Ethics & Compliance](#15-ethics--compliance)
16. [Submission Deliverables](#16-submission-deliverables)

---

## 1. The Problem

Kenya's startup ecosystem has a visibility problem — but it cuts in an unexpected direction.

The common "best businesses in Kenya" lists keep rediscovering the same set of funded, press-covered, VC-backed companies: Twiga Foods, Sendy, M-KOPA, Wasoko. These are excellent businesses, but they are already known. Investors, accelerators, and media platforms have them covered. Screening more candidates using quality signals alone does not solve this — you just re-list the already-famous at higher precision.

Meanwhile, thousands of genuinely exceptional Kenyan operators — manufacturers in Eldoret, agrovet chains in Nakuru, B2B logistics providers in Mombasa, e-commerce sellers on Jumia with 4.8-star ratings built over a decade — remain invisible to the ecosystem. They never attended a startup event. They have no Crunchbase page. No VC has called. They are exceptional *because* they built without ecosystem air cover.

**The gap is not about quality. It is about discoverability.** And discoverability cannot be fixed by looking harder at the same sources the ecosystem already watches.

---

## 2. The Solution

**The Unlisted** is a repeatable discovery engine built around a single insight:

> A hidden champion must be **excellent** *and* **unknown**. These two properties must be optimised together, not separately.

The system operationalises this as a two-axis scoring model where the final rank is the geometric mean of a Quality score and an Obscurity score. Either axis alone is insufficient — a mediocre-but-unknown business scores low, and a high-quality-but-famous business is disqualified entirely before scoring even begins.

The pipeline is designed to run quarterly. It seeds thousands of candidates from free public sources (directories, marketplaces, association rosters, procurement portals), applies a hard exclusion gate against nine common databases the ecosystem watches, scores survivors on six Quality dimensions and one Obscurity axis, and surfaces the top 50 as evidence-backed profiles ready for human verification and founder outreach.

Every quantitative claim in every profile traces to a stored signal row with a source and timestamp. The candidate database is the durable artefact — re-running a stage refreshes derived tables without destroying evidence. A different researcher running these steps next quarter should reach a comparable list.

---

## 3. The Two-Axis Model

```
hc_rank = √(Quality × Obscurity)
```

The geometric mean is deliberate. It punishes imbalance:

| Scenario | Quality | Obscurity | hc_rank |
| --- | ---: | ---: | ---: |
| Excellent + invisible | 90 | 100 | **94.9** |
| Excellent + somewhat known | 90 | 50 | 67.1 |
| Mediocre + invisible | 40 | 100 | 63.2 |
| Excellent + already famous | 90 | 0 | **0 (disqualified)** |
| Average across both | 70 | 70 | 70.0 |

A business that is strong on only one axis cannot compensate. This is what makes the list different — it is not a quality ranking with an obscurity filter bolted on, it is a joint optimisation where both axes matter equally in the final score.

---

## 4. Features

### 4.1 Pipeline Dashboard (Web UI)

The primary interface for analysts running discovery cycles.

**Pipeline Funnel Visualization**
A signature animated SVG funnel on the dashboard homepage showing six named stages as horizontal bands of decreasing width — SEED, DEDUPE, ENRICH, EXCLUDE, SCORE, TOP 50 — with live candidate counts per stage. On page load, amber dots animate downward through the funnel and disappear at the EXCLUDE band for disqualified candidates. Clicking a stage band navigates to that stage's detail view. Hovering shows a sector breakdown tooltip (e-commerce vs. manufacturing counts).

**Stage Run Controls**
A row of six stage buttons below the funnel lets analysts trigger any pipeline stage directly from the browser. Clicking a stage opens a terminal slide-over showing the CLI command and a streaming log output panel simulating real execution. Sector can be filtered to All / E-commerce / Manufacturing before running.

**Top 5 Leaderboard Preview**
The right panel shows the current top five ranked businesses at a glance — rank number, business name, sector tag, Quality and Obscurity score bars, and HC rank — so analysts can see at a glance if the latest run produced meaningful movement.

**Activity Log**
A live scrollable feed of pipeline events in monospaced terminal style: timestamps, seeded counts, disqualification events (highlighted in terracotta), and scoring completions. Disqualification toasts slide in from the bottom-right as the pipeline runs.

---

### 4.2 Candidate Database

A full, filterable, sortable view of every business that has entered the pipeline at any stage.

- **Search** — real-time search by business name
- **Filter sidebar** — filter by sector, status (Active / Disqualified / Pending), Quality score range, Obscurity score range, and footprint hit count
- **Sortable table** — sortable by rank, Quality, Obscurity, HC Score; default sort by `hc_rank` descending
- **Status indicators** — disqualified rows render at 50% opacity with a strikethrough on the rank column; status badges distinguish Active / Disqualified / Pending
- **Pagination** — 25 / 50 / 100 rows per page with candidate count display
- **Candidate detail slide-over** — clicking any row opens a 480px right panel showing:
  - Score breakdown with weighted dimension bars (Quality × 6 dimensions)
  - Evidence log: every signal row with source, value, and timestamp
  - Footprint check: all nine databases checked, hit counts, disqualify reason if applicable
  - Actions: View Full Profile, Mark for Verification, Add to Outreach

---

### 4.3 Top 50 Hidden Champions

The primary deliverable — 50 ranked business profile cards for businesses that passed the exclusion gate.

- **Hero stat bar** — total champions count, total candidates seeded, average Quality and Obscurity across the cohort
- **Export buttons** — Export CSV and Export Profiles (.zip of Markdown files) from the header
- **Ranked cards** — each card shows rank number, HC Score, business name, sector, years operating, Quality and Obscurity score bars, and the top three evidence signals (e.g. `★ 4.7 · 1,240 reviews`, `KAM Member`, `3 tenders won`)
- **Top-3 accent** — cards ranked 1–3 carry an amber left-border accent to distinguish the podium
- **Quick view hover** — hovering a card reveals the top three evidence signals without navigating away
- **Score bar animations** — on mount, all score bars animate from 0% to their actual value

---

### 4.4 Business Profile Pages

A full deep-dive profile for every business in the Top 50, structured as an evidence-backed document ready for human verification.

**Profile Header**
Dark forest-green header with the business name, sector, location, and three score pills (Quality / Obscurity / HC Score) visible at a glance. A decorative rank number in large italic type anchors the hero section. Share Profile and Edit buttons sit top-right.

**Narrative Section**
An auto-generated or template-driven overview paragraph describing what makes the business exceptional. Fields that need human verification are highlighted with inline amber markers.

**Score Breakdown**
A grouped bar chart (Recharts) showing all six Quality dimensions with their weights. Below it: an Obscurity gauge — a semicircle gauge with a needle — and the full footprint table listing every common database checked, hit counts, and whether each is a strong excluder.

**Evidence Log**
Every signal stored for the business is shown in a sortable table: Signal Type, Value, Source, Collected timestamp. Source links are clickable. A signal coverage grid at the bottom shows which of the six Quality dimensions have signals vs. gaps (amber dot = signal, dashed circle = missing).

**Founder Outreach Section**
For businesses in the top 10, a CRM section shows the outreach pipeline (Identified → Contacted → Responded → Interviewed → Joined) with the current stage highlighted in amber. Analysts can log contact notes, update last-contact date, and access the interview script via a collapsible accordion.

**Action Bar**
Sticky actions at the bottom: Mark Verified, Send to Founder (pre-fills an email with the profile link), Export Profile (.md), and Disqualify (terracotta, requires confirmation with written reason).

---

### 4.5 Founder Outreach Tracker

A lightweight CRM for managing relationships with the top 10 identified founders.

- **Kanban board** — five columns: Identified, Contacted, Responded, Interviewed, Joined / Declined. Cards show rank, business name, HC score, last contact date, and a notes preview.
- **Drag-and-drop** — drag cards between columns (powered by `@dnd-kit/core`) to update outreach status
- **Founder detail slide-over** — clicking a card opens a full notes editor, contact history log, and the interview script
- **Interview script checklist** — five sections (Opening, Story, Business Model, Verify Signals, The Invitation), each collapsible, with checkboxes to mark questions as asked during a live call
- **Export** — Export Tracker CSV downloads the full outreach log with status and notes for every founder

---

### 4.6 Methodology & Docs

All written documentation rendered inline as a styled docs site, consistent with the dashboard's visual system.

Seven documents are accessible from a sticky sidebar:

| # | Document | Contents |
| --- | --- | --- |
| 01 | Methodology | Operating principle, funnel stages, reproducibility contract |
| 02 | Sources | All free public data sources and their signal types |
| 03 | Exclusion Criteria | The nine common databases, footprint thresholds, disqualification logic |
| 04 | Scoring Rubric | Dimension weights, normalisation method, worked examples |
| 05 | Interview Script | Full founder interview guide with five sections |
| 06 | Data Ethics | Compliance with Kenya Data Protection Act 2019, transparency commitments |
| 07 | Re-run Runbook | Quarterly refresh procedure, step-by-step with timing and common issues |

CLI commands in code blocks have a copy-to-clipboard button on hover. Inline thresholds and constants (e.g. `FOOTPRINT_DISQUALIFY = 8`) are highlighted in amber.

---

### 4.7 Discovery Pipeline (Backend Engine)

The core of the system — a Python pipeline with a modular connector architecture, SQLite evidence store, and REST API.

**Offline-safe by design.** Every stage degrades gracefully: no API key means template profiles instead of Claude-generated ones; no network means cached/zero footprint scores instead of live lookups; no connector results means the existing evidence in the database is preserved. The pipeline never crashes on missing optional dependencies.

**Append-only evidence store.** The `signal` and `footprint` tables are never truncated between runs. Re-running a stage adds new evidence rows; it does not overwrite old ones. This makes the scoring auditable — you can always trace a final rank back to the exact signals that produced it, and when they were collected.

**Sector-normalised scoring.** Quality scores are normalised within sector cohorts, not globally. A manufacturing business is compared to other manufacturing businesses. This prevents cross-sector comparisons from distorting the ranking.

**Configurable thresholds.** All weights and constants live in code (`score.py`, `footprint.py`), not in anyone's head. `WEIGHTS`, `FOOTPRINT_DISQUALIFY`, and `OBSCURITY_K` are single-source-of-truth constants.

---

## 5. Architecture

```
The Unlisted
├── run.py                        CLI orchestrator
├── server.py                     FastAPI HTTP API (deploys to Render)
├── requirements.txt
├── render.yaml                   Render deploy config (backend)
│
├── discovery/                    Core pipeline (Python, stdlib-first)
│   ├── models.py                 Business · Signal · Footprint · Score + signal vocabulary
│   ├── store.py                  SQLite persistence (thread-safe, append-only evidence)
│   ├── dedupe.py                 Entity deduplication (normalise → fuzzy match)
│   ├── footprint.py              Exclusion gate + Obscurity scoring
│   ├── score.py                  Two-axis scoring model (Quality + Obscurity → hc_rank)
│   ├── profile.py                Profile generation (Claude Opus or offline template)
│   ├── outreach.py               Top-10 founder outreach tracker
│   └── connectors/
│       ├── base.py               Connector interface (abstract)
│       ├── sample.py             Bundled offline fixtures (demo + CI)
│       ├── jumia.py              Jumia seller pages — e-commerce connector
│       ├── kam.py                KAM directory — manufacturing connector
│       └── tenders.py            Public tender awards — revenue proxy connector
│
├── docs/                         Written methodology and deliverable docs
│   ├── 01-methodology.md
│   ├── 02-sources.md
│   ├── 03-exclusion-criteria.md
│   ├── 04-scoring-rubric.md
│   ├── 05-interview-script.md
│   ├── 06-data-ethics-compliance.md
│   └── 07-rerun-runbook.md
│
├── frontend/                     TanStack Start dashboard (SSR, deploys as a Node server)
│   ├── src/
│   │   ├── routes/               index (landing) · app.index (pipeline) · app.candidates ·
│   │   │                         app.top50 · app.outreach · app.profile.$id · app.docs(.$slug)
│   │   ├── components/
│   │   │   ├── landing/          CinematicHero · TwoAxisSection · PillarsSection · ChampionsPreview
│   │   │   └── ui/               shadcn/ui primitives (button, card, table, dialog, sidebar, …)
│   │   ├── lib/                  api.ts (typed fetch client) · types.ts · utils.ts
│   │   └── styles.css            Design tokens (forest/amber/terracotta, Fraunces/Inter/DM Mono)
│   └── vite.config.ts
│
└── output/                       Generated per pipeline run (gitignored)
    ├── top50.csv
    ├── outreach_tracker.csv
    └── profiles/
        └── *.md
```

**Deployment topology:**

```
Browser → frontend (TanStack Start, SSR)
                ↕ REST API calls
         Render (FastAPI backend) → SQLite (in-memory for stateless deploys)
```

The frontend and backend are independently deployable. `frontend/` calls the FastAPI backend over `VITE_API_BASE_URL` for every piece of data and every action (no client-generated mock data) — the backend is the single source of truth, and can be pointed at a persistent PostgreSQL store for production use.

---

## 6. Tech Stack

### Backend

| Layer | Technology |
| --- | --- |
| Language | Python 3.11+ |
| HTTP API | FastAPI + Uvicorn |
| Database | SQLite (via stdlib `sqlite3`) |
| HTTP client | `requests` + `BeautifulSoup4` |
| LLM profiles | Anthropic Claude API (optional — degrades to template) |
| Search backend | DuckDuckGo HTML (free default) · SerpAPI (optional, higher limits) |
| Deploy | Render (free tier, auto-deploy from `main`) |

### Frontend

| Layer | Technology |
| --- | --- |
| Framework | React 19 + TypeScript, TanStack Start (SSR) |
| Data fetching | TanStack Query against the FastAPI backend (`src/lib/api.ts`) |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Charts | Recharts (score breakdown bars, obscurity gauge) |
| Drag-and-drop | `@dnd-kit/core` (outreach kanban) |
| Routing | TanStack Router (file-based) |
| Icons | Lucide React |
| Fonts | Fraunces (headings) · DM Mono (data/code) · Inter (body) — Google Fonts |
| Build | Vite + Bun |
| Deploy | Any Node host (Nitro `node-server` preset) |

---

## 7. Pipeline Stages

### Running the full pipeline

```bash
# Offline demo (no internet or API keys needed)
python run.py demo

# Individual stages
python run.py seed       --source jumia   --sector ecommerce
python run.py seed       --source kam     --sector manufacturing
python run.py seed       --source tenders --sector manufacturing
python run.py footprint  --sector ecommerce
python run.py footprint  --sector manufacturing
python run.py score      --sector ecommerce
python run.py score      --sector manufacturing
python run.py profile    --sector ecommerce
python run.py profile    --sector manufacturing
python run.py export
python run.py outreach
```

### Stage reference

| Stage | What it does | Input | Output |
| --- | --- | --- | --- |
| **seed** | Pull candidates + raw signals from a connector | Source name + sector | `business` + `signal` rows in `champions.db` |
| **footprint** | Check each candidate against common databases; measure ecosystem visibility | All businesses in db | `footprint` rows; disqualification flags |
| **score** | Compute Quality (6 dimensions), Obscurity, and `hc_rank`; apply exclusion gate | `signal` + `footprint` rows | `score` rows per business |
| **profile** | Generate a Markdown profile per top-50 finalist (Claude or template) | Top-50 scored businesses | `output/profiles/*.md` |
| **export** | Write `top50.csv` + `outreach_tracker.csv` | Score table | `output/*.csv` |
| **outreach** | Build / refresh the top-10 founder outreach tracker; preserves existing CRM state | Top-10 by `hc_rank` | `output/outreach_tracker.csv` |

---

## 8. Scoring Model (Deep Dive)

### Final rank

```python
hc_rank = sqrt(Quality * Obscurity)    # geometric mean, range 0..100
```

Businesses that fail the exclusion gate receive `hc_rank = 0` regardless of their Quality score.

### Axis 1 — Quality (0..100)

Six weighted dimensions, each min-max normalised within its sector cohort before weighting:

| Dimension | Weight | Signal | Rationale |
| --- | ---: | --- | --- |
| Longevity | 20% | `longevity_years` | Survival is a filter. Fragile businesses don't last a decade. |
| Customer | 30% | `(rating / 5) × log₁₊₁(review_count)` | Satisfaction weighted by proven scale. Log-transformed to prevent review-count gaming. |
| Consistency | 15% | `1 / (1 + last_activity_days / 30)` | Still operating, still active. Recent signals score higher. |
| Growth | 15% | `locations + job_postings` | Physical expansion and active hiring are low-noise growth proxies. |
| Revenue | 10% | `tenders_won + locations` | Tender awards and branch count proxy real revenue without requiring accounts. |
| Validation | 10% | `max(certified, association_member)` | Third-party vetting (KAM membership, ISO certification, KEBS mark). |

**Cohort normalisation:** Weights are applied after min-max normalisation within the sector. A manufacturing business is only compared to other manufacturing businesses. A score of 80 means "top of its cohort on fundamentals", not a global absolute percentile.

**Zero-spread handling:** If a dimension has no variance across the cohort (all candidates have the same value), it contributes a neutral 0.5 — no information means no distortion.

### Axis 2 — Obscurity (0..100)

```python
obscurity = 100 / (1 + total_footprint_hits / K)    # K = 2.0
```

- 0 hits → Obscurity = 100 (perfectly invisible)
- 2 hits → Obscurity = 50
- 8+ hits → Obscurity approaches 0 AND triggers the hard disqualification gate

### Exclusion gate

Any business with `footprint_hits >= FOOTPRINT_DISQUALIFY` (default: 8) is **hard-disqualified** — `hc_rank` is set to 0 and the business is excluded from the Top 50 regardless of Quality score. A single hit on a strong excluder (Crunchbase, Briter Bridges, VC4A) is also grounds for immediate disqualification.

### Worked example

| Business | Quality | Obscurity | hc_rank | Notes |
| --- | ---: | ---: | ---: | --- |
| Eldoret Agrovet Supplies | 71.9 | 100.0 | **84.8** | 18 years old, 4.6★, 3 locations, 5 tenders, KAM member, zero footprint |
| Githunguri Dairy Co. | 78.1 | 66.7 | 72.2 | Exceptional fundamentals, light footprint (3 hits) |
| Twiga Foods | — | — | **0** | Disqualified: Crunchbase profile found |
| Sendy | — | — | **0** | Disqualified: Crunchbase + VC4A profiles found |

---

## 9. Data Sources

All sources used by the pipeline are **free and publicly accessible**. No paid APIs are required for a standard run.

### Seed connectors

| Connector | Sector | Signal types | Notes |
| --- | --- | --- | --- |
| Jumia seller pages | E-commerce | Rating, review count, longevity, location count | Live HTML scraping of seller profiles |
| KAM directory | Manufacturing | Association membership, sector, location | Kenya Association of Manufacturers member roster |
| Public tenders (PPRA) | Both | Tender awards, contract values, award dates | Public Procurement Regulatory Authority open data |
| Sample fixtures | Both | All types | Bundled offline data for demo and CI |

### Footprint databases checked (exclusion gate)

| Database | Type | Strength |
| --- | --- | --- |
| Crunchbase | Funding / startup profiles | **Strong excluder** — single hit disqualifies |
| VC4A | African startup profiles | **Strong excluder** |
| Briter Bridges | African tech company database | **Strong excluder** |
| TechCabal | Kenyan tech press | Moderate — reduces Obscurity score |
| Disrupt Africa | Pan-African startup press | Moderate |
| LinkedIn company pages | Professional network | Moderate — high following reduces score |
| Startup Genome | Global startup rankings | Moderate |
| Nairobi Startup Index | Local aggregator | Light |
| Africapital | VC/PE deals database | **Strong excluder** |

### Planned additional sources

- WHOIS / Wayback Machine — domain age as longevity signal (no scraping required)
- Facebook business pages — customer rating and check-in counts
- BrighterMonday / Fuzu — active job postings as growth signal
- OpenStreetMap — location count for physical-presence verification
- Business Daily Africa archives — press mention check (exclusion)

---

## 10. Exclusion Gate

The exclusion gate is the most important stage in the pipeline. Without it, the output is just a quality ranking — which is what every existing list already produces.

**The principle:** if the ecosystem already knows about a business, it is not a hidden champion. The ecosystem watches a predictable set of databases. Presence in any of them is evidence of discoverability.

**Hard disqualifiers (single hit):**

- Active Crunchbase profile
- VC4A company listing
- Briter Bridges database entry
- Africapital deal record
- Feature coverage in TechCabal, Disrupt Africa, or equivalent

**Soft footprint (reduces Obscurity score):**

- LinkedIn company page with >500 followers
- Nairobi Startup Index listing
- Startup Genome appearance

**Threshold:** `FOOTPRINT_DISQUALIFY = 8` total hits across all databases triggers hard disqualification. This threshold is configurable in `discovery/footprint.py`.

---

## 11. Getting Started

### Prerequisites

- Python 3.11+
- Bun (or Node.js 20+) for the frontend

### Backend quickstart

```bash
# Clone the repository
git clone https://github.com/MarkAndrewKamau/The-Unlisted.git
cd The-Unlisted

# Install dependencies (optional — core pipeline runs on stdlib alone)
pip install -r requirements.txt

# Run the full offline demo
python run.py demo
# → writes output/top50.csv and output/profiles/*.md
# → sample data includes Twiga/Sendy disqualification so you can watch the gate work
```

### Run individual stages

```bash
python run.py seed      --source sample --sector manufacturing
python run.py footprint --sector manufacturing
python run.py score     --sector manufacturing
python run.py profile   --sector manufacturing
python run.py export
python run.py outreach
```

### Enable LLM profile generation (optional)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
python run.py profile --sector manufacturing
# Profiles are now generated by Claude instead of the offline template
```

### Enable SerpAPI for higher-volume footprint checks (optional)

```bash
export SERPAPI_KEY=your_key_here
python run.py footprint --sector ecommerce
# Uses SerpAPI instead of DuckDuckGo; higher rate limits, paid
```

### Run the backend API server

```bash
pip install -r requirements.txt
uvicorn server:app --reload
# API available at http://localhost:8000
# Interactive docs at http://localhost:8000/docs
```

The API seeds itself from the offline sample fixtures on startup (`data/sample_businesses.json`, 20 businesses across 4 sectors) — no external network calls or API keys required to get real data flowing.

### Frontend quickstart

```bash
cd frontend
bun install
bun run dev
# Open http://localhost:5173
```

The frontend calls the backend for every page and every action — no mock data. It defaults to `http://localhost:8000`; point it elsewhere with:

```bash
# In frontend/.env.local
VITE_API_BASE_URL=http://localhost:8000
```

### Adding a new data connector

1. Create `discovery/connectors/<name>.py` subclassing `Connector`
2. Implement `discover()` to yield `SeedRecord(business, [signals])`
3. Register it in `discovery/connectors/__init__.py` under `REGISTRY`
4. Run: `python run.py seed --source <name> --sector <sector>`

---

## 12. API Reference

The FastAPI backend exposes the pipeline results as JSON. Full interactive docs at `/docs` when running locally.

| Endpoint | Method | Description |
| --- | --- | --- |
| `/businesses` | GET | All businesses in the database with scores |
| `/businesses/{id}` | GET | Single business with full signals + footprint |
| `/scores` | GET | All score records; supports `?sector=` and `?top_n=` filters |
| `/top50` | GET | Top 50 by `hc_rank` with full score data |
| `/outreach` | GET | Outreach tracker rows for the top 10 |
| `/pipeline/run` | POST | Trigger a pipeline run (demo mode); returns streaming log |
| `/health` | GET | Health check |

---

## 13. Monetisation Strategy

The Unlisted is positioned at the intersection of impact investment, ecosystem intelligence, and B2B data products. Several revenue streams are viable depending on the stage of development and the target customer.

---

### 13.1 Quarterly Intelligence Subscription (Primary Revenue Stream)

**Target customers:** Impact investors, private equity funds, development finance institutions (DFIs), family offices with emerging-market mandates, grant-making foundations.

**Product:** A quarterly report and database subscription that delivers the updated Top 50 list, full evidence-backed profiles, scoring methodology, and analyst commentary — delivered as a structured data file, a web dashboard, and an optional PDF brief.

**Pricing model (indicative):**

| Tier | Includes | Price / quarter |
| --- | --- | --- |
| Standard | Data export (CSV) + scoring methodology | $500–$2,000 |
| Premium | Dashboard access + full profiles + analyst commentary | $3,000–$8,000 |
| Enterprise | Custom sector filter + API access + white-label | $15,000–$30,000 |

**Why this works:** DFIs like the IFC, British International Investment, FSD Kenya, and Omidyar Network already commission expensive bespoke research for deal sourcing. The Unlisted automates the discovery layer that currently costs $50,000+ per custom research engagement, and makes it repeatable at a fraction of the price.

---

### 13.2 Custom Discovery Runs (Professional Services)

**Target customers:** Sector-focused investors (agri-tech funds, manufacturing PE), development agencies (USAID, GIZ, DFID), banks building SME portfolios (Equity, KCB, Stanbic), and corporates running supplier-diversity programmes.

**Product:** A paid engagement to run the discovery pipeline against a client-specified sector, geography, or business characteristic filter. Delivered as a ranked database, individual profiles, and an optional analyst presentation.

**Pricing model:**

| Engagement | Scope | Price |
| --- | --- | --- |
| One-off sector scan | Single sector, one cycle | $5,000–$20,000 |
| Recurring quarterly scan | Defined scope, 4 cycles/year | $8,000–$25,000 / quarter |
| Pipeline licence + setup | Client's internal team | $30,000–$80,000 one-off + $10,000/year support |

**Why this works:** The pipeline architecture already supports adding new connectors and sector definitions. A custom run for, say, the Kenyan formal textile sector or the Great Rift Valley agri-processing corridor is a configuration change, not a rebuild. The marginal cost of a custom scan is low once the core infrastructure exists.

---

### 13.3 Founder Community & Recognition Programme

**Target customers:** The hidden champion founders themselves — businesses in the Top 50 or Top 100.

**Product:** A "Hidden Champions Kenya" recognition programme. Founders in the list receive a verification badge, a shareable public profile page, and optional access to a peer network of other hidden champions.

**Pricing model:**

| Tier | Access | Price / year |
| --- | --- | --- |
| Free | Public profile + ranking badge | $0 |
| Verified Member | Verified profile + peer network + annual summit | $500–$1,500 |
| Premium Member | All above + investor introductions + press profiling + procurement leads | $2,500–$5,000 |

**Why this works:** Being named a Hidden Champion is a credibility signal for founders who have never been part of the formal ecosystem. Banks, procurement officers, and talent networks take notice. The recognition has real monetary value to the businesses listed — it is a marketing and credibility asset, not just a data point.

---

### 13.4 Investor–Founder Matchmaking

**Target customers:** Impact investors seeking curated deal flow; hidden champion founders open to growth capital or strategic partnership.

**Product:** A facilitated introduction or matchmaking service. When a discovered champion fits a specific investor's mandate, a warm introduction is arranged.

**Pricing model:**

| Service | Who pays | Price |
| --- | --- | --- |
| Introduction fee | Investor | $1,000–$5,000 per introduction |
| Deal-sourcing retainer | Investor | $2,000–$8,000 / month |
| Success fee (investment closes) | Investor | 0.5–2% of deal value |

**Why this works:** The pipeline already produces investor-ready profiles with evidence-backed scores. The gap between "discovery" and "deal introduction" is a single human step — the analyst who reviews the Top 50 and matches profiles to open investor mandates. This service tier monetises the human layer that sits on top of the automated pipeline.

---

### 13.5 API Licensing & White-Label Expansion

**Target customers:** Financial data platforms, news and media organisations covering African business, accelerators and incubators in Kenya and the wider East African region.

**Product:** API access to the scoring engine and candidate database. White-label licencing of the pipeline for partner organisations to run under their own brand in a different geography (Tanzania, Uganda, Rwanda, Ghana, Nigeria).

**Pricing model:**

| Product | Price |
| --- | --- |
| API access | $500–$2,000 / month (volume tiered) |
| White-label licence (new geography) | $20,000–$50,000 one-off + $10,000/year |
| Joint venture (revenue share) | Negotiated per geography |

**Why this works:** The two-axis model and connector architecture are geography-agnostic. The exclusion databases used in Kenya have equivalents in every African country (VC4A is pan-African; Crunchbase is global). Expanding to a new geography requires new connectors and local source research — a 4–8 week build, not a product rebuild.

---

### 13.6 Grant & Institutional Funding

**Target customers:** Development Finance Institutions, philanthropic foundations, pan-African innovation programmes.

**Product:** Research partnerships, co-funding arrangements, and programme grants for ecosystem development work.

**Rationale:** The Unlisted addresses a genuine market failure — capital and expertise are not flowing to the best-performing but least-visible businesses in Kenya. This framing aligns with the mandates of FSD Kenya, the Omidyar Network, the Mastercard Foundation, and GIZ. Grant funding can underwrite infrastructure cost while commercial revenue scales, and can fund human-verification and outreach operations that convert a data product into a founder-support programme.

---

### Revenue model summary

| Stream | Customer type | Revenue type | Year 1 potential |
| --- | --- | --- | --- |
| Quarterly subscription | Investors / DFIs | Recurring | $50K–$200K |
| Custom discovery runs | Funds / Agencies / Banks | Project | $80K–$300K |
| Founder community | Hidden champion founders | Recurring | $20K–$80K |
| Matchmaking | Investors + founders | Transaction | $30K–$100K |
| API / white-label | Platforms / regional partners | Recurring + licence | $40K–$150K |
| Grants | DFIs / foundations | Non-dilutive | $50K–$250K |

---

## 14. Roadmap

### Completed

- [x] Two-axis scoring model (`hc_rank = √(Quality × Obscurity)`)
- [x] Hard exclusion gate against nine common databases
- [x] KAM directory connector (manufacturing fundamentals)
- [x] Public tenders connector (revenue proxy)
- [x] Jumia seller connector (e-commerce, customer signal)
- [x] Live search backend for footprint scoring (DuckDuckGo free / SerpAPI optional)
- [x] SQLite evidence store (append-only signal and footprint tables)
- [x] Claude-powered profile generation (degrades to template without API key)
- [x] Top-10 founder outreach tracker with CRM state persistence
- [x] Full-stack dashboard — pipeline funnel, candidate table, Top 50, profiles, kanban outreach, docs
- [x] FastAPI backend with REST endpoints, backing the dashboard end-to-end (no mock data)
- [x] Render deploy configuration (backend); frontend deploys as a standard Node/Nitro server

### Next quarter

- [ ] WHOIS / Wayback Machine longevity enrichment connector
- [ ] Facebook business pages connector (rating + check-in count)
- [ ] BrighterMonday / Fuzu hiring signal connector
- [ ] Claude Haiku fuzzy dedupe across connectors
- [ ] PostgreSQL persistence for stateful production deploys
- [ ] Webhook-based notifications when a candidate crosses score thresholds
- [ ] Scheduled quarterly run (cron trigger via Render)

### Future

- [ ] Tanzania and Uganda sector expansion (connector + exclusion database config per geography)
- [ ] Investor-mandate matching engine (match Top 50 profiles to open fund theses)
- [ ] Public-facing ranking page (SEO-indexed, founder-shareable)
- [ ] Mobile app for field researchers seeding candidates manually
- [ ] Multi-user analyst workspace with role-based access

---

## 15. Ethics & Compliance

All data collected and processed by The Unlisted pipeline is subject to the following principles, detailed in [docs/06-data-ethics-compliance.md](docs/06-data-ethics-compliance.md):

- **Public sources only.** No data is collected that is not already publicly accessible. No passwords, no scraping behind authentication walls, no purchased data lists.
- **Kenya Data Protection Act 2019 compliance.** Business data (not personal data) is the primary artefact. Where individual names appear (tender award signatories, director names from registries), they are stored only as a signal source reference, not as a subject of profiling.
- **Transparency to subjects.** Businesses in the Top 50 are offered the opportunity to review their profile before publication. Profiles note explicitly what was collected and from where.
- **Opt-out mechanism.** Any business can request removal from the database and from future pipeline runs. Removal is implemented as a blocklist in `store.py` rather than a data deletion, so that re-running the pipeline does not inadvertently re-add the business.
- **No individual scoring.** The pipeline scores businesses, not founders or employees. The outreach tracker records contact history but does not produce a "founder score" or any individual ranking.
- **Append-only evidence log.** Evidence rows are never deleted or overwritten. If a signal is found to be incorrect, it is marked as superseded and a corrected row is added. This prevents silent manipulation of historical scores.

---

## 16. Submission Deliverables

| # | Deliverable | Location |
| --- | --- | --- |
| 1 | Research methodology | [docs/01-methodology.md](docs/01-methodology.md) |
| 2 | Source list | [docs/02-sources.md](docs/02-sources.md) |
| 3 | Exclusion criteria | [docs/03-exclusion-criteria.md](docs/03-exclusion-criteria.md) |
| 4 | Scoring rubric | [docs/04-scoring-rubric.md](docs/04-scoring-rubric.md) |
| 5 | Candidate database | `champions.db` (built by the pipeline) |
| 6 | Top 50 profiles | `output/top50.csv` + `output/profiles/*.md` |
| 7 | Top 10 founder outreach tracker | `output/outreach_tracker.csv` |
| 8 | Interview script | [docs/05-interview-script.md](docs/05-interview-script.md) |
| 9 | Data ethics / compliance note | [docs/06-data-ethics-compliance.md](docs/06-data-ethics-compliance.md) |
| 10 | Quarterly re-run runbook | [docs/07-rerun-runbook.md](docs/07-rerun-runbook.md) |
| 11 | Full-stack dashboard | `frontend/` — TanStack Start, calls the API directly |
| 12 | REST API | `server.py` — deploys to Render |

---

*Built for the Kuzana Hidden Champions bounty — surfacing the exceptional Kenyan businesses the ecosystem has missed, one quarter at a time.*
