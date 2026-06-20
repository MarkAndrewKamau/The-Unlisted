"""Ecosystem-footprint / exclusion stage — the engine behind the Obscurity axis.

The bounty asks for the Top 50 businesses **not found in the common databases**
the startup ecosystem already watches. So this stage checks each candidate
against an explicit, named list of those databases and records any presence.
That presence feeds the Obscurity score and a hard disqualification gate: a
business that turns up in a common database is, by definition, not hidden.

COMMON_DATABASES is the auditable definition of "already known". Everything here
is free/cheap: site-scoped search-hit counts and public profile lookups.

`search_hits` is pluggable. Without a backend it returns 0 — meaning "not found",
so live runs degrade safely to treating candidates as hidden until a search
source is wired. The sample connector seeds presence directly for demos.
"""
from __future__ import annotations

from typing import Callable

from .models import Footprint
from .search import SearchError, get_backend
from .store import Store

# The explicit definition of "already known". Each entry is a database/outlet the
# Kenyan startup ecosystem routinely scans. A hit in ANY of these is footprint.
COMMON_DATABASES = {
    # Funding / startup databases
    "crunchbase.com": "Crunchbase (funding profiles)",
    "briterbridges.com": "Briter Bridges (Africa startup intelligence)",
    "vc4a.com": "VC4A (venture database)",
    "disrupt-africa.com": "Disrupt Africa (startup database + news)",
    "thebigdeal.com": "The Big Deal (African funding tracker)",
    # Ecosystem press
    "techcabal.com": "TechCabal",
    "techpoint.africa": "Techpoint Africa",
    "businessdailyafrica.com": "Business Daily (startup desk)",
    # Professional / social presence at ecosystem scale
    "linkedin.com": "LinkedIn (company page following)",
}

# Strong-signal databases: presence here alone is enough to exclude (these mean
# "funded / actively profiled by the ecosystem").
STRONG_EXCLUDERS = {"crunchbase.com", "briterbridges.com", "vc4a.com", "thebigdeal.com"}


def collect(store: Store, sector: str | None = None,
            search_hits: Callable[[str], int] | None = None) -> int:
    """Record each candidate's presence across COMMON_DATABASES. Returns rows written.

    `search_hits` defaults to the best available backend (see search.get_backend):
    SerpAPI if a key is set, else free DuckDuckGo, else a 0-returning stub. Pass
    your own callable to override (e.g. in tests).
    """
    if search_hits is None:
        backend = get_backend()
        print(f"[footprint] search backend: {backend.name}")
        search_hits = backend.count

    written = 0
    failures = 0
    for b in store.businesses(sector):
        name = b["name"]
        for domain in COMMON_DATABASES:
            try:
                hits = search_hits(f'"{name}" site:{domain}')
            except SearchError:
                failures += 1  # lookup failed (throttled) — NOT a confirmed 0
                continue
            if hits:
                store.add_footprint(Footprint(business_id=b["id"], source=domain, hits=hits))
                written += 1
    if failures:
        print(f"[footprint] WARNING: {failures} lookups failed (search backend throttled). "
              f"Those businesses are under-checked — re-run to retry, or set "
              f"SERPAPI_API_KEY for reliable counts before trusting the exclusion gate.")
    return written
