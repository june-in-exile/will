pragma circom 2.2.2;

include "circomlib/circuits/bitify.circom";
include "circomlib/circuits/gates.circom";
include "../shared/components/arithmetic.circom";
include "../shared/components/bits.circom";

/**
 * Optimized Galois Field multiplication in GF(2^128)
 * Reduction polynomial: x^128 + x^7 + x^2 + x + 1
 * 
 * This implementation uses a three-round approach to handle overflows efficiently:
 * - Round 1: Calculate initial multiplication with first-level overflows
 * - Round 2: Process first-level overflows with reduction polynomial
 * - Round 3: Process remaining second-level overflows
 * 
 * The key optimization is accumulating contributions instead of iterative XOR operations,
 * which significantly reduces the number of constraints.
 */
template GF128MultiplyOptimized() {
    signal input {byte} aBytes[16];
    signal input {byte} bBytes[16];
    signal output {byte} cBytes[16];
    
    signal aBitGroup[16][8];
    signal bBitGroup[16][8];
    signal cBitGroup[16][8];
    signal aBits[128];
    signal bBits[128];
    signal cBits[128];
    
    // Convert 16-byte input to 128-bit
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

    // Reduction polynomial coefficients: 1 + x + x^2 + x^7
    var p_x[4] = [0, 1, 2, 7];

    // Counter arrays for accumulating contributions
    signal counter1[128][128];
    signal counter2[4][127];
    signal counter3[4][6];

    // Valid bits that fit within 128-bit result
    signal valid1[128];
    signal valid2[128];
    signal valid3[13];  // Only bits 0-12 can have contributions from round 3

    // Overflow bits that need reduction
    signal overflow1[127];  // Maximum 127 overflow bits from round 1
    signal overflow2[6];    // Maximum 6 overflow bits from round 2

    // ===== Round 1: Main multiplication =====
    // For each bit of 'a', accumulate b shifted right by that bit position
    for (var aBit = 0; aBit < 128; aBit++) {
        for (var bBit = 0; bBit < 128; bBit++) {
            var prevBBit = bBit + 1;
            
            // Base case: first a-bit or no previous b-bit to carry
            if (aBit == 0 || prevBBit >= 128) {
                counter1[aBit][bBit] <== aBits[aBit] * bBits[bBit];
            } else {
                // Accumulate: current contribution + carried value from previous iteration
                counter1[aBit][bBit] <== counter1[aBit - 1][prevBBit] + aBits[aBit] * bBits[bBit];
            }
        }
    }

    // Extract valid bits (0-127) and overflow bits (128+) from round 1
    for (var i = 0; i < 128; i++) {
        valid1[i] <== counter1[i][0];

        if (i < 127) {
            overflow1[i] <== counter1[127][i + 1];
        }
    }

    // ===== Round 2: Process first-level overflows =====
    // Apply reduction polynomial to overflow bits from round 1
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over1Bit = 0; over1Bit < 127; over1Bit++) {
            if (pIdx == 0) {
                // Initialize with overflow values
                counter2[pIdx][over1Bit] <== overflow1[over1Bit];
            } else {
                // Calculate previous overflow bit position based on polynomial terms
                var prevOver1Bit = over1Bit + (p_x[pIdx] - p_x[pIdx - 1]);
                if (prevOver1Bit < 127) {
                    // Accumulate from previous polynomial term
                    counter2[pIdx][over1Bit] <== counter2[pIdx - 1][prevOver1Bit] + overflow1[over1Bit];
                } else {
                    // No previous term to accumulate
                    counter2[pIdx][over1Bit] <== overflow1[over1Bit];
                }
            }
        }
    }
    
    // Extract contributions to valid bits and remaining overflows from round 2
    for (var i = 0; i < 128; i++) {
        if (i < p_x[1]) {
            valid2[i] <== counter2[0][i - p_x[0]];
        } else if (i < p_x[2]) {
            valid2[i] <== counter2[1][i - p_x[1]];
        } else if (i < p_x[3]) {
            valid2[i] <== counter2[2][i - p_x[2]];
        } else {
            valid2[i] <== counter2[3][i - p_x[3]];
        }

        if (i < 6) {
            overflow2[i] <== counter2[3][i + (128 - 7)];
        }
    }

    // ===== Round 3: Process second-level overflows =====
    // Apply reduction polynomial to remaining overflow bits
    for (var pIdx = 0; pIdx < 4; pIdx++) {
        for (var over2Bit = 0; over2Bit < 6; over2Bit++) {
            if (pIdx == 0) {
                counter3[pIdx][over2Bit] <== overflow2[over2Bit];
            } else {
                var prevOver2Bit = over2Bit + (p_x[pIdx] - p_x[pIdx - 1]);
                if (prevOver2Bit < 6) {
                    counter3[pIdx][over2Bit] <== counter3[pIdx - 1][prevOver2Bit] + overflow2[over2Bit];
                } else {
                    counter3[pIdx][over2Bit] <== overflow2[over2Bit];
                }
            }
        }
    }
    
    // Extract final contributions from round 3 (only affects bits 0-12)
    for (var i = 0; i < 13; i++) {
        if (i < p_x[1]) {
            valid3[i] <== counter3[0][i - p_x[0]];
        } else if (i < p_x[2]) {
            valid3[i] <== counter3[1][i - p_x[1]];
        } else if (i < p_x[3]) {
            valid3[i] <== counter3[2][i - p_x[2]];
        } else {
            valid3[i] <== counter3[3][i - p_x[3]];
        }
    }

    // ===== Final step: Sum all contributions and reduce modulo 2 =====
    for (var cBit = 0; cBit < 128; cBit++) {
        if (cBit < 13) {
            cBits[cBit] <== Mod2()(valid1[cBit] + valid2[cBit] + valid3[cBit]);
        } else {
            cBits[cBit] <== Mod2()(valid1[cBit] + valid2[cBit]);
        }
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

//     An Example of GF128MultiplyOptimized() with GF(2^8):
    
//     signal input {bit} a[8] = 10010001 (0x91);
//     signal input {bit} b[8] = 11101111 (0xef);
//     signal output {bit} c[8];

//     p(x) = 1 + x + x^3 + x^4 -> p_x = [0,1,3,4]

//     ====================== Round 1 ======================

//       a:    1  0  0  1  0  0  0  1
//       b:    1  1  1  0  1  1  1  1

//    aBit:    0:7
//    bBit:    0:7

//    ctr1:    1  1  1  0  1  1  1  1                     
//                1  1  0  1  1  1  1  0                  
//                   1  0  1  1  1  1  0  0               
//                      1  2  2  1  2  1  1  1            
//                         2  2  1  2  1  1  1  0         
//                            2  1  2  1  1  1  0  0      
//                               1  2  1  1  1  0  0  0   
//                                  3  2  2  1  1  1  1  1
//             ______________________
//  valid1:    1  1  1  1  2  2  1  3
//   over1:    2  2  1  1  1  1  1

//     ====================== Round 2 ======================

//     p_x:    [0,1,3,4]
//   over1:    2  2  1  1  1  1  1

//    pIdx:    0:3
// overBit:    0:6

//    ctr2:    2  2  1  1  1  1  1            
//                4  3  2  2  2  2  1         
//                      4  4  3  3  2  1  1   
//                         6  5  4  3  2  2  1
//             ______________________
//  valid2:    2  4  3  4  6  5  4  3
//   over2:    2  2  1

//     ====================== Round 3 ======================

//     p_x:    [0,1,3,4]
//   over2:    2  2  1

//    pIdx:    0:3
// overBit:    0:2

//    ctr3:    2  2  1            
//                4  3  1         
//                      3  2  1   
//                         4  3  1
//             ___________________
//  valid3:    2  4  3  3  4  3  1

//     ===================== Sum & Mod =====================

//   valid1    1  1  1  1  2  2  1  3
// + valid2    2  4  3  4  6  5  4  3
// + valid3    2  4  3  3  4  3  1
// =    sum    5  9  7  8 12 10  6  6

//    mod2:    1  1  1  0  0  0  0  0
//      c =    11100000 (0xe0)