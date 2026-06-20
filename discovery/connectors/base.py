"""Connector interface shared by every data source."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator

from ..models import Business, Signal


@dataclass
class SeedRecord:
    """One candidate plus the raw signals a connector observed about it.

    `signals` are emitted without a business_id (we don't have one until the
    Business is persisted); the orchestrator fills it in after upsert.
    """
    business: Business
    signals: list[Signal]


class Connector:
    """Base class. Subclasses set `name` and implement `discover`."""

    name: str = "base"

    def __init__(self, sector: str, **kwargs):
        self.sector = sector
        self.kwargs = kwargs

    def discover(self) -> Iterator[SeedRecord]:
        """Yield candidate businesses with their observed signals."""
        raise NotImplementedError

    # convenience for subclasses
    def _signal(self, type_: str, value: float, url: str = "") -> Signal:
        return Signal(business_id=-1, type=type_, value=float(value), source=self.name, url=url)
