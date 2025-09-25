// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { WillFactory } from "src/WillFactory.sol";

contract WillFactoryScript is Script {
    WillFactory public willFactory;
    address private _cidUploadVerifier;
    address private _willCreateVerifier;
    address private _jsonCidVerifier;
    address private _notary;
    address private _executor;
    address private _permit2;
    uint8 private _maxEstates;

    constructor() {
        _cidUploadVerifier = vm.envAddress("CID_UPLOAD_VERIFIER");
        _willCreateVerifier = vm.envAddress("WILL_CREATION_VERIFIER");
        _jsonCidVerifier = vm.envAddress("JSON_CID_VERIFIER");
        _notary = vm.envAddress("NOTARY");
        _executor = vm.envAddress("EXECUTOR");
        _permit2 = vm.envAddress("PERMIT2");
        _maxEstates = uint8(vm.envUint("MAX_ESTATES"));
    }

    function setUp() public { }

    function run() public {
        vm.startBroadcast();

        willFactory =
            new WillFactory(_cidUploadVerifier, _willCreateVerifier, _jsonCidVerifier, _notary, _executor, _permit2, _maxEstates);

        vm.stopBroadcast();
    }
}
