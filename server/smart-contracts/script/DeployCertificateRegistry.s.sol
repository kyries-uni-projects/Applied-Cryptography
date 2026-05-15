// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/CertificateRegistry.sol";

contract DeployCertificateRegistry is Script {
    function run() external {
        vm.startBroadcast();
        CertificateRegistry registry = new CertificateRegistry();
        vm.stopBroadcast();

        console.log("CertificateRegistry deployed at:", address(registry));
        console.log("Deployer (owner):", msg.sender);
    }
}
