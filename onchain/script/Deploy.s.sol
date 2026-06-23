// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {ChampionRegistry} from "../src/ChampionRegistry.sol";

/// @notice Deploys ChampionRegistry. Owner defaults to the deployer (the address
///         derived from PRIVATE_KEY), or REGISTRY_OWNER if set.
///
/// Usage (Fuji):
///   forge script script/Deploy.s.sol \
///     --rpc-url $AVALANCHE_RPC_URL --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    function run() external returns (ChampionRegistry registry) {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address owner = vm.envOr("REGISTRY_OWNER", vm.addr(pk));
        vm.startBroadcast(pk);
        registry = new ChampionRegistry(owner);
        vm.stopBroadcast();
        console2.log("ChampionRegistry deployed at:", address(registry));
        console2.log("Owner:", owner);
    }
}
