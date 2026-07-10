"""Company profile generation.

Produces the deliverable profile per finalist, covering founder background,
business model, growth indicators, and what makes them exceptional.

Two modes:
  - LLM mode (when ANTHROPIC_API_KEY is set + `anthropic` installed): Claude
    Opus synthesises a narrative profile from the collected signals + footprint.
  - Template mode (default/offline): a deterministic markdown profile built
    straight from the evidence, with the founder/background fields flagged as
    research TODOs for your collaborator.

Either way the output is grounded only in stored evidence — we never invent
facts about a real business.
"""
from __future__ import annotations

import os

from .models import now_iso
from .store import Store

PROFILE_MODEL = "claude-opus-4-8"

TEMPLATE = """# {name}

**Sector:** {sector}  |  **Town:** {town}  |  **Operating since:** {since}
**Hidden-Champion rank:** {hc}  (Quality {quality} × Obscurity {obscurity})

## Why this business is exceptional
{why}

## Evidence (public signals)
{signals}

## Ecosystem footprint
{footprint}

## Profile — to complete via outreach/research
- **Founder background:** _TODO (collaborator)_
- **Business model:** _TODO_
- **Growth indicators:** {growth}
- **Risks / open questions:** _TODO_

_Generated {ts}. All quantitative claims trace to the evidence above._
"""


def _evidence_lines(store: Store, business_id: int) -> str:
    sigs = store.latest_signals(business_id)
    if not sigs:
        return "_no signals collected_"
    return "\n".join(f"- `{t}`: {r['value']:g}  (source: {r['source']})"
                     for t, r in sorted(sigs.items()))


def _footprint_lines(store: Store, business_id: int) -> str:
    rows = store.footprint_sources(business_id)
    if not rows:
        return "- none found — invisible to the startup ecosystem ✅"
    return "\n".join(f"- {r['source']}: {r['hits']}" for r in rows)


def _heuristic_why(store: Store, b) -> str:
    sigs = store.latest_signals(b["id"])
    bits = []
    if "longevity_years" in sigs and sigs["longevity_years"]["value"] >= 10:
        bits.append(f"{int(sigs['longevity_years']['value'])} years of survival")
    if "rating" in sigs and "review_count" in sigs:
        bits.append(f"{sigs['rating']['value']:g}★ across {int(sigs['review_count']['value'])} reviews")
    if "tenders_won" in sigs and sigs["tenders_won"]["value"] > 0:
        bits.append(f"{int(sigs['tenders_won']['value'])} public tenders won")
    return ("Strong fundamentals with near-zero ecosystem noise: "
            + ", ".join(bits) + ".") if bits else "Quietly excellent on the collected signals."


def generate(store: Store, sector: str, top_n: int = 50) -> int:
    rows = store.ranked(sector=sector)[:top_n]
    use_llm = bool(os.getenv("ANTHROPIC_API_KEY"))
    client = _client() if use_llm else None
    written = 0
    for b in rows:
        md = _llm_profile(client, store, b) if client else _template_profile(store, b)
        store.put_profile(b["id"], md, now_iso())
        written += 1
    store.commit()
    return written


def _template_profile(store: Store, b) -> str:
    sigs = store.latest_signals(b["id"])
    growth = []
    for k, label in (("locations", "locations"), ("job_postings", "open roles")):
        if k in sigs and sigs[k]["value"] > 0:
            growth.append(f"{int(sigs[k]['value'])} {label}")
    return TEMPLATE.format(
        name=b["name"], sector=b["sector"], town=b["town"] or "—",
        since=b["registry_year"] or "—",
        hc=b["hc_rank"], quality=b["quality"], obscurity=b["obscurity"],
        why=_heuristic_why(store, b),
        signals=_evidence_lines(store, b["id"]),
        footprint=_footprint_lines(store, b["id"]),
        growth=", ".join(growth) or "_TODO_",
        ts=now_iso(),
    )


# Public alias: render a single business's template-mode profile on demand
# (used by the HTTP API to generate one profile without a batch run).
render_profile = _template_profile


def _client():
    try:
        import anthropic
        return anthropic.Anthropic()
    except ImportError:
        print("[profile] anthropic not installed; falling back to template mode")
        return None


def _llm_profile(client, store: Store, b) -> str:
    evidence = _evidence_lines(store, b["id"])
    footprint = _footprint_lines(store, b["id"])
    prompt = (
        "You are profiling a Kenyan business for the Kuzana Hidden Champions list. "
        "Use ONLY the evidence provided; do not invent facts. Where founder background "
        "or business-model detail is unknown, write '_needs research_'. Output markdown "
        "with sections: Why exceptional, Business model (inferred), Growth indicators, "
        "What to verify.\n\n"
        f"Business: {b['name']} ({b['sector']}, {b['town']})\n"
        f"Quality {b['quality']} / Obscurity {b['obscurity']} / rank {b['hc_rank']}\n\n"
        f"Signals:\n{evidence}\n\nFootprint:\n{footprint}\n"
    )
    msg = client.messages.create(
        model=PROFILE_MODEL, max_tokens=1200,
        messages=[{"role": "user", "content": prompt}],
    )
    body = "".join(block.text for block in msg.content if block.type == "text")
    header = (f"# {b['name']}\n\n**{b['sector']} · {b['town']}** · "
              f"rank {b['hc_rank']} (Q{b['quality']}×O{b['obscurity']})\n\n")
    return header + body
