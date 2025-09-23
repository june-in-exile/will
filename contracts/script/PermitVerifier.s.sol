// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { PermitVerifier } from "src/PermitVerifier.sol";

contract PermitVerifierScript is Script {
    PermitVerifier public permitVerifier;

    function setUp() public { }

    function run() public {
        vm.startBroadcast();

        permitVerifier = new PermitVerifier();

        vm.stopBroadcast();
    }
}
