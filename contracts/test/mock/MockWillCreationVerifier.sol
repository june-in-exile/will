// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockWillCreationVerifier {
    bool public shouldReturnTrue = true;

    function setShouldReturnTrue(bool _shouldReturnTrue) external {
        shouldReturnTrue = _shouldReturnTrue;
    }

    function verifyProof(uint256[2] calldata, uint256[2][2] calldata, uint256[2] calldata, uint256[292] calldata)
        external
        view
        returns (bool)
    {
        return shouldReturnTrue;
    }
}
