// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/implementations/ECDSAVerifier.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ECDSAVerifierTest is Test {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    ECDSAVerifier public verifier;
    uint256 private testPrivateKey;
    address private testSigner;

    function setUp() public {
        verifier = new ECDSAVerifier();
        testPrivateKey = 0x1654936181a635198cb5a8e9945f9a16267635d85be5100c5e85d88d4e5da788; // Just a random private key
        testSigner = vm.addr(testPrivateKey); // 0xB7C4508b4A6C83Dc66345C70759F19903fC5BF97
    }

    function testVerifyValidSignature() public view {
        string memory message = "bagaaieraniuiwhx5ie7otcziftldfqvsci5ff3t2tkex5jwk2pa7mca5vc4a";
        bytes32 messageHash = keccak256(bytes(message));
        console.log("messageHash:");
        console.logBytes32(messageHash);

        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        console.log("ethSignedHash:");
        console.logBytes32(ethSignedHash);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(testPrivateKey, ethSignedHash);
        bytes memory signature = abi.encodePacked(r, s, v);
        console.log("Signature:");
        console.logBytes(signature);

        bool isValid = verifier.verifySignature(testSigner, messageHash, signature);
        assertTrue(isValid, "Signature should be valid");
    }

    function testVerifyInvalidSignature() public view {
        string memory message = "bagaaieraniuiwhx5ie7otcziftldfqvsci5ff3t2tkex5jwk2pa7mca5vc4a";
        bytes32 messageHash = keccak256(bytes(message));

        uint256 fakePrivateKey = 0x1a3676c044154d66dc41dcdccdf7c31fc032d6fa2a092b666fa3def935337227;
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(fakePrivateKey, messageHash.toEthSignedMessageHash());
        bytes memory badSig = abi.encodePacked(r, s, v);

        bool isValid = verifier.verifySignature(testSigner, messageHash, badSig);
        assertFalse(isValid, "Signature should be invalid");
    }
}
