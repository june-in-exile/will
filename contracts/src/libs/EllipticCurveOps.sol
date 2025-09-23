// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EllipticCurveOps {
    // BN254/alt_bn128 curve parameters

    // Base field size (for x, y coordinates)
    uint256 constant FIELD_ORDER = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    // Scalar field size (order of the prime subgroup)
    uint256 constant CURVE_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    error CoordOutOfRange(string coord, uint256 value);
    error ScalarOutOfRange(uint256 scalar);
    error ICNotOnCurve(uint256 x, uint256 y);
    error PrecompileFailed(uint256 opcode);

    /**
     * @dev Add two elliptic curve points using precompile
     * @param x1 First point x coordinate
     * @param y1 First point y coordinate
     * @param x2 Second point x coordinate
     * @param y2 Second point y coordinate
     * @return x3 Result point x coordinate
     * @return y3 Result point y coordinate
     */
    function ecAdd(uint256 x1, uint256 y1, uint256 x2, uint256 y2) internal view returns (uint256 x3, uint256 y3) {
        if (x1 >= FIELD_ORDER) revert CoordOutOfRange("x1", x1);
        if (y1 >= FIELD_ORDER) revert CoordOutOfRange("y1", y1);
        if (x2 >= FIELD_ORDER) revert CoordOutOfRange("x2", x2);
        if (y2 >= FIELD_ORDER) revert CoordOutOfRange("y2", y2);

        uint256[4] memory input = [x1, y1, x2, y2];
        uint256[2] memory output;

        bool success;
        assembly {
            success := staticcall(gas(), 6, input, 0x80, output, 0x40)
        }
        if (!success) revert PrecompileFailed(0x06);

        return (output[0], output[1]);
    }

    /**
     * @dev Multiply elliptic curve point by scalar using precompile
     * @param x Point x coordinate
     * @param y Point y coordinate
     * @param scalar Scalar multiplier
     * @return x2 Result point x coordinate
     * @return y2 Result point y coordinate
     */
    function ecMul(uint256 x, uint256 y, uint256 scalar) internal view returns (uint256 x2, uint256 y2) {
        if (x >= FIELD_ORDER) revert CoordOutOfRange("x", x);
        if (y >= FIELD_ORDER) revert CoordOutOfRange("y", y);
        if (scalar >= CURVE_ORDER) revert ScalarOutOfRange(scalar);

        uint256[3] memory input = [x, y, scalar];
        uint256[2] memory output;

        bool success;
        assembly {
            success := staticcall(gas(), 7, input, 0x60, output, 0x40)
        }
        if (!success) revert PrecompileFailed(0x07);

        return (output[0], output[1]);
    }

    /**
     * @dev Check if point is the identity/infinity point.
     *
     * @notice Although (0,0) is not mathematically on the curve, this convention is used for practical reasons.
     */
    function isIdentity(uint256 x, uint256 y) internal pure returns (bool) {
        return x == 0 && y == 0;
    }

    /**
     * @dev Check if a point lies on the BN254 curve: y^2 = x^3 + 3 (mod q).
     *
     * @notice The identity (0,0) is accepted as valid by convention.
     */
    function isOnCurve(uint256 x, uint256 y) internal pure returns (bool) {
        if (isIdentity(x, y)) return true;

        uint256 lhs = mulmod(y, y, FIELD_ORDER);
        uint256 rhs = addmod(mulmod(mulmod(x, x, FIELD_ORDER), x, FIELD_ORDER), 3, FIELD_ORDER);

        return lhs == rhs;
    }
}
