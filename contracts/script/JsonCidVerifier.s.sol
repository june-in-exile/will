// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { JsonCidVerifier } from "src/JsonCidVerifier.sol";

contract JsonCidVerifierScript is Script {
    JsonCidVerifier public jsonCidVerifier;

    function setUp() public { }

    function run() public {
        vm.startBroadcast();

        jsonCidVerifier = new JsonCidVerifier();

        vm.stopBroadcast();
    }
}
