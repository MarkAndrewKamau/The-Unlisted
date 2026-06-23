// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "openzeppelin-contracts/access/Ownable.sol";
import {MerkleProof} from "openzeppelin-contracts/utils/cryptography/MerkleProof.sol";
import {Strings} from "openzeppelin-contracts/utils/Strings.sol";

/// @title ChampionRegistry
/// @notice Tamper-proof, timestamped provenance for the "Hidden Champions" Top-50.
///         Each published edition stores a Merkle root over the ranked list plus a
///         pointer (IPFS CID) to the full off-chain profiles/evidence. Anyone can
///         later prove a given business was in a published edition — so we can show
///         we did not edit or backfill the list after the fact.
///
/// @dev    The list itself lives off-chain (no PII on a public ledger). The leaf is
///         keccak256(abi.encodePacked(name, 0x00, sector, 0x00, decimal(hcRankBps)))
///         which the off-chain relayer reproduces byte-for-byte. hcRankBps is the
///         hc_rank in basis points (e.g. 84.8 -> 8480) so the score is committed too.
contract ChampionRegistry is Ownable {
    struct Edition {
        bytes32 merkleRoot;
        uint256 count; // number of champions committed
        string ipfsCid; // off-chain list of profiles/evidence
        uint64 publishedAt; // block timestamp
    }

    Edition[] public editions;

    event EditionPublished(
        uint256 indexed editionId,
        bytes32 merkleRoot,
        uint256 count,
        string ipfsCid,
        uint64 publishedAt
    );

    constructor(address initialOwner) Ownable(initialOwner) {}

    /// @notice Publish a new edition of the Top-50. Owner-only (the research team).
    function publishEdition(bytes32 merkleRoot, uint256 count, string calldata ipfsCid)
        external
        onlyOwner
        returns (uint256 editionId)
    {
        editionId = editions.length;
        editions.push(Edition(merkleRoot, count, ipfsCid, uint64(block.timestamp)));
        emit EditionPublished(editionId, merkleRoot, count, ipfsCid, uint64(block.timestamp));
    }

    function editionCount() external view returns (uint256) {
        return editions.length;
    }

    function latest() external view returns (Edition memory) {
        require(editions.length > 0, "no editions");
        return editions[editions.length - 1];
    }

    /// @notice Deterministic leaf for a champion. Mirrored exactly by the relayer.
    function championLeaf(string memory name, string memory sector, uint256 hcRankBps)
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encodePacked(name, bytes1(0x00), sector, bytes1(0x00), Strings.toString(hcRankBps))
        );
    }

    /// @notice Prove a champion (by its raw fields) was committed in an edition.
    function verifyChampion(
        uint256 editionId,
        string calldata name,
        string calldata sector,
        uint256 hcRankBps,
        bytes32[] calldata proof
    ) external view returns (bool) {
        require(editionId < editions.length, "bad edition");
        bytes32 leaf = championLeaf(name, sector, hcRankBps);
        return MerkleProof.verify(proof, editions[editionId].merkleRoot, leaf);
    }

    /// @notice Lower-level membership check against a precomputed leaf.
    function verifyMembership(uint256 editionId, bytes32 leaf, bytes32[] calldata proof)
        external
        view
        returns (bool)
    {
        require(editionId < editions.length, "bad edition");
        return MerkleProof.verify(proof, editions[editionId].merkleRoot, leaf);
    }
}
