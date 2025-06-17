// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "src/JSONCIDVerifier.sol";

contract MockJSONCIDVerifier {
    bool public shouldReturnTrue = true;
    bool public shouldRevert = false;

    function setShouldReturnTrue(bool _shouldReturnTrue) external {
        shouldReturnTrue = _shouldReturnTrue;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function verifyCID(
        JSONCIDVerifier.JsonObject memory,
        string memory
    ) external view returns (bool) {
        if (shouldRevert) {
            revert("MockJSONCIDVerifier: verifyCID reverted");
        }

        return shouldReturnTrue;
    }

    function verifyCID(
        JSONCIDVerifier.TypedJsonObject memory,
        string memory
    ) external view returns (bool) {
        if (shouldRevert) {
            revert("MockJSONCIDVerifier: verifyCIDTyped reverted");
        }

        return shouldReturnTrue;
    }
}
