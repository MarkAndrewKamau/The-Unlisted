# On-Chain Provenance (Avalanche Fuji)

Phase 1 of the Avalanche integration: **tamper-proof, timestamped provenance of
the Top-50**. Each published edition commits a Merkle root over the ranked list
(each leaf binds `name + sector + hc_rank`) plus an optional IPFS pointer to the
full profiles. Anyone can later prove a business was in a published edition — so
we can show the list wasn't edited or backfilled after the fact.

> The engine stays off-chain. We anchor *outputs*, not computation. No PII goes
> on-chain — only hashes and scores.

## Pieces

| Where | What |
|---|---|
| `src/ChampionRegistry.sol` | the contract: `publishEdition`, `verifyChampion`, `latest` |
| `discovery/onchain.py` | relayer: builds the Merkle tree, publishes the root, makes proofs |
| `discovery/keccak.py` | dependency-free Keccak-256 (so hashing/Merkle need no installs) |
| `server.py` `/api/onchain/*` | `status`, `publish`, `proof` endpoints |

The Solidity leaf and the Python leaf are byte-identical:
`keccak256(abi.encodePacked(name, 0x00, sector, 0x00, decimal(hcRankBps)))`,
and both use OpenZeppelin's sorted-pair `MerkleProof`. `hcRankBps` = `hc_rank ×
100` (84.8 → 8480), so the score is committed too — change a rank, the proof fails.

## Test the contract

```bash
cd onchain
forge install OpenZeppelin/openzeppelin-contracts foundry-rs/forge-std
forge test -vvv
```

## Deploy to Fuji

```bash
cp .env.example .env        # fill PRIVATE_KEY (testnet), get AVAX from the faucet
source .env
forge script script/Deploy.s.sol --rpc-url "$AVALANCHE_RPC_URL" --broadcast --private-key "$PRIVATE_KEY"
# copy the printed address into REGISTRY_ADDRESS (root .env too, for the relayer)
```

Faucet: https://faucet.avax.network/ · Explorer: https://testnet.snowtrace.io/

## Publish the Top-50 root

With `REGISTRY_ADDRESS` + `PRIVATE_KEY` set and `web3` installed:

```bash
curl -X POST localhost:8000/api/onchain/publish
# -> { "mode": "published", "root": "0x..", "tx_hash": "0x..", "explorer": "https://testnet.snowtrace.io/tx/0x.." }
```

Without config or `web3`, the same call returns `"mode": "dry-run"` with the
computed root — so the demo always works, even offline.

## Frontend badge (read-only first)

The simplest, highest-impact UI: a **"Verified on Avalanche ✓"** badge on the
Top-50 view linking to Snowtrace. No wallet needed.

```tsx
// fetch once, e.g. in the Top50 view
const res = await fetch(`${API_BASE}/api/onchain/status`);
const { configured, registry_address, current_root, chain_id } = await res.json();

{configured && (
  <a
    className="badge"
    href={`https://testnet.snowtrace.io/address/${registry_address}`}
    target="_blank" rel="noreferrer"
    title={`Top-50 Merkle root ${current_root}`}
  >
    ✓ Verified on Avalanche
  </a>
)}
```

For per-champion proof (Phase 1.5), call `/api/onchain/proof?name=..&sector=..`
and pass `proof` into `verifyChampion` via a read-only contract call (viem/ethers).

## Roadmap
- **Phase 2** — `DiscoveryBounty.sol`: incentivized referral submissions, scored
  off-chain, rewarded on verification (the exclusion gate = anti-sybil).
- **Phase 3** — founder profile claim + Kuzana membership credential.
