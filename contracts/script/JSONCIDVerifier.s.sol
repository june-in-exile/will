// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {JSONCIDVerifier} from "src/implementations/JSONCIDVerifier.sol";

contract JSONCIDVerifierScript is Script {
    JSONCIDVerifier public jsonCidVerifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        jsonCidVerifier = new JSONCIDVerifier();

        vm.stopBroadcast();
    }
}
