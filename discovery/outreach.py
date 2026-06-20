"""Top-10 founder outreach tracker (bonus deliverable).

Generates a CRM-style tracker for the top-ranked finalists so the team can run
and record the "invite into the Kuzana network" outreach. The tracker is
round-trippable: regenerating it preserves any status/notes you've already
entered (matched by business name), so re-running the pipeline next quarter
won't wipe your CRM state.

Columns map to a simple outreach funnel:
    identified -> contacted -> responded -> interviewed -> joined / declined
"""
from __future__ import annotations

import csv
from pathlib import Path

from .store import Store

TRACKER = Path("output") / "outreach_tracker.csv"

COLUMNS = [
    "rank", "business", "sector", "town", "hc_rank",
    "founder", "contact_channel", "contact_handle",
    "status", "first_contacted", "last_touch", "owner", "notes",
]
# Fields the pipeline fills; the rest are human-maintained and preserved.
PIPELINE_FIELDS = {"rank", "business", "sector", "town", "hc_rank"}
DEFAULT_STATUS = "identified"


def _load_existing(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    with path.open(newline="") as f:
        return {row["business"]: row for row in csv.DictReader(f)}


def build(store: Store, top_n: int = 10) -> Path:
    TRACKER.parent.mkdir(parents=True, exist_ok=True)
    existing = _load_existing(TRACKER)
    rows = store.ranked()[:top_n]

    out: list[dict] = []
    for i, b in enumerate(rows, 1):
        prior = existing.get(b["name"], {})
        row = {c: prior.get(c, "") for c in COLUMNS}  # preserve human-entered fields
        row.update({
            "rank": i, "business": b["name"], "sector": b["sector"],
            "town": b["town"] or "", "hc_rank": b["hc_rank"],
        })
        if not row["status"]:
            row["status"] = DEFAULT_STATUS
        out.append(row)

    with TRACKER.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(out)
    return TRACKER
