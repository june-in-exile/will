// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "src/JsonCidVerifier.sol";

contract MockJsonCidVerifier {
    bool public shouldReturnTrue = true;
    bool public shouldRevert = false;

    function setShouldReturnTrue(bool _shouldReturnTrue) external {
        shouldReturnTrue = _shouldReturnTrue;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function verifyCID(
        JsonCidVerifier.JsonObject memory,
        string memory
    ) external view returns (bool) {
        if (shouldRevert) {
            revert("MockJsonCidVerifier: verifyCID reverted");
        }

        return shouldReturnTrue;
    }

    function verifyCID(
        JsonCidVerifier.TypedJsonObject memory,
        string memory
    ) external view returns (bool) {
        if (shouldRevert) {
            revert("MockJsonCidVerifier: verifyCIDTyped reverted");
        }

        return shouldReturnTrue;
    }
}
