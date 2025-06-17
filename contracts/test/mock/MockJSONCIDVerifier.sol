// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockJSONCIDVerifier {
    bool public shouldReturnTrue = true;
    string public reason = "";

    function setShouldReturnTrue(
        bool _shouldReturnTrue,
        string memory _reason
    ) external {
        shouldReturnTrue = _shouldReturnTrue;
        reason = _reason;
    }

    function verifyCID(
        string memory,
        string memory
    ) external view returns (bool, string memory) {
        return (shouldReturnTrue, reason);
    }
}