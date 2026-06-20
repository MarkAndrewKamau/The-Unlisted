"""Offline fixture connector.

Reads data/sample_businesses.json so the whole pipeline runs end-to-end with no
network — useful for development, CI, and demoing the scoring/ranking logic.
The fixtures deliberately include two ecosystem-famous companies (Twiga, Sendy)
so you can watch the Obscurity gate disqualify them.

It also seeds footprint counts (via the `_footprint` side-channel the orchestrator
reads) so `score` works without a live footprint stage.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Iterator

from ..models import Business, Footprint, Signal
from .base import Connector, SeedRecord

DATA = Path(__file__).resolve().parents[2] / "data" / "sample_businesses.json"


class SampleConnector(Connector):
    name = "sample"

    def discover(self) -> Iterator[SeedRecord]:
        records = json.loads(DATA.read_text())
        for rec in records:
            if self.sector and rec["sector"] != self.sector:
                continue
            biz = Business(
                name=rec["name"],
                sector=rec["sector"],
                town=rec.get("town", ""),
                website=rec.get("website", ""),
                registry_year=rec.get("registry_year"),
                source=self.name,
            )
            signals = [
                Signal(business_id=-1, type=k, value=float(v), source=self.name)
                for k, v in rec.get("signals", {}).items()
            ]
            sr = SeedRecord(business=biz, signals=signals)
            # stash footprint so the orchestrator can persist it (sample mode only)
            sr.footprint = [  # type: ignore[attr-defined]
                Footprint(business_id=-1, source=k, hits=int(v))
                for k, v in rec.get("footprint", {}).items()
            ]
            yield sr
