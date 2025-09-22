// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WillCreationVerifier} from "src/WillCreationVerifier.sol";

contract WillCreationVerifierScript is Script {
    WillCreationVerifier public verifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        verifier = new WillCreationVerifier();

        vm.stopBroadcast();
    }
}
