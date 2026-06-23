// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {ChampionRegistry} from "../src/ChampionRegistry.sol";

contract ChampionRegistryTest is Test {
    ChampionRegistry registry;
    address owner = address(0xA11CE);
    address stranger = address(0xB0B);

    function setUp() public {
        registry = new ChampionRegistry(owner);
    }

    function test_PublishAndRead() public {
        bytes32 root = keccak256("root");
        vm.prank(owner);
        uint256 id = registry.publishEdition(root, 50, "ipfs://cid");
        assertEq(id, 0);
        assertEq(registry.editionCount(), 1);
        ChampionRegistry.Edition memory e = registry.latest();
        assertEq(e.merkleRoot, root);
        assertEq(e.count, 50);
    }

    function test_OnlyOwnerCanPublish() public {
        vm.prank(stranger);
        vm.expectRevert();
        registry.publishEdition(bytes32(0), 1, "x");
    }

    /// @dev Two-leaf tree: root = hashPair(leafA, leafB); proof for A is [leafB].
    function test_VerifyChampionMembership() public {
        bytes32 leafA = registry.championLeaf("Eldoret Agrovet Supplies", "ecommerce", 8480);
        bytes32 leafB = registry.championLeaf("Githunguri Dairy", "manufacturing", 7220);
        bytes32 root = _hashPair(leafA, leafB);

        vm.prank(owner);
        registry.publishEdition(root, 2, "ipfs://cid");

        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafB;
        assertTrue(registry.verifyChampion(0, "Eldoret Agrovet Supplies", "ecommerce", 8480, proof));
        // wrong score must fail
        assertFalse(registry.verifyChampion(0, "Eldoret Agrovet Supplies", "ecommerce", 9999, proof));
    }

    function _hashPair(bytes32 a, bytes32 b) private pure returns (bytes32) {
        return a < b ? keccak256(abi.encodePacked(a, b)) : keccak256(abi.encodePacked(b, a));
    }
}
