"""Investability / verification enrichment (deepens pre-screening + evidence).

For each candidate this collects free, investor-relevant signals and stores them
as sourced, timestamped evidence (so the score stays auditable):

  - contactability : does it publish a website / phone / email (is it reachable?)
  - website_live   : does the site actually load (HTTP 200)?  -> real & active
  - https          : served over HTTPS                        -> basic maturity
  - domain_age_years : years since the first web-archive snapshot (Wayback)
                       -> longevity / survival, the classic low-risk signal
  - site_last_seen_days : days since the last snapshot         -> still maintained?

All sources are free and unauthenticated (Wayback CDX API, plain HTTP). Web-based
signals only apply to businesses that publish a website — an honest limitation we
surface rather than hide. Customer-review depth (for no-website SMEs) comes from
the separate Google Places enricher.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from urllib.parse import urlparse

from .models import Sig, Signal
from .store import Store

UA = {"User-Agent": "KuzanaResearch/0.1 (hidden-champions research)"}
WAYBACK_CDX = "http://web.archive.org/cdx/search/cdx"
CURRENT_YEAR = datetime.now(timezone.utc).year


def _domain(website: str) -> str:
    host = urlparse(website if "://" in website else "https://" + website).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def _url(website: str) -> str:
    return website if "://" in website else "https://" + website


def check_live(website: str, requests) -> tuple[int, int]:
    """Return (website_live 0/1, https 0/1). Never raises."""
    try:
        r = requests.get(_url(website), headers=UA, timeout=12, allow_redirects=True)
        live = 1 if r.status_code < 400 else 0
        https = 1 if r.url.lower().startswith("https://") else 0
        return live, https
    except Exception:
        return 0, 0


def wayback_span(website: str, requests) -> tuple[int | None, int | None]:
    """(first_snapshot_year, days_since_last_snapshot) via the free Wayback CDX API."""
    dom = _domain(website)
    if not dom:
        return None, None

    def _ts(params):
        try:
            r = requests.get(WAYBACK_CDX, params=params, headers=UA, timeout=15)
            rows = r.json()
            return rows[1][0] if len(rows) > 1 else None  # row 0 is the header
        except Exception:
            return None

    base = {"url": f"{dom}/*", "output": "json", "fl": "timestamp"}
    first = _ts({**base, "limit": 1})
    last = _ts({**base, "limit": -1})
    first_year = int(first[:4]) if first else None
    last_days = None
    if last:
        dt = datetime(int(last[:4]), int(last[4:6]), int(last[6:8]), tzinfo=timezone.utc)
        last_days = (datetime.now(timezone.utc) - dt).days
    return first_year, last_days


def enrich(store: Store, sector: str | None = None) -> int:
    """Attach verification/longevity signals to each business. Returns signals written."""
    try:
        import requests
    except ImportError:
        print("[enrich] requests not installed; skipping.")
        return 0

    written = 0
    web_checked = 0
    for b in store.businesses(sector):
        sigs = store.latest_signals(b["id"])
        has_web = 1 if (b["website"] or sigs.get(Sig.HAS_WEBSITE)) else 0
        has_phone = 1 if sigs.get(Sig.HAS_PHONE) else 0
        has_email = 1 if sigs.get(Sig.HAS_EMAIL) else 0
        contactability = has_web + has_phone + has_email

        def put(t, v, url=""):
            nonlocal written
            store.add_signal(Signal(business_id=b["id"], type=t, value=float(v),
                                    source="enrich", url=url))
            written += 1

        put(Sig.HAS_WEBSITE, has_web)
        put(Sig.CONTACTABILITY, contactability)

        if b["website"]:
            live, https = check_live(b["website"], requests)
            put(Sig.WEBSITE_LIVE, live, url=b["website"])
            put(Sig.HTTPS, https)
            first_year, last_days = wayback_span(b["website"], requests)
            if first_year:
                put(Sig.DOMAIN_AGE_YEARS, max(0, CURRENT_YEAR - first_year),
                    url=f"https://web.archive.org/web/*/{_domain(b['website'])}")
            if last_days is not None:
                put(Sig.SITE_LAST_SEEN_DAYS, last_days)
            web_checked += 1
            time.sleep(0.5)  # polite to Wayback

    print(f"[enrich] {written} signals written ({web_checked} businesses had a website "
          f"to verify). Web-based signals don't apply to no-website businesses.")
    return written
