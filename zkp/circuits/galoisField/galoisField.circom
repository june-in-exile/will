pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";


//     An Example of the Optimization Algorithm with GF(2^8):
    
//     signal input {bit} a[8] = 10010001 (0x91);
//     signal input {bit} b[8] = 11101111 (0xef);
//     signal output {bit} c[8];

//     p(x) = 1 + x + x^3 + x^4 -> p_x = [0,1,3,4]

//     ====================== Round 1 ======================

//     idx:    0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
//       a:    1  0  0  1  0  0  0  1
//       b:    1  1  1  0  1  1  1  1

//    aBit:    0:7
//    bBit:    0:7

//    ctr1:    1  1  1  0  1  1  1  1  0  0  0  0  0  0  0
//             1  1  1  0  1  1  1  1  0  0  0  0  0  0  0
//             1  1  1  0  1  1  1  1  0  0  0  0  0  0  0
//             1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
//             1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
//             1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
//             1  1  1  1  2  2  1  2  1  1  1  0  0  0  0
//             1  1  1  1  2  2  1  3  2  2  1  1  1  1  1
//             ______________________, ___________________
//             valid1                , over1

//     ====================== Round 2 ======================

//     idx:    0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
//     p_x:    [0,1,3,4]
//   over1:    2  2  1  1  1  1  1

//    pIdx:    0:3
// overBit:    0:6

//    ctr2:    2  2  1  1  1  1  1  0  0  0  0
//             2  4  3  2  2  2  2  1  0  0  0
//             2  4  3  4  4  3  3  2  1  1  0
//             2  4  3  4  6  5  4  3  2  2  1
//             ______________________, ___________________
//             valid2                , over2
  
//     ====================== Round 3 ======================

//     idx:    0  1  2  3  4  5  6  7  8  9 10 11 12 13 14
//     p_x:    [0,1,3,4]
//   over2:    2  2  1

//    pIdx:    0:3
// overBit:    0:2

//    ctr3:    2  2  1  0  0  0  0
//             2  4  3  1  0  0  0
//             2  4  3  3  2  1  0
//             2  4  3  3  4  3  1
//             ___________________
//             valid3

//     ===================== Sum & Mod =====================

//   valid1    1  1  1  1  2  2  1  3
// + valid2    2  4  3  4  6  5  4  3
// + valid3    2  4  3  3  4  3  1
// =    sum    5  9  7  8 12 10  6  6       

//    mod2:    1  1  1  0  0  0  0  0
//      c =    11100000 (0xe0)

/**
 * Galois Field multiplication in GF(2^128) with reduction polynomial x^128 + x^7 + x^2 + x + 1 (0xe1 || 30 zeros in LSB order)
 *
 * Idea of Galois Field multiplication with reduction polynomial p(x):
 *   c = Σ (a[i] == 1 ? b >> i : 0) mod p(x)
 *
 * Algorithm:
 * - For each bit i of 'a' (from LSB to MSB):
 *   - If a[i] == 1, c ^= b
 *   - b >>= 1
 *   - If b overflows, reduce using the polynomial
 */
