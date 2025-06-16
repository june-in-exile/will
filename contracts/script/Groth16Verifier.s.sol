// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {Groth16Verifier} from "src/Groth16Verifier.sol";

contract Groth16VerifierScript is Script {
    Groth16Verifier public verifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        verifier = new Groth16Verifier();

        vm.stopBroadcast();
    }
}
