"""Wikipedia/Wikidata presence — a reliable, free, no-throttle obscurity signal.

The startup-database checks (Crunchbase, etc.) depend on a search backend, which
the free DuckDuckGo path rate-limits hard from datacenter IPs. Wikipedia exposes
a proper API that doesn't throttle reasonable use and answers from any host, so
it's the dependable backbone for the exclusion gate.

Signal: a business with its *own Wikipedia article* is, by definition, already
known to the wider public — not a hidden champion. We confirm the top search
result's title actually matches the business (canonicalised), so noise results
(e.g. "Maisha Flour Factory" -> "Shark Tank India") don't cause false exclusions.
"""
from __future__ import annotations

import time

from .dedupe import canonical

API = "https://en.wikipedia.org/w/api.php"
UA = {"User-Agent": "KuzanaResearch/0.1 (hidden-champions research; tavissoftwarellm@gmail.com)"}
DELAY = 0.4   # polite gap between calls; Wikipedia 429s on rapid bursts


def _title_matches(name: str, title: str) -> bool:
    cn, ct = canonical(name), canonical(title)
    if not cn or not ct:
        return False
    if cn == ct:
        return True
    # one fully contains the other, and the shorter side is substantial
    shorter = min(cn, ct, key=len)
    return len(shorter) >= 5 and (cn in ct or ct in cn)


def known_title(name: str, retries: int = 3) -> str | None:
    """Return the matching Wikipedia article title if the business is notable, else None.

    Polite + retrying (Wikipedia 429s on bursts). Raises on persistent failure so
    the caller can distinguish "checked, not found" from "couldn't check"
    (mirroring search.SearchError semantics).
    """
    import requests

    last = "unknown"
    for attempt in range(retries):
        time.sleep(DELAY)
        try:
            resp = requests.get(
                API,
                params={"action": "query", "list": "search", "srsearch": name,
                        "srlimit": 3, "format": "json", "maxlag": 5},
                headers=UA, timeout=15,
            )
            if resp.status_code in (429, 503):
                last = f"HTTP {resp.status_code}"
                time.sleep(1.0 * (2 ** attempt))  # back off
                continue
            resp.raise_for_status()
            for hit in resp.json().get("query", {}).get("search", []):
                if _title_matches(name, hit["title"]):
                    return hit["title"]
            return None
        except Exception as e:
            last = str(e)
    raise RuntimeError(f"wikipedia lookup failed after {retries} tries: {last}")
