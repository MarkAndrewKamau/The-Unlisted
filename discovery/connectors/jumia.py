"""Jumia Kenya seller connector (free, public web).

Jumia exposes per-seller pages with a star rating, rating count, and a
"followers"/tenure line — clean public proxies for customer satisfaction,
scale, and longevity. This connector walks a category listing, collects the
distinct sellers behind the products, and reads each seller page.

Design notes:
- Network + parsing deps (requests, bs4) are imported lazily so the rest of the
  package works without them.
- Selectors live in one place (SELECTORS) because marketplace HTML drifts; when
  Jumia changes layout you fix it here, not across the codebase.
- This is intentionally polite (rate-limited, real UA). For production, respect
  robots.txt and consider their seller API / a proper scraping budget.

Until selectors are tuned against live HTML this returns nothing rather than bad
data — the sample connector covers the end-to-end demo.
"""
from __future__ import annotations

import re
import time
from typing import Iterator

from ..models import Business
from .base import Connector, SeedRecord

BASE = "https://www.jumia.co.ke"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; KuzanaResearch/0.1; +research)"}

# Category landing pages to harvest sellers from. Maps our sector -> Jumia paths.
SECTOR_CATEGORIES = {
    "ecommerce": ["/groceries/", "/health-beauty/", "/home-office/"],
    "manufacturing": ["/groceries/"],  # food producers selling direct
}

# Centralised CSS selectors — update here when Jumia's markup changes.
SELECTORS = {
    "product_link": "a.core",          # product cards on a listing
    "seller_block": "section.-pvs",    # seller info block on a product page
    "seller_name": "a.-m -prxs",
    "rating": "div.stars",             # contains e.g. "4.5 out of 5"
    "rating_count": "a.-plxs",         # contains e.g. "(1,820 ratings)"
}


def _num(text: str) -> float | None:
    m = re.search(r"[\d,.]+", text or "")
    return float(m.group().replace(",", "")) if m else None


class JumiaConnector(Connector):
    name = "jumia"

    def discover(self) -> Iterator[SeedRecord]:
        try:
            import requests  # noqa: F401
            from bs4 import BeautifulSoup  # noqa: F401
        except ImportError:
            print("[jumia] requests/beautifulsoup4 not installed; skipping. "
                  "`pip install -r requirements.txt`")
            return

        import requests
        from bs4 import BeautifulSoup

        session = requests.Session()
        session.headers.update(HEADERS)
        seen_sellers: set[str] = set()

        for path in SECTOR_CATEGORIES.get(self.sector, []):
            try:
                resp = session.get(BASE + path, timeout=15)
                resp.raise_for_status()
            except Exception as e:  # network/HTTP issues shouldn't crash the run
                print(f"[jumia] fetch failed for {path}: {e}")
                continue

            soup = BeautifulSoup(resp.text, "html.parser")
            product_urls = [
                a.get("href") for a in soup.select(SELECTORS["product_link"]) if a.get("href")
            ][: self.kwargs.get("max_products", 20)]

            for purl in product_urls:
                rec = self._read_seller(session, BeautifulSoup, BASE + purl, seen_sellers)
                if rec:
                    yield rec
                time.sleep(self.kwargs.get("delay", 1.0))  # be polite

    def _read_seller(self, session, BeautifulSoup, product_url, seen) -> SeedRecord | None:
        try:
            resp = session.get(product_url, timeout=15)
            resp.raise_for_status()
        except Exception:
            return None
        soup = BeautifulSoup(resp.text, "html.parser")
        block = soup.select_one(SELECTORS["seller_block"])
        if not block:
            return None

        name_el = block.select_one(SELECTORS["seller_name"])
        name = name_el.get_text(strip=True) if name_el else None
        if not name or name in seen:
            return None
        seen.add(name)

        rating = _num((block.select_one(SELECTORS["rating"]) or _empty()).get_text())
        count = _num((block.select_one(SELECTORS["rating_count"]) or _empty()).get_text())

        biz = Business(name=name, sector=self.sector, source=self.name, website=product_url)
        signals = []
        if rating is not None:
            signals.append(self._signal("rating", rating, url=product_url))
        if count is not None:
            signals.append(self._signal("review_count", count, url=product_url))
        return SeedRecord(business=biz, signals=signals)


class _empty:
    def get_text(self, *a, **k):
        return ""
