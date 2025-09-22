// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CidUploadVerifier} from "src/CidUploadVerifier.sol";

contract CidUploadVerifierScript is Script {
    CidUploadVerifier public verifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        verifier = new CidUploadVerifier();

        vm.stopBroadcast();
    }
}
