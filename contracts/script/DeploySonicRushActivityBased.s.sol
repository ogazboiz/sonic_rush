// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SonicRushActivityBased.sol";

contract DeploySonicRushActivityBasedScript is Script {
    function run() external returns (SonicRushActivityBased) {
        uint256 deployerPrivateKey = vm.envUint("MAINNET_PRIVATE_KEY");
        address charityAddress = vm.envAddress("MAINNET_CHARITY_ADDRESS");
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy SonicRush with:
        // - Vault name: "SonicRush"
        // - Base reward rate: 1 (basis points per hour for ~50% APY with activity)
        // - Charity address from environment
        SonicRushActivityBased sonicRush = new SonicRushActivityBased(
            "SonicRush",
            1,
            charityAddress
        );

        vm.stopBroadcast();

        console.log("SonicRush deployed to:", address(sonicRush));
        console.log("Owner:", sonicRush.owner());
        console.log("Charity:", sonicRush.charityAddress());
        console.log("Base Reward Rate:", sonicRush.baseRewardRate());

        return sonicRush;
    }
}