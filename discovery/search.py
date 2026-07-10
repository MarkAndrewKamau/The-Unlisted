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
import random
import time
from pathlib import Path

CACHE_PATH = Path(".search_cache.json")
_UA = "Mozilla/5.0 (compatible; KuzanaResearch/0.1; +research)"


class SearchError(Exception):
    """Raised when a lookup *failed* (throttled/blocked/transport error), as
    distinct from a successful lookup that legitimately found 0 results. Callers
    must NOT treat this as 'no footprint' silently, and it must NOT be cached."""


class SearchBackend:
    name = "base"

    def count(self, query: str) -> int:
        raise NotImplementedError

    def results(self, query: str) -> list[str]:
        """Return result URLs for a query (used by the single-query footprint scan)."""
        raise NotImplementedError


class StubBackend(SearchBackend):
    """Returns nothing — used when offline or no deps/keys."""
    name = "stub"

    def count(self, query: str) -> int:
        return 0

    def results(self, query: str) -> list[str]:
        return []


class DuckDuckGoBackend(SearchBackend):
    """Free HTML-endpoint search. Counts result rows on the first page.

    For the exclusion gate we mainly need presence (>0) and a rough magnitude,
    so a first-page count of site-scoped results is sufficient signal.

    DuckDuckGo answers a bursted client with HTTP 202 and an "anomaly/challenge"
    page rather than a 4xx. We detect that, back off, and retry; if it persists
    we raise SearchError so the caller can flag it instead of silently scoring
    the business as obscure.
    """
    name = "ddg"
    ENDPOINT = "https://html.duckduckgo.com/html/"

    def __init__(self, delay: float = 2.5, retries: int = 3):
        self.delay = delay
        self.retries = retries

    def _fetch(self, query: str):
        """Throttle-aware fetch. Returns BeautifulSoup or raises SearchError."""
        try:
            import requests
            from bs4 import BeautifulSoup
        except ImportError:
            raise SearchError("requests/beautifulsoup4 not installed")

        last = "unknown"
        for attempt in range(self.retries):
            time.sleep(self.delay + random.uniform(0, 0.8))  # polite + jittered
            try:
                resp = requests.post(
                    self.ENDPOINT, data={"q": query},
                    headers={"User-Agent": _UA}, timeout=20,
                )
            except Exception as e:
                last = f"transport error: {e}"
                continue
            low = resp.text.lower()
            if resp.status_code != 200 or "anomaly" in low or "challenge" in low:
                last = f"throttled (HTTP {resp.status_code})"
                time.sleep(self.delay * (2 ** attempt))  # exponential backoff
                continue
            return BeautifulSoup(resp.text, "html.parser")
        raise SearchError(f"ddg lookup failed after {self.retries} tries: {last}")

    def count(self, query: str) -> int:
        soup = self._fetch(query)
        if soup.select_one(".no-results"):
            return 0
        return len(soup.select("a.result__a"))

    def results(self, query: str) -> list[str]:
        soup = self._fetch(query)
        if soup.select_one(".no-results"):
            return []
        return [a.get("href", "") for a in soup.select("a.result__a") if a.get("href")]


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
            raise SearchError("requests not installed")
        try:
            resp = requests.get(
                self.ENDPOINT,
                params={"q": query, "engine": "google", "api_key": self.api_key},
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise SearchError(f"serpapi lookup failed: {e}")
        return int(data.get("search_information", {}).get("total_results", 0) or 0)

    def results(self, query: str) -> list[str]:
        import requests
        try:
            resp = requests.get(
                self.ENDPOINT,
                params={"q": query, "engine": "google", "api_key": self.api_key},
                timeout=20,
            )
            resp.raise_for_status()
            data = resp.json()
        except Exception as e:
            raise SearchError(f"serpapi lookup failed: {e}")
        return [r.get("link", "") for r in data.get("organic_results", []) if r.get("link")]


class CachingBackend(SearchBackend):
    """Wraps a backend with a JSON on-disk cache keyed by query.

    Only *successful* lookups are cached. A SearchError (throttle/transport
    failure) propagates and is never stored, so a later run retries it instead
    of inheriting a poisoned 0.
    """

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

    def _save(self) -> None:
        try:
            self.path.write_text(json.dumps(self._cache, indent=0))
        except Exception:
            pass

    def count(self, query: str) -> int:
        if query in self._cache:
            return self._cache[query]
        val = self.inner.count(query)  # SearchError propagates, uncached
        self._cache[query] = val
        self._save()
        return val

    def results(self, query: str) -> list[str]:
        key = "R::" + query  # separate namespace from count()
        if key in self._cache:
            return self._cache[key]
        val = self.inner.results(query)  # SearchError propagates, uncached
        self._cache[key] = val
        self._save()
        return val


def extract_domain(url: str) -> str:
    """Normalised host for a result URL, unwrapping DuckDuckGo redirect links.

    DDG result hrefs are often `//duckduckgo.com/l/?uddg=<encoded real url>`.
    """
    from urllib.parse import parse_qs, unquote, urlparse

    if "duckduckgo.com/l/" in url or url.startswith("//duckduckgo.com"):
        q = parse_qs(urlparse(url if "://" in url else "https:" + url).query)
        if "uddg" in q:
            url = unquote(q["uddg"][0])
    host = urlparse(url if "://" in url else "https://" + url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


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
