"""The two-axis scoring model.

Quality  : strength of fundamentals from public signals (0..100)
Obscurity: inverse of ecosystem footprint (0..100)
hc_rank  : geometric mean of the two, so a business must be BOTH excellent AND
           unknown to rank high. A hard gate disqualifies anything too visible.

Quality is built from weighted dimensions. Each dimension is reduced to a raw
number per business, then min-max normalised *within the sector cohort* (you
can only compare a dairy to other dairies, not to a software seller), then
weighted and summed.
"""
from __future__ import annotations

import math

from .models import Score, Sig, now_iso
from .store import Store

# Quality dimension -> (weight, function from latest-signals dict -> raw value).
# Weights sum to 1.0. Tune these as the scoring model matures.
WEIGHTS = {
    "longevity": 0.20,
    "customer": 0.30,
    "consistency": 0.15,
    "growth": 0.15,
    "revenue": 0.10,
    "validation": 0.10,
}


def _g(sig: dict, key: str, default: float = 0.0) -> float:
    row = sig.get(key)
    return float(row["value"]) if row else default


def _raw_dimensions(sig: dict) -> dict[str, float]:
    """Collapse a business's signals into one raw number per Quality dimension."""
    rating = _g(sig, Sig.RATING)            # 0..5
    reviews = _g(sig, Sig.REVIEW_COUNT)
    last_days = _g(sig, Sig.LAST_ACTIVITY_DAYS, default=365)
    return {
        "longevity": _g(sig, Sig.LONGEVITY_YEARS),
        # satisfaction weighted by how many customers it's proven across
        "customer": (rating / 5.0) * math.log1p(reviews),
        # fresher activity => higher; invert days-since-last-activity
        "consistency": 1.0 / (1.0 + last_days / 30.0),
        "growth": _g(sig, Sig.LOCATIONS) + _g(sig, Sig.JOB_POSTINGS),
        "revenue": _g(sig, Sig.TENDERS_WON) + _g(sig, Sig.LOCATIONS),
        "validation": max(_g(sig, Sig.CERTIFIED), _g(sig, Sig.ASSOCIATION_MEMBER)),
    }


def _normalize(values: list[float]) -> list[float]:
    """Min-max to 0..1. Constant column -> all 0.5 (no information)."""
    lo, hi = min(values), max(values)
    if hi - lo < 1e-9:
        return [0.5 for _ in values]
    return [(v - lo) / (hi - lo) for v in values]


# --- Obscurity / disqualification gate --------------------------------------
FOOTPRINT_DISQUALIFY = 8     # total press/funding hits above this => excluded
OBSCURITY_K = 2.0            # softness of the obscurity decay


def _obscurity(total_hits: int) -> float:
    """Map footprint hits -> 0..100. 0 hits = 100 (invisible), decays fast."""
    return 100.0 / (1.0 + total_hits / OBSCURITY_K)


def score_sector(store: Store, sector: str) -> list[Score]:
    rows = store.businesses(sector)
    if not rows:
        return []

    # 1) raw dimensions per business
    raws: list[dict[str, float]] = []
    for b in rows:
        raws.append(_raw_dimensions(store.latest_signals(b["id"])))

    # 2) normalise each dimension across the cohort
    normed = {dim: _normalize([r[dim] for r in raws]) for dim in WEIGHTS}

    # 3) combine
    results: list[Score] = []
    for i, b in enumerate(rows):
        quality = 100.0 * sum(WEIGHTS[dim] * normed[dim][i] for dim in WEIGHTS)
        hits = store.total_footprint(b["id"])
        obscurity = _obscurity(hits)

        disq, reason = 0, ""
        if hits > FOOTPRINT_DISQUALIFY:
            disq, reason = 1, f"ecosystem footprint too high ({hits} hits)"

        hc = 0.0 if disq else math.sqrt(max(quality, 0) * max(obscurity, 0))
        s = Score(business_id=b["id"], quality=round(quality, 1),
                  obscurity=round(obscurity, 1), hc_rank=round(hc, 1),
                  disqualified=disq, reason=reason, computed_at=now_iso())
        store.put_score(s)
        results.append(s)
    return results
