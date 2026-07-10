"""SQLite persistence. Stdlib only, no ORM.

Tables mirror models.py. `signal` and `footprint` are append-only evidence logs
so the pipeline is auditable and re-runnable; `score` and `profile` are derived
and get overwritten on recompute.
"""
from __future__ import annotations

import sqlite3
from pathlib import Path

from .models import Business, Footprint, Score, Signal, now_iso

SCHEMA = """
CREATE TABLE IF NOT EXISTS business (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    sector        TEXT NOT NULL,
    town          TEXT,
    source        TEXT,
    website       TEXT,
    registry_year INTEGER,
    created_at    TEXT,
    UNIQUE(name, sector)
);
CREATE TABLE IF NOT EXISTS signal (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES business(id),
    type        TEXT NOT NULL,
    value       REAL NOT NULL,
    source      TEXT,
    url         TEXT,
    captured_at TEXT
);
CREATE TABLE IF NOT EXISTS footprint (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    business_id INTEGER NOT NULL REFERENCES business(id),
    source      TEXT NOT NULL,
    hits        INTEGER NOT NULL,
    url         TEXT,
    captured_at TEXT
);
CREATE TABLE IF NOT EXISTS score (
    business_id     INTEGER PRIMARY KEY REFERENCES business(id),
    quality         REAL,
    obscurity       REAL,
    hc_rank         REAL,
    disqualified    INTEGER DEFAULT 0,
    reason          TEXT,
    dimensions_json TEXT,
    computed_at     TEXT
);
CREATE TABLE IF NOT EXISTS profile (
    business_id INTEGER PRIMARY KEY REFERENCES business(id),
    markdown    TEXT,
    computed_at TEXT
);
CREATE TABLE IF NOT EXISTS outreach (
    business_id INTEGER PRIMARY KEY REFERENCES business(id),
    status      TEXT NOT NULL DEFAULT 'identified',
    notes       TEXT DEFAULT '',
    updated_at  TEXT
);
CREATE TABLE IF NOT EXISTS review (
    business_id  INTEGER PRIMARY KEY REFERENCES business(id),
    disqualified INTEGER DEFAULT 0,
    reason       TEXT DEFAULT '',
    verified     INTEGER DEFAULT 0,
    updated_at   TEXT
);
CREATE TABLE IF NOT EXISTS activity (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      TEXT NOT NULL,
    message TEXT NOT NULL,
    tone    TEXT NOT NULL DEFAULT 'info'
);
"""


