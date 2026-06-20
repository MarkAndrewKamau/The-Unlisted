# Source List

Every source is **free / publicly accessible**. Columns: what it gives us, which
signals it feeds, connector status, and notes on access.

Legend — Status: ✅ built · 🔌 logic written, needs live tuning · 📋 planned.

## Discovery sources (where candidates come from)

| Source | Sector | Signals it feeds | Status | Access notes |
|---|---|---|---|---|
| **Jumia Kenya** seller pages | e-commerce | rating, review_count, longevity (tenure) | 🔌 `jumia.py` | Public product/seller pages; rate-limited polite scrape |
| **Kilimall** seller pages | e-commerce | rating, review_count | 📋 | Same pattern as Jumia |
| **KAM** member directory | manufacturing | association_member, certified, locations | 🔌 `kam.py` | Public, paginated; vetted membership |
| **Public tenders** (tenders.go.ke / PPIP) | all | tenders_won (revenue proxy) | 🔌 `tenders.py` | Awarded-tender notices, supplier names |
| **Google Maps / OSM** | all | rating, review_count, recency, locations | 📋 | OSM via Overpass (free); Maps via scrape budget |
| **Facebook Pages** | retail/food | rating, post recency, longevity | 📋 | Many KE SMEs are FB-only — itself an obscurity signal |
| **BRS / eCitizen** registry | all | registry_year (longevity) | 📋 | Per-name lookup; incorporation date |
| **WHOIS + Wayback** | businesses w/ sites | longevity (domain/first-capture age) | 📋 | Free; good cross-check on claimed age |
| **BrighterMonday / Fuzu** | all | job_postings (growth/hiring) | 📋 | Active listings = hiring = growth |
| **KEBS certified-firms list** | manufacturing | certified | 📋 | Standards mark = quality validation |
| **Sector boards** (Tea/Coffee/Dairy, Pharmacy & Poisons, TRA) | sector-specific | licensed/registered status | 📋 | Licensed-operator registers |
| **Physical-market & county directories** | regional/informal | existence, locality | 📋 | Reaches businesses with zero web presence |

## Exclusion sources (the "common databases" we check against)

Defined in code as `COMMON_DATABASES` in `discovery/footprint.py`.

| Database | Role | Strong excluder? |
|---|---|---|
| Crunchbase | funding profiles | **Yes** |
| Briter Bridges | Africa startup intelligence | **Yes** |
| VC4A | venture database | **Yes** |
| The Big Deal | African funding tracker | **Yes** |
| Disrupt Africa | startup DB + news | No (penalty) |
| TechCabal | ecosystem press | No (penalty) |
| Techpoint Africa | ecosystem press | No (penalty) |
| Business Daily (startup desk) | press | No (penalty) |
| LinkedIn | company-page following at scale | No (penalty) |

See [03-exclusion-criteria](03-exclusion-criteria.md) for how presence is scored.

## Adding a source

Connectors are pluggable — see the "Adding a data source" section of the root
[README](../README.md). The bar for a new discovery source: it must be public,
re-fetchable, and emit at least one signal in the [rubric](04-scoring-rubric.md).
