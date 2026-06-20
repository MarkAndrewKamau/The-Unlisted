"""Source connectors.

Each connector implements `Connector` and yields `(Business, [Signal])` records.
Add a new source by dropping a module here and registering it in REGISTRY.
"""
from .base import Connector, SeedRecord
from .jumia import JumiaConnector
from .sample import SampleConnector

# name -> connector factory. `run.py seed --source <name>` looks here.
REGISTRY: dict[str, type[Connector]] = {
    "sample": SampleConnector,
    "jumia": JumiaConnector,
}

__all__ = ["Connector", "SeedRecord", "REGISTRY"]
