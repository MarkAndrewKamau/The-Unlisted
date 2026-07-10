#!/usr/bin/env python3
"""Kuzana Hidden Champions — pipeline orchestrator.

Stages (run individually or all at once via `demo`):

    seed       pull candidates + raw signals from a connector into the DB
    footprint  measure ecosystem visibility (Obscurity axis)
    score      compute Quality, Obscurity, hc_rank; apply disqualification gate
    profile    write a markdown profile per finalist
    export     write output/top50.csv and output/profiles/*.md
    outreach   write output/outreach_tracker.csv for the top-10 founders
    demo       seed(sample) -> score -> profile -> export -> outreach, offline

Examples
--------
    python run.py demo
    python run.py seed --source jumia --sector ecommerce
    python run.py footprint --sector ecommerce
    python run.py score --sector ecommerce && python run.py export
"""
from __future__ import annotations

import argparse
import csv
from pathlib import Path

from discovery import enrich as enrich_stage
from discovery import footprint as footprint_stage
from discovery import outreach as outreach_stage
from discovery import profile as profile_stage
from discovery import score as score_stage
from discovery.connectors import REGISTRY
from discovery.store import Store

SECTORS = ["manufacturing", "ecommerce", "agriculture", "logistics"]
OUTPUT = Path("output")


def stage_seed(store: Store, source: str, sector: str) -> None:
    if source not in REGISTRY:
        raise SystemExit(f"unknown source '{source}'. options: {', '.join(REGISTRY)}")
    connector = REGISTRY[source](sector=sector)
    n_biz = n_sig = 0
    with store.conn.pipeline():  # batch network round-trips to the remote DB
        for rec in connector.discover():
            bid = store.upsert_business(rec.business)
            for sig in rec.signals:
                sig.business_id = bid
                store.add_signal(sig)
                n_sig += 1
            # sample connector also carries seeded footprint
            for fp in getattr(rec, "footprint", []):
                fp.business_id = bid
                store.add_footprint(fp)
            store.commit()  # one round-trip per business, not per row
            n_biz += 1
    print(f"[seed:{source}] {n_biz} businesses, {n_sig} signals into the database")


def stage_enrich(store: Store, sector: str) -> None:
    enrich_stage.enrich(store, sector)


def stage_places(store: Store, sector: str) -> None:
    from discovery import places as places_stage
    places_stage.enrich_places(store, sector)


def stage_footprint(store: Store, sector: str) -> None:
    n = footprint_stage.collect(store, sector)
    print(f"[footprint] wrote {n} common-database presence rows for sector '{sector}'. "
          f"(Set SERPAPI_API_KEY for higher-fidelity counts; SEARCH_BACKEND=stub to skip.)")


def stage_score(store: Store, sector: str) -> None:
    results = score_stage.score_sector(store, sector)
    kept = [r for r in results if not r.disqualified]
    print(f"[score] {len(results)} scored, {len(results) - len(kept)} disqualified "
          f"by footprint gate, {len(kept)} ranked.")


def stage_profile(store: Store, sector: str, top_n: int) -> None:
    n = profile_stage.generate(store, sector, top_n)
    print(f"[profile] generated {n} profiles for sector '{sector}'.")


def stage_export(store: Store, top_n: int) -> None:
    OUTPUT.mkdir(exist_ok=True)
    (OUTPUT / "profiles").mkdir(exist_ok=True)
    rows = store.ranked()[:top_n]
    csv_path = OUTPUT / "top50.csv"
    with csv_path.open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["rank", "name", "sector", "town", "hc_rank", "quality", "obscurity", "since"])
        for i, b in enumerate(rows, 1):
            w.writerow([i, b["name"], b["sector"], b["town"], b["hc_rank"],
                        b["quality"], b["obscurity"], b["registry_year"] or ""])
    for b in rows:
        prof = store.conn.execute(
            "SELECT markdown FROM profile WHERE business_id=%s", (b["id"],)
        ).fetchone()
        if prof:
            slug = "".join(c if c.isalnum() else "-" for c in b["name"].lower()).strip("-")
            (OUTPUT / "profiles" / f"{slug}.md").write_text(prof["markdown"])
    print(f"[export] {csv_path} + {len(rows)} profiles in {OUTPUT/'profiles'}")
    _print_leaderboard(rows)


def stage_outreach(store: Store, top_n: int = 10) -> None:
    path = outreach_stage.build(store, top_n)
    print(f"[outreach] top-{top_n} founder tracker at {path} "
          f"(human-entered status/notes are preserved on re-run)")


def _print_leaderboard(rows) -> None:
    print("\n  rank  hc    Q     O     business")
    print("  " + "-" * 52)
    for i, b in enumerate(rows, 1):
        print(f"  {i:>3}  {b['hc_rank']:>5} {b['quality']:>5} {b['obscurity']:>5}  "
              f"{b['name']} ({b['sector']})")


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("stage", choices=["seed", "footprint", "score", "profile",
                                      "export", "outreach", "demo"])
    p.add_argument("--db", default="champions.db")
    p.add_argument("--source", default="sample", help="connector for seed stage")
    p.add_argument("--sector", default=None, help="restrict to one sector")
    p.add_argument("--top", type=int, default=50)
    args = p.parse_args()

    store = Store(args.db)
    sectors = [args.sector] if args.sector else SECTORS
    try:
        if args.stage == "seed":
            for s in sectors:
                stage_seed(store, args.source, s)
        elif args.stage == "footprint":
            for s in sectors:
                stage_footprint(store, s)
        elif args.stage == "score":
            for s in sectors:
                stage_score(store, s)
        elif args.stage == "profile":
            for s in sectors:
                stage_profile(store, s, args.top)
        elif args.stage == "export":
            stage_export(store, args.top)
        elif args.stage == "outreach":
            stage_outreach(store)
        elif args.stage == "demo":
            for s in sectors:
                stage_seed(store, "sample", s)
                stage_score(store, s)
                stage_profile(store, s, args.top)
            stage_export(store, args.top)
            stage_outreach(store)
    finally:
        store.close()


if __name__ == "__main__":
    main()
