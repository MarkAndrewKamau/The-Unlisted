"""Search backends for the footprint/exclusion stage.

`footprint.collect` needs a function `query -> hit_count` to look candidates up in
the common databases. This module provides that, with three interchangeable
backends and a caching wrapper:

    - DuckDuckGoBackend : free, no API key (default)        [needs requests+bs4]
    - SerpApiBackend    : paid, reliable total counts        [SERPAPI_API_KEY]
    - StubBackend       : always 0 (offline / no deps)       [fallback]

Selection (see `get_backend`) is environment-driven so the pipeline picks the
best available option automatically:

    SEARCH_BACKEND = ddg | serpapi | stub   (optional explicit override)
    SERPAPI_API_KEY = ...                    (enables serpapi auto-select)

Every backend degrades safely: any network/parse error returns 0 ("not found"),
so a footprint run never crashes and never invents footprint. Results are cached
to disk so re-runs and the politeness budget don't re-hit the network.
"""
from __future__ import annotations

import json
import os
import time
from pathlib import Path

CACHE_PATH = Path(".search_cache.json")
_UA = "Mozilla/5.0 (compatible; KuzanaResearch/0.1; +research)"


class SearchBackend:
    name = "base"

    def count(self, query: str) -> int:
        raise NotImplementedError


class StubBackend(SearchBackend):
    """Returns 0 for everything — used when offline or no deps/keys."""
    name = "stub"

    def count(self, query: str) -> int:
        return 0


class DuckDuckGoBackend(SearchBackend):
    """Free HTML-endpoint search. Counts result rows on the first page.

    For the exclusion gate we mainly need presence (>0) and a rough magnitude,
    so a first-page count of site-scoped results is sufficient signal.
    """
    name = "ddg"
    ENDPOINT = "https://html.duckduckgo.com/html/"

    def __init__(self, delay: float = 1.5):
        self.delay = delay

    def count(self, query: str) -> int:
        try:
            import requests
            from bs4 import BeautifulSoup
        except ImportError:
            return 0
        try:
            resp = requests.post(
                self.ENDPOINT, data={"q": query},
                headers={"User-Agent": _UA}, timeout=20,
            )
            resp.raise_for_status()
        except Exception:
            return 0
        finally:
            time.sleep(self.delay)  # be polite regardless of outcome
        soup = BeautifulSoup(resp.text, "html.parser")
        if soup.select_one(".no-results"):
            return 0
        return len(soup.select("a.result__a"))


class SerpApiBackend(SearchBackend):
    """Paid, reliable. Uses Google's reported total_results via SerpAPI."""
    name = "serpapi"
    ENDPOINT = "https://serpapi.com/search"

    def __init__(self, api_key: str):
        self.api_key = api_key

    def count(self, query: str) -> int:
        try:
            import requests
        except ImportError:
            return 0
        try:
            resp = requests.get(
                self.ENDPOINT,
                params={"q": query, "engine": "google", "api_key": self.api_key},
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return 0
        return int(data.get("search_information", {}).get("total_results", 0) or 0)


class CachingBackend(SearchBackend):
    """Wraps a backend with a JSON on-disk cache keyed by query."""

    def __init__(self, inner: SearchBackend, path: Path = CACHE_PATH):
        self.inner = inner
        self.path = path
        self.name = f"{inner.name}+cache"
        self._cache: dict[str, int] = {}
        if path.exists():
            try:
                self._cache = json.loads(path.read_text())
            except Exception:
                self._cache = {}

    def count(self, query: str) -> int:
        if query in self._cache:
            return self._cache[query]
        val = self.inner.count(query)
        self._cache[query] = val
        try:
            self.path.write_text(json.dumps(self._cache, indent=0))
        except Exception:
            pass
        return val


def get_backend() -> SearchBackend:
    """Pick the best available backend from the environment, wrapped in cache."""
    choice = os.getenv("SEARCH_BACKEND", "").lower()
    key = os.getenv("SERPAPI_API_KEY")

    if choice == "stub":
        return StubBackend()
    if choice == "serpapi" or (not choice and key):
        if key:
            return CachingBackend(SerpApiBackend(key))
        print("[search] serpapi requested but SERPAPI_API_KEY not set; using ddg")
    if choice in ("", "ddg", "serpapi"):
        return CachingBackend(DuckDuckGoBackend())
    print(f"[search] unknown SEARCH_BACKEND '{choice}'; using stub")
    return StubBackend()
