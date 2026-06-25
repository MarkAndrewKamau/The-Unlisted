"""Minimal HTTP API over the discovery pipeline, for deploying the backend
as a web service (e.g. Render) alongside the frontend (e.g. Vercel).

Runs the same `demo` flow as `python run.py demo` once at startup — sample
connector -> score -> outreach — entirely offline, then serves the results
as JSON. The CLI (`run.py`) remains the source of truth for the pipeline
logic; this just exposes it over HTTP.
"""
from __future__ import annotations

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from discovery import footprint as footprint_stage
from discovery import onchain as onchain_stage
from discovery import outreach as outreach_stage
from discovery import score as score_stage
from discovery.connectors import REGISTRY
from discovery.store import Store

SECTORS = ["manufacturing", "ecommerce"]

app = FastAPI(title="The Unlisted — Discovery Engine API")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allowed_origins == "*" else allowed_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = os.getenv("DB_PATH", "champions.db")

store = Store(":memory:")
serving_real = False   # True when we loaded a real CLI-produced database


def _run_demo() -> None:
    for sector in SECTORS:
        connector = REGISTRY["sample"](sector=sector)
        for rec in connector.discover():
            bid = store.upsert_business(rec.business)
            for sig in rec.signals:
                sig.business_id = bid
                store.add_signal(sig)
            for fp in getattr(rec, "footprint", []):
                fp.business_id = bid
                store.add_footprint(fp)
        score_stage.score_sector(store, sector)
    outreach_stage.build(store, top_n=10)


def _init_store() -> None:
    """Serve the real CLI-produced database if present and populated; otherwise
    fall back to the in-memory sample demo so the API always returns something."""
    global store, serving_real
    if os.path.exists(DB_PATH):
        candidate = Store(DB_PATH)
        if candidate.businesses():
            store = candidate
            serving_real = True
            print(f"[server] serving REAL data from {DB_PATH} "
                  f"({len(candidate.businesses())} businesses)")
            return
        candidate.close()
    store = Store(":memory:")
    serving_real = False
    _run_demo()
    print("[server] no populated DB found — serving sample demo data")


@app.on_event("startup")
def startup() -> None:
    _init_store()


def _row_to_dict(row) -> dict:
    return {k: row[k] for k in row.keys()}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/meta")
def meta():
    """Tells the UI whether it's looking at real CLI data or the sample demo."""
    return {"serving_real": serving_real, "db_path": DB_PATH if serving_real else None}


@app.get("/api/pipeline/stats")
def pipeline_stats():
    all_rows = store.businesses()
    ranked = store.ranked(include_disqualified=True)
    disqualified = [r for r in ranked if r["disqualified"]]
    scored = [r for r in ranked if not r["disqualified"]]
    return {
        "serving_real": serving_real,
        "seeded": len(all_rows),
        "scored": len(scored),
        "disqualified": len(disqualified),
        "top50": min(50, len(scored)),
    }


