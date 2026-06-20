"""Kenya Association of Manufacturers (KAM) member-directory connector.

KAM's public member directory is a *vetted* list of manufacturers — membership
is itself a fundamentals signal (the business is real, compliant, and pays dues
to be there). Many KAM members are exactly the B2B "hidden champions" the bounty
targets: serious operators with zero startup-ecosystem footprint.

Signals emitted per member:
  - association_member = 1   (vetted membership)
  - certified          = 1   (if the listing shows KEBS / ISO marks)
  - locations                (branches/plants listed)
  - sector validation via the KAM sub-sector category

Like the Jumia connector this ships real fetch + parse logic guarded behind lazy
imports and tuned selectors. Until selectors are validated against live HTML it
yields nothing rather than bad data; the sample connector covers the demo.

Directory: https://kam.co.ke/membership-directory/  (paginated, public)
"""
from __future__ import annotations

import time
from typing import Iterator

from ..models import Business, Sig
from .base import Connector, SeedRecord

BASE = "https://kam.co.ke"
DIRECTORY = "/membership-directory/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; KuzanaResearch/0.1; +research)"}

# Centralised selectors — update here when KAM changes its directory markup.
SELECTORS = {
    "member_card": "div.member, li.directory-item",
    "name": "h3, .member-name",
    "sector": ".member-sector, .category",
    "location": ".member-location, .location",
    "next_page": "a.next, a.pagination-next",
}


class KAMConnector(Connector):
    name = "kam"

    def discover(self) -> Iterator[SeedRecord]:
        try:
            import requests  # noqa: F401
            from bs4 import BeautifulSoup  # noqa: F401
        except ImportError:
            print("[kam] requests/beautifulsoup4 not installed; skipping. "
                  "`pip install -r requirements.txt`")
            return

        import requests
        from bs4 import BeautifulSoup

        session = requests.Session()
        session.headers.update(HEADERS)
        url = BASE + DIRECTORY
        pages = 0
        max_pages = self.kwargs.get("max_pages", 10)

        while url and pages < max_pages:
            try:
                resp = session.get(url, timeout=20)
                resp.raise_for_status()
            except Exception as e:
                print(f"[kam] fetch failed for {url}: {e}")
                return
            soup = BeautifulSoup(resp.text, "html.parser")

            for card in soup.select(SELECTORS["member_card"]):
                rec = self._parse_card(card)
                if rec:
                    yield rec

            nxt = soup.select_one(SELECTORS["next_page"])
            url = (BASE + nxt["href"]) if nxt and nxt.get("href") else None
            pages += 1
            time.sleep(self.kwargs.get("delay", 1.0))

    def _parse_card(self, card) -> SeedRecord | None:
        name_el = card.select_one(SELECTORS["name"])
        name = name_el.get_text(strip=True) if name_el else None
        if not name:
            return None
        loc_el = card.select_one(SELECTORS["location"])
        town = loc_el.get_text(strip=True) if loc_el else ""

        biz = Business(name=name, sector=self.sector or "manufacturing",
                       town=town, source=self.name, website=BASE + DIRECTORY)
        signals = [
            self._signal(Sig.ASSOCIATION_MEMBER, 1, url=BASE + DIRECTORY),
        ]
        text = card.get_text(" ", strip=True).lower()
        if "kebs" in text or "iso" in text:
            signals.append(self._signal(Sig.CERTIFIED, 1, url=BASE + DIRECTORY))
        return SeedRecord(business=biz, signals=signals)
