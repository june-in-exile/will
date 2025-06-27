// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {WillFactory} from "src/WillFactory.sol";

contract WillFactoryScript is Script {
    WillFactory public willFactory;
    address private _uploadCidVerifier;
    address private _createWillVerifier;
    address private _jsonCidVerifier;
    address private _executor;
    address private _permit2;

    constructor() {
        _uploadCidVerifier = vm.envAddress("UPLOAD_CID_VERIFIER");
        _createWillVerifier = vm.envAddress("CREATE_WILL_VERIFIER");
        _jsonCidVerifier = vm.envAddress("JSON_CID_VERIFIER");
        _executor = vm.envAddress("EXECUTOR");
        _permit2 = vm.envAddress("PERMIT2");
    }

    function setUp() public {}

    function run() public {
        vm.startBroadcast();

        willFactory = new WillFactory(
            _uploadCidVerifier,
            _createWillVerifier,
            _jsonCidVerifier,
            _executor,
            _permit2
        );

        vm.stopBroadcast();
    }
}