def _slug(name: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")


_SIGNAL_FIELDS = ["longevity_years", "rating", "review_count", "last_activity_days",
                  "locations", "job_postings", "tenders_won", "certified", "association_member"]


def _investability(sigs: dict) -> dict:
    """The verification/fundamentals signals from enrich.py + places.py.

    None = 'not checked / unknown' (kept distinct from 0/false) so the UI can show
    honest 'unknown' states for businesses we couldn't verify."""
    def g(k):
        return sigs[k]["value"] if k in sigs else None
    def b(k):
        v = g(k)
        return None if v is None else bool(v)
    return {
        "hasWebsite": bool(g("has_website")),
        "hasPhone": bool(g("has_phone")),
        "contactability": int(g("contactability") or 0),
        "websiteLive": b("website_live"),
        "https": b("https"),
        "domainAgeYears": None if g("domain_age_years") is None else int(g("domain_age_years")),
        "siteLastSeenDays": None if g("site_last_seen_days") is None else int(g("site_last_seen_days")),
    }


def _rich_business(row) -> dict:
    """Assemble a ranked row into the shape the frontend `Business` type expects."""
    from discovery import score as score_stage
    from discovery.footprint import COMMON_DATABASES

    bid = row["id"]
    sigs = store.latest_signals(bid)
    signals = {k: (sigs[k]["value"] if k in sigs else 0) for k in _SIGNAL_FIELDS}
    fp = [{"source": f["source"], "label": COMMON_DATABASES.get(f["source"], f["source"]),
           "hits": f["hits"]} for f in store.footprint_sources(bid) if f["hits"]]
    breakdown, contributions = score_stage.dimension_breakdown(sigs)
    return {
        "investability": _investability(sigs),
        "id": bid, "slug": _slug(row["name"]), "name": row["name"], "sector": row["sector"],
        "town": row["town"] or "", "website": row["website"] or "",
        "source": row["source"] or "", "registry_year": row["registry_year"] or 0,
        "signals": signals, "footprint": fp,
        "totalFootprintHits": store.total_footprint(bid),
        "quality": row["quality"], "qualityBreakdown": breakdown,
        "qualityContributions": contributions,
        "obscurity": row["obscurity"], "hc_rank": row["hc_rank"],
        "disqualified": bool(row["disqualified"]),
        "disqualifyReason": row["reason"] or "",
        "status": "disqualified" if row["disqualified"] else "active",
    }


@app.get("/api/businesses")
def businesses_rich(sector: str | None = None):
    """Full business objects (signals, footprint, score breakdown) for the UI."""
    rows = store.ranked(sector=sector, include_disqualified=True)
    return [_rich_business(r) for r in rows]


@app.get("/api/candidates")
def candidates(sector: str | None = None):
    rows = store.ranked(sector=sector, include_disqualified=True)
    return [_row_to_dict(r) for r in rows]


@app.get("/api/top50")
def top50(n: int = 50):
    rows = store.ranked(include_disqualified=False)[:n]
    return [_row_to_dict(r) for r in rows]


@app.get("/api/outreach")
def outreach():
    """Real top-10 as outreach records. Fields are empty/'identified' until a
    human logs genuine outreach — we never fabricate founders or conversations."""
    rows = store.ranked(include_disqualified=False)[:10]
    return [{
        "businessSlug": _slug(r["name"]), "founder": "", "contactChannel": "",
        "contactHandle": "", "status": "identified", "firstContacted": None,
        "lastTouch": None, "owner": "", "notes": "",
    } for r in rows]


@app.post("/api/pipeline/rerun")
def rerun():
    """Reload the store: re-reads the real DB if present, else rebuilds the demo."""
    try:
        store.close()
    except Exception:
        pass
    _init_store()
    return {"status": "ok", "serving_real": serving_real}


# --- Avalanche on-chain provenance ------------------------------------------
@app.get("/api/onchain/status")
def onchain_status():
    """Config + the current Top-50 Merkle root (dry-run, no tx sent).

    'configured' needs only the public REGISTRY_ADDRESS — the read-only badge
    must never require the signing key, so a deployed backend never holds it."""
    configured = bool(os.getenv("REGISTRY_ADDRESS"))
    tree, records = onchain_stage.champions_merkle(store, top_n=50)
    return {
        "configured": configured,
        "network": "avalanche-fuji",
        "chain_id": onchain_stage.FUJI_CHAIN_ID,
        "registry_address": os.getenv("REGISTRY_ADDRESS", ""),
        "current_root": "0x" + tree.root.hex(),
        "champion_count": len(records),
    }


@app.post("/api/onchain/publish")
def onchain_publish(ipfs_cid: str = ""):
    """Publish the Top-50 root to ChampionRegistry (dry-run if unconfigured)."""
    return onchain_stage.publish_edition(store, top_n=50, ipfs_cid=ipfs_cid)


@app.get("/api/onchain/proof")
def onchain_proof(name: str, sector: str):
    """Merkle proof for one champion, for on-chain/Snowtrace verification."""
    proof = onchain_stage.proof_for(store, name, sector)
    if proof is None:
        return {"error": "champion not found in current Top-50"}
    return proof
