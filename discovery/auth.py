"""Email/password authentication.

Deliberately simple and dependency-light (bcrypt + PyJWT), consistent with the
project's free-first, no-vendor-lock-in approach — no third-party auth service,
just a `users` table in the same Postgres database plus stateless JWTs.

Tokens are verified by signature + expiry only (stateless); there is no
server-side session/blacklist store, so "logout" is client-side (discard the
token). That's an acceptable trade-off for an internal analyst dashboard, not a
public multi-tenant product.
"""
from __future__ import annotations

import os
import time

import bcrypt
import jwt

JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
TOKEN_TTL_SECONDS = 7 * 24 * 3600  # 7 days


class AuthError(Exception):
    """Raised for any authentication failure (bad credentials, expired/invalid token)."""


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        return False


def create_token(user_id: int, email: str) -> str:
    now = int(time.time())
    # "sub" must be a string per RFC 7519 (PyJWT enforces this) — cast back to
    # int in the caller (server.py's require_user) when reading it.
    payload = {"sub": str(user_id), "email": email, "iat": now, "exp": now + TOKEN_TTL_SECONDS}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError as e:
        raise AuthError(f"invalid or expired token: {e}") from e
