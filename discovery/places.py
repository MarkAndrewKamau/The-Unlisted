"""Google Places enricher — customer-demand signals for physical SMEs.

The single most investor-relevant fundamental for a physical business is its
customer base: rating × number of ratings × recency. Most genuinely-hidden SMEs
have no website but ARE on Google Maps, so Places reaches the long tail that the
free web-archive enricher (enrich.py) cannot.

Populates the signals the two-axis score already consumes, so the data flows
straight into Quality with no scoring change:
    rating              -> customer satisfaction
    review_count        -> proven scale (number of ratings)
    last_activity_days  -> recency of the newest review (still trading?)

Uses the current Places API (New). Set GOOGLE_PLACES_API_KEY (backend only).
A canonical name-match guard prevents attaching a same-named different business's
reviews — we drop the match rather than pollute the evidence.
"""
from __future__ import annotations

import os
import time
from datetime import datetime, timezone

from .dedupe import canonical
from .models import Sig, Signal
from .store import Store

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
DETAILS_URL = "https://places.googleapis.com/v1/places/"


def _name_matches(query_name: str, found_name: str) -> bool:
    cn, cf = canonical(query_name), canonical(found_name)
    if not cn or not cf:
        return False
    shorter = min(cn, cf, key=len)
    return cn == cf or (len(shorter) >= 5 and (cn in cf or cf in cn))


class PlacesError(Exception):
    pass


def _search(requests, query: str, api_key: str) -> dict | None:
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.rating,places.userRatingCount",
    }
    last = "unknown"
    for attempt in range(3):  # network blips/timeouts are common — retry before giving up
        try:
            r = requests.post(SEARCH_URL, headers=headers,
                              json={"textQuery": query}, timeout=30)
        except Exception as e:  # Timeout / ConnectionError — never crash the run
            last = f"network error: {type(e).__name__}"
            time.sleep(1.5 * (attempt + 1))
            continue
        if r.status_code != 200:
            # surface Google's actual reason (API not enabled / billing / restriction)
            raise PlacesError(f"HTTP {r.status_code}: {r.text[:200]}")
        places = r.json().get("places", [])
        return places[0] if places else None
    raise PlacesError(last)


def _last_review_days(requests, place_id: str, api_key: str) -> int | None:
    headers = {"X-Goog-Api-Key": api_key, "X-Goog-FieldMask": "reviews.publishTime"}
    try:
        r = requests.get(DETAILS_URL + place_id, headers=headers, timeout=15)
        r.raise_for_status()
        times = [rv["publishTime"] for rv in r.json().get("reviews", []) if rv.get("publishTime")]
        if not times:
            return None
        newest = max(datetime.fromisoformat(t.replace("Z", "+00:00")) for t in times)
        return (datetime.now(timezone.utc) - newest).days
    except Exception:
        return None


def enrich_places(store: Store, sector: str | None = None, api_key: str | None = None) -> int:
    api_key = api_key or os.getenv("GOOGLE_PLACES_API_KEY")
    if not api_key:
        print("[places] GOOGLE_PLACES_API_KEY not set — skipping. "
              "(Free tier: console.cloud.google.com → Places API.)")
        return 0
    try:
        import requests
    except ImportError:
        print("[places] requests not installed; skipping.")
        return 0

    written = matched = consecutive_fail = 0
    for b in store.businesses(sector):
        query = " ".join(x for x in [b["name"], b["town"], "Kenya"] if x)
        try:
            place = _search(requests, query, api_key)
            consecutive_fail = 0
        except PlacesError as e:
            consecutive_fail += 1
            if consecutive_fail == 1:
                print(f"[places] request failed: {e}")
            if consecutive_fail >= 5:
                print("[places] aborting after 5 consecutive failures. Likely causes: "
                      "'Places API (New)' not enabled, billing not enabled on the project, "
                      "or a key API/IP restriction. (A freshly enabled API can also take a "
                      "few minutes to propagate — wait and re-run.)")
                break
            continue
        time.sleep(0.3)
        if not place or not _name_matches(b["name"], place.get("displayName", {}).get("text", "")):
            continue
        matched += 1
        url = f"https://www.google.com/maps/place/?q=place_id:{place['id']}"

        def put(t, v):
            nonlocal written
            store.add_signal(Signal(business_id=b["id"], type=t, value=float(v),
                                    source="google_places", url=url))
            written += 1

        if place.get("rating") is not None:
            put(Sig.RATING, place["rating"])
        if place.get("userRatingCount") is not None:
            put(Sig.REVIEW_COUNT, place["userRatingCount"])
        last_days = _last_review_days(requests, place["id"], api_key)
        if last_days is not None:
            put(Sig.LAST_ACTIVITY_DAYS, last_days)
        time.sleep(0.3)

    print(f"[places] matched {matched} businesses on Google Maps, wrote {written} signals.")
    return written
