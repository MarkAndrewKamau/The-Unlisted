"""HTTP API over the discovery pipeline, serving the frontend.

Persists to Postgres (Neon) via DATABASE_URL — no more in-memory/SQLite reset
on process start. Seeds the offline sample fixtures once, on first boot only
(when the businesses table is empty), so a fresh database has something to
show; every subsequent run (seed/footprint/score/etc, via CLI or the
dashboard's "run stage" buttons) persists for real.

The CLI (`run.py`) and `discovery/` remain the source of truth for the
pipeline logic; this module exposes it over HTTP and layers auth, outreach
state, manual review overrides, an activity log, and on-chain provenance on
top (things the CLI has no concept of).
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

load_dotenv()

from discovery import auth
from discovery import footprint as footprint_stage
from discovery import onchain as onchain_stage
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

DATABASE_URL = os.environ["DATABASE_URL"]
store = Store(DATABASE_URL)
last_run_at: str | None = None


def _seed_sample_if_empty() -> None:
    """First-boot bootstrap only: seed+score the offline sample fixtures if the
    database is empty, so a brand-new Neon DB isn't blank. Never touches an
    already-populated database (real pipeline data is never overwritten)."""
    global last_run_at
    from discovery.models import now_iso

    if store.businesses():
        return
    with store.conn.pipeline():  # batch network round-trips to the remote DB
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
                store.commit()  # one round-trip per business, not per row
            score_stage.score_sector(store, sector)  # commits internally
    top10 = store.ranked()[:10]
    store.ensure_outreach_seeded([b["id"] for b in top10])
    outreach_stage.build(store, top_n=10)
    last_run_at = now_iso()
    store.add_activity(f"Bootstrapped empty database with sample fixtures — {len(store.businesses())} candidates seeded", "success")


@app.on_event("startup")
def startup() -> None:
    _seed_sample_if_empty()


def _row_to_dict(row) -> dict:
    return dict(row)


def _dimensions(row) -> list[dict]:
    raw = row.get("dimensions_json")
    return json.loads(raw) if raw else []


def _investability(sigs: dict) -> dict:
    """The verification/fundamentals signals from enrich.py + places.py.

    None = 'not checked / unknown', kept distinct from 0/false, so the UI can
    show an honest 'unknown' state for businesses we couldn't verify."""
    def g(k):
        return sigs[k]["value"] if k in sigs else None

    def b(k):
        v = g(k)
        return None if v is None else bool(v)

    return {
        "has_website": bool(g("has_website")),
        "has_phone": bool(g("has_phone")),
        "contactability": int(g("contactability") or 0),
        "website_live": b("website_live"),
        "https": b("https"),
        "domain_age_years": None if g("domain_age_years") is None else int(g("domain_age_years")),
        "site_last_seen_days": None if g("site_last_seen_days") is None else int(g("site_last_seen_days")),
    }


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


# --- auth --------------------------------------------------------------------
class RegisterBody(BaseModel):
    email: EmailStr
    password: str
    name: str = ""


class LoginBody(BaseModel):
    email: EmailStr
    password: str


def _user_payload(user: dict) -> dict:
    return {"id": user["id"], "email": user["email"], "name": user["name"], "role": user["role"]}


@app.post("/api/auth/register")
def register(body: RegisterBody):
    if len(body.password) < 8:
        raise HTTPException(400, "password must be at least 8 characters")
    user = store.create_user(body.email, auth.hash_password(body.password), body.name)
    if user is None:
        raise HTTPException(409, "an account with that email already exists")
    token = auth.create_token(user["id"], user["email"])
    return {"token": token, "user": _user_payload(user)}


@app.post("/api/auth/login")
def login(body: LoginBody):
    user = store.get_user_by_email(body.email)
    if user is None or not auth.verify_password(body.password, user["password_hash"]):
        raise HTTPException(401, "invalid email or password")
    token = auth.create_token(user["id"], user["email"])
    return {"token": token, "user": _user_payload(user)}


def require_user(authorization: str | None = Header(default=None)) -> dict:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "missing bearer token")
    token = authorization.split(" ", 1)[1]
    try:
        payload = auth.decode_token(token)
    except auth.AuthError as e:
        raise HTTPException(401, str(e))
    user = store.get_user_by_id(int(payload["sub"]))
    if user is None:
        raise HTTPException(401, "user no longer exists")
    return user


