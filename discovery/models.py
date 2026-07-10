"""Data model + the signal vocabulary the whole pipeline shares.

A `Business` is a candidate. A `Signal` is one piece of public evidence about a
candidate, always carrying its source and capture time so any score can be
traced back to raw evidence (this auditability is the credibility backbone of
the methodology). `Footprint` rows record ecosystem visibility used to compute
the Obscurity axis.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# --- Signal vocabulary -------------------------------------------------------
# Each constant is a signal *type*. Connectors emit these; the scorer maps them
# onto Quality dimensions. Keep this list as the single source of truth.
class Sig:
    LONGEVITY_YEARS = "longevity_years"      # years operating (registry / WHOIS / Wayback)
    RATING = "rating"                        # 0..5 customer rating
    REVIEW_COUNT = "review_count"            # number of reviews/ratings
    LAST_ACTIVITY_DAYS = "last_activity_days"  # days since last review/post (lower = better)
    LOCATIONS = "locations"                  # number of physical locations / branches
    JOB_POSTINGS = "job_postings"            # active hiring listings (growth proxy)
    TENDERS_WON = "tenders_won"              # public tender awards (revenue proxy)
    CERTIFIED = "certified"                  # 0/1 KEBS or sector certification
    ASSOCIATION_MEMBER = "association_member"  # 0/1 KAM/KEPSA etc. membership

    # --- investability / verification layer (enrich.py) ---
    HAS_WEBSITE = "has_website"              # 0/1 publishes a website
    HAS_PHONE = "has_phone"                  # 0/1 publishes a phone
    HAS_EMAIL = "has_email"                  # 0/1 publishes an email
    CONTACTABILITY = "contactability"        # 0..3 count of reachable channels
    WEBSITE_LIVE = "website_live"            # 0/1 site returns HTTP 200
    HTTPS = "https"                          # 0/1 serves over HTTPS
    DOMAIN_AGE_YEARS = "domain_age_years"    # years since first web archive (longevity/survival)
    SITE_LAST_SEEN_DAYS = "site_last_seen_days"  # days since last web snapshot (still maintained?)


@dataclass
class Business:
    name: str
    sector: str
    town: str = ""
    source: str = ""                 # connector that first seeded this candidate
    website: str = ""
    registry_year: int | None = None
    id: int | None = None
    created_at: str = field(default_factory=now_iso)


@dataclass
class Signal:
    business_id: int
    type: str
    value: float
    source: str
    url: str = ""
    captured_at: str = field(default_factory=now_iso)


@dataclass
class Footprint:
    business_id: int
    source: str                      # e.g. "techcabal", "crunchbase", "linkedin"
    hits: int
    url: str = ""
    captured_at: str = field(default_factory=now_iso)


@dataclass
class Score:
    business_id: int
    quality: float
    obscurity: float
    hc_rank: float
    disqualified: int = 0
    reason: str = ""
    dimensions_json: str = "[]"
    computed_at: str = field(default_factory=now_iso)
