// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { WillFactory } from "src/WillFactory.sol";

contract WillFactoryScript is Script {
    WillFactory public willFactory;
    address private _cidUploadVerifier;
    address private _willCreateVerifier;
    address private _jsonCidVerifier;
    address private _executor;
    address private _permit2;

    constructor() {
        _cidUploadVerifier = vm.envAddress("CID_UPLOAD_VERIFIER");
        _willCreateVerifier = vm.envAddress("WILL_CREATION_VERIFIER");
        _jsonCidVerifier = vm.envAddress("JSON_CID_VERIFIER");
        _executor = vm.envAddress("EXECUTOR");
        _permit2 = vm.envAddress("PERMIT2");
    }

    function setUp() public { }

    function run() public {
        vm.startBroadcast();

        willFactory = new WillFactory(_cidUploadVerifier, _willCreateVerifier, _jsonCidVerifier, _executor, _permit2);

        vm.stopBroadcast();
    }
}
