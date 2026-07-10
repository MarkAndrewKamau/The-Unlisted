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

from . import wiki
from .models import Footprint
from .search import SearchError, extract_domain, get_backend
from .store import Store

# The explicit definition of "already known". Each entry is a database/outlet the
# Kenyan startup ecosystem routinely scans. A hit in ANY of these is footprint.
COMMON_DATABASES = {
    # General public prominence — reliable & free via the Wikipedia API. Its own
    # article means the wider public already knows them (not a hidden champion).
    "wikipedia.org": "Wikipedia (public prominence)",
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

# Strong-signal databases: presence here alone is enough to exclude. Wikipedia and
# the funding databases all mean "already known / funded / actively profiled".
STRONG_EXCLUDERS = {"wikipedia.org", "crunchbase.com", "briterbridges.com",
                    "vc4a.com", "thebigdeal.com"}


def collect(store: Store, sector: str | None = None, backend=None) -> int:
    """Record each candidate's presence in COMMON_DATABASES. Returns rows written.

    Hybrid lookup, tuned to stay viable on the free DuckDuckGo backend:

      - **Hard gate (reliable):** a *site-scoped* check for each of the 4 STRONG
        excluders only (`"<name>" site:crunchbase.com` …). Big companies' own
        pages outrank their Crunchbase/LinkedIn entries in a general search, so a
        site-scoped query is the only dependable way to detect "already funded /
        profiled". That's 4 lookups/business, not the full 9.
      - **Soft signal (cheap):** ONE general query (`"<name>" Kenya`) whose result
        domains are scanned for press/social databases — adds to the obscurity
        magnitude without extra site-scoped calls.

    ~5 lookups/business vs. the naive 9, and the hard gate stays accurate.
    `backend` defaults to search.get_backend(); pass a fake in tests.
    """
    if backend is None:
        backend = get_backend()
    print(f"[footprint] Wikipedia gate (reliable) + search enrichment via {backend.name}")

    soft_dbs = [d for d in COMMON_DATABASES if d not in STRONG_EXCLUDERS and d != "wikipedia.org"]
    ddg_strong = [d for d in STRONG_EXCLUDERS if d != "wikipedia.org"]
    written = 0
    wiki_fail = 0
    search_disabled = False   # circuit-breaker: trip after repeated throttling
    consecutive_search_fail = 0

    for b in store.businesses(sector):
        name = b["name"]
        store.clear_footprint(b["id"])  # idempotent: re-running won't double-count

        # 1) PRIMARY, reliable: Wikipedia public-prominence gate
        try:
            title = wiki.known_title(name)
            if title:
                store.add_footprint(Footprint(business_id=b["id"], source="wikipedia.org",
                                              hits=1, url=f"https://en.wikipedia.org/wiki/{title}"))
                written += 1
        except Exception:
            wiki_fail += 1

        if search_disabled:
            continue

        # 2) BEST-EFFORT enrichment: search-backed startup-database + press/social
        threw = False
        for domain in ddg_strong:
            try:
                n = backend.count(f'"{name}" site:{domain}')
            except SearchError:
                threw = True
                break
            if n:
                store.add_footprint(Footprint(business_id=b["id"], source=domain, hits=n))
                written += 1
        if not threw:
            try:
                urls = backend.results(f'"{name}" Kenya')
                hits: dict[str, int] = {}
                for url in urls:
                    host = extract_domain(url)
                    for domain in soft_dbs:
                        if host == domain or host.endswith("." + domain):
                            hits[domain] = hits.get(domain, 0) + 1
                for domain, n in hits.items():
                    store.add_footprint(Footprint(business_id=b["id"], source=domain, hits=n))
                    written += 1
            except SearchError:
                threw = True

        consecutive_search_fail = consecutive_search_fail + 1 if threw else 0
        if consecutive_search_fail >= 3:
            search_disabled = True
            print("[footprint] search backend throttled repeatedly — disabling search "
                  "enrichment for this run; Wikipedia gate still applied. "
                  "(Re-run later or set SERPAPI_API_KEY for full common-database coverage.)")

    store.commit()
    if wiki_fail:
        print(f"[footprint] WARNING: {wiki_fail} Wikipedia checks failed (network). Re-run to retry.")
    return written
