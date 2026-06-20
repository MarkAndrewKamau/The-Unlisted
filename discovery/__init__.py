"""Kuzana Hidden Champions discovery engine.

A repeatable pipeline that surfaces exceptional Kenyan businesses the startup
ecosystem has missed, and ranks them by a two-axis model:

    Hidden-Champion rank = geometric_mean(Quality, Obscurity)

where Quality is built from public fundamentals signals (longevity, customer
satisfaction, operational consistency, growth, revenue proxies) and Obscurity
is the inverse of ecosystem footprint (press, funding, startup-event presence).
"""

__version__ = "0.1.0"
