"""Ecosystem-footprint stage — the engine behind the Obscurity axis.

For each business we count how visible it already is to the startup ecosystem.
High visibility is what the bounty tells us to *exclude*, so these counts feed a
penalty (and a hard disqualification gate) in score.py.

Sources are intentionally cheap/free:
  - press: site-scoped web search hit counts (TechCabal, Disrupt Africa, etc.)
  - crunchbase: presence of a funding profile
  - linkedin: company-page follower magnitude
  - startup_events: appearances on accelerator / pitch-event lists

This module ships the orchestration + a pluggable `search_hits` function. Wire
`search_hits` to a real search backend (Bing API, SerpAPI, or scraped SERP
counts). Without a backend it returns 0, which simply means "no footprint found"
— so live runs degrade safely to treating everyone as obscure until you connect
a search source. The sample connector seeds footprint directly for demos.
"""
from __future__ import annotations

from typing import Callable

from .models import Footprint
from .store import Store

PRESS_SITES = [
    "techcabal.com",
    "disrupt-africa.com",
    "businessdailyafrica.com",
    "techpoint.africa",
]


def default_search_hits(query: str) -> int:
    """Stub: return result count for a query. Replace with a real backend.

    Example wiring (SerpAPI):
        params = {"q": query, "api_key": KEY, "engine": "google"}
        return int(requests.get("https://serpapi.com/search", params).json()
                   .get("search_information", {}).get("total_results", 0))
    """
    return 0


def collect(store: Store, sector: str | None = None,
            search_hits: Callable[[str], int] = default_search_hits) -> int:
    """Populate the footprint table for businesses in `sector`. Returns row count."""
    written = 0
    for b in store.businesses(sector):
        name = b["name"]
        for site in PRESS_SITES:
            hits = search_hits(f'"{name}" site:{site}')
            if hits:
                store.add_footprint(Footprint(business_id=b["id"], source=site, hits=hits))
                written += 1
        # Crunchbase presence counts as strong footprint (funded => known).
        cb = search_hits(f'"{name}" site:crunchbase.com')
        if cb:
            store.add_footprint(Footprint(business_id=b["id"], source="crunchbase", hits=cb))
            written += 1
    return written