@app.get("/api/auth/me")
def me(user: dict = Depends(require_user)):
    return _user_payload(user)


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
    sigs = store.latest_signals(business_id)
    payload["signals"] = {k: v["value"] for k, v in sigs.items()}
    payload["investability"] = _investability(sigs)
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


class DisqualifyBody(BaseModel):
    reason: str


@app.post("/api/candidates/{business_id}/verify")
def verify_candidate(business_id: int, user: dict = Depends(require_user)):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    store.set_override(business_id, verified=1)
    store.add_activity(f"Marked verified: {row['name']} (by {user['email']})", "success")
    return {"status": "ok"}


@app.post("/api/candidates/{business_id}/disqualify")
def disqualify_candidate(business_id: int, body: DisqualifyBody, user: dict = Depends(require_user)):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    store.set_override(business_id, disqualified=1, reason=body.reason)
    store.add_activity(f"Disqualified: {row['name']} ({body.reason}) (by {user['email']})", "disqualify")
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
def update_outreach(business_id: int, body: OutreachPatch, user: dict = Depends(require_user)):
    row = store.by_id(business_id)
    if row is None:
        raise HTTPException(404, "not found")
    store.upsert_outreach(business_id, status=body.status, notes=body.notes)
    if body.status:
        store.add_activity(f"Outreach: {row['name']} -> {body.status} (by {user['email']})", "info")
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


StageName = Literal["seed", "enrich", "places", "footprint", "score", "profile", "export", "outreach"]


class RunStageBody(BaseModel):
    sector: str | None = None
    source: str | None = None


@app.post("/api/pipeline/run/{stage}")
def run_stage(stage: StageName, body: RunStageBody | None = None, user: dict = Depends(require_user)):
    sector = body.sector if body and body.sector and body.sector != "all" else None
    source = (body.source if body and body.source else "sample")
    sectors = [sector] if sector else SECTORS
    lines: list[str] = [f"$ python run.py {stage}" + (f" --sector {sector}" if sector else "")]

    if stage == "seed":
        for s in sectors:
            connector = REGISTRY[source](sector=s)
            n_biz = n_sig = 0
            with store.conn.pipeline():  # batch network round-trips to the remote DB
                for rec in connector.discover():
                    bid = store.upsert_business(rec.business)
                    for sig in rec.signals:
                        sig.business_id = bid
                        store.add_signal(sig)
                        n_sig += 1
                    for fp in getattr(rec, "footprint", []):
                        fp.business_id = bid
                        store.add_footprint(fp)
                    store.commit()  # one round-trip per business, not per row
                n_biz += 1
            lines.append(f"[seed:{source}] {s}: {n_biz} businesses, {n_sig} signals")
    elif stage == "enrich":
        from discovery import enrich as enrich_stage
        for s in sectors:
            n = enrich_stage.enrich(store, s)
            lines.append(f"[enrich] {s}: {n} signals written")
    elif stage == "places":
        from discovery import places as places_stage
        for s in sectors:
            n = places_stage.enrich_places(store, s)
            lines.append(f"[places] {s}: {n} signals written")
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
    msg = f'Pipeline stage "{stage}" completed' + (f" ({sector})" if sector else " (all sectors)") + f" (by {user['email']})"
    store.add_activity(msg, "success")
    return {"stage": stage, "sector": sector or "all", "lines": lines}


# --- Avalanche on-chain provenance -------------------------------------------
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
def onchain_publish(ipfs_cid: str = "", user: dict = Depends(require_user)):
    """Publish the Top-50 root to ChampionRegistry (dry-run if unconfigured)."""
    result = onchain_stage.publish_edition(store, top_n=50, ipfs_cid=ipfs_cid)
    store.add_activity(f"On-chain publish: {result['mode']} (by {user['email']})", "info")
    return result


@app.get("/api/onchain/proof")
def onchain_proof(name: str, sector: str):
    """Merkle proof for one champion, for on-chain/Snowtrace verification."""
    proof = onchain_stage.proof_for(store, name, sector)
    if proof is None:
        return {"error": "champion not found in current Top-50"}
    return proof
