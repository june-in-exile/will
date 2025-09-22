// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.7.0 <0.9.0;

import "forge-std/Script.sol";
import {VerifierConstants1} from "./VerifierConstants1.sol";
import {VerifierConstants2} from "./VerifierConstants2.sol";
import {VerifierConstants3} from "./VerifierConstants3.sol";
import { WillCreationVerifier } from "./WillCreationVerifier.sol";

contract DeployVerifierScript is Script {
    function run() external {
        vm.startBroadcast();

        // Deploy constants contracts
        VerifierConstants1 constants1 = new VerifierConstants1();
        VerifierConstants2 constants2 = new VerifierConstants2();
        VerifierConstants3 constants3 = new VerifierConstants3();

        console.log("Constants1 deployed at:", address(constants1));
        console.log("Constants2 deployed at:", address(constants2));
        console.log("Constants3 deployed at:", address(constants3));

        // Deploy main verifier
        WillCreationVerifier verifier = new WillCreationVerifier(
            address(constants1),
            address(constants2),
            address(constants3)
        );

        console.log("Main verifier deployed at:", address(verifier));

        vm.stopBroadcast();
    }
}