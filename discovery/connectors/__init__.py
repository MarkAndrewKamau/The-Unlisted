"""Source connectors.

Each connector implements `Connector` and yields `(Business, [Signal])` records.
Add a new source by dropping a module here and registering it in REGISTRY.
"""
from .base import Connector, SeedRecord
from .jumia import JumiaConnector
from .kam import KAMConnector
from .sample import SampleConnector
from .tenders import TendersConnector

# name -> connector factory. `run.py seed --source <name>` looks here.
REGISTRY: dict[str, type[Connector]] = {
    "sample": SampleConnector,
    "jumia": JumiaConnector,      # e-commerce sellers (customer signal)
    "kam": KAMConnector,          # manufacturing membership (vetted, fundamentals)
    "tenders": TendersConnector,  # public tender awards (revenue proxy)
}

__all__ = ["Connector", "SeedRecord", "REGISTRY"]