class Store:
    def __init__(self, path: str = "champions.db"):
        self.path = path
        Path(path).parent.mkdir(parents=True, exist_ok=True) if Path(path).parent != Path("") else None
        self.conn = sqlite3.connect(path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.executescript(SCHEMA)
        self.conn.commit()

    # --- writes --------------------------------------------------------------
    def upsert_business(self, b: Business) -> int:
        """Insert or fetch a candidate; returns its id. Dedup is by (name, sector)."""
        cur = self.conn.execute(
            "INSERT OR IGNORE INTO business(name, sector, town, source, website, registry_year, created_at)"
            " VALUES (?,?,?,?,?,?,?)",
            (b.name, b.sector, b.town, b.source, b.website, b.registry_year, b.created_at),
        )
        if cur.lastrowid and cur.rowcount:
            self.conn.commit()
            return cur.lastrowid
        row = self.conn.execute(
            "SELECT id FROM business WHERE name=? AND sector=?", (b.name, b.sector)
        ).fetchone()
        return row["id"]

    def add_signal(self, s: Signal) -> None:
        self.conn.execute(
            "INSERT INTO signal(business_id, type, value, source, url, captured_at) VALUES (?,?,?,?,?,?)",
            (s.business_id, s.type, s.value, s.source, s.url, s.captured_at),
        )
        self.conn.commit()

    def add_footprint(self, f: Footprint) -> None:
        self.conn.execute(
            "INSERT INTO footprint(business_id, source, hits, url, captured_at) VALUES (?,?,?,?,?)",
            (f.business_id, f.source, f.hits, f.url, f.captured_at),
        )
        self.conn.commit()

    def put_score(self, s: Score) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO score(business_id, quality, obscurity, hc_rank, disqualified, reason, dimensions_json, computed_at)"
            " VALUES (?,?,?,?,?,?,?,?)",
            (s.business_id, s.quality, s.obscurity, s.hc_rank, s.disqualified, s.reason,
             s.dimensions_json, s.computed_at),
        )
        self.conn.commit()

    def put_profile(self, business_id: int, markdown: str, computed_at: str) -> None:
        self.conn.execute(
            "INSERT OR REPLACE INTO profile(business_id, markdown, computed_at) VALUES (?,?,?)",
            (business_id, markdown, computed_at),
        )
        self.conn.commit()

    # --- reads ---------------------------------------------------------------
    def businesses(self, sector: str | None = None) -> list[sqlite3.Row]:
        if sector:
            return self.conn.execute("SELECT * FROM business WHERE sector=?", (sector,)).fetchall()
        return self.conn.execute("SELECT * FROM business").fetchall()

    def latest_signals(self, business_id: int) -> dict[str, sqlite3.Row]:
        """Most recent value per signal type for one business."""
        rows = self.conn.execute(
            "SELECT * FROM signal WHERE business_id=? ORDER BY captured_at", (business_id,)
        ).fetchall()
        return {r["type"]: r for r in rows}  # later rows overwrite -> latest wins

    def total_footprint(self, business_id: int) -> int:
        row = self.conn.execute(
            "SELECT COALESCE(SUM(hits),0) AS h FROM footprint WHERE business_id=?", (business_id,)
        ).fetchone()
        return int(row["h"])

    def footprint_sources(self, business_id: int) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM footprint WHERE business_id=?", (business_id,)
        ).fetchall()

    def ranked(self, sector: str | None = None, include_disqualified: bool = False) -> list[sqlite3.Row]:
        q = (
            "SELECT b.*, s.quality, s.obscurity, s.hc_rank, s.disqualified, s.reason, s.dimensions_json "
            "FROM business b JOIN score s ON s.business_id = b.id"
        )
        clauses = []
        params: list = []
        if sector:
            clauses.append("b.sector = ?")
            params.append(sector)
        if not include_disqualified:
            clauses.append("s.disqualified = 0")
        if clauses:
            q += " WHERE " + " AND ".join(clauses)
        q += " ORDER BY s.hc_rank DESC"
        return self.conn.execute(q, params).fetchall()

    def by_id(self, business_id: int) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT b.*, s.quality, s.obscurity, s.hc_rank, s.disqualified, s.reason, s.dimensions_json "
            "FROM business b LEFT JOIN score s ON s.business_id = b.id WHERE b.id = ?",
            (business_id,),
        ).fetchone()

    # --- outreach --------------------------------------------------------------
    def upsert_outreach(self, business_id: int, status: str | None = None, notes: str | None = None) -> None:
        existing = self.conn.execute(
            "SELECT * FROM outreach WHERE business_id=?", (business_id,)
        ).fetchone()
        if existing is None:
            self.conn.execute(
                "INSERT INTO outreach(business_id, status, notes, updated_at) VALUES (?,?,?,?)",
                (business_id, status or "identified", notes or "", now_iso()),
            )
        else:
            new_status = status if status is not None else existing["status"]
            new_notes = notes if notes is not None else existing["notes"]
            self.conn.execute(
                "UPDATE outreach SET status=?, notes=?, updated_at=? WHERE business_id=?",
                (new_status, new_notes, now_iso(), business_id),
            )
        self.conn.commit()

    def ensure_outreach_seeded(self, business_ids: list[int]) -> None:
        """Create an 'identified' row for any of these ids that don't have one yet."""
        for bid in business_ids:
            row = self.conn.execute("SELECT 1 FROM outreach WHERE business_id=?", (bid,)).fetchone()
            if row is None:
                self.conn.execute(
                    "INSERT INTO outreach(business_id, status, notes, updated_at) VALUES (?,?,?,?)",
                    (bid, "identified", "", now_iso()),
                )
        self.conn.commit()

    def list_outreach(self) -> list[sqlite3.Row]:
        return self.conn.execute("SELECT * FROM outreach").fetchall()

    def get_outreach(self, business_id: int) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM outreach WHERE business_id=?", (business_id,)
        ).fetchone()

    # --- manual review overrides ------------------------------------------------
    def set_override(self, business_id: int, disqualified: int | None = None,
                      reason: str | None = None, verified: int | None = None) -> None:
        existing = self.conn.execute(
            "SELECT * FROM review WHERE business_id=?", (business_id,)
        ).fetchone()
        if existing is None:
            self.conn.execute(
                "INSERT INTO review(business_id, disqualified, reason, verified, updated_at) VALUES (?,?,?,?,?)",
                (business_id, disqualified or 0, reason or "", verified or 0, now_iso()),
            )
        else:
            new_dq = disqualified if disqualified is not None else existing["disqualified"]
            new_reason = reason if reason is not None else existing["reason"]
            new_verified = verified if verified is not None else existing["verified"]
            self.conn.execute(
                "UPDATE review SET disqualified=?, reason=?, verified=?, updated_at=? WHERE business_id=?",
                (new_dq, new_reason, new_verified, now_iso(), business_id),
            )
        self.conn.commit()

    def overrides(self) -> dict[int, sqlite3.Row]:
        rows = self.conn.execute("SELECT * FROM review").fetchall()
        return {r["business_id"]: r for r in rows}

    def get_override(self, business_id: int) -> sqlite3.Row | None:
        return self.conn.execute(
            "SELECT * FROM review WHERE business_id=?", (business_id,)
        ).fetchone()

    # --- activity log ------------------------------------------------------------
    def add_activity(self, message: str, tone: str = "info") -> None:
        self.conn.execute(
            "INSERT INTO activity(ts, message, tone) VALUES (?,?,?)",
            (now_iso(), message, tone),
        )
        self.conn.commit()

    def list_activity(self, limit: int = 50) -> list[sqlite3.Row]:
        return self.conn.execute(
            "SELECT * FROM activity ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()

    def close(self) -> None:
        self.conn.close()