template GF128Multiply() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    signal aBitGroup[16][8];
    signal bBitGroup[16][8];
    signal cBitGroup[16][8];
    signal aBits[128];
    signal bBits[128];
    signal cBits[128];
    
    // Convert 16-byte a, b to 128-bit, initialize c = 0
    for (var byte = 0; byte < 16; byte++) {
        // in-byte: MSB first -> LSB first
        aBitGroup[byte] <== Num2Bits(8)(aBytes[byte]);
        bBitGroup[byte] <== Num2Bits(8)(bBytes[byte]);
        // between-byte: LSB first -> MSB first
        for (var bit = 0; bit < 8; bit++) {
            aBits[byte * 8 + bit] <== aBitGroup[byte][7 - bit];
            bBits[byte * 8 + bit] <== bBitGroup[byte][7 - bit];
        }
    }

    var p_x[4] = [0,1,2,7]; // 1 + x + x^2 + x^7

    signal counter1[128][255]; // First round: overflow to bit 255 (128 + 128 - 1)
    signal counter2[4][134]; // Second round: overflow to bit 134 (127 + 8 - 1)
    signal counter3[4][13]; // Third round: overflow to bit 13 (6 + 8 - 1)

    signal valid1[128];
    signal valid2[128];
    signal valid3[13]; // index 14-127 must be zero

    signal overflow1[127];
    signal overflow2[6];

    // Round 1
    for (var aBit = 0; aBit < 128; aBit++) {
        for (var bBit = 0; bBit < 128; bBit++) {
            if (aBit == 0) {
                counter1[aBit][aBit + bBit] <== aBits[aBit] * bBits[bBit];
            } else {
                counter1[aBit][aBit + bBit] <== counter1[aBit - 1][aBit + bBit] + aBits[aBit] * bBits[bBit];
            }
        }   
    }

    for (var ctr1Idx = 0; ctr1Idx < 255; ctr1Idx++) {
        if (ctr1Idx < 128) {
            valid1[ctr1Idx] <== counter1[127][ctr1Idx];
        } else {
            overflow1[ctr1Idx - 128] <== counter1[127][ctr1Idx];
        }
    }

    // Round 2
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over1Bit = 0; over1Bit < 127; over1Bit++) {
            if (pIdx == 0) {
                counter2[pIdx][p_x[pIdx] + over1Bit] <== overflow1[over1Bit];
            } else {
                counter2[pIdx][p_x[pIdx] + over1Bit] <== counter2[pIdx - 1][p_x[pIdx] + over1Bit] + overflow1[over1Bit];
            }
        }
    }

    for (var ctr2Idx = 0; ctr2Idx < 134; ctr2Idx++) {
        if (ctr2Idx < 128) {
            valid2[ctr2Idx] <== counter2[3][ctr2Idx];
        } else {
            overflow2[ctr2Idx - 128] <== counter2[3][ctr2Idx];
        }
    }

    // Round 3
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over2Bit = 0; over2Bit < 13; over2Bit++) {
            if (pIdx == 0) {
                counter3[pIdx][p_x[pIdx] + over2Bit] <== overflow2[over2Bit];
            } else {
                counter3[pIdx][p_x[pIdx] + over2Bit] <== counter3[pIdx - 1][p_x[pIdx] + over2Bit] + overflow2[over2Bit];
            }
        }
    }

    for (var ctr3Idx = 0; ctr3Idx < 13; ctr3Idx++) {
        valid3[ctr3Idx] <== counter3[3][ctr3Idx];
    }

    // Sum & Mod
    signal validSum[128];
    for (var cBit = 0; cBit < 128; cBit++) {
        if (cBit < 13) {
            validSum[cBit] <== valid1[cBit] + valid2[cBit] + valid3[cBit];
        } else {
            validSum[cBit] <== valid1[cBit] + valid2[cBit];
        }
        cBits[cBit] <== Mod2()(validSum[cBit]);
    }
    
    // Convert final result bits back to bytes
    for (var byte = 0; byte < 16; byte++) {
        // between-byte: MSB first -> LSB first
        for (var bit = 0; bit < 8; bit++) {
            cBitGroup[byte][7 - bit] <== cBits[byte * 8 + bit];
        }
        // in-byte: LSB first -> MSB first
        cBytes[byte] <== Bits2Num(8)(cBitGroup[byte]);
    }
}


// Auto updated: 2025-07-16T10:57:12.426Z
template UntaggedGF128Multiply() {
    signal input aBytes[16];
    signal input bBytes[16];
    signal output {byte} cBytes[16];

    signal {byte} _aBytes[16];
    _aBytes <== aBytes;
    signal {byte} _bBytes[16];
    _bBytes <== bBytes;

    cBytes <== GF128Multiply()(_aBytes, _bBytes);
}

component main = UntaggedGF128Multiply();
