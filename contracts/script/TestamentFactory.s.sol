// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.21;

import {Script, console} from "forge-std/Script.sol";
import {TestamentFactory} from "src/TestamentFactory.sol";

contract TestamentFactoryScript is Script {
    TestamentFactory public testamentFactory;
    address private _testatorVerifier;
    address private _decryptionVerifier;
    address private _jsonCidVerifier;
    address private _executor;
    address private _permit2;

    constructor() {
        _testatorVerifier = vm.envAddress("PERMIT2_VERIFIER_ADDRESS");
        _decryptionVerifier = vm.envAddress("DECRYPTION_VERIFIER_ADDRESS");
        _jsonCidVerifier = vm.envAddress("JSON_CID_VERIFIER_ADDRESS");
        _executor = vm.envAddress("EXECUTOR");
        _permit2 = vm.envAddress("PERMIT2_ADDRESS");
    }

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        testamentFactory = new TestamentFactory(
            _testatorVerifier,
            _decryptionVerifier,
            _jsonCidVerifier,
            _executor,
            _permit2
        );

        vm.stopBroadcast();
    }
}
