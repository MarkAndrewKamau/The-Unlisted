"""Public tender-award connector (revenue proxy).

A business that quietly wins government/parastatal tenders is generating real
revenue and clearing procurement due-diligence — a strong fundamentals signal
that is invisible to the startup ecosystem. Kenya's PPIP / tenders portals
publish *awarded* tenders (supplier name + value), which we aggregate per
supplier into a `tenders_won` count.

We seed candidates we haven't seen elsewhere AND enrich existing ones: the
orchestrator's upsert dedups by (name, sector), so a supplier already found via
KAM just gains a tenders_won signal.

Real fetch/parse logic guarded behind lazy imports; safe-skips when the source
is unreachable. Point SOURCE_URL at the awarded-tenders feed/export you use.

Sources to wire: tenders.go.ke, PPIP (ppip.go.ke) awarded notices, county portals.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Iterator

from ..models import Business, Sig
from .base import Connector, SeedRecord

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; KuzanaResearch/0.1; +research)"}
SOURCE_URL = "https://tenders.go.ke/awarded"  # placeholder; wire to a real export

SELECTORS = {
    "award_row": "tr.award, .award-notice",
    "supplier": ".supplier-name, td.supplier",
    "value": ".award-value, td.value",
}


class TendersConnector(Connector):
    name = "tenders"

    def discover(self) -> Iterator[SeedRecord]:
        try:
            import requests  # noqa: F401
            from bs4 import BeautifulSoup  # noqa: F401
        except ImportError:
            print("[tenders] requests/beautifulsoup4 not installed; skipping.")
            return

        import requests
        from bs4 import BeautifulSoup

        session = requests.Session()
        session.headers.update(HEADERS)
        try:
            resp = session.get(SOURCE_URL, timeout=20)
            resp.raise_for_status()
        except Exception as e:
            print(f"[tenders] fetch failed for {SOURCE_URL}: {e}")
            return

        soup = BeautifulSoup(resp.text, "html.parser")
        counts: dict[str, int] = defaultdict(int)
        for row in soup.select(SELECTORS["award_row"]):
            sup = row.select_one(SELECTORS["supplier"])
            if sup and sup.get_text(strip=True):
                counts[sup.get_text(strip=True)] += 1
            time.sleep(0)  # parsing-only loop; placeholder for paginated fetches

        for name, n in counts.items():
            biz = Business(name=name, sector=self.sector or "manufacturing",
                           source=self.name, website=SOURCE_URL)
            yield SeedRecord(
                business=biz,
                signals=[self._signal(Sig.TENDERS_WON, n, url=SOURCE_URL)],
            )
