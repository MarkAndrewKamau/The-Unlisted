"""Candidate de-duplication.

MVP uses cheap deterministic normalisation (strip legal suffixes, punctuation,
casing) to collapse "Kamau Foods Ltd" / "Kamau Foods Limited" / "kamau foods".
This is the place to upgrade to an LLM pass (Claude Haiku) for fuzzy matches the
rules miss — same business, different spelling/branch naming.
"""
from __future__ import annotations

import re

_SUFFIXES = r"\b(ltd|limited|co|company|enterprises?|kenya|k\.?e\.?|plc|llc|group)\b"


def canonical(name: str) -> str:
    n = name.lower()
    n = re.sub(r"[^a-z0-9 ]", " ", n)
    n = re.sub(_SUFFIXES, " ", n)
    n = re.sub(r"\s+", " ", n).strip()
    return n


def group_duplicates(names: list[str]) -> dict[str, list[str]]:
    """Return canonical_key -> [original names] for any key with >1 member."""
    groups: dict[str, list[str]] = {}
    for name in names:
        groups.setdefault(canonical(name), []).append(name)
    return {k: v for k, v in groups.items() if len(v) > 1}


# --- Upgrade path -----------------------------------------------------------
# def llm_dedupe(candidates): call Claude Haiku to cluster near-duplicate names
# that survived `canonical` (e.g. abbreviations, transposed words, typos).
