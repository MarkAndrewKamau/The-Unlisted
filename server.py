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

store = Store(":memory:")


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


@app.on_event("startup")
def startup() -> None:
    _run_demo()


def _row_to_dict(row) -> dict:
    return {k: row[k] for k in row.keys()}


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/pipeline/stats")
def pipeline_stats():
    all_rows = store.businesses()
    ranked = store.ranked(include_disqualified=True)
    disqualified = [r for r in ranked if r["disqualified"]]
    scored = [r for r in ranked if not r["disqualified"]]
    return {
        "seeded": len(all_rows),
        "scored": len(scored),
        "disqualified": len(disqualified),
        "top50": min(50, len(scored)),
    }


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
    rows = store.ranked(include_disqualified=False)[:10]
    return [_row_to_dict(r) for r in rows]


@app.post("/api/pipeline/rerun")
def rerun():
    global store
    store.close()
    store = Store(":memory:")
    _run_demo()
    return {"status": "ok"}
