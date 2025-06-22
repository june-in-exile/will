// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TestamentFactory} from "src/TestamentFactory.sol";

contract TestamentFactoryScript is Script {
    TestamentFactory public testamentFactory;
    address private _uploadCIDVerifier;
    address private _createTestamentVerifier;
    address private _jsonCidVerifier;
    address private _executor;
    address private _permit2;

    constructor() {
        _uploadCIDVerifier = vm.envAddress("UPLOAD_CID_VERIFIER");
        _createTestamentVerifier = vm.envAddress("CREATE_TESTAMENT_VERIFIER");
        _jsonCidVerifier = vm.envAddress("JSON_CID_VERIFIER");
        _executor = vm.envAddress("EXECUTOR");
        _permit2 = vm.envAddress("PERMIT2");
    }

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        testamentFactory = new TestamentFactory(
            _uploadCIDVerifier,
            _createTestamentVerifier,
            _jsonCidVerifier,
            _executor,
            _permit2
        );

        vm.stopBroadcast();
    }
}
