// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract EllipticCurveOps {
    // BN254/alt_bn128 curve parameters
    uint256 constant FIELD_ORDER = 21888242871839275222246405745257275088696311157297823662689037894645226208583;
    uint256 constant CURVE_ORDER = 21888242871839275222246405745257275088548364400416034343698204186575808495617;

    /**
     * @dev Add two elliptic curve points using precompile
     * @param x1 First point x coordinate
     * @param y1 First point y coordinate 
     * @param x2 Second point x coordinate
     * @param y2 Second point y coordinate
     * @return x3 Result point x coordinate
     * @return y3 Result point y coordinate
     */
    function ecAdd(uint256 x1, uint256 y1, uint256 x2, uint256 y2) 
        internal view returns (uint256 x3, uint256 y3) {
        uint256[4] memory input = [x1, y1, x2, y2];
        uint256[2] memory output;
        
        assembly {
            let success := staticcall(gas(), 6, input, 0x80, output, 0x40)
            if iszero(success) {
                revert(0, 0)
            }
        }
        
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
    function ecMul(uint256 x, uint256 y, uint256 scalar) 
        internal view returns (uint256 x2, uint256 y2) {
        uint256[3] memory input = [x, y, scalar];
        uint256[2] memory output;
        
        assembly {
            let success := staticcall(gas(), 7, input, 0x60, output, 0x40)
            if iszero(success) {
                revert(0, 0)
            }
        }
        
        return (output[0], output[1]);
    }
    
    /**
     * @dev Check if point is the identity/infinity point
     */
    function isIdentity(uint256 x, uint256 y) internal pure returns (bool) {
        return x == 0 && y == 0;
    }
    
    /**
     * @dev Check if point is on the curve y^2 = x^3 + 3
     */
    function isOnCurve(uint256 x, uint256 y) internal pure returns (bool) {
        if (isIdentity(x, y)) return true;
        
        uint256 lhs = mulmod(y, y, FIELD_ORDER);
        uint256 rhs = addmod(mulmod(mulmod(x, x, FIELD_ORDER), x, FIELD_ORDER), 3, FIELD_ORDER);
        
        return lhs == rhs;
    }
}