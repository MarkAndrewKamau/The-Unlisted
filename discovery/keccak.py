"""Self-contained Keccak-256 (Ethereum's hash, NOT NIST SHA3-256).

Bundled so the on-chain Merkle/leaf logic is reproducible and unit-testable with
zero third-party dependencies — the relayer needs `web3` only to *send* a
transaction, never to hash. Validated against known vectors in tests:

    keccak256(b"")    = c5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470
    keccak256(b"abc") = 4e03657aea45a94fc7d47ba826c8d667c0d1e6e33a64a036ec44f58fa12d6c45

The only difference from SHA3-256 is the domain-separation/padding byte (0x01 vs
0x06), so we implement the sponge directly rather than reaching for hashlib.sha3.
"""
from __future__ import annotations

_MASK64 = (1 << 64) - 1

_ROT = [
    [0, 36, 3, 41, 18],
    [1, 44, 10, 45, 2],
    [62, 6, 43, 15, 61],
    [28, 55, 25, 21, 56],
    [27, 20, 39, 8, 14],
]

_RC = [
    0x0000000000000001, 0x0000000000008082, 0x800000000000808A, 0x8000000080008000,
    0x000000000000808B, 0x0000000080000001, 0x8000000080008081, 0x8000000000008009,
    0x000000000000008A, 0x0000000000000088, 0x0000000080008009, 0x000000008000000A,
    0x000000008000808B, 0x800000000000008B, 0x8000000000008089, 0x8000000000008003,
    0x8000000000008002, 0x8000000000000080, 0x000000000000800A, 0x800000008000000A,
    0x8000000080008081, 0x8000000000008080, 0x0000000080000001, 0x8000000080008008,
]


def _rotl(x: int, n: int) -> int:
    n &= 63
    if n == 0:
        return x & _MASK64
    return ((x << n) | (x >> (64 - n))) & _MASK64


def _keccak_f(a: list[list[int]]) -> list[list[int]]:
    for rnd in range(24):
        # theta
        c = [a[x][0] ^ a[x][1] ^ a[x][2] ^ a[x][3] ^ a[x][4] for x in range(5)]
        d = [c[(x - 1) % 5] ^ _rotl(c[(x + 1) % 5], 1) for x in range(5)]
        for x in range(5):
            for y in range(5):
                a[x][y] ^= d[x]
        # rho + pi
        b = [[0] * 5 for _ in range(5)]
        for x in range(5):
            for y in range(5):
                b[y][(2 * x + 3 * y) % 5] = _rotl(a[x][y], _ROT[x][y])
        # chi
        for x in range(5):
            for y in range(5):
                a[x][y] = b[x][y] ^ ((~b[(x + 1) % 5][y]) & b[(x + 2) % 5][y])
        # iota
        a[0][0] ^= _RC[rnd]
    return a


def keccak256(data: bytes) -> bytes:
    rate = 136  # bytes (1088 bits) for 256-bit output
    msg = bytearray(data)
    # pad10*1 with Keccak domain byte 0x01
    msg.append(0x01)
    while len(msg) % rate != 0:
        msg.append(0x00)
    msg[-1] ^= 0x80

    state = [[0] * 5 for _ in range(5)]
    for off in range(0, len(msg), rate):
        block = msg[off:off + rate]
        for i in range(rate // 8):
            lane = int.from_bytes(block[i * 8:i * 8 + 8], "little")
            x, y = i % 5, i // 5
            state[x][y] ^= lane
        state = _keccak_f(state)

    out = bytearray()
    for i in range(4):  # 4 lanes = 32 bytes
        x, y = i % 5, i // 5
        out += state[x][y].to_bytes(8, "little")
    return bytes(out[:32])
