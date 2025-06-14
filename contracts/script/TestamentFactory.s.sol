// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {TestamentFactory} from "src/implementations/TestamentFactory.sol";

contract TestamentFactoryScript is Script {
    TestamentFactory public testamentFactory;
    address private _testatorVerifier;
    address private _decryptionVerifier;
    address private _jsonCidVerifier;
    address private _executor;

    constructor() {
        _testatorVerifier = vm.envAddress("PERMIT2_VERIFIER_ADDRESS");
        _decryptionVerifier = vm.envAddress("DECRYPTION_VERIFIER_ADDRESS");
        _jsonCidVerifier = vm.envAddress("JSON_CID_VERIFIER_ADDRESS");
        _executor = vm.envAddress("EXECUTOR");
    }

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        testamentFactory = new TestamentFactory(
            _testatorVerifier,
            _decryptionVerifier,
            _jsonCidVerifier,
            _executor
        );

        vm.stopBroadcast();
    }
}
