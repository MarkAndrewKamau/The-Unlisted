"""Postgres persistence (Neon). No ORM — plain SQL via psycopg.

Tables mirror models.py. `signal` and `footprint` are append-only evidence logs
so the pipeline is auditable and re-runnable; `score` and `profile` are derived
and get overwritten on recompute.
"""
from __future__ import annotations

import psycopg
from psycopg.rows import dict_row

from .models import Business, Footprint, Score, Signal, now_iso

SCHEMA = """
CREATE TABLE IF NOT EXISTS business (
    id            SERIAL PRIMARY KEY,
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
    id          SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES business(id),
    type        TEXT NOT NULL,
    value       REAL NOT NULL,
    source      TEXT,
    url         TEXT,
    captured_at TEXT
);
CREATE TABLE IF NOT EXISTS footprint (
    id          SERIAL PRIMARY KEY,
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
    id      SERIAL PRIMARY KEY,
    ts      TEXT NOT NULL,
    message TEXT NOT NULL,
    tone    TEXT NOT NULL DEFAULT 'info'
);
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    role          TEXT NOT NULL DEFAULT 'analyst',
    created_at    TEXT
);
"""


class Store:
    def __init__(self, dsn: str):
        self.dsn = dsn
        self.conn = psycopg.connect(dsn, row_factory=dict_row, autocommit=False)
        self.conn.execute(SCHEMA)
        self.conn.commit()

    # --- writes --------------------------------------------------------------
    def upsert_business(self, b: Business) -> int:
        """Insert or fetch a candidate; returns its id. Dedup is by (name, sector).
        Does not commit — see add_signal; caller commits once the business's
        signals/footprint are attached too, so a business persists atomically
        with its evidence."""
        row = self.conn.execute(
            "INSERT INTO business(name, sector, town, source, website, registry_year, created_at)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s)"
            " ON CONFLICT (name, sector) DO NOTHING RETURNING id",
            (b.name, b.sector, b.town, b.source, b.website, b.registry_year, b.created_at),
        ).fetchone()
        if row:
            return row["id"]
        row = self.conn.execute(
            "SELECT id FROM business WHERE name=%s AND sector=%s", (b.name, b.sector)
        ).fetchone()
        return row["id"]

    def add_signal(self, s: Signal) -> None:
        """Does not commit — these are written in tight per-business loops during
        seed/enrich stages; call `store.commit()` once per business/batch instead
        of paying a network round-trip per row."""
        self.conn.execute(
            "INSERT INTO signal(business_id, type, value, source, url, captured_at) VALUES (%s,%s,%s,%s,%s,%s)",
            (s.business_id, s.type, s.value, s.source, s.url, s.captured_at),
        )

    def add_footprint(self, f: Footprint) -> None:
        """Does not commit — see add_signal."""
        self.conn.execute(
            "INSERT INTO footprint(business_id, source, hits, url, captured_at) VALUES (%s,%s,%s,%s,%s)",
            (f.business_id, f.source, f.hits, f.url, f.captured_at),
        )

    def clear_footprint(self, business_id: int) -> None:
        """Drop a business's footprint rows so re-running the gate doesn't double-count
        (total_footprint SUMs hits). Does not commit — see add_signal."""
        self.conn.execute("DELETE FROM footprint WHERE business_id=%s", (business_id,))

    def put_score(self, s: Score) -> None:
        """Does not commit — see add_signal; score_sector() commits once per sector."""
        self.conn.execute(
            "INSERT INTO score(business_id, quality, obscurity, hc_rank, disqualified, reason, dimensions_json, computed_at)"
            " VALUES (%s,%s,%s,%s,%s,%s,%s,%s)"
            " ON CONFLICT (business_id) DO UPDATE SET"
            " quality=EXCLUDED.quality, obscurity=EXCLUDED.obscurity, hc_rank=EXCLUDED.hc_rank,"
            " disqualified=EXCLUDED.disqualified, reason=EXCLUDED.reason,"
            " dimensions_json=EXCLUDED.dimensions_json, computed_at=EXCLUDED.computed_at",
            (s.business_id, s.quality, s.obscurity, s.hc_rank, s.disqualified, s.reason,
             s.dimensions_json, s.computed_at),
        )

    def put_profile(self, business_id: int, markdown: str, computed_at: str) -> None:
        """Does not commit — see add_signal; profile.generate() commits once per sector."""
        self.conn.execute(
            "INSERT INTO profile(business_id, markdown, computed_at) VALUES (%s,%s,%s)"
            " ON CONFLICT (business_id) DO UPDATE SET"
            " markdown=EXCLUDED.markdown, computed_at=EXCLUDED.computed_at",
            (business_id, markdown, computed_at),
        )

    def commit(self) -> None:
        self.conn.commit()

    # --- reads ---------------------------------------------------------------
    def businesses(self, sector: str | None = None) -> list[dict]:
        if sector:
            return self.conn.execute("SELECT * FROM business WHERE sector=%s", (sector,)).fetchall()
        return self.conn.execute("SELECT * FROM business").fetchall()

    def latest_signals(self, business_id: int) -> dict[str, dict]:
        """Most recent value per signal type for one business."""
        rows = self.conn.execute(
            "SELECT * FROM signal WHERE business_id=%s ORDER BY captured_at", (business_id,)
        ).fetchall()
        return {r["type"]: r for r in rows}  # later rows overwrite -> latest wins

    def total_footprint(self, business_id: int) -> int:
        row = self.conn.execute(
            "SELECT COALESCE(SUM(hits),0) AS h FROM footprint WHERE business_id=%s", (business_id,)
        ).fetchone()
        return int(row["h"])

    def footprint_sources(self, business_id: int) -> list[dict]:
        return self.conn.execute(
            "SELECT * FROM footprint WHERE business_id=%s", (business_id,)
        ).fetchall()

    def ranked(self, sector: str | None = None, include_disqualified: bool = False) -> list[dict]:
        q = (
            "SELECT b.*, s.quality, s.obscurity, s.hc_rank, s.disqualified, s.reason, s.dimensions_json "
            "FROM business b JOIN score s ON s.business_id = b.id"
        )
        clauses = []
        params: list = []
        if sector:
            clauses.append("b.sector = %s")
            params.append(sector)
        if not include_disqualified:
            clauses.append("s.disqualified = 0")
        if clauses:
            q += " WHERE " + " AND ".join(clauses)
        q += " ORDER BY s.hc_rank DESC"
        return self.conn.execute(q, params).fetchall()

    def by_id(self, business_id: int) -> dict | None:
        return self.conn.execute(
            "SELECT b.*, s.quality, s.obscurity, s.hc_rank, s.disqualified, s.reason, s.dimensions_json "
            "FROM business b LEFT JOIN score s ON s.business_id = b.id WHERE b.id = %s",
            (business_id,),
        ).fetchone()

    # --- outreach --------------------------------------------------------------
    def upsert_outreach(self, business_id: int, status: str | None = None, notes: str | None = None) -> None:
        existing = self.conn.execute(
            "SELECT * FROM outreach WHERE business_id=%s", (business_id,)
        ).fetchone()
        if existing is None:
            self.conn.execute(
                "INSERT INTO outreach(business_id, status, notes, updated_at) VALUES (%s,%s,%s,%s)",
                (business_id, status or "identified", notes or "", now_iso()),
            )
        else:
            new_status = status if status is not None else existing["status"]
            new_notes = notes if notes is not None else existing["notes"]
            self.conn.execute(
                "UPDATE outreach SET status=%s, notes=%s, updated_at=%s WHERE business_id=%s",
                (new_status, new_notes, now_iso(), business_id),
            )
        self.conn.commit()

    def ensure_outreach_seeded(self, business_ids: list[int]) -> None:
        """Create an 'identified' row for any of these ids that don't have one yet."""
        for bid in business_ids:
            row = self.conn.execute("SELECT 1 FROM outreach WHERE business_id=%s", (bid,)).fetchone()
            if row is None:
                self.conn.execute(
                    "INSERT INTO outreach(business_id, status, notes, updated_at) VALUES (%s,%s,%s,%s)",
                    (bid, "identified", "", now_iso()),
                )
        self.conn.commit()

    def list_outreach(self) -> list[dict]:
        return self.conn.execute("SELECT * FROM outreach").fetchall()

    def get_outreach(self, business_id: int) -> dict | None:
        return self.conn.execute(
            "SELECT * FROM outreach WHERE business_id=%s", (business_id,)
        ).fetchone()

    # --- manual review overrides ------------------------------------------------
    def set_override(self, business_id: int, disqualified: int | None = None,
                      reason: str | None = None, verified: int | None = None) -> None:
        existing = self.conn.execute(
            "SELECT * FROM review WHERE business_id=%s", (business_id,)
        ).fetchone()
        if existing is None:
            self.conn.execute(
                "INSERT INTO review(business_id, disqualified, reason, verified, updated_at) VALUES (%s,%s,%s,%s,%s)",
                (business_id, disqualified or 0, reason or "", verified or 0, now_iso()),
            )
        else:
            new_dq = disqualified if disqualified is not None else existing["disqualified"]
            new_reason = reason if reason is not None else existing["reason"]
            new_verified = verified if verified is not None else existing["verified"]
            self.conn.execute(
                "UPDATE review SET disqualified=%s, reason=%s, verified=%s, updated_at=%s WHERE business_id=%s",
                (new_dq, new_reason, new_verified, now_iso(), business_id),
            )
        self.conn.commit()

    def overrides(self) -> dict[int, dict]:
        rows = self.conn.execute("SELECT * FROM review").fetchall()
        return {r["business_id"]: r for r in rows}

    def get_override(self, business_id: int) -> dict | None:
        return self.conn.execute(
            "SELECT * FROM review WHERE business_id=%s", (business_id,)
        ).fetchone()

    # --- activity log ------------------------------------------------------------
    def add_activity(self, message: str, tone: str = "info") -> None:
        self.conn.execute(
            "INSERT INTO activity(ts, message, tone) VALUES (%s,%s,%s)",
            (now_iso(), message, tone),
        )
        self.conn.commit()

    def list_activity(self, limit: int = 50) -> list[dict]:
        return self.conn.execute(
            "SELECT * FROM activity ORDER BY id DESC LIMIT %s", (limit,)
        ).fetchall()

    # --- users -------------------------------------------------------------------
    def create_user(self, email: str, password_hash: str, name: str = "", role: str = "analyst") -> dict | None:
        """Returns the new user row, or None if the email is already registered."""
        row = self.conn.execute(
            "INSERT INTO users(email, password_hash, name, role, created_at) VALUES (%s,%s,%s,%s,%s)"
            " ON CONFLICT (email) DO NOTHING RETURNING id, email, name, role, created_at",
            (email.lower().strip(), password_hash, name, role, now_iso()),
        ).fetchone()
        if row:
            self.conn.commit()
        return row

    def get_user_by_email(self, email: str) -> dict | None:
        return self.conn.execute(
            "SELECT * FROM users WHERE email=%s", (email.lower().strip(),)
        ).fetchone()

    def get_user_by_id(self, user_id: int) -> dict | None:
        return self.conn.execute(
            "SELECT * FROM users WHERE id=%s", (user_id,)
        ).fetchone()

    def close(self) -> None:
        self.conn.close()
