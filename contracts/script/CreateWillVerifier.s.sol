// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {Groth16Verifier} from "src/CreateWillVerifier.sol";

contract CreateWillVerifierScript is Script {
    Groth16Verifier public verifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        verifier = new Groth16Verifier();

        vm.stopBroadcast();
    }
}
