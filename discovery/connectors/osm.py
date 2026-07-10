"""OpenStreetMap / Overpass connector — the real candidate backbone.

Overpass returns real, located businesses across every sector with no API key and
no anti-bot friction, which makes it the right discovery source for "all sectors,
one by one": each sector maps to a set of OSM tags. Coverage is the long tail —
welders, carpenters, millers, agrovets, bakeries — exactly the businesses the
startup ecosystem never sees. (Known names like Safaricom also appear; the
obscurity gate strips those downstream.)

Signals are intentionally honest about what OSM actually provides: existence as a
real located business, plus whether it publishes a website/phone (a weak
operational-presence proxy, and a hook for later WHOIS-longevity enrichment).
Richer quality signals (customer reviews) need a funded source (Google Places)
and are out of scope for the free build — documented as the next enrichment.
"""
from __future__ import annotations

import re
import time
from typing import Iterator

from ..models import Business, Sig
from .base import Connector, SeedRecord

# Trailing mapper-signature annotations seen in OSM (e.g. "Bamburi cement ltd-ruben").
_MAPPER_TAG = re.compile(r"[\s\-–—]+rube[nd]\b", re.IGNORECASE)
# Obvious non-businesses / placeholders to skip outright.
_SKIP_EXACT = {"farm house", "new kicc", "shop", "kiosk", "factory", "office", "company"}


def clean_name(raw: str) -> str:
    name = _MAPPER_TAG.sub("", raw).strip(" -–—\t")
    return re.sub(r"\s+", " ", name)


def is_real_business(name: str) -> bool:
    n = name.lower().strip()
    return len(n) >= 3 and n not in _SKIP_EXACT

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]
UA = {"User-Agent": "KuzanaResearch/0.1 (hidden-champions research)"}

# Sector -> Overpass element filters. `nwr` = node/way/relation. Add sectors here
# to extend coverage; this is the single place that defines "all sectors".
SECTOR_TAGS: dict[str, list[str]] = {
    "manufacturing": ['nwr["craft"]', 'nwr["industrial"]', 'nwr["man_made"="works"]'],
    "retail": ['nwr["shop"]'],
    "food": ['nwr["amenity"~"restaurant|cafe|fast_food|bar|pub"]', 'nwr["shop"="bakery"]'],
    "services": ['nwr["office"="company"]', 'nwr["shop"="laundry"]', 'nwr["craft"="electrician"]'],
    "agriculture": ['nwr["craft"="agricultural"]', 'nwr["shop"="agrarian"]', 'nwr["shop"="farm"]'],
}


def _query(filters: list[str], limit: int) -> str:
    body = "\n".join(f"  {f}(area.ke);" for f in filters)
    return (
        '[out:json][timeout:90];\n'
        'area["ISO3166-1"="KE"][admin_level=2]->.ke;\n'
        f'(\n{body}\n);\n'
        f'out tags center {limit};'
    )


class OSMConnector(Connector):
    name = "osm"

    def discover(self) -> Iterator[SeedRecord]:
        try:
            import requests  # noqa: F401
        except ImportError:
            print("[osm] requests not installed; skipping.")
            return
        import requests

        filters = SECTOR_TAGS.get(self.sector)
        if not filters:
            print(f"[osm] no tag mapping for sector '{self.sector}' "
                  f"(known: {', '.join(SECTOR_TAGS)})")
            return

        limit = self.kwargs.get("limit", 200)
        data = _query(filters, limit)
        elements = self._fetch(requests, data)
        seen: set[str] = set()
        for el in elements:
            tags = el.get("tags", {})
            name = clean_name(tags.get("name") or "")
            if not name or not is_real_business(name) or name.lower() in seen:
                continue
            seen.add(name.lower())

            town = tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:county") or ""
            website = tags.get("website") or tags.get("contact:website") or ""
            biz = Business(name=name, sector=self.sector, town=town,
                           website=website, source=self.name)
            signals = [self._signal(Sig.LOCATIONS, 1, url=self._osm_url(el))]
            if website:
                signals.append(self._signal("has_website", 1, url=website))
            if tags.get("phone") or tags.get("contact:phone"):
                signals.append(self._signal("has_phone", 1))
            yield SeedRecord(business=biz, signals=signals)

    def _fetch(self, requests, data: str) -> list:
        for ep in ENDPOINTS:
            try:
                r = requests.post(ep, data={"data": data}, headers=UA, timeout=120)
                if r.status_code == 200:
                    return r.json().get("elements", [])
                print(f"[osm] {ep} -> HTTP {r.status_code}")
            except Exception as e:
                print(f"[osm] {ep} failed: {e}")
            time.sleep(1.0)
        return []

    @staticmethod
    def _osm_url(el: dict) -> str:
        return f"https://www.openstreetmap.org/{el.get('type','node')}/{el.get('id','')}"
