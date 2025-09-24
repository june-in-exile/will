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

    function verifyCid(JsonCidVerifier.JsonObject memory, string memory) external view returns (bool) {
        if (shouldRevert) {
            revert("MockJsonCidVerifier: verifyCid reverted");
        }

        return shouldReturnTrue;
    }

    function verifyCid(JsonCidVerifier.TypedJsonObject memory, string memory) external view returns (bool) {
        if (shouldRevert) {
            revert("MockJsonCidVerifier: verifyCidTyped reverted");
        }

        return shouldReturnTrue;
    }
}
