// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

contract ECDSAVerifier {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    function verifySignature(address signer, bytes32 messageHash, bytes memory signature) public pure returns (bool) {
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);
        return recoveredSigner == signer;
    }
}
