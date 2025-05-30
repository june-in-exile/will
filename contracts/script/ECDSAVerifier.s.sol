// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {ECDSAVerifier} from "src/implementations/ECDSAVerifier.sol";

contract ECDSAVerifierScript is Script {
    ECDSAVerifier public verifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        verifier = new ECDSAVerifier();

        vm.stopBroadcast();
    }
}
