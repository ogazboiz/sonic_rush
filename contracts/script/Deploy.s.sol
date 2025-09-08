// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TimeFlowVault.sol";

contract DeployScript is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy TimeFlowVault with initial parameters
        string memory vaultName = "Sonic TimeFlow Vault";
        uint256 initialRewardRate = 1; // 0.01% per second (reasonable for testing)
        
        TimeFlowVault vault = new TimeFlowVault(vaultName, initialRewardRate);

        console.log("=== TimeFlowVault Deployment ===");
        console.log("Contract deployed to:", address(vault));
        console.log("Vault Name:", vaultName);
        console.log("Initial Reward Rate:", initialRewardRate, "basis points per second");
        console.log("Streaming Fee:", vault.STREAMING_FEE_BPS(), "basis points (0.1%)");
        console.log("Owner:", vault.owner());
        console.log("Deployment successful!");

        vm.stopBroadcast();
    }
}