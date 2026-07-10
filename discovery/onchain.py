"""Avalanche relayer: anchor the Top-50 on-chain and prove membership.

This bridges the off-chain pipeline (the `Store`) to the `ChampionRegistry`
contract on Avalanche Fuji. It:

  1. builds a Merkle tree over the ranked Top-50 (leaf commits name+sector+rank),
  2. publishes the root (+ optional IPFS CID) via `publishEdition`, and
  3. produces per-champion proofs the frontend/Snowtrace can verify.

Hashing/Merkle are dependency-free (see keccak.py) and match the contract's
`abi.encodePacked(name, 0x00, sector, 0x00, decimal(hcRankBps))` leaf and OZ's
sorted-pair `MerkleProof`. Only *sending the transaction* needs `web3`; without
it (or without env config) `publish_edition` runs in dry-run mode and just
returns the root, so the pipeline never hard-depends on a chain being reachable.

Env:
    AVALANCHE_RPC_URL   default https://api.avax-test.network/ext/bc/C/rpc (Fuji)
    PRIVATE_KEY         deployer/owner key (publishing is owner-only)
    REGISTRY_ADDRESS    deployed ChampionRegistry address
"""
from __future__ import annotations

import os
from dataclasses import dataclass

from .keccak import keccak256
from .store import Store

FUJI_RPC = "https://api.avax-test.network/ext/bc/C/rpc"
FUJI_CHAIN_ID = 43113
SNOWTRACE_TX = "https://testnet.snowtrace.io/tx/"

# Minimal ABI — only what the relayer calls.
REGISTRY_ABI = [
    {"type": "function", "name": "publishEdition", "stateMutability": "nonpayable",
     "inputs": [{"name": "merkleRoot", "type": "bytes32"}, {"name": "count", "type": "uint256"},
                {"name": "ipfsCid", "type": "string"}],
     "outputs": [{"name": "editionId", "type": "uint256"}]},
    {"type": "function", "name": "editionCount", "stateMutability": "view",
     "inputs": [], "outputs": [{"name": "", "type": "uint256"}]},
]


def rank_to_bps(hc_rank: float) -> int:
    """hc_rank (e.g. 84.8) -> basis points (8480) so the score is committed too."""
    return int(round(float(hc_rank) * 100))


def champion_leaf(name: str, sector: str, hc_rank_bps: int) -> bytes:
    """Mirror of ChampionRegistry.championLeaf — must stay byte-identical."""
    packed = (name.encode() + b"\x00" + sector.encode() + b"\x00"
              + str(hc_rank_bps).encode())
    return keccak256(packed)


def _hash_pair(a: bytes, b: bytes) -> bytes:
    """OZ MerkleProof hashes the *sorted* pair (commutative)."""
    return keccak256(a + b) if a <= b else keccak256(b + a)


@dataclass
class MerkleResult:
    root: bytes
    leaves: list[bytes]
    proofs: dict[bytes, list[bytes]]  # leaf -> proof


def build_merkle(leaves: list[bytes]) -> MerkleResult:
    """OZ-compatible Merkle tree: sorted-pair hashing, odd node promoted."""
    if not leaves:
        return MerkleResult(b"\x00" * 32, [], {})
    # de-dup while preserving order (identical leaves would break proofs)
    seen: set[bytes] = set()
    uniq = [x for x in leaves if not (x in seen or seen.add(x))]

    proofs: dict[bytes, list[bytes]] = {leaf: [] for leaf in uniq}
    layer = list(uniq)
    # map each original leaf to its index in the current layer
    index = {leaf: i for i, leaf in enumerate(uniq)}
    tracked = {leaf: i for leaf, i in index.items()}

    while len(layer) > 1:
        nxt: list[bytes] = []
        for i in range(0, len(layer), 2):
            if i + 1 < len(layer):
                left, right = layer[i], layer[i + 1]
                parent = _hash_pair(left, right)
                # record sibling for any tracked leaf sitting in this pair
                for leaf, pos in tracked.items():
                    if pos == i:
                        proofs[leaf].append(right)
                    elif pos == i + 1:
                        proofs[leaf].append(left)
            else:
                parent = layer[i]  # odd one out, promoted unchanged
            nxt.append(parent)
        # recompute tracked positions for next layer
        tracked = {leaf: pos // 2 for leaf, pos in tracked.items()}
        layer = nxt
    return MerkleResult(layer[0], uniq, proofs)


def champions_merkle(store: Store, top_n: int = 50) -> tuple[MerkleResult, list[dict]]:
    """Build the Merkle tree for the current Top-N. Returns (tree, rows-as-dicts)."""
    rows = store.ranked()[:top_n]
    records = []
    leaves = []
    for r in rows:
        bps = rank_to_bps(r["hc_rank"])
        leaf = champion_leaf(r["name"], r["sector"], bps)
        leaves.append(leaf)
        records.append({"name": r["name"], "sector": r["sector"],
                        "hc_rank": r["hc_rank"], "hc_rank_bps": bps,
                        "leaf": "0x" + leaf.hex()})
    return build_merkle(leaves), records


# --- chain interaction -------------------------------------------------------
def _config() -> dict | None:
    addr = os.getenv("REGISTRY_ADDRESS")
    key = os.getenv("PRIVATE_KEY")
    if not addr or not key:
        return None
    return {"rpc": os.getenv("AVALANCHE_RPC_URL", FUJI_RPC), "address": addr, "key": key}


def publish_edition(store: Store, top_n: int = 50, ipfs_cid: str = "") -> dict:
    """Publish the Top-N Merkle root to ChampionRegistry.

    Returns a dict describing the result. Falls back to a dry-run (root computed,
    nothing sent) when web3 is missing or env is unconfigured, so callers can
    always show the root even without a live chain.
    """
    tree, records = champions_merkle(store, top_n)
    root_hex = "0x" + tree.root.hex()
    base = {"root": root_hex, "count": len(records), "champions": records}

    cfg = _config()
    if cfg is None:
        return {**base, "mode": "dry-run", "reason": "set REGISTRY_ADDRESS + PRIVATE_KEY to publish"}

    try:
        from web3 import Web3
    except ImportError:
        return {**base, "mode": "dry-run", "reason": "web3 not installed (pip install web3)"}

    w3 = Web3(Web3.HTTPProvider(cfg["rpc"]))
    if not w3.is_connected():
        return {**base, "mode": "dry-run", "reason": f"cannot reach RPC {cfg['rpc']}"}

    acct = w3.eth.account.from_key(cfg["key"])
    contract = w3.eth.contract(address=Web3.to_checksum_address(cfg["address"]), abi=REGISTRY_ABI)
    tx = contract.functions.publishEdition(tree.root, len(records), ipfs_cid).build_transaction({
        "from": acct.address,
        "nonce": w3.eth.get_transaction_count(acct.address),
        "chainId": w3.eth.chain_id,
    })
    signed = acct.sign_transaction(tx)
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return {**base, "mode": "published", "tx_hash": tx_hash.hex(),
            "block": receipt.blockNumber, "explorer": SNOWTRACE_TX + tx_hash.hex()}


def proof_for(store: Store, name: str, sector: str, top_n: int = 50) -> dict | None:
    """Return the Merkle proof for one champion (for frontend/on-chain verify)."""
    tree, records = champions_merkle(store, top_n)
    for rec in records:
        if rec["name"] == name and rec["sector"] == sector:
            leaf = bytes.fromhex(rec["leaf"][2:])
            return {**rec, "root": "0x" + tree.root.hex(),
                    "proof": ["0x" + p.hex() for p in tree.proofs.get(leaf, [])]}
    return None
