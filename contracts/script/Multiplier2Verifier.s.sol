// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

// import { Script, console } from "forge-std/Script.sol";
// import { Multiplier2Verifier } from "src/Multiplier2Verifier.sol";

// contract Multiplier2VerifierScript is Script {
//     Multiplier2Verifier public verifier;

//     function setUp() public { }

//     function run() public {
//         vm.startBroadcast();

//         verifier = new Multiplier2Verifier();

//         vm.stopBroadcast();
//     }
// }

import { Script, console } from "forge-std/Script.sol";
import { Multiplier2Verifier, VerifierConstants1 } from "src/Multiplier2Verifier/Multiplier2Verifier.sol";

contract Multiplier2VerifierScript is Script {
    Multiplier2Verifier public verifier;

    function setUp() public { }

    function run() public {
        vm.startBroadcast();

        VerifierConstants1 constants1 = new VerifierConstants1();

        verifier = new Multiplier2Verifier(address(constants1));

        vm.stopBroadcast();
    }
}
