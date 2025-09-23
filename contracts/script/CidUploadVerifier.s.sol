// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { CidUploadVerifier, VerifierConstants1, VerifierConstants2 } from "src/CidUploadVerifier.sol";

contract CidUploadVerifierScript is Script {
    CidUploadVerifier public verifier;

    function setUp() public { }

    function run() public {
        vm.startBroadcast();

        VerifierConstants1 constants1 = new VerifierConstants1();
        VerifierConstants2 constants2 = new VerifierConstants2();

        verifier = new CidUploadVerifier(address(constants1), address(constants2));

        vm.stopBroadcast();
    }
}
