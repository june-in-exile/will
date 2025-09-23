// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IVerifierConstants {
    function getIC(uint256 index) external pure returns (uint256 x, uint256 y);
    function getICCount() external pure returns (uint256);
    function getBatchIC(uint256 startIdx, uint256 count)
        external
        pure
        returns (uint256[] memory xs, uint256[] memory ys);
}
