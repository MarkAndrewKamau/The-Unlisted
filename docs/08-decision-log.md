# Decision Log & Progress (ADR-lite)

A running record of the key decisions, why we made them, and current status.
Newest decisions are appended at the bottom.

## Status snapshot

| Area | State |
|---|---|
| Discovery (origination) | ✅ Real OSM/Overpass connector, all sectors |
| Exclusion gate (obscurity) | ✅ Wikipedia primary + DDG enrichment, idempotent |
| Two-axis scoring | ✅ Quality × Obscurity, hard gate |
| Investability layer (pre-screen + evidence) | ✅ enrich (Wayback/HTTP) + Google Places, surfaced in UI |
| Backend API (FastAPI) | ✅ deployed on Render |
| Frontend (React) | ✅ deployed on Render, live data + honest LIVE/DEMO badge |
| On-chain provenance (Avalanche) | ✅ contract live on Fuji, root published + verified |
| Profiles / Top-50 / outreach tracker | ✅ generated |
| Real founder outreach | ⏳ pending (Phase 4) |
| Submission hardening | ⏳ pending (Phase 5) |

Out of scope by design (the DD handoff): financials, legal/registration, ESG/AML, post-investment monitoring.

---

## ADR-001 — Free-first data sources
**Context:** the method must be replicable at near-zero cost and not depend on a vendor.
**Decision:** build on free/public sources (OpenStreetMap, Wikipedia, DuckDuckGo, Wayback); allow a single optional paid key (Places free tier) only for the strongest signal.
**Consequence:** free public endpoints rate-limit bulk automated requests — a trade-off, not a bug. Mitigated with caching, back-off, circuit-breakers, and a one-line paid upgrade path.

## ADR-002 — OSM/Overpass as the primary discovery source
**Context:** marketplace scraping (Jumia) returns products/resellers behind a JS SPA — the wrong businesses; sector directories were JS-rendered or 404'd.
**Decision:** use OpenStreetMap via the Overpass API as the candidate backbone; map each sector to OSM tags.
**Consequence:** real, located businesses across every sector, free and replicable. Limitation: thin per-business data (often no website) — addressed by the investability layer.

## ADR-003 — Wikipedia as the primary obscurity signal
**Context:** DuckDuckGo hard-throttles datacenter IPs, making the search-based gate unreliable at scale.
**Decision:** make Wikipedia presence (own article = already known) the reliable primary exclusion signal; keep DDG common-database checks as best-effort enrichment behind a circuit-breaker.
**Consequence:** the gate is dependable from any host; a title-match guard avoids false exclusions. Failed lookups are flagged, never silently treated as "obscure".

## ADR-004 — Two-axis scoring with a hard exclusion gate
**Context:** the bounty's core pitfall is surfacing companies the ecosystem already knows.
**Decision:** rank by geometric mean of Quality and Obscurity; hard-disqualify anything in a strong common database (Wikipedia/Crunchbase/Briter/VC4A/The Big Deal) or over a footprint threshold.
**Consequence:** a business must be both excellent and unknown to rank. Obscurity is a measured, first-class metric, not an afterthought.

## ADR-005 — On-chain provenance on Avalanche (Fuji)
**Context:** a discovery list is only useful if people trust it wasn't cherry-picked or backfilled.
**Decision:** hash the published Top-50 into a Merkle root and anchor it in a smart contract on Avalanche Fuji; surface a "Verified on Avalanche" badge linking to Snowtrace.
**Consequence:** anyone can recompute the root and verify the list is untouched since publication. Integrity/provenance only — not a quality guarantee. Testnet (demonstration).

## ADR-006 — Investability layer to deepen pre-screening + evidence (B & C)
**Context:** pure discovery has limited value; investors weigh fundamentals before funding.
**Decision:** add an `enrich` stage (Wayback longevity, website-live, contactability — free) and a `places` stage (Google Places free tier: rating × review count × recency); store every signal with source + timestamp; surface an "Investor signals" panel.
**Consequence:** Quality reflects real fundamentals, and each business carries an auditable, investor-ready dossier. Honest limits: web signals need a website; reviews are rich for consumer sectors, sparse for hidden B2B; financials/legal remain the DD handoff.

## ADR-007 — Honest positioning: top-of-funnel, not a DD replacement
**Context:** overclaiming (replacing due diligence) would be caught by any serious investor/DFI.
**Decision:** position the product as origination + triage + an auditable starting dossier; explicitly hand off financial/legal/ESG diligence and monitoring.
**Consequence:** credibility. We compress the first ~30% of the investor funnel and stop cleanly at the DD line.
