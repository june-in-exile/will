// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {CIDVerifier} from "src/implementations/CIDVerifier.sol";

contract CIDVerifierScript is Script {
    CIDVerifier public cidVerifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        cidVerifier = new CIDVerifier();

        vm.stopBroadcast();
    }
}
