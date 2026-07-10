"""HTTP API over the discovery pipeline, serving the NewUI frontend.

Runs the same `demo` flow as `python run.py demo` once at startup — sample
connector -> footprint -> score -> profile -> outreach, entirely offline —
then serves the results as JSON, plus mutation endpoints for the interactive
parts of the dashboard (running a stage, editing outreach, manual review).

The CLI (`run.py`) and `discovery/` remain the source of truth for the
pipeline logic; this module only exposes it over HTTP and layers small,
explicitly-tracked state on top (manual verify/disqualify, outreach status,
an activity log) that the CLI has no concept of.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from discovery import footprint as footprint_stage
from discovery import outreach as outreach_stage
from discovery import profile as profile_stage
from discovery import score as score_stage
from discovery.connectors import REGISTRY
from discovery.footprint import COMMON_DATABASES, STRONG_EXCLUDERS
from discovery.store import Store

SECTORS = ["manufacturing", "ecommerce", "agriculture", "logistics"]
CYCLE = "2026-Q3"
DOCS_DIR = Path(__file__).parent / "docs"

app = FastAPI(title="The Unlisted — Discovery Engine API")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if allowed_origins == "*" else allowed_origins.split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

store = Store(":memory:")
last_run_at: str | None = None


def _run_demo() -> None:
    global last_run_at
    from discovery.models import now_iso

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
    top10 = store.ranked()[:10]
    store.ensure_outreach_seeded([b["id"] for b in top10])
    outreach_stage.build(store, top_n=10)
    last_run_at = now_iso()
    store.add_activity(f"Pipeline demo run complete — {len(store.businesses())} candidates seeded", "success")


@app.on_event("startup")
def startup() -> None:
    _run_demo()


def _row_to_dict(row) -> dict:
    return {k: row[k] for k in row.keys()}


def _dimensions(row) -> list[dict]:
    raw = row["dimensions_json"] if "dimensions_json" in row.keys() else None
    return json.loads(raw) if raw else []


def _business_payload(row, override=None) -> dict:
    d = _row_to_dict(row)
    dims = _dimensions(row)
    d.pop("dimensions_json", None)
    d["dimensions"] = dims
    manual_dq = bool(override["disqualified"]) if override else False
    d["disqualified"] = bool(d.get("disqualified")) or manual_dq
    if manual_dq and override["reason"]:
        d["reason"] = override["reason"]
    d["verified"] = bool(override["verified"]) if override else False
    d["manually_disqualified"] = manual_dq
    return d


def _footprint_table(business_id: int) -> list[dict]:
    hits = {r["source"]: r["hits"] for r in store.footprint_sources(business_id)}
    return [
        {
            "database": domain,
            "label": label,
            "hit": hits.get(domain, 0) > 0,
            "hits": hits.get(domain, 0),
            "strong_excluder": domain in STRONG_EXCLUDERS,
        }
        for domain, label in COMMON_DATABASES.items()
    ]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/pipeline/stats")
def pipeline_stats():
    all_rows = store.businesses()
    ranked = store.ranked(include_disqualified=True)
    disqualified = [r for r in ranked if r["disqualified"]]
    scored = [r for r in ranked if not r["disqualified"]]
    by_sector = {}
    for s in SECTORS:
        sector_rows = store.ranked(sector=s, include_disqualified=True)
        by_sector[s] = {
            "seeded": len(store.businesses(s)),
            "scored": len([r for r in sector_rows if not r["disqualified"]]),
            "disqualified": len([r for r in sector_rows if r["disqualified"]]),
        }
    return {
        "seeded": len(all_rows),
        "scored": len(scored),
        "disqualified": len(disqualified),
        "top50": min(50, len(scored)),
        "cycle": CYCLE,
        "last_run": last_run_at,
        "by_sector": by_sector,
    }


@app.get("/api/candidates")
def candidates(sector: str | None = None, status: str | None = None, search: str | None = None):
    rows = store.ranked(sector=sector, include_disqualified=True)
    overrides = store.overrides()
    out = []
    for r in rows:
        payload = _business_payload(r, overrides.get(r["id"]))
        if search and search.lower() not in payload["name"].lower():
            continue
        computed_status = "disqualified" if payload["disqualified"] else "active"
        if status and status != computed_status:
            continue
        payload["status"] = computed_status
        out.append(payload)
    return out


@app.get("/api/candidates/{business_id}")
def candidate_detail(business_id: int):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    override = store.get_override(business_id)
    payload = _business_payload(row, override)
    payload["signals"] = {k: v["value"] for k, v in store.latest_signals(business_id).items()}
    payload["footprint"] = _footprint_table(business_id)
    outreach = store.get_outreach(business_id)
    payload["outreach"] = _row_to_dict(outreach) if outreach else None
    return payload


@app.get("/api/candidates/{business_id}/profile")
def candidate_profile(business_id: int):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    return {"markdown": profile_stage.render_profile(store, row)}


class VerifyBody(BaseModel):
    pass


class DisqualifyBody(BaseModel):
    reason: str


@app.post("/api/candidates/{business_id}/verify")
def verify_candidate(business_id: int):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    store.set_override(business_id, verified=1)
    store.add_activity(f"Marked verified: {row['name']}", "success")
    return {"status": "ok"}


@app.post("/api/candidates/{business_id}/disqualify")
def disqualify_candidate(business_id: int, body: DisqualifyBody):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    store.set_override(business_id, disqualified=1, reason=body.reason)
    store.add_activity(f"Disqualified: {row['name']} ({body.reason})", "disqualify")
    return {"status": "ok"}


@app.get("/api/top50")
def top50(n: int = 50):
    rows = store.ranked(include_disqualified=False)[:n]
    overrides = store.overrides()
    return [_business_payload(r, overrides.get(r["id"])) for r in rows]


@app.get("/api/outreach")
def outreach():
    rows = store.list_outreach()
    overrides = store.overrides()
    out = []
    for o in rows:
        biz = store.by_id(o["business_id"])
        if biz is None:
            continue
        payload = _business_payload(biz, overrides.get(biz["id"]))
        payload["outreach"] = _row_to_dict(o)
        payload["founder"] = None  # no founder data collected — needs research
        out.append(payload)
    out.sort(key=lambda p: p["hc_rank"] or 0, reverse=True)
    return out


class OutreachPatch(BaseModel):
    status: str | None = None
    notes: str | None = None


@app.patch("/api/outreach/{business_id}")
def update_outreach(business_id: int, body: OutreachPatch):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    store.upsert_outreach(business_id, status=body.status, notes=body.notes)
    if body.status:
        store.add_activity(f"Outreach: {row['name']} -> {body.status}", "info")
    return _row_to_dict(store.get_outreach(business_id))


@app.get("/api/activity")
def activity(limit: int = 50):
    return [_row_to_dict(r) for r in store.list_activity(limit)]


@app.get("/api/docs")
def docs_list():
    out = []
    for f in sorted(DOCS_DIR.glob("*.md")):
        slug = f.stem
        number = slug.split("-", 1)[0]
        body = f.read_text()
        title = body.splitlines()[0].lstrip("# ").strip() if body else slug
        out.append({"slug": slug, "number": number, "title": title})
    return out


@app.get("/api/docs/{slug}")
def doc_detail(slug: str):
    f = DOCS_DIR / f"{slug}.md"
    if not f.exists():
        raise HTTPException(404, "not found")
    body = f.read_text()
    number = slug.split("-", 1)[0]
    title = body.splitlines()[0].lstrip("# ").strip() if body else slug
    return {"slug": slug, "number": number, "title": title, "body": body}


StageName = Literal["seed", "footprint", "score", "profile", "export", "outreach"]


class RunStageBody(BaseModel):
    sector: str | None = None


@app.post("/api/pipeline/run/{stage}")
def run_stage(stage: StageName, body: RunStageBody | None = None):
    sector = body.sector if body and body.sector and body.sector != "all" else None
    sectors = [sector] if sector else SECTORS
    lines: list[str] = [f"$ python run.py {stage}" + (f" --sector {sector}" if sector else "")]

    if stage == "seed":
        for s in sectors:
            connector = REGISTRY["sample"](sector=s)
            n_biz = n_sig = 0
            for rec in connector.discover():
                bid = store.upsert_business(rec.business)
                for sig in rec.signals:
                    sig.business_id = bid
                    store.add_signal(sig)
                    n_sig += 1
                for fp in getattr(rec, "footprint", []):
                    fp.business_id = bid
                    store.add_footprint(fp)
                n_biz += 1
            lines.append(f"[seed:sample] {s}: {n_biz} businesses, {n_sig} signals")
    elif stage == "footprint":
        for s in sectors:
            n = footprint_stage.collect(store, s)
            lines.append(f"[footprint] {s}: wrote {n} common-database presence rows")
    elif stage == "score":
        for s in sectors:
            results = score_stage.score_sector(store, s)
            kept = [r for r in results if not r.disqualified]
            lines.append(f"[score] {s}: {len(results)} scored, {len(results) - len(kept)} disqualified")
    elif stage == "profile":
        for s in sectors:
            n = profile_stage.generate(store, s, top_n=50)
            lines.append(f"[profile] {s}: generated {n} profiles")
    elif stage == "export":
        rows = store.ranked()[:50]
        lines.append(f"[export] {len(rows)} rows ready (output/top50.csv on CLI)")
    elif stage == "outreach":
        top10 = store.ranked()[:10]
        store.ensure_outreach_seeded([b["id"] for b in top10])
        outreach_stage.build(store, top_n=10)
        lines.append(f"[outreach] top-{len(top10)} founder tracker refreshed")

    lines.append("done.")
    msg = f'Pipeline stage "{stage}" completed' + (f" ({sector})" if sector else " (all sectors)")
    store.add_activity(msg, "success")
    return {"stage": stage, "sector": sector or "all", "lines": lines}


@app.post("/api/pipeline/rerun")
def rerun():
    global store
    store.close()
    store = Store(":memory:")
    _run_demo()
    return {"status": "ok"}
