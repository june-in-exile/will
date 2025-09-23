// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { WillCreationVerifier, VerifierConstants1, VerifierConstants2 } from "src/WillCreationVerifier/WillCreationVerifier.sol";

contract WillCreationVerifierScript is Script {
    WillCreationVerifier public verifier;

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        VerifierConstants1 constants1 = new VerifierConstants1();
        VerifierConstants2 constants2 = new VerifierConstants2();

        verifier = new WillCreationVerifier(
            address(constants1),
            address(constants2)
        );

        vm.stopBroadcast();
    }
}
